const express = require('express');
const { body, validationResult } = require('express-validator');
const Symbol = require('../models/Symbol');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};
    if (category) filter.category = category;

    const symbols = await Symbol.find(filter).sort({ name: 1 });
    res.json({ symbols });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener símbolos' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const symbol = await Symbol.findById(req.params.id);
    if (!symbol) {
      return res.status(404).json({ error: 'Símbolo no encontrado' });
    }
    res.json({ symbol });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el símbolo' });
  }
});

router.post('/', authenticate, requireAdmin, [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('description').trim().notEmpty().withMessage('La descripción es requerida'),
  body('category').isIn(['elementos', 'animales', 'acciones']).withMessage('Categoría inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, emoji, description, category } = req.body;
    const symbol = new Symbol({ name, emoji, description, category });
    await symbol.save();

    res.status(201).json({ message: 'Símbolo creado', symbol });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear símbolo' });
  }
});

router.put('/:id', authenticate, requireAdmin, [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('category').optional().isIn(['elementos', 'animales', 'acciones'])
], async (req, res) => {
  try {
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.emoji !== undefined) updates.emoji = req.body.emoji;
    if (req.body.description) updates.description = req.body.description;
    if (req.body.category) updates.category = req.body.category;

    const symbol = await Symbol.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!symbol) {
      return res.status(404).json({ error: 'Símbolo no encontrado' });
    }

    res.json({ message: 'Símbolo actualizado', symbol });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar símbolo' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const symbol = await Symbol.findByIdAndDelete(req.params.id);
    if (!symbol) {
      return res.status(404).json({ error: 'Símbolo no encontrado' });
    }
    res.json({ message: 'Símbolo eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar símbolo' });
  }
});

module.exports = router;
