const mongoose = require('mongoose');
require('dotenv').config();
const Conversation = require('./models/Conversation');
require('./models/User');
const fs = require('fs');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const convs = await Conversation.find({ type: 'direct' }).populate('participants.user');
    let output = '';
    for (const c of convs) {
      const parts = c.participants;
      if (parts.length < 2) {
         output += `Conversation with < 2 participants: ${c._id}, parts length: ${parts.length}\n`;
      } else {
         for (const p of parts) {
            if (!p.user) {
               output += `Conversation with null user populated: ${c._id}, raw parts array: ${c.participants.map(p => p.toString())}\n`;
               break;
            } else if (!p.user.fullName && !p.user.username) {
               output += `User missing fullName & username: ${p.user._id}\n`;
            }
         }
      }
    }
    fs.writeFileSync('conv_report.txt', output);
    console.log('Done checking conversations.');
    process.exit(0);
  });
