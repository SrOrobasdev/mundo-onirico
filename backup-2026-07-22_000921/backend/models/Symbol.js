const mongoose = require('mongoose');

const symbolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 15000
  },
  emoji: {
    type: String,
    default: '🔮'
  },
  description: {
    type: String,
    required: true,
    maxlength: 15000
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
