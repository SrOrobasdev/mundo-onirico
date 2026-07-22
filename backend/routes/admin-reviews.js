const express = require('express');
const Review = require('../models/Review');
const AuditLog = require('../models/AuditLog');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { validateObjectId } = require('../middleware/validateObjectId');

const router = express.Router();

router.use(authenticate, requireAdmin);
router.use('/:id', validateObjectId);

router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const total = await Review.countDocuments({});
  const reviews = await Review.find({})
    .populate('user', 'name email')
    .populate('dream', 'title')
    .sort({ createdAt: -1 }).skip(skip).limit(limit);

  const pending = await Review.countDocuments({ status: 'Pendiente' });
  const approved = await Review.countDocuments({ status: 'Aprobada' });

  res.json({ reviews, stats: { pending, approved }, total, page, pages: Math.ceil(total / limit), hasMore: page * limit < total });
}));

router.post('/:id/approve', asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new AppError('Reseña no encontrada', 404);
  }

  review.status = 'Aprobada';
  review.moderatedBy = req.user._id;
  review.moderatedAt = new Date();
  await review.save();

  await AuditLog.create({
    action: 'approve_review',
    userId: req.user._id,
    targetId: review._id,
    targetModel: 'Review',
    details: `Aprobó reseña de ${review.userName || 'desconocido'} (${review.rating}★)`,
    ip: req.ip
  });

  res.json({ message: 'Reseña aprobada y publicada', review });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) {
    throw new AppError('Reseña no encontrada', 404);
  }

  await AuditLog.create({
    action: 'reject_review',
    userId: req.user._id,
    targetId: review._id,
    targetModel: 'Review',
    details: `Eliminó reseña de ${review.userName || 'desconocido'} (${review.rating}★)`,
    ip: req.ip
  });

  res.json({ message: 'Reseña eliminada' });
}));

module.exports = router;
