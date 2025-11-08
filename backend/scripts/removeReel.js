require('dotenv').config();
const mongoose = require('mongoose');
const Reel = require('../models/Reel');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Database connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const removeReel = async () => {
  try {
    await connectDB();

    // Find the reel with the missing video file
    const reel = await Reel.findOne({ 'video.url': '/uploads/1761063888846-986689634.mp4' });

    if (!reel) {
      console.log('Reel not found');
      return;
    }

    console.log('Found reel:', reel._id);

    // Mark as deleted instead of hard delete
    reel.isDeleted = true;
    reel.deletedAt = new Date();
    await reel.save();

    console.log('Reel marked as deleted');

  } catch (error) {
    console.error('Error removing reel:', error);
  } finally {
    mongoose.connection.close();
  }
};

removeReel();
