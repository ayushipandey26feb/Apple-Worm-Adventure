import { useState, useEffect, useCallback } from 'react'
import './App.css'
import Auth from './components/Auth'
import { apiRequest } from './services/api'


const BASE_LEVELS = [
  {
    worm: [{ x: 1, y: 3 }, { x: 0, y: 3 }],
    apple: { x: 4, y: 3 },
    portal: { x: 6, y: 3 },
    walls: [{ x: 3, y: 2 }, { x: 3, y: 4 }],
  },
  {
    worm: [{ x: 1, y: 5 }, { x: 0, y: 5 }],
    apple: { x: 4, y: 5 },
    portal: { x: 6, y: 5 },
    walls: [{ x: 3, y: 4 }, { x: 3, y: 6 }, { x: 5, y: 3 }],
  },
  {
    worm: [{ x: 1, y: 1 }, { x: 0, y: 1 }],
    apple: { x: 3, y: 1 },
    portal: { x: 6, y: 1 },
    walls: [{ x: 4, y: 0 }, { x: 4, y: 2 }, { x: 5, y: 3 }],
  },
  {
    worm: [{ x: 1, y: 2 }, { x: 0, y: 2 }],
    apple: { x: 3, y: 2 },
    portal: { x: 6, y: 2 },
    walls: [{ x: 4, y: 1 }, { x: 4, y: 3 }, { x: 2, y: 4 }, { x: 5, y: 5 }],
  },
  {
    worm: [{ x: 1, y: 1 }, { x: 0, y: 1 }],
    apple: { x: 3, y: 1 },
    portal: { x: 6, y: 1 },
    walls: [{ x: 4, y: 0 }, { x: 4, y: 2 }, { x: 5, y: 3 }, { x: 2, y: 4 }, { x: 3, y: 5 }, { x: 5, y: 5 }],
  },
  {
    worm: [{ x: 1, y: 5 }, { x: 0, y: 5 }],
    apple: { x: 2, y: 3 },
    portal: { x: 6, y: 1 },
    walls: [{ x: 3, y: 2 }, { x: 4, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 5 }],
  },
  {
    worm: [{ x: 1, y: 1 }, { x: 0, y: 1 }],
    apple: { x: 5, y: 1 },
    portal: { x: 6, y: 5 },
    walls: [{ x: 3, y: 0 }, { x: 3, y: 2 }, { x: 4, y: 3 }, { x: 5, y: 3 }],
  },
  {
    worm: [{ x: 1, y: 5 }, { x: 0, y: 5 }],
    apple: { x: 5, y: 5 },
    portal: { x: 6, y: 1 },
    walls: [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 2 }],
  },
  {
    worm: [{ x: 1, y: 3 }, { x: 0, y: 3 }],
    apple: { x: 5, y: 3 },
    portal: { x: 6, y: 5 },
    walls: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 2, y: 5 }],
  },
  {
    worm: [{ x: 1, y: 5 }, { x: 0, y: 5 }],
    apple: { x: 5, y: 1 },
    portal: { x: 6, y: 1 },
    walls: [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 2 }, { x: 2, y: 2 }, { x: 5, y: 5 }],
  },
]

// Add 40 additional playable levels. These use a clear horizontal route so
// every level is completable; obstacle layouts vary outside the safe route.
const EXTRA_LEVELS = Array.from({ length: 40 }, (_, index) => {
  const pathRow = [1, 3, 5][index % 3]
  const appleX = [3, 4, 5][index % 3]

  const walls = Array.from({ length: 2 + (index % 3) }, (_, wallIndex) => ({
    x: 2 + ((index * 3 + wallIndex * 2) % 5),
    y: (pathRow + 1 + wallIndex + (index % 2)) % 7,
  })).filter(wall => wall.y !== pathRow)

  return {
    worm: [{ x: 1, y: pathRow }, { x: 0, y: pathRow }],
    apple: { x: appleX, y: pathRow },
    portal: { x: 6, y: pathRow },
    walls,
  }
})

const LEVELS = [...BASE_LEVELS, ...EXTRA_LEVELS]

const ALL_ACHIEVEMENTS = [
  {
    achievementId: 'first_level',
    title: 'First Step',
    description: 'Complete your first level',
    reward: 10,
    icon: '🌱'
  },
  {
    achievementId: 'five_levels',
    title: 'Rising Star',
    description: 'Complete 5 different levels',
    reward: 20,
    icon: '⭐'
  },
  {
    achievementId: 'ten_levels',
    title: 'Worm Champion',
    description: 'Complete 10 different levels',
    reward: 30,
    icon: '🏆'
  },
  {
    achievementId: 'three_star',
    title: 'Perfect Player',
    description: 'Earn 3 stars in any level',
    reward: 20,
    icon: '💎'
  },
  {
    achievementId: 'twenty_levels',
    title: 'Super Explorer',
    description: 'Complete 20 different levels',
    reward: 40,
    icon: '🚀'
  },
  {
    achievementId: 'fifty_levels',
    title: 'Legendary Worm',
    description: 'Complete 50 different levels',
    reward: 100,
    icon: '👑'
  }
];

