const express = require('express');
const { body, validationResult } = require('express-validator');
const Dream = require('../models/Dream');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const limitOneDreamPer3h = async (req, res, next) => {
  try {
    const last = await Dream.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (last) {
      const hoursElapsed = (Date.now() - new Date(last.createdAt).getTime()) / 3600000;
      if (hoursElapsed < 3) {
        const remaining = Math.ceil((3 - hoursElapsed) * 10) / 10;
        return res.status(429).json({ error: `Puedes enviar un sueño cada 3 horas. Vuelve en ${remaining.toFixed(1)}h.` });
      }
    }
    next();
  } catch { next(); }
};

const requireVerifiedForSecondDream = async (req, res, next) => {
  try {
    if (!req.user.emailVerified) {
      const dreamCount = await Dream.countDocuments({ user: req.user._id });
      if (dreamCount >= 1) {
        return res.status(403).json({ error: 'VERIFICATION_REQUIRED', message: 'Verifica tu cuenta para enviar más sueños.' });
      }
    }
    next();
  } catch { next(); }
};

router.post('/', authenticate, limitOneDreamPer3h, requireVerifiedForSecondDream, [
  body('title').trim().notEmpty().withMessage('El título es requerido'),
  body('text').trim().notEmpty().withMessage('La descripción del sueño es requerida')
    .isLength({ min: 10 }).withMessage('Describe tu sueño con al menos 10 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, text } = req.body;

    const dream = new Dream({
      user: req.user._id,
      title,
      text,
      status: 'Pendiente'
    });

    await dream.save();

    res.status(201).json({
      message: 'Sueño enviado al intérprete',
      dream
    });
  } catch (error) {
    console.error('Create dream error:', error);
    res.status(500).json({ error: 'Error al enviar el sueño' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const total = await Dream.countDocuments({ user: req.user._id });
    const dreams = await Dream.find({ user: req.user._id })
      .sort({ createdAt: -1 }).skip(skip).limit(limit);
    res.json({ dreams, total, page, pages: Math.ceil(total / limit), hasMore: page * limit < total });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener sueños' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const dream = await Dream.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!dream) {
      return res.status(404).json({ error: 'Sueño no encontrado' });
    }

    res.json({ dream });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el sueño' });
  }
});

module.exports = router;
