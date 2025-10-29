const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Follow = require('../models/Follow');

async function migrateFollows() {
  await connectDB();

  console.log('Starting follow migration...');

  const totalUsers = await User.countDocuments();
  console.log(`Total users: ${totalUsers}`);

  let processed = 0;
  const batchSize = 100;

  const cursor = User.find({}).cursor();

  for (let user = await cursor.next(); user != null; user = await cursor.next()) {
    const followingIds = user.following || [];

    if (followingIds.length > 0) {
      const followDocs = followingIds.map(followingId => ({
        follower: user._id,
        following: followingId
      }));

      try {
        await Follow.insertMany(followDocs, { ordered: false });
        console.log(`Migrated ${followDocs.length} follows for user ${user.username}`);
      } catch (error) {
        if (error.code !== 11000) {
          console.error(`Error migrating follows for user ${user._id}:`, error);
        }
      }
    }

    processed++;
    if (processed % batchSize === 0) {
      console.log(`Processed ${processed}/${totalUsers} users`);
    }
  }

  console.log('Migration complete!');

  const totalFollows = await Follow.countDocuments();
  console.log(`Total follow relationships created: ${totalFollows}`);

  process.exit(0);
}

migrateFollows().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
