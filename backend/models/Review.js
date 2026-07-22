const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dream: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dream',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  text: {
    type: String,
    required: true,
    maxlength: 15000
  },
  status: {
    type: String,
    enum: ['Pendiente', 'Aprobada'],
    default: 'Pendiente'
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  moderatedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

reviewSchema.index({ user: 1, dream: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
