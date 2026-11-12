const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    passwordHash: {
        type: String,
        required: true
    },

    coins: {
        type: Number,
        default: 0
    },

    totalScore: {
        type: Number,
        default: 0
    },

    completedLevels: {
        type: Number,
        default: 0
    },

        rewardHistory: [
        {
            type: {
                type: String,
                enum: ['daily', 'achievement', 'ad', 'level', 'spend'],
                required: true
            },
           coins: {
    type: Number,
    required: true,
    min: 1
},
            date: {
                type: Date,
                default: Date.now
            }
        }
        
    ],

    achievements: [
    {
        achievementId: {
            type: String,
            required: true
        },
        title: {
            type: String,
            required: true
        },
        unlockedAt: {
            type: Date,
            default: Date.now
        }
    }
],

        lastDailyRewardDate: {
        type: Date,
        default: null
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    unlockedLevels: {
    type: Number,
    default: 1
},

levelProgress: [{
    levelId: {
        type: Number,
        required: true
    },
    stars: {
        type: Number,
        default: 0,
        min: 0,
        max: 3
    },
    bestMoves: {
        type: Number,
        default: 0
    },
    score: {
        type: Number,
        default: 0
    },
    completed: {
        type: Boolean,
        default: false
    }
}],

streak: {
    type: Number,
    default: 0
},

lastPlayedAt: {
    type: Date,
    default: null
},

gameHistory: [{
    levelId: Number,
    score: {
        type: Number,
        default: 0
    },
    moves: {
        type: Number,
        default: 0
    },
    stars: {
        type: Number,
        default: 0,
        min: 0,
        max: 3
    },
    completedAt: {
        type: Date,
        default: Date.now
    }
}]
});

const User = mongoose.model('User', userSchema);

module.exports = User;