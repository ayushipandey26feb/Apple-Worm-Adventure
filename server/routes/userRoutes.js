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
        console.error('Registration error:', error);

        res.status(500).json({
            message: 'Registration failed'
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
        console.error('Login error:', error);

        res.status(500).json({
            message: 'Login failed'
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
        console.error('Profile fetch error:', error);

        res.status(500).json({
            message: 'Failed to fetch profile'
        });
    }
});



// Save Game Progress API
router.put('/progress', authMiddleware, async (req, res) => {
    try {
        const {
            levelId,
            stars,
            bestMoves,
            score,
            moves,
        } = req.body;

        // Validate incoming progress
        if (
            !Number.isInteger(levelId) ||
            levelId < 1 ||
            levelId > 50 ||
            !Number.isInteger(stars) ||
            stars < 1 ||
            stars > 3 ||
            !Number.isFinite(bestMoves) ||
            bestMoves < 1 ||
            !Number.isFinite(score) ||
            score < 0 ||
            !Number.isFinite(moves) ||
            moves < 1
           
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

        const previousLevelScore = levelData?.score || 0;
        const isNewLevelCompletion = !levelData || !levelData.completed;

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
        const newBestScore = Math.max(previousLevelScore, score);

        user.totalScore = (user.totalScore || 0) +
            (newBestScore - previousLevelScore);

        if (isNewLevelCompletion && score > 0) {
            user.coins = (user.coins || 0) + score;

            user.rewardHistory.push({
                type: 'level',
                coins: score,
                date: new Date()
            });
        }

        user.completedLevels = new Set(
            user.levelProgress
                .filter(item => item.completed)
                .map(item => item.levelId)
        ).size;

        user.unlockedLevels = Math.max(
            user.unlockedLevels || 1,
            Math.min(50, levelId + 1)
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
        const safeUser = user.toObject();
        delete safeUser.passwordHash;

        res.status(200).json({
            message: 'Game progress saved successfully!',
            user: safeUser
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
        console.error('Spend coins error:', error);

        res.status(500).json({
            message: 'Unable to spend coins'
        });
    }
});


// Daily Reward API
router.post('/daily-reward', authMiddleware, async (req, res) => {
    try {
        const now = new Date();

        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const user = await User.findOneAndUpdate(
            {
                _id: req.userId,
                $or: [
                    { lastDailyRewardDate: { $lt: startOfDay } },
                    { lastDailyRewardDate: null }
                ]
            },
            {
                $inc: { coins: 50 },
                $set: { lastDailyRewardDate: now },
                $push: {
                    rewardHistory: {
                        type: 'daily',
                        coins: 50,
                        date: now
                    }
                }
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!user) {
            const existingUser = await User.findById(req.userId);

            if (!existingUser) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            return res.status(400).json({
                message: 'Daily reward already claimed today!'
            });
        }

        return res.status(200).json({
            message: 'Daily reward claimed successfully!',
            rewardCoins: 50,
            totalCoins: user.coins
        });

    } catch (error) {
        console.error('Daily reward error:', error);

        return res.status(500).json({
            message: 'Daily reward failed'
        });
    }
});


// Achievement Unlock API
router.post('/achievements/unlock', authMiddleware, async (req, res) => {
    try {
        const { achievementId } = req.body;

        if (!achievementId) {
            return res.status(400).json({
                message: 'Achievement ID is required'
            });
        }

        const achievementRewards = {
            first_level: {
                title: 'First Step',
                coins: 10,
                requiredLevels: 1
            },
            five_levels: {
                title: 'Rising Star',
                coins: 20,
                requiredLevels: 5
            },
            ten_levels: {
                title: 'Worm Champion',
                coins: 30,
                requiredLevels: 10
            },
            three_star: {
                title: 'Perfect Player',
                coins: 20,
                requiredLevels: 0
            },
            twenty_levels: {
                title: 'Super Explorer',
                coins: 40,
                requiredLevels: 20
            },
            fifty_levels: {
                title: 'Legendary Worm',
                coins: 100,
                requiredLevels: 50
            }
        };

        const achievement = achievementRewards[achievementId];

        if (!achievement) {
            return res.status(400).json({
                message: 'Invalid achievement'
            });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        const completedLevels = user.levelProgress.filter(
            level => level.completed
        );

        const uniqueCompletedLevels = new Set(
            completedLevels.map(level => level.levelId)
        );

        let eligible = false;

        if (achievementId === 'three_star') {
            eligible = completedLevels.some(
                level => level.stars === 3
            );
        } else {
            eligible =
                uniqueCompletedLevels.size >= achievement.requiredLevels;
        }

        if (!eligible) {
            return res.status(403).json({
                message: 'Achievement requirements not completed'
            });
        }

        const rewardCoins = achievement.coins;
        const achievementTitle = achievement.title;

        const updatedUser = await User.findOneAndUpdate(
            {
                _id: req.userId,
                'achievements.achievementId': {
                    $ne: achievementId
                }
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
                new: true,
                runValidators: true
            }
        );

        if (!updatedUser) {
            return res.status(400).json({
                message: 'Achievement already unlocked!'
            });
        }

        return res.status(200).json({
            message: 'Achievement unlocked successfully!',
            achievement: achievementTitle,
            rewardCoins,
            totalCoins: updatedUser.coins,
            achievements: updatedUser.achievements
        });

    } catch (error) {
        console.error('Achievement unlock error:', error);

        return res.status(500).json({
            message: 'Achievement unlock failed'
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
        console.error('Reward history error:', error);

        res.status(500).json({
            message: 'Failed to fetch reward history'
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
        console.error('Leaderboard error:', error);

        res.status(500).json({
            message: 'Failed to fetch leaderboard'
        });
    }
});

module.exports = router;