const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  dream: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dream',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['user', 'admin'],
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['text', 'audio', 'file'],
    default: 'text'
  },
  fileName: {
    type: String,
    default: null
  },
  fileUrl: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

messageSchema.index({ dream: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);