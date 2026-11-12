
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function migrateUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected!');

        const users = await User.collection.find({}).toArray();

        for (const user of users) {
            const updates = {};

            // Preserve existing progress
            if (user.unlockedLevels === undefined) {
                updates.unlockedLevels = Math.min(
                    50,
                    Math.max(1, (user.completedLevels || 0) + 1)
                );
            }

            if (user.levelProgress === undefined) {
                updates.levelProgress = [];
            }

            if (user.streak === undefined) {
                updates.streak = 0;
            }

            if (user.lastPlayedAt === undefined) {
                updates.lastPlayedAt = null;
            }

            if (user.gameHistory === undefined) {
                updates.gameHistory = [];
            }

            if (Object.keys(updates).length > 0) {
                await User.collection.updateOne(
                    { _id: user._id },
                    { $set: updates }
                );
            }
        }

        console.log('Migration completed successfully!');
        console.log('Users checked:', users.length);

    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB disconnected.');
    }
}

migrateUsers();
