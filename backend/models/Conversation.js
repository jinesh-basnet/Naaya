const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['direct', 'group'],
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  name: {
    type: String,
    required: function() { return this.type === 'group'; },
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  avatar: {
    type: String, 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastMessageAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    allowInvites: {
      type: Boolean,
      default: true
    },
    isPublic: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});


conversationSchema.index({ participants: 1 });
conversationSchema.index({ 'participants.user': 1 });
conversationSchema.index({ type: 1, lastMessageAt: -1 });
conversationSchema.index({ createdBy: 1 });

conversationSchema.virtual('unreadCount').get(function() {
  return 0;
});

conversationSchema.methods.addParticipant = function(userId, role = 'member') {
  if (this.participants.some(p => p.user.toString() === userId.toString())) {
    throw new Error('User is already a participant');
  }
  this.participants.push({
    user: userId,
    role,
    joinedAt: new Date(),
    isActive: true
  });
  return this.save();
};

conversationSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.user.toString() !== userId.toString());
  return this.save();
};

conversationSchema.methods.updateLastMessage = function(messageId, timestamp) {
  this.lastMessage = messageId;
  this.lastMessageAt = timestamp;
  return this.save();
};

conversationSchema.statics.findDirectConversation = function(userId1, userId2) {
  // Do NOT filter by isActive here — we need to find the conversation
  // even when a participant previously left, so we can re-activate them.
  return this.findOne({
    type: 'direct',
    participants: {
      $all: [
        { $elemMatch: { user: userId1 } },
        { $elemMatch: { user: userId2 } }
      ],
      $size: 2
    }
  });
};

conversationSchema.statics.createDirectConversation = async function(userId1, userId2) {
  const existing = await this.findDirectConversation(userId1, userId2);

  if (existing) {
    // Re-activate any participant who previously "left" the direct conversation.
    // This heals the isActive:false state so both users can message again.
    let dirty = false;
    existing.participants = existing.participants.map(p => {
      if (!p.isActive) {
        dirty = true;
        return { ...p.toObject(), isActive: true };
      }
      return p;
    });
    if (!existing.isActive) {
      existing.isActive = true;
      dirty = true;
    }
    if (dirty) await existing.save();
    return existing;
  }

  const conversation = new this({
    type: 'direct',
    participants: [
      { user: userId1, role: 'member' },
      { user: userId2, role: 'member' }
    ],
    createdBy: userId1
  });

  return conversation.save();
};

module.exports = mongoose.model('Conversation', conversationSchema);
