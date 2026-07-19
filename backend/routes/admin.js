const express = require('express');
const { body, validationResult } = require('express-validator');
const Dream = require('../models/Dream');
const User = require('../models/User');
const Symbol = require('../models/Symbol');
const Review = require('../models/Review');
const AuditLog = require('../models/AuditLog');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendInterpretationNotification } = require('../services/email');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { validateObjectId } = require('../middleware/validateObjectId');

const router = express.Router();

router.use(authenticate, requireAdmin);
router.use('/dreams/:id', validateObjectId);

router.get('/dashboard', asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments({ role: 'user' });
  const totalDreams = await Dream.countDocuments();
  const pendingDreams = await Dream.countDocuments({ status: 'Pendiente' });
  const interpretedDreams = await Dream.countDocuments({ status: 'Interpretado' });
  const pendingReviews = await Review.countDocuments({ status: 'Pendiente' });

  res.json({
    stats: { totalUsers, totalDreams, pendingDreams, interpretedDreams, pendingReviews }
  });
}));

router.get('/users', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const total = await User.countDocuments({ role: 'user' });
  const users = await User.find({ role: 'user' }).sort({ createdAt: -1 }).skip(skip).limit(limit);
  const usersWithDreamCount = await Promise.all(
    users.map(async (user) => {
      const dreamCount = await Dream.countDocuments({ user: user._id });
      return { ...user.toJSON(), dreamCount };
    })
  );
  res.json({ users: usersWithDreamCount, total, page, pages: Math.ceil(total / limit), hasMore: page * limit < total });
}));

router.get('/dreams', asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const total = await Dream.countDocuments(filter);
  const dreams = await Dream.find(filter)
    .populate('user', 'name email')
    .sort({ createdAt: -1 }).skip(skip).limit(limit);
  res.json({ dreams, total, page, pages: Math.ceil(total / limit), hasMore: page * limit < total });
}));

router.get('/dreams/:id', asyncHandler(async (req, res) => {
  const dream = await Dream.findById(req.params.id)
    .populate('user', 'name email avatar');
  if (!dream) {
    throw new AppError('Sueño no encontrado', 404);
  }
  res.json({ dream });
}));

router.post('/dreams/:id/interpret', [
  body('interpretation').trim().notEmpty().withMessage('La interpretación es requerida')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { interpretation } = req.body;
  const dream = await Dream.findById(req.params.id).populate('user');

  if (!dream) {
    throw new AppError('Sueño no encontrado', 404);
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
}));

router.get('/audit', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const skip = (page - 1) * limit;
  const filter = {};
  if (req.query.action) filter.action = req.query.action;

  const total = await AuditLog.countDocuments(filter);
  const logs = await AuditLog.find(filter)
    .populate('userId', 'name email')
    .sort({ createdAt: -1 }).skip(skip).limit(limit);

  res.json({ logs, total, page, pages: Math.ceil(total / limit), hasMore: page * limit < total });
}));

module.exports = router;
