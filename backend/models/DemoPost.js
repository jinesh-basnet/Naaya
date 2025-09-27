const mongoose = require('mongoose');

const demoPostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'DemoUser', required: true },
  imageUrl: { type: String },
  caption: { type: String },
  location: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DemoPost', demoPostSchema);
