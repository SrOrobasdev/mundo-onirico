const express = require('express');
const Review = require('../models/Review');
const AuditLog = require('../models/AuditLog');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Reseña no encontrada' });
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
  } catch (error) {
    res.status(500).json({ error: 'Error al aprobar reseña' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Reseña no encontrada' });
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
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar reseña' });
  }
});

module.exports = router;
