
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');

async function backfill(batchSize = 500) {
  await connectDB();

  const total = await User.countDocuments();
  console.log(`Total users: ${total}`);

  let processed = 0;
  const cursor = User.find().cursor();

  const updates = [];

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const actual = Array.isArray(doc.following) ? doc.following.length : 0;
    if (doc.followingCount !== actual) {
      updates.push({ id: doc._id, count: actual });
    }

    if (updates.length >= batchSize) {
      await Promise.all(updates.map(u => User.updateOne({ _id: u.id }, { $set: { followingCount: u.count } })));
      processed += updates.length;
      console.log(`Updated ${processed}/${total} users`);
      updates.length = 0;
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates.map(u => User.updateOne({ _id: u.id }, { $set: { followingCount: u.count } })));
    processed += updates.length;
    console.log(`Updated ${processed}/${total} users`);
  }

  console.log('Backfill complete');
  process.exit(0);
}

backfill().catch(err => {
  console.error('Backfill error', err);
  process.exit(1);
});