function App() {
  const [screen, setScreen] = useState('auth')
  const [authUser, setAuthUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isGuest, setIsGuest] = useState(false)
  const [level, setLevel] = useState(0)


  const [unlocked, setUnlocked] = useState(1)



  const [completed, setCompleted] = useState([])

  const [worm, setWorm] = useState(LEVELS[0].worm)
  const [appleEaten, setAppleEaten] = useState(false)
  const [score, setScore] = useState(0)
  const [stars, setStars] = useState(0)

  const [bestMoves, setBestMoves] = useState({})

  // Tracks which levels have already awarded stars, separately from completion.
  // This also fixes levels completed before the star system was added.
  const [starredLevels, setStarredLevels] = useState([])

  // Stores the best star rating earned on each level.
  // Older saves with 30 stars across 10 completed levels are treated as 3 stars per level.
  const [levelStars, setLevelStars] = useState({})

  const [moves, setMoves] = useState(0)
  const [won, setWon] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [scoreDoubled, setScoreDoubled] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
  const [coins, setCoins] = useState(0);
  const [rewardHistory, setRewardHistory] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);


  const [dailyChallengeUnlocked, setDailyChallengeUnlocked] = useState(false)
  const [dailyMessage, setDailyMessage] = useState('')
  const [hint, setHint] = useState('')

  const toggleSound = () => {
    setSoundOn(prev => !prev)
  }
  const DAILY_BONUS_COINS = 50


  const claimDailyReward = async () => {
    if (isGuest) {
      setDailyMessage('Create a free account to claim daily rewards.');
      return;
    }

    if (!dailyChallengeUnlocked) {
      setDailyMessage('🎯 Complete a level first to unlock your daily reward!');
      return;
    }

    try {
      const data = await apiRequest('/users/daily-reward', {
        method: 'POST'
      });

      setCoins(data.totalCoins);

      setProfile(previous =>
        previous ? { ...previous, coins: data.totalCoins } : previous
      );

      setDailyRewardClaimed(true);

      setDailyMessage(
        `🎉 Daily reward claimed! +${data.rewardCoins} coins. Total: ${data.totalCoins}`
      );

    } catch (error) {
      setDailyMessage(error.message || 'Daily reward could not be claimed.');
    }
  };


  const unlockAchievement = async (achievementId, title) => {
    if (isGuest || !localStorage.getItem('token')) return;

    try {
      const data = await apiRequest('/users/achievements/unlock', {
        method: 'POST',
        body: {
          achievementId,
          title
        }
      });

      setCoins(data.totalCoins);

      setProfile(previous =>
        previous
          ? {
            ...previous,
            coins: data.totalCoins,
            achievements: data.achievements || []
          }
          : previous
      );

      setAchievements(data.achievements || []);

      const historyData = await apiRequest('/users/reward-history');
      setRewardHistory(historyData.rewardHistory || []);

      setHint(`🏆 Achievement unlocked: ${title}! +10 coins earned!`);

    } catch (error) {
      if (!error.message?.includes('already unlocked')) {
        console.error('Achievement unlock failed:', error.message);
      }
    }
  };
  const current = LEVELS[level]
  const HINT_COST = 10


  const showHint = async () => {
    if (isGuest) {
      setHint('Create a free account to use coin-based hints and rewards.');
      return;
    }

    if (won) return;

    if (coins < HINT_COST) {
      setHint('❌ Not enough coins! You need 10 coins for a hint.');
      return;
    }

    try {
      const data = await apiRequest('/users/coins/spend', {
        method: 'POST',
        body: { amount: HINT_COST }
      });

      setCoins(data.remainingCoins);

      setProfile(previous =>
        previous ? { ...previous, coins: data.remainingCoins } : previous
      );

      const historyData = await apiRequest('/users/reward-history');
      setRewardHistory(historyData.rewardHistory || []);

      setHint(
        !appleEaten
          ? '💡 First, collect the apple 🍎!'
          : '💡 Apple collected! Now reach the green portal 🟩.'
      );

    } catch (error) {
      setHint(error.message || 'Unable to use hint.');
    }
  };



  const playWinSound = () => {
    try {
      if (!soundOn) return
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext

      if (!AudioContextClass) return

      const audio = new AudioContextClass()

        ;[523.25, 659.25, 783.99, 1046.5].forEach(
          (frequency, index) => {
            const oscillator = audio.createOscillator()
            const gain = audio.createGain()

            oscillator.type = 'sine'
            oscillator.frequency.value = frequency

            gain.gain.setValueAtTime(0.0001, audio.currentTime + index * 0.13)
            gain.gain.exponentialRampToValueAtTime(
              0.15,
              audio.currentTime + index * 0.13 + 0.03
            )
            gain.gain.exponentialRampToValueAtTime(
              0.0001,
              audio.currentTime + index * 0.13 + 0.25
            )

            oscillator.connect(gain)
            gain.connect(audio.destination)

            oscillator.start(audio.currentTime + index * 0.13)
            oscillator.stop(audio.currentTime + index * 0.13 + 0.27)
          }
        )

      setTimeout(() => audio.close(), 1200)
    } catch (error) {
      console.log('Sound could not play:', error)
    }
  }



  // Gentle original background music for active gameplay.
  // It starts after the player enters a level and follows the Sound On/Off toggle.
  useEffect(() => {
    if (screen !== 'game' || !soundOn || won || gameOver) return

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    let audio
    let melodyTimer
    let isDisposed = false

    const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 783.99, 659.25]
    let noteIndex = 0

    const playNote = () => {
      if (!audio || isDisposed || audio.state !== 'running') return

      const now = audio.currentTime
      const oscillator = audio.createOscillator()
      const envelope = audio.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(notes[noteIndex % notes.length], now)
      envelope.gain.setValueAtTime(0.0001, now)
      envelope.gain.exponentialRampToValueAtTime(0.022, now + 0.035)
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.34)

      oscillator.connect(envelope)
      envelope.connect(audio.destination)
      oscillator.start(now)
      oscillator.stop(now + 0.36)
      noteIndex += 1
    }

    try {
      audio = new AudioContextClass()
      audio.resume().then(() => {
        if (isDisposed) return
        playNote()
        melodyTimer = window.setInterval(playNote, 420)
      }).catch(() => {
        // Some browsers wait for the next player interaction before audio can start.
      })
    } catch (error) {
      console.warn('Background music is unavailable:', error)
    }

    return () => {
      isDisposed = true
      if (melodyTimer) window.clearInterval(melodyTimer)
      if (audio && audio.state !== 'closed') audio.close().catch(() => { })
    }
  }, [screen, soundOn, won, gameOver])



  useEffect(() => {
    if (!isGuest) return

    try {
      localStorage.setItem('guest_appleWormUnlocked', JSON.stringify(unlocked))
      localStorage.setItem('guest_appleWormCompleted', JSON.stringify(completed))
    } catch {
      // Storage may be unavailable.
    }
  }, [unlocked, completed, isGuest])

  useEffect(() => {
    if (!isGuest) return

    try {
      localStorage.setItem('guest_appleWormStars', JSON.stringify(stars))
      localStorage.setItem('guest_appleWormBestMoves', JSON.stringify(bestMoves))
      localStorage.setItem('guest_appleWormStarredLevels', JSON.stringify(starredLevels))
    } catch {
      // Storage may be unavailable.
    }
  }, [stars, bestMoves, starredLevels, isGuest])

  useEffect(() => {
    if (!isGuest) return

    try {
      localStorage.setItem(
        'guest_appleWormLevelStars',
        JSON.stringify(levelStars)
      )
    } catch {
      // Storage may be unavailable.
    }
  }, [levelStars, isGuest])

  const resetLevel = (index = level) => {
    setWorm(LEVELS[index].worm.map(p => ({ ...p })))
    setAppleEaten(false)
    setMoves(0)
    setScore(0)
    setWon(false)
    setGameOver(false)
    setScoreDoubled(false)
  }

  const REVIVE_COST = 20


  const reviveGame = async () => {
    console.log('REVIVE BUTTON CLICKED');

    if (isGuest) {
      setHint('Create a free account to use coin-based revives.');
      return;
    }

    if (!gameOver) return;

    if (coins < REVIVE_COST) {
      setHint('❌ Not enough coins! You need 20 coins to revive.');
      return;
    }

    try {
      const data = await apiRequest('/users/coins/spend', {
        method: 'POST',
        body: { amount: REVIVE_COST }
      });

      console.log('SPEND API DATA:', data);

      setCoins(data.remainingCoins);

      setProfile(previous =>
        previous
          ? { ...previous, coins: data.remainingCoins }
          : previous
      );

      setGameOver(false);

      const historyData = await apiRequest('/users/reward-history');
      setRewardHistory(historyData.rewardHistory || []);

      setHint('💚 Revived! Continue your adventure!');
    } catch (error) {
      console.error('REVIVE ERROR:', error);
      setHint(error.message || 'Unable to revive.');
    }
  };


  const doubleScore = () => {
    if (isGuest) {
      setHint('Create a free account to access reward features.');
      return;
    }
    if (!won || scoreDoubled) return

    const doubledScore = score * 2

    setScore(doubledScore)
    setScoreDoubled(true)
    setHint('🎉 Your score has been doubled!')
  }

  const openLevel = index => {
    if (index >= unlocked) return
    setLevel(index)
    resetLevel(index)
    setScreen('game')
  }

  const moveWorm = useCallback((dx, dy) => {
    if (screen !== 'game' || won || gameOver) return

    const head = worm[0]
    const next = { x: head.x + dx, y: head.y + dy }

    if (next.x < 0 || next.x > 7 || next.y < 0 || next.y > 6) {
      setGameOver(true)
      return
    }

    if (current.walls.some(w => w.x === next.x && w.y === next.y)) {
      setGameOver(true)
      return
    }

    if (worm.slice(0, -1).some(p => p.x === next.x && p.y === next.y)) {
      setGameOver(true)
      return
    }


    const eating =
      !appleEaten &&
      next.x === current.apple.x &&
      next.y === current.apple.y

    const updated = [next, ...worm]
    if (!eating) updated.pop()

    setWorm(updated)
    if (eating) setAppleEaten(true)

    const movesToFinish = moves + 1
    setMoves(movesToFinish)
    const reachingPortal =
      next.x === current.portal.x &&
      next.y === current.portal.y &&
      (appleEaten || eating)

    const earnedStars = movesToFinish < 12 ? 3 : movesToFinish < 18 ? 2 : 1
    const earnedScore = Math.max(100, 500 - movesToFinish * 10)
    if (!reachingPortal) {
      setMoves(movesToFinish)
      return
    }


    if (reachingPortal) {


      // Save completed game progress to MongoDB
      if (localStorage.getItem('token') && !isGuest) {
        apiRequest('/users/progress', {
          method: 'PUT',
          body: JSON.stringify({
            levelId: level + 1,
            stars: earnedStars,
            bestMoves: movesToFinish,
            score: earnedScore,
            moves: movesToFinish,
            totalScore: (profile?.totalScore || 0) + earnedScore
          })
        })
          .then(data => {
            console.log('Game progress saved to MongoDB:', data);
          })
          .catch(error => {
            console.error('Progress save failed:', error.message);
          });
      }
    }




    setDailyChallengeUnlocked(true)

    setWon(true)


    if (!isGuest) {
      const completedCount = completed.includes(level)
        ? completed.length
        : completed.length + 1;

      const achievementsToUnlock = [];

      if (completedCount === 1) {
        achievementsToUnlock.push({
          achievementId: 'first_level',
          title: 'First Step'
        });
      }

      if (completedCount === 5) {
        achievementsToUnlock.push({
          achievementId: 'five_levels',
          title: 'Rising Star'
        });
      }

      if (completedCount === 10) {
        achievementsToUnlock.push({
          achievementId: 'ten_levels',
          title: 'Worm Champion'
        });
      }


      if (completedCount >= 20) {
        achievementsToUnlock.push({
          achievementId: 'twenty_levels',
          title: 'Super Explorer'
        });
      }

      if (completedCount >= 50) {
        achievementsToUnlock.push({
          achievementId: 'fifty_levels',
          title: 'Legendary Worm'
        });
      }


      if (earnedStars === 3) {
        achievementsToUnlock.push({
          achievementId: 'three_star',
          title: 'Perfect Player'
        });
      }


      (async () => {
        for (const item of achievementsToUnlock) {
          try {
            const data = await apiRequest('/users/achievements/unlock', {
              method: 'POST',
              body: item
            });

            if (data.totalCoins !== undefined) {
              setCoins(data.totalCoins);

              setAchievements(data.achievements || []);

              setProfile(previous =>
                previous
                  ? {
                    ...previous,
                    coins: data.totalCoins,
                    achievements: data.achievements || []
                  }
                  : previous
              );
            }
          } catch (error) {
            if (!error.message.includes('already unlocked')) {
              console.error('Achievement unlock failed:', error.message);
            }
          }
        }

        try {
          const historyData = await apiRequest('/users/reward-history');
          setRewardHistory(historyData.rewardHistory || []);
        } catch (error) {
          console.error('Reward history update failed:', error);
        }
      })();

    }

    playWinSound()
    setScore(earnedScore)

    // Keep the best star rating for this level, even if it was completed before.
    setLevelStars(previous => ({
      ...previous,
      [level]: Math.max(Number(previous[level]) || 0, earnedStars),
    }))

    // Add to the total only the first time this level awards stars.
    if (!starredLevels.includes(level)) {
      setStars(previous => previous + earnedStars)
      setStarredLevels(previous =>
        previous.includes(level) ? previous : [...previous, level]
      )
    }

    setBestMoves(previous => {
      const oldBest = previous[level]
      if (oldBest !== undefined && oldBest <= movesToFinish) {
        return previous
      }
      return { ...previous, [level]: movesToFinish }
    })

    setCompleted(previous =>
      previous.includes(level) ? previous : [...previous, level]
    )

    setUnlocked(previous =>
      Math.max(previous, Math.min(LEVELS.length, level + 2))
    )


  }, [screen, won, gameOver, worm, current, appleEaten, level, moves, starredLevels, completed])

  useEffect(() => {
    const handleKey = e => {
      const keys = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        w: [0, -1],
        s: [0, 1],
        a: [-1, 0],
        d: [1, 0],
      }

      if (keys[e.key] && screen === 'game') {
        e.preventDefault()
        moveWorm(...keys[e.key])
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [moveWorm, screen])

  const startGuestSession = () => {
    const readGuest = (key, fallback) => {
      try {
        const value = localStorage.getItem(`guest_${key}`)
        return value === null ? fallback : JSON.parse(value)
      } catch {
        return fallback
      }
    }

    setIsGuest(true)
    setProfile(null)
    setAuthUser({
      name: 'Guest Player',
      email: 'Progress saved on this device'
    })

    const guestCompleted = readGuest('appleWormCompleted', [])
    const guestUnlocked = readGuest('appleWormUnlocked', 1)

    setCompleted(guestCompleted)
    setUnlocked(Math.max(1, Math.min(LEVELS.length, guestUnlocked)))
    setStars(readGuest('appleWormStars', 0))
    setBestMoves(readGuest('appleWormBestMoves', {}))
    setStarredLevels(readGuest('appleWormStarredLevels', []))
    setLevelStars(readGuest('appleWormLevelStars', {}))

    setLevel(0)
    resetLevel(0)
    setScreen('home')
  }

  const goHome = () => {
    resetLevel(0)
    setLevel(0)
    setScreen('home')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setAuthUser(null)
    setProfile(null)
    setIsGuest(false)
    setScreen('auth')
    resetLevel(0)
    setLevel(0)
  }

  const resetProgress = async () => {
    const confirmed = window.confirm(
      'Reset all saved levels, stars, scores and best moves? This cannot be undone.'
    );

    if (!confirmed) return;

    try {
      if (isGuest) {
        const guestKeys = [
          'guest_appleWormUnlocked',
          'guest_appleWormCompleted',
          'guest_appleWormStars',
          'guest_appleWormBestMoves',
          'guest_appleWormStarredLevels',
          'guest_appleWormLevelStars'
        ];

        guestKeys.forEach(key => localStorage.removeItem(key));
      } else if (localStorage.getItem('token')) {
        await apiRequest('/users/progress', {
          method: 'DELETE'
        });
      }

      setUnlocked(1);
      setCompleted([]);
      setStars(0);
      setBestMoves({});
      setStarredLevels([]);
      setLevelStars({});
      setLevel(0);

      setProfile(previous =>
        previous ? {
          ...previous,
          totalScore: 0,
          completedLevels: 0,
          unlockedLevels: 1,
          levelProgress: [],
          gameHistory: []
        } : null
      );

      resetLevel(0);
      setScreen('home');

      alert('Your game progress has been reset successfully!');

    } catch (error) {
      console.error('Reset progress failed:', error.message);
      alert('Unable to reset progress. Please try again.');
    }
  };


  useEffect(() => {
    if (screen !== 'home' || !localStorage.getItem('token')) {
      return;
    }

    const fetchProfile = async () => {
      try {
        const data = await apiRequest('/users/profile');

        setProfile(data.user);
        setAuthUser(data.user);

        const savedLevels = data.user.levelProgress || [];

        // Load only this registered user's progress
        const completedLevels = savedLevels
          .filter(item => item.completed)
          .map(item => item.levelId);

        setCompleted(completedLevels);

        setLevelStars(
          Object.fromEntries(
            savedLevels.map(item => [
              item.levelId,
              item.stars || 0
            ])
          )
        );

        setBestMoves(
          Object.fromEntries(
            savedLevels
              .filter(item => item.bestMoves > 0)
              .map(item => [
                item.levelId,
                item.bestMoves
              ])
          )
        );

        setUnlocked(
          Math.max(1, data.user.unlockedLevels || 1)
        );

        setStars(
          savedLevels.reduce(
            (sum, item) => sum + (item.stars || 0),
            0
          )
        );

        setCoins(data.user.coins || 0);
        try {
          const historyData = await apiRequest('/users/reward-history');
        } catch (error) {
          console.error('Reward history fetch failed:', error.message);
        }
        setRewardHistory(data.user.rewardHistory || []);
        setAchievements(data.user.achievements || []);
        await fetchLeaderboard();

        setDailyRewardClaimed(
          data.user.lastDailyRewardDate
            ? new Date(data.user.lastDailyRewardDate).toDateString() ===
            new Date().toDateString()
            : false
        );

      } catch (error) {
        console.error('Profile fetch failed:', error.message);

        localStorage.removeItem('token');
        setAuthUser(null);
        setProfile(null);
        setScreen('auth');
      }
    };


    const fetchLeaderboard = async () => {
      try {
        const data = await apiRequest('/users/leaderboard');
        setLeaderboard(data.leaderboard || []);
      } catch (error) {
        console.error('Leaderboard fetch failed:', error.message);
      }
    };

    fetchProfile();
  }, [screen]);


  return (
    <main className="app-shell">
      {screen === 'auth' ? (
        <header className="site-header auth-site-header">
          <button className="brand" onClick={startGuestSession} aria-label="Play as guest">
            <span className="brand-mark">🐛</span>
            <span>APPLE WORM <b>ADVENTURE</b></span>
          </button>
          <span className="auth-header-note">Your next little big adventure</span>
          <button className="nav-play" onClick={startGuestSession}>Play as Guest <span>↗</span></button>
        </header>
      ) : (
        <header className="site-header">
          <button className="brand" onClick={goHome} aria-label="Go to home">
            <span className="brand-mark">🐛</span>
            <span>APPLE WORM <b>ADVENTURE</b></span>
          </button>
          <nav className="main-nav" aria-label="Main navigation">
            <button className={screen === 'home' ? 'active' : ''} onClick={goHome}>Home</button>
            <button onClick={() => { setScreen('home'); window.setTimeout(() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }), 80) }}>How to play</button>
            <button className={screen === 'levels' ? 'active' : ''} onClick={() => setScreen('levels')}>Levels</button>
            <button onClick={() => { setScreen('home'); window.setTimeout(() => document.getElementById('player-stats')?.scrollIntoView({ behavior: 'smooth' }), 80) }}>Saved progress</button>
            <button onClick={() => { setScreen('home'); window.setTimeout(() => document.getElementById('player-stats')?.scrollIntoView({ behavior: 'smooth' }), 80) }}>Profile</button>
            {!isGuest && (
              <button className="nav-logout nav-logout-inline" onClick={handleLogout} title="Logout from your account">
                <span aria-hidden="true">↪</span> Logout
              </button>
            )}
          </nav>
          <div className="header-actions">
            {isGuest ? (
              <button className="nav-play" onClick={() => setScreen('auth')}>Login / Register <span>↗</span></button>
            ) : (
              <button className="nav-play" onClick={() => setScreen('levels')}>Play now <span>↗</span></button>
            )}
          </div>
        </header>
      )}

      {screen === 'auth' && (
        <div className="auth-screen">
          <Auth
            onLoginSuccess={(user) => {
              setIsGuest(false)
              setAuthUser(user)
              setScreen('home')
            }}
          />
          <div className="guest-entry">
            <span>Just want to try the game?</span>
            <button type="button" className="guest-play-button" onClick={startGuestSession}>Play as Guest <span>→</span></button>
            <small>Guest progress stays on this device. Create an account to save future progress to your account and access rewards.</small>
          </div>
          <footer className="site-footer">THINK • WIGGLE • WIN</footer>
        </div>
      )}



      {screen === 'home' && (
        <>
          <section className="hero-section" id="home">
            <div className="hero-copy">
              <div className="hero-kicker"><span>✦</span> YOUR NEXT LITTLE BIG ADVENTURE</div>
              <h1>Ready, set,<br /><em>SLITHER!</em></h1>
              <p className="hero-description">Meet your new wiggly best friend. Collect shiny apples, solve clever puzzles and find your way to the portal!</p>
              <div className="hero-actions">
                <button className="primary-cta" onClick={() => setScreen('levels')}>Play for free <span>→</span></button>
                <a className="text-link" href="#features">How to play <span>↓</span></a>
              </div>
              <div className="hero-proof"><span className="mini-avatar">🐸</span><span className="mini-avatar">🐻</span><span className="mini-avatar">🐼</span><p><b>Big fun. Tiny worm.</b><small>One clever move at a time.</small></p></div>
            </div>

            <div className="hero-visual" aria-label="Apple Worm Adventure game illustration">
              <div className="sun-orb">☀️</div>
              <span className="cloud cloud-one">☁️</span><span className="cloud cloud-two">☁️</span>
              <span className="floating-star star-one">★</span><span className="floating-star star-two">✦</span>
              <div className="scene-hill hill-back"></div><div className="scene-hill hill-front"></div>
              <div className="scene-worm"><span className="worm-face">🐛</span><span className="worm-body">🟢</span><span className="worm-body">🟢</span></div>
              <div className="scene-apple">🍎<span>✦</span></div>
              <div className="scene-portal"><span>✦</span><small>GOAL</small></div>
              <div className="scene-level-card"><span className="level-icon">🧩</span><span><b>LEVEL 01</b><small>The first bite</small></span><strong>★</strong></div>
              <div className="scene-caption">🍃 &nbsp; THINK · WIGGLE · WIN &nbsp; 🍃</div>
            </div>
          </section>

          <section className="player-panel" id="player-stats">
            <div className="player-heading"><div><span className="section-kicker">YOUR ADVENTURE</span><h2>
              {isGuest
                ? 'Welcome, Guest!'
                : `Welcome back, ${profile?.name || authUser?.name || 'Player'}!`} 👋
            </h2></div><span className="online-pill"><i></i> {isGuest ? 'GUEST MODE' : 'PLAYER PROFILE'}</span></div>
            <div className="player-metrics">
              <div className="metric-card"><span>✉️</span><small>EMAIL</small><b>{isGuest ? 'Saved on this device' : (profile?.email || authUser?.email || 'Player account')}</b></div>
              <div className="metric-card"><span>🪙</span><small>COINS</small><b>{isGuest ? 'Account required' : coins}</b></div>
              <div className="metric-card"><span>🏆</span><small>BEST SCORE</small><b>{isGuest ? score : (profile?.totalScore ?? 0)}</b></div>
              <div className="metric-card"><span>🎯</span><small>LEVELS COMPLETED</small><b>{completed.length}</b></div>
            </div>


            <section className="achievement-section">
              <div className="achievement-heading">
                <span className="section-kicker">YOUR MILESTONES</span>
                <h2>🏆 Achievements</h2>
                <p>Celebrate your progress and every little victory!</p>
              </div>

              {isGuest ? (
                <p className="achievement-empty">
                  Create an account to unlock and save achievements.
                </p>
              ) : achievements.length === 0 ? (
                <p className="achievement-empty">
                  🌱 No achievements unlocked yet. Complete your first level to earn one!
                </p>
              ) : (

                <div className="achievement-grid">
                  {ALL_ACHIEVEMENTS.map((item) => {
                    const isUnlocked = achievements.some(
                      achievement =>
                        achievement.achievementId === item.achievementId
                    );

                    const unlockedItem = achievements.find(
                      achievement =>
                        achievement.achievementId === item.achievementId
                    );

                    return (
                      <article
                        className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                        key={item.achievementId}
                      >
                        <span className="achievement-icon">
                          {isUnlocked ? item.icon : '🔒'}
                        </span>

                        <div className="achievement-info">
                          <h3>{item.title}</h3>

                          <small>
                            {isUnlocked
                              ? `Unlocked on ${new Date(
                                unlockedItem.unlockedAt
                              ).toLocaleDateString()}`
                              : item.description}
                          </small>

                          <span className="achievement-reward">
                            🪙 {item.reward} Coins
                          </span>
                        </div>

                        <span className="achievement-check">
                          {isUnlocked ? '✓' : '🔐'}
                        </span>
                      </article>
                    );
                  })}
                </div>

              )}
            </section>

            {isGuest && <p className="guest-notice">You’re playing as a guest. Your levels and stars are saved on this device. <button type="button" onClick={() => setScreen('auth')}>Create an account to save future progress</button>.</p>}
          </section>

          <section className="feature-section" id="features">
            <div><span className="section-kicker">A WORLD OF WIGGLES</span><h2>Small worm. <em>Big adventures.</em></h2><p>Plan your path, grab every apple and make it safely to the portal.</p></div>
            <div className="feature-grid">
              <article className="feature-card"><span>🍎</span><h3>Collect apples</h3><p>Find the fruit to grow and unlock your way forward.</p></article>
              <article className="feature-card"><span>🧠</span><h3>Solve puzzles</h3><p>Think ahead and move carefully around obstacles.</p></article>
              <article className="feature-card"><span>⭐</span><h3>Earn rewards</h3><p>Complete levels, collect stars and build your score.</p></article>
            </div>
          </section>
          <footer className="site-footer">APPLE WORM ADVENTURE <span>·</span> THINK • MOVE • GROW</footer>
        </>
      )}

      {screen === 'levels' && (
        <section className="content-screen">
          <div className="screen-topline"><button className="back-link" onClick={goHome}>← Home</button><span className="section-kicker">YOUR ADVENTURE</span></div>
          <div className="screen-heading"><h1>Choose your <em>level.</em></h1><p>Complete a puzzle to unlock the next level.</p></div>
          <div className="level-grid">
            {LEVELS.map((item, index) => {
              const isUnlocked = index < unlocked
              const isCompleted = completed.includes(index)
              const earnedStars = Number(levelStars[index]) || 0
              return (
                <button key={index} className={`level-button level-card ${isCompleted ? 'level-completed' : ''} ${!isUnlocked ? 'level-locked' : ''}`} disabled={!isUnlocked} onClick={() => openLevel(index)}>
                  <span className="level-card-top"><span className="level-number">LEVEL {String(index + 1).padStart(2, '0')}</span><span className="level-state">{isCompleted ? '✓' : isUnlocked ? '↗' : '🔒'}</span></span>
                  <strong className="level-card-art">{isCompleted ? (earnedStars > 0 ? '⭐'.repeat(earnedStars) : '☆') : isUnlocked ? '🐛' : '🔒'}</strong>
                  <span className="level-card-title">{item.name || `Level ${index + 1}`}</span>
                  <small>{isCompleted ? 'Completed' : isUnlocked ? 'Ready to play' : 'Complete previous level'}</small>
                  <span className="level-card-bottom"><span>{isCompleted ? 'Replay level' : isUnlocked ? 'Start puzzle' : 'Locked'}</span><b>→</b></span>
                </button>
              )
            })}
          </div>
          <button className="secondary-button" onClick={resetProgress}>Reset Saved Progress</button>
        </section>
      )}

      {screen === 'game' && (
        <section className="content-screen play-area">
          <div className="screen-topline"><button className="back-link" onClick={() => setScreen('levels')}>← All levels</button><span className="section-kicker">LEVEL {level + 1} / {LEVELS.length}</span></div>
          <div className="screen-heading"><h1>Apple Worm <em>Adventure</em></h1><p>{won ? '🎉 Level completed!' : appleEaten ? 'Great! Now reach the green portal.' : 'Collect the apple, then reach the portal.'}</p></div>
          <div className="game-stats"><span>🍎 {appleEaten ? 'Collected' : 'Not collected'}</span><span>👣 Moves: {moves}</span><span>🏆 Score: {score}</span><span>⭐ Stars: {stars}</span><span>🥇 Best: {bestMoves[level] ?? '—'}</span></div>
          <div className="board board-scenic" role="grid" aria-label={`Level ${level + 1}`}>
            {Array.from({ length: 56 }, (_, i) => {
              const x = i % 8, y = Math.floor(i / 8)
              const isWorm = worm.some(p => p.x === x && p.y === y)
              const isHead = worm[0].x === x && worm[0].y === y
              const isWall = current.walls.some(p => p.x === x && p.y === y)
              const isApple = !appleEaten && current.apple.x === x && current.apple.y === y
              const isPortal = current.portal.x === x && current.portal.y === y
              return (
                <div
                  key={i}
                  className={['cell', isWorm ? 'worm-cell' : '', isHead ? 'worm-head' : '', isWall ? 'wall-cell' : '', isApple ? 'apple-cell' : '', isPortal ? 'portal-cell' : ''].join(' ')}
                  role="gridcell"
                  aria-label={isWall ? 'Wooden obstacle' : isHead ? 'Worm head' : isWorm ? 'Worm body' : isApple ? 'Apple' : isPortal ? 'Portal' : 'Empty tile'}
                >
                  {isWall && <span className="wood-grain" aria-hidden="true" />}
                  {isWorm && <span className={`worm-sprite ${isHead ? 'worm-sprite-head' : 'worm-sprite-body'}`} aria-hidden="true">{isHead ? '🐛' : ''}</span>}
                  {isApple && <span className="apple-sprite" aria-hidden="true">🍎</span>}
                  {isPortal && <span className={`portal-sprite ${won ? 'portal-sprite-won' : ''}`} aria-hidden="true">{won ? '✨' : '🌀'}</span>}
                </div>
              )
            })}
          </div>
          <p className="game-help">Use arrow keys or the buttons below.</p>
          <div className="daily-challenge"><div className="coins-display">🪙 {isGuest ? 'Guest mode — rewards locked' : `Total Coins: ${coins}`}</div><h3>🎁 Daily Challenge</h3><p>Complete a level and claim your daily bonus!</p><button className="primary-cta" onClick={claimDailyReward} disabled={!isGuest && (!dailyChallengeUnlocked || dailyRewardClaimed)}>{isGuest ? '🔐 Create Account to Claim' : dailyRewardClaimed ? '✅ Reward Claimed Today' : dailyChallengeUnlocked ? '🎁 Claim 50 Bonus Coins' : '🔒 Complete a Level to Unlock'}</button>{dailyMessage && <p>{dailyMessage}</p>}</div>
          <div className="reward-history">
            <h3>🏆 Reward History</h3>

            {rewardHistory.length === 0 ? (
              <p>No rewards claimed yet.</p>
            ) : (
              <div className="reward-history-list">
                {rewardHistory.slice().reverse().map((reward, index) => (
                  <div className="reward-history-item" key={index}>
                    <span>
                      {reward.type === 'daily' ? '🎁 Daily Reward' :
                        reward.type === 'achievement' ? '🏆 Achievement' :
                          reward.type === 'ad' ? '📺 Ad Reward' :
                            '⭐ Level Reward'}
                    </span>

                    <strong>+{reward.coins} 🪙</strong>

                    <small>
                      {new Date(reward.date).toLocaleDateString()}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="game-tools"><button className="secondary-button" onClick={toggleSound}>{soundOn ? '🔊 Sound On' : '🔇 Sound Off'}</button><button className="secondary-button" onClick={showHint} disabled={won}>💡 Get Hint (10 coins)</button></div>
          {hint && <p className="hint-message">{hint}</p>}
          <div className="direction-pad"><button onClick={() => moveWorm(0, -1)} aria-label="Move up">⬆️</button><div><button onClick={() => moveWorm(-1, 0)} aria-label="Move left">⬅️</button><button onClick={() => moveWorm(0, 1)} aria-label="Move down">⬇️</button><button onClick={() => moveWorm(1, 0)} aria-label="Move right">➡️</button></div></div>
          {gameOver && (
            <div className="failure-overlay">
              <div className="failure-card">
                <div className="failure-icon">💔</div>
                <span className="failure-kicker">DON'T GIVE UP, WORM EXPLORER!</span>
                <h2>Oops! Try again</h2>
                <p>Your worm bumped into an obstacle. Every puzzle is a new chance to win.</p>
                <div className="failure-stats">
                  <div><strong>👣 {moves}</strong><small>Moves made</small></div>
                  <div><strong>🍎 {appleEaten ? '1 / 1' : '0 / 1'}</strong><small>Apples found</small></div>
                </div>
                <button className="failure-retry" onClick={() => resetLevel()}>↻ Try Again</button>
                <button className="failure-revive" onClick={() => {
                  console.log('REVIVE BUTTON CLICKED');
                  reviveGame();
                }} disabled={!isGuest && coins < REVIVE_COST}>💚 {isGuest ? 'Create Account to Revive' : 'Revive · 20 Coins'}</button>
                <button className="failure-levels" onClick={() => setScreen('levels')}>Choose another level</button>
              </div>
            </div>
          )}
          {won && <div className="welcome-message"><div className="confetti-container">{Array.from({ length: 45 }, (_, i) => <span key={i} className="confetti-piece" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 10) * 0.12}s` }} />)}</div><h2>⭐ Level {level + 1} complete!</h2><p>Stars earned: {'⭐'.repeat(Number(levelStars[level]) || 0)}</p><button className="secondary-button" onClick={doubleScore} disabled={scoreDoubled}>{scoreDoubled ? '✅ Score Doubled!' : '🎉 Double My Score'}</button><button className="primary-cta" onClick={() => setScreen('levels')}>Choose Next Level →</button></div>}
          {!gameOver && !won && <div className="game-actions"><button className="primary-cta" onClick={() => resetLevel()}>↻ Restart Level</button><button className="secondary-button" onClick={() => setScreen('levels')}>Level Selection</button><button className="secondary-button" onClick={goHome}>Back to Home</button></div>}
        </section>
      )}
    </main>
  )
}

export default App
