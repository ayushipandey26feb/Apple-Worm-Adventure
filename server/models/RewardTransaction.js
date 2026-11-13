const mongoose = require('mongoose');

const rewardTransactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    gameId: {
        type: String,
        default: 'APPLE_WORM_ADVENTURE'
    },
    sessionId: String,
    levelId: Number,

    type: {
        type: String,
        enum: [
            'REVIVE',
            'DOUBLE_SCORE',
            'DOUBLE_COINS',
            'EXTRA_MOVES',
            'HINT',
            'BOOSTER'
        ],
        required: true
    },

    source: {
        type: String,
        default: 'REWARDED_AD'
    },

    amount: {
        type: Number,
        required: true,
        min: 0
    },

    multiplier: {
        type: Number,
        default: 1
    },

    adProvider: {
        type: String,
        default: 'MOCK'
    },

    adEventId: {
        type: String,
        required: true,
        unique: true
    },

    status: {
        type: String,
        enum: ['REQUESTED', 'VERIFIED', 'GRANTED', 'APPLIED', 'REJECTED', 'EXPIRED'],
        default: 'REQUESTED'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model(
    'RewardTransaction',
    rewardTransactionSchema
);