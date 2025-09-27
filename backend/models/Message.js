const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'location', 'contact'],
    default: 'text'
  },
  media: {
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'file']
    },
    url: String,
    thumbnail: String,
    filename: String,
    size: Number,
    duration: Number,
    width: Number,
    height: Number
  },
  location: {
    name: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    address: String
  },
  contact: {
    name: String,
    phone: String,
    email: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  isDelivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: Date,
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    reactedAt: {
      type: Date,
      default: Date.now
    }
  }],
  forwarded: {
    type: Boolean,
    default: false
  },
  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  forwardedAt: Date
}, {
  timestamps: true
});

// Indexes for better performance
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, isRead: 1 });
messageSchema.index({ createdAt: -1 });

// Method to mark as read
messageSchema.methods.markAsRead = function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return true;
  }
  return false;
};

// Method to mark as delivered
messageSchema.methods.markAsDelivered = function() {
  if (!this.isDelivered) {
    this.isDelivered = true;
    this.deliveredAt = new Date();
    return true;
  }
  return false;
};

// Method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  const existingReaction = this.reactions.find(
    reaction => reaction.user.toString() === userId.toString()
  );
  
  if (existingReaction) {
    existingReaction.emoji = emoji;
    existingReaction.reactedAt = new Date();
  } else {
    this.reactions.push({ user: userId, emoji });
  }
  
  return true;
};

// Method to remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(
    reaction => reaction.user.toString() !== userId.toString()
  );
  return true;
};

// Method to edit message
messageSchema.methods.editMessage = function(newContent) {
  if (this.messageType !== 'text') {
    throw new Error('Only text messages can be edited');
  }
  
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return true;
};

// Method to delete message
messageSchema.methods.deleteMessage = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = 'This message was deleted';
  return true;
};

// Method to forward message
messageSchema.methods.forwardMessage = function(newReceiverId, newSenderId) {
  const forwardedMessage = new this.constructor({
    sender: newSenderId,
    receiver: newReceiverId,
    content: this.content,
    messageType: this.messageType,
    media: this.media,
    location: this.location,
    contact: this.contact,
    forwarded: true,
    forwardedFrom: this.sender,
    forwardedAt: new Date()
  });
  
  return forwardedMessage;
};

module.exports = mongoose.model('Message', messageSchema);
