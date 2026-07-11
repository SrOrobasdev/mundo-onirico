const mongoose = require('mongoose');

const dreamSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  text: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pendiente', 'Interpretado'],
    default: 'Pendiente'
  },
  interpretation: {
    type: String,
    default: null
  },
  interpretedAt: {
    type: Date,
    default: null
  },
  interpretedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

dreamSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Dream', dreamSchema);
