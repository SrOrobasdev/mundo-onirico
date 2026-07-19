const express = require('express');
const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Dream = require('../models/Dream');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/public', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const total = await Review.countDocuments({ status: 'Aprobada' });
    const reviews = await Review.find({ status: 'Aprobada' })
      .populate('user', 'name')
      .sort({ createdAt: -1 }).skip(skip).limit(limit);
    res.json({ reviews, total, page, pages: Math.ceil(total / limit), hasMore: page * limit < total });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

router.post('/:dreamId', authenticate, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Calificación debe ser entre 1 y 5'),
  body('text').trim().notEmpty().withMessage('El texto de la reseña es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const dream = await Dream.findOne({
      _id: req.params.dreamId,
      user: req.user._id,
      status: 'Interpretado'
    });

    if (!dream) {
      return res.status(404).json({ error: 'Sueño no encontrado o no interpretado' });
    }

    const existing = await Review.findOne({ user: req.user._id, dream: dream._id });
    if (existing) {
      return res.status(400).json({ error: 'Ya has calificado este sueño' });
    }

    const review = new Review({
      user: req.user._id,
      dream: dream._id,
      rating: req.body.rating,
      text: req.body.text
    });

    await review.save();

    res.status(201).json({ message: 'Reseña enviada para moderación', review });
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ error: 'Error al enviar reseña' });
  }
});

router.get('/my', authenticate, async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .populate('dream', 'title')
      .sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

module.exports = router;
