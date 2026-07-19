const express = require('express');
const { body, validationResult } = require('express-validator');
const Symbol = require('../models/Symbol');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { validateObjectId } = require('../middleware/validateObjectId');

const router = express.Router();

router.use('/:id', validateObjectId);

router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { category } = req.query;
  const filter = {};
  if (category) filter.category = category;

  const symbols = await Symbol.find(filter).sort({ name: 1 });
  res.json({ symbols });
}));

router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const symbol = await Symbol.findById(req.params.id);
  if (!symbol) {
    throw new AppError('Símbolo no encontrado', 404);
  }
  res.json({ symbol });
}));

router.post('/', authenticate, requireAdmin, [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('description').trim().notEmpty().withMessage('La descripción es requerida'),
  body('category').isIn(['elementos', 'animales', 'acciones']).withMessage('Categoría inválida')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { name, emoji, description, category } = req.body;
  const symbol = new Symbol({ name, emoji, description, category });
  await symbol.save();

  res.status(201).json({ message: 'Símbolo creado', symbol });
}));

router.put('/:id', authenticate, requireAdmin, [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('category').optional().isIn(['elementos', 'animales', 'acciones'])
], asyncHandler(async (req, res) => {
  const updates = {};
  if (req.body.name) updates.name = req.body.name;
  if (req.body.emoji !== undefined) updates.emoji = req.body.emoji;
  if (req.body.description) updates.description = req.body.description;
  if (req.body.category) updates.category = req.body.category;

  const symbol = await Symbol.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!symbol) {
    throw new AppError('Símbolo no encontrado', 404);
  }

  res.json({ message: 'Símbolo actualizado', symbol });
}));

router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const symbol = await Symbol.findByIdAndDelete(req.params.id);
  if (!symbol) {
    throw new AppError('Símbolo no encontrado', 404);
  }
  res.json({ message: 'Símbolo eliminado' });
}));

module.exports = router;
