const express = require('express');
const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Dream = require('../models/Dream');
const { authenticate } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/public', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const total = await Review.countDocuments({ status: 'Aprobada' });
  const reviews = await Review.find({ status: 'Aprobada' })
    .populate('user', 'name')
    .sort({ createdAt: -1 }).skip(skip).limit(limit);
  res.json({ reviews, total, page, pages: Math.ceil(total / limit), hasMore: page * limit < total });
}));

router.post('/:dreamId', authenticate, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Calificación debe ser entre 1 y 5'),
  body('text').trim().notEmpty().withMessage('El texto de la reseña es requerido')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const dream = await Dream.findOne({
    _id: req.params.dreamId,
    user: req.user._id,
    status: 'Interpretado'
  });

  if (!dream) {
    throw new AppError('Sueño no encontrado o no interpretado', 404);
  }

  const existing = await Review.findOne({ user: req.user._id, dream: dream._id });
  if (existing) {
    throw new AppError('Ya has calificado este sueño', 400);
  }

  const review = new Review({
    user: req.user._id,
    dream: dream._id,
    rating: req.body.rating,
    text: req.body.text
  });

  await review.save();

  res.status(201).json({ message: 'Reseña enviada para moderación', review });
}));

router.get('/my', authenticate, asyncHandler(async (req, res) => {
  const reviews = await Review.find({ user: req.user._id })
    .populate('dream', 'title')
    .sort({ createdAt: -1 });
  res.json({ reviews });
}));

module.exports = router;
