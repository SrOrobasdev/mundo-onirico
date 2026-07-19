const express = require('express');
const { body, validationResult } = require('express-validator');
const Dream = require('../models/Dream');
const User = require('../models/User');
const Symbol = require('../models/Symbol');
const Review = require('../models/Review');
const AuditLog = require('../models/AuditLog');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendInterpretationNotification } = require('../services/email');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalDreams = await Dream.countDocuments();
    const pendingDreams = await Dream.countDocuments({ status: 'Pendiente' });
    const interpretedDreams = await Dream.countDocuments({ status: 'Interpretado' });
    const pendingReviews = await Review.countDocuments({ status: 'Pendiente' });

    res.json({
      stats: { totalUsers, totalDreams, pendingDreams, interpretedDreams, pendingReviews }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).sort({ createdAt: -1 });
    const usersWithDreamCount = await Promise.all(
      users.map(async (user) => {
        const dreamCount = await Dream.countDocuments({ user: user._id });
        return { ...user.toJSON(), dreamCount };
      })
    );
    res.json({ users: usersWithDreamCount });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

router.get('/dreams', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const dreams = await Dream.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json({ dreams });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener sueños' });
  }
});

router.get('/dreams/:id', async (req, res) => {
  try {
    const dream = await Dream.findById(req.params.id)
      .populate('user', 'name email avatar');
    if (!dream) {
      return res.status(404).json({ error: 'Sueño no encontrado' });
    }
    res.json({ dream });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el sueño' });
  }
});

router.post('/dreams/:id/interpret', [
  body('interpretation').trim().notEmpty().withMessage('La interpretación es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { interpretation } = req.body;
    const dream = await Dream.findById(req.params.id).populate('user');

    if (!dream) {
      return res.status(404).json({ error: 'Sueño no encontrado' });
    }

    dream.interpretation = interpretation;
    dream.status = 'Interpretado';
    dream.interpretedAt = new Date();
    dream.interpretedBy = req.user._id;
    await dream.save();

    await AuditLog.create({
      action: 'interpret',
      userId: req.user._id,
      targetId: dream._id,
      targetModel: 'Dream',
      details: `Interpretó el sueño "${dream.title}" de ${dream.user?.name || 'desconocido'}`,
      ip: req.ip
    });

    sendInterpretationNotification(dream.user, dream);

    res.json({
      message: 'Interpretación enviada',
      dream
    });
  } catch (error) {
    console.error('Interpret error:', error);
    res.status(500).json({ error: 'Error al enviar interpretación' });
  }
});

router.get('/audit', async (req, res) => {
  try {
    const { limit = 50, action } = req.query;
    const filter = {};
    if (action) filter.action = action;

    const logs = await AuditLog.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener auditoría' });
  }
});

module.exports = router;
