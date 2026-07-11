const mongoose = require('mongoose');

const symbolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  emoji: {
    type: String,
    default: '🔮'
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['elementos', 'animales', 'acciones'],
    default: 'elementos'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Symbol', symbolSchema);
