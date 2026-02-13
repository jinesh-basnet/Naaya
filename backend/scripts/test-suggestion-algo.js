const mongoose = require('mongoose');
const User = require('../models/User');
const Following = require('../models/Following');
const UserInteraction = require('../models/UserInteraction');
const RichGetRicherAlgorithm = require('../utils/friendSuggestionAlgorithm');
require('dotenv').config();

// Connect to Database
mongoose.connect('mongodb://127.0.0.1:27017/naaya_social', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error(err));

async function createTestUsers() {
    console.log('Creating test scenario...');

    // Clean up previous test data if needed
    // await User.deleteMany({ email: /@test.com/ });
    // await Following.deleteMany({});

    try {
        // 1. Create User B (You)
        const userB = await User.create({
            username: 'userB_' + Date.now(),
            email: `userB_${Date.now()}@test.com`,
            password: 'password123',
            fullName: 'User B (Me)',
            interactions: ['tech', 'music'],
            location: { city: 'Kathmandu' }
        });
        console.log(`Created User B: ${userB.username}`);

        // 2. Create User A (Your Friend)
        const userA = await User.create({
            username: 'userA_' + Date.now(),
            email: `userA_${Date.now()}@test.com`,
            password: 'password123',
            fullName: 'User A (Friend)',
            interactions: ['tech'],
            location: { city: 'Kathmandu' }
        });
        console.log(`Created User A: ${userA.username}`);

        // 3. Create User X (Friend of Friend - The Target Suggestion)
        const userX = await User.create({
            username: 'userX_' + Date.now(),
            email: `userX_${Date.now()}@test.com`,
            password: 'password123',
            fullName: 'User X (Friend of Friend)',
            interactions: ['music'],
            location: { city: 'Pokhara' }, // Different city to prove mutuals matter more
            followersCount: 10 // Not super famous
        });
        console.log(`Created User X: ${userX.username}`);

        // 4. Create User Y (Random Popular User - Control Group)
        const userY = await User.create({
            username: 'userY_' + Date.now(),
            email: `userY_${Date.now()}@test.com`,
            password: 'password123',
            fullName: 'User Y (Popular Stranger)',
            interactions: ['sports'],
            location: { city: 'Lalitpur' },
            followersCount: 1000 // Very famous
        });
        console.log(`Created User Y: ${userY.username}`);

        // --- SETUP CONNECTIONS ---

        // B follows A
        await Following.create({
            user: userB._id,
            following: [userA._id]
        });
        await User.findByIdAndUpdate(userB._id, { $inc: { followingCount: 1 } });
        await User.findByIdAndUpdate(userA._id, { $inc: { followersCount: 1 } });
        console.log('User B follows User A');

        // A follows X (Creating the Mutual Connection for B -> X)
        await Following.create({
            user: userA._id,
            following: [userX._id]
        });
        await User.findByIdAndUpdate(userA._id, { $inc: { followingCount: 1 } });
        await User.findByIdAndUpdate(userX._id, { $inc: { followersCount: 1 } });
        console.log('User A follows User X');

        // Init User Interaction for preferences (optional but good for realism)
        await UserInteraction.create({
            viewer: userB._id,
            author: userA._id,
            interactions: { view: { count: 5, lastInteraction: new Date() } }
        });

        // --- RUN ALGORITHM ---
        console.log('\nRunning Algorithm for User B...');
        const algorithm = new RichGetRicherAlgorithm();
        const suggestions = await algorithm.getSuggestions(userB._id, 5);

        console.log('\n--- SUGGESTION RESULTS ---');
        suggestions.users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.username} (${user.fullName})`);
            console.log(`   Mutuals: ${user.mutualConnections || 0}`);
            console.log(`   Score Factors: ${user.factors}`);
            // console.log(`   Final Score: ${user.score}`); // Score removed from final output, but factors show it
        });

        // Verification
        const suggestedX = suggestions.users.find(u => u._id.toString() === userX._id.toString());
        const suggestedY = suggestions.users.find(u => u._id.toString() === userY._id.toString());

        if (suggestedX) {
            console.log('\n✅ SUCCESS: User X (Friend of Friend) was suggested!');
            if (suggestedX.mutualConnections > 0) {
                console.log('✅ SUCCESS: User X correctly identified as a Mutual Connection.');
            } else {
                console.log('❌ FAIL: User X not identified as a Mutual Connection.');
            }
        } else {
            console.log('\n❌ FAIL: User X was NOT suggested.');
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        mongoose.disconnect();
    }
}

createTestUsers();
