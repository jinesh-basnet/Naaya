const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  content: {
    type: String,
    required: function() { return this.messageType === 'text'; },
    maxlength: 1000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'location', 'contact', 'shared_post', 'shared_reel', 'story_reply'],
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
  sharedContent: {
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'sharedContent.contentType'
    },
    contentType: {
      type: String,
      enum: ['Post', 'Reel']
    },
    content: String,
    media: [{
      type: String,
      url: String,
      thumbnail: String
    }],
    author: {
      _id: mongoose.Schema.Types.ObjectId,
      username: String,
      fullName: String
    }
  },
  storyReply: {
    storyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Story'
    },
    storyContent: String,
    storyAuthor: {
      _id: mongoose.Schema.Types.ObjectId,
      username: String,
      fullName: String
    }
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    reactedAt: Date
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  forwarded: {
    type: Boolean,
    default: false
  },
  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  forwardedAt: Date,
  seenBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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

}, {
  timestamps: true
});

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, isRead: 1 });
messageSchema.index({ createdAt: -1 });

messageSchema.methods.markAsRead = function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return true;
  }
  return false;
};

messageSchema.methods.markAsDelivered = function() {
  if (!this.isDelivered) {
    this.isDelivered = true;
    this.deliveredAt = new Date();
    return true;
  }
  return false;
};

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

messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(
    reaction => reaction.user.toString() !== userId.toString()
  );
  return true;
};

messageSchema.methods.editMessage = function(newContent) {
  if (this.messageType !== 'text') {
    throw new Error('Only text messages can be edited');
  }
  
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return true;
};

messageSchema.methods.deleteMessage = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = 'This message was deleted';
  return true;
};

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
