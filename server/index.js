const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const economyConfig = require('./config/economyConfig');


const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/users', userRoutes);

// Server-controlled economy configuration
app.get('/api/economy/config', (req, res) => {
    res.json({
        levelCompletionCoins: economyConfig.levelCompletionCoins,
        doubleScoreEnabled: economyConfig.rewardedAd.doubleScoreMultiplier > 1,
        doubleCoinsEnabled: economyConfig.rewardedAd.doubleCoinsMultiplier > 1,
        reviveEnabled: economyConfig.rewardedAd.reviveEnabled,
        extraMoves: economyConfig.rewardedAd.extraMoves,
        hintEnabled: economyConfig.rewardedAd.hintEnabled,
        dailyRewardedAdCap: economyConfig.rewardedAd.maxRewardedAdsPerDay
    });
});

// Test API
app.get('/', (req, res) => {
    res.json({
        message: 'Apple Worm Adventure Backend is running!'
    });
});

const PORT = process.env.PORT || 5000;

// Check MongoDB connection string
if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing in .env file');
    process.exit(1);
}

// Connect MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected Successfully!');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('MongoDB Connection Error:', error.message);
    });