const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');

// User Registration API
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: 'All fields are required'
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                message: 'Email already registered'
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            passwordHash
        });

        await newUser.save();

        res.status(201).json({
            message: 'Registration successful!',
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                coins: newUser.coins
            }
        });

    } catch (error) {
        res.status(500).json({
            message: 'Registration failed',
            error: error.message
        });
    }
});

// User Login API
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!isMatch) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            message: 'Login successful!',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                coins: user.coins
            }
        });

    } catch (error) {
        res.status(500).json({
            message: 'Login failed',
            error: error.message
        });
    }
});

// Get Logged-in User Profile
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-passwordHash');

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        res.status(200).json({
            message: 'Profile fetched successfully!',
            user
        });

    } catch (error) {
        res.status(500).json({
            message: 'Unable to fetch profile',
            error: error.message
        });
    }
});



// Save Game Progress API
router.put('/progress', authMiddleware, async (req, res) => {
    try {
        const {
            totalScore,
            completedLevels,
            levelId,
            stars,
            bestMoves,
            score,
            moves
        } = req.body;

        // Validate incoming progress
        if (
            !Number.isInteger(levelId) ||
            levelId < 0 ||
            levelId >= 50 ||
            !Number.isInteger(stars) ||
            stars < 1 ||
            stars > 3 ||
            !Number.isFinite(bestMoves) ||
            bestMoves < 1 ||
            !Number.isFinite(score) ||
            score < 0 ||
            !Number.isFinite(moves) ||
            moves < 1 ||
            !Number.isFinite(totalScore) ||
            totalScore < 0
        ) {
            return res.status(400).json({
                message: 'Invalid game progress data'
            });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        // Find existing level progress
        let levelData = user.levelProgress.find(
            item => item.levelId === levelId
        );

        if (!levelData) {
            user.levelProgress.push({
                levelId,
                stars,
                bestMoves,
                score,
                completed: true
            });
        } else {
            levelData.stars = Math.max(levelData.stars || 0, stars);
            levelData.bestMoves = Math.min(
                levelData.bestMoves || bestMoves,
                bestMoves
            );
            levelData.score = Math.max(levelData.score || 0, score);
            levelData.completed = true;
        }

        // Update overall progress
        user.totalScore = Math.max(user.totalScore || 0, totalScore);
        user.completedLevels = user.levelProgress.filter(
            item => item.completed
        ).length;

        user.unlockedLevels = Math.max(
            user.unlockedLevels || 1,
            Math.min(50, levelId + 2)
        );

        user.lastPlayedAt = new Date();

        // Record this completed game
        user.gameHistory.push({
            levelId,
            score,
            moves,
            stars,
            completedAt: new Date()
        });

        await user.save();

        res.status(200).json({
            message: 'Game progress saved successfully!',
            user
        });

    } catch (error) {
        console.error('Progress save error:', error);
        res.status(500).json({
            message: 'Unable to save game progress'
        });
    }
});

// Reset Logged-in User Progress API
router.delete('/progress', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        user.totalScore = 0;
        user.completedLevels = 0;
        user.unlockedLevels = 1;
        user.levelProgress = [];
        user.gameHistory = [];
        user.lastPlayedAt = null;

        await user.save();

        res.status(200).json({
            message: 'Progress reset successfully!'
        });

    } catch (error) {
        console.error('Progress reset error:', error);
        res.status(500).json({
            message: 'Unable to reset progress'
        });
    }
});



// Spend Coins API
router.post('/coins/spend', authMiddleware, async (req, res) => {
    try {
        const { amount } = req.body;

        if (!Number.isInteger(amount) || amount <= 0 || amount > 10000) {
            return res.status(400).json({
                message: 'Invalid coin amount'
            });
        }

        const now = new Date();

        const updatedUser = await User.findOneAndUpdate(
            {
                _id: req.userId,
                coins: { $gte: amount }
            },
            {
                $inc: { coins: -amount },
                $push: {
                    rewardHistory: {
                        type: 'spend',
                        coins: amount,
                        date: now
                    }
                }
            },
            {
                new: true,
                runValidators: true
            }
        ).select('-passwordHash');

        if (!updatedUser) {
            return res.status(400).json({
                message: 'Insufficient coins or user not found'
            });
        }

        res.status(200).json({
            message: 'Coins spent successfully!',
            remainingCoins: updatedUser.coins
        });

    } catch (error) {
        res.status(500).json({
            message: 'Unable to spend coins',
            error: error.message
        });
    }
});

// Daily Reward API
router.post('/daily-reward', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        const now = new Date();

        if (user.lastDailyRewardDate) {
            const lastClaim = new Date(user.lastDailyRewardDate);

            const sameDay =
                lastClaim.getFullYear() === now.getFullYear() &&
                lastClaim.getMonth() === now.getMonth() &&
                lastClaim.getDate() === now.getDate();

            if (sameDay) {
                return res.status(400).json({
                    message: 'Daily reward already claimed today!'
                });
            }
        }

        const rewardCoins = 50;

        user.coins += rewardCoins;
        user.lastDailyRewardDate = now;

        user.rewardHistory.push({
            type: 'daily',
            coins: rewardCoins,
            date: now
        });

        await user.save();

        res.status(200).json({
            message: 'Daily reward claimed successfully!',
            rewardCoins,
            totalCoins: user.coins
        });

    } catch (error) {
        res.status(500).json({
            message: 'Daily reward failed',
            error: error.message
        });
    }
});

// Achievement Unlock API
router.post('/achievements/unlock', authMiddleware, async (req, res) => {
    try {
        const { achievementId, title } = req.body;

        if (!achievementId || !title) {
            return res.status(400).json({
                message: 'Achievement ID and title are required'
            });
        }


const achievementRewards = {
  first_level: {
    title: 'First Step',
    coins: 10
  },
  five_levels: {
    title: 'Rising Star',
    coins: 20
  },
  ten_levels: {
    title: 'Worm Champion',
    coins: 30
  },
  three_star: {
    title: 'Perfect Player',
    coins: 20
  },
  twenty_levels: {
    title: 'Super Explorer',
    coins: 40
  },
  fifty_levels: {
    title: 'Legendary Worm',
    coins: 100
  }
};


const achievement = achievementRewards[achievementId];

if (!achievement) {
  return res.status(400).json({
    message: 'Invalid achievement'
  });
}


const rewardCoins = achievement.coins;

const achievementTitle = achievement.title;

        const updatedUser = await User.findOneAndUpdate(
            {
                _id: req.userId,
                'achievements.achievementId': { $ne: achievementId }
            },
            {
                $push: {
                   achievements: {
    achievementId,
    title: achievementTitle,
    unlockedAt: new Date()
},
                    rewardHistory: {
                        type: 'achievement',
                        coins: rewardCoins,
                        date: new Date()
                    }
                },
                $inc: {
                    coins: rewardCoins
                }
            },
            {
                returnDocument: 'after',
                runValidators: true
            }
        );

        if (!updatedUser) {
            const userExists = await User.exists({ _id: req.userId });

            if (!userExists) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            return res.status(400).json({
                message: 'Achievement already unlocked!'
            });
        }

       res.status(200).json({
    message: 'Achievement unlocked successfully!',
    achievement: achievementTitle,
    rewardCoins,
    totalCoins: updatedUser.coins,
    achievements: updatedUser.achievements
});

    } catch (error) {
        res.status(500).json({
            message: 'Achievement unlock failed',
            error: error.message
        });
    }
});

// Reward History API
router.get('/reward-history', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select('rewardHistory coins');

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        res.status(200).json({
            message: 'Reward history fetched successfully!',
            totalCoins: user.coins,
            rewardHistory: user.rewardHistory
        });

    } catch (error) {
        res.status(500).json({
            message: 'Failed to fetch reward history',
            error: error.message
        });
    }
});

// Leaderboard API
router.get('/leaderboard', async (req, res) => {
    try {
        const leaderboard = await User.find()
            .select('name totalScore completedLevels')
            .sort({ totalScore: -1 })
            .limit(10);

        res.status(200).json({
            message: 'Leaderboard fetched successfully!',
            leaderboard
        });

    } catch (error) {
        res.status(500).json({
            message: 'Failed to fetch leaderboard',
            error: error.message
        });
    }
});

module.exports = router;