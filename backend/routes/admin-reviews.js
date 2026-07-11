const express = require('express');
const Review = require('../models/Review');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const reviews = await Review.find(filter)
      .populate('user', 'name email')
      .populate('dream', 'title')
      .sort({ createdAt: -1 });

    const pending = await Review.countDocuments({ status: 'Pendiente' });
    const approved = await Review.countDocuments({ status: 'Aprobada' });

    res.json({ reviews, stats: { pending, approved } });
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
    res.json({ message: 'Reseña eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar reseña' });
  }
});

module.exports = router;
