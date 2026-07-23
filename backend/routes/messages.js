const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Message = require('../models/Message');
const Dream = require('../models/Dream');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/:dreamId', authenticate, asyncHandler(async (req, res) => {
  const dream = await Dream.findById(req.params.dreamId);
  if (!dream) throw new AppError('Sueño no encontrado', 404);
  if (req.user.role !== 'admin' && dream.user.toString() !== req.user._id.toString()) {
    throw new AppError('No autorizado', 403);
  }
  const messages = await Message.find({ dream: req.params.dreamId }).sort({ createdAt: 1 });
  res.json({ messages });
}));

router.post('/:dreamId', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
  const dream = await Dream.findById(req.params.dreamId);
  if (!dream) throw new AppError('Sueño no encontrado', 404);

  const isAdmin = req.user.role === 'admin';
  const isOwner = dream.user.toString() === req.user._id.toString();

  if (!isAdmin && !isOwner) throw new AppError('No autorizado', 403);

  if (isAdmin && dream.status === 'Pendiente') {
    dream.interpretation = req.body.content || '';
    dream.status = 'Interpretado';
    dream.interpretedAt = new Date();
    dream.interpretedBy = req.user._id;
    await dream.save();
  }

  const msgData = {
    dream: req.params.dreamId,
    sender: req.user._id,
    senderRole: isAdmin ? 'admin' : 'user',
    content: req.body.content || '',
    type: 'text'
  };

  if (req.file) {
    const ext = path.extname(req.file.originalname).toLowerCase();
    msgData.type = ['.mp3', '.wav', '.ogg', '.webm', '.m4a'].includes(ext) ? 'audio' : 'file';
    msgData.fileName = req.file.originalname;
    msgData.fileUrl = '/uploads/' + req.file.filename;
  }

  const message = await Message.create(msgData);

  res.status(201).json({ message });
}));

router.get('/uploads/:filename', (req, res) => {
  res.sendFile(path.join(uploadDir, req.params.filename));
});

module.exports = router;