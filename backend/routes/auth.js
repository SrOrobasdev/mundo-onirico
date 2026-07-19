const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const passport = require('passport');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { sendWelcomeEmail, sendVerificationCode } = require('../services/email');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { validateObjectId } = require('../middleware/validateObjectId');

const router = express.Router();

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, emailVerified: user.emailVerified || false },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

router.post('/register', [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(200).json({
      message: 'Si el correo no está registrado, recibirás instrucciones.'
    });
  }

  const user = new User({ name, email, password });
  await user.save();

  const code = user.generateVerificationCode();
  await user.save();
  sendVerificationCode(user, code);
  sendWelcomeEmail(user);

  const token = generateToken(user);

  res.status(201).json({
    message: 'Cuenta creada con éxito. Revisa tu email para verificar.',
    token,
    user: user.toJSON()
  });
}));

router.post('/login', [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es requerida')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('Credenciales inválidas', 401);
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    const remaining = Math.ceil((user.lockUntil - new Date()) / 60000);
    throw new AppError(`Demasiados intentos. Cuenta bloqueada ${remaining} min.`, 429);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= 10) {
      user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      user.failedLoginAttempts = 0;
      await user.save();
      throw new AppError('Demasiados intentos. Cuenta bloqueada 30 min.', 429);
    }
    await user.save();
    throw new AppError('Credenciales inválidas', 401);
  }

  if (!user.isActive) {
    throw new AppError('Cuenta desactivada', 403);
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  const token = generateToken(user);

  res.json({
    message: 'Inicio de sesión exitoso',
    token,
    user: user.toJSON()
  });
}));

router.post('/verify', authenticate, [
  body('code').trim().notEmpty().withMessage('Código requerido')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  if (req.user.emailVerified) {
    return res.json({ message: 'Cuenta ya verificada.', user: req.user.toJSON() });
  }

  if (!req.user.verificationCode || !req.user.verificationCodeExpiresAt || req.user.verificationCodeExpiresAt < new Date()) {
    throw new AppError('Código expirado. Solicita un nuevo código.', 400);
  }

  if (!req.user.compareVerificationCode(req.body.code)) {
    throw new AppError('Código incorrecto.', 400);
  }

  req.user.emailVerified = true;
  req.user.verificationCode = null;
  await req.user.save();

  res.json({ message: 'Cuenta verificada con éxito.', user: req.user.toJSON() });
}));

router.post('/resend-code', authenticate, asyncHandler(async (req, res) => {
  if (req.user.emailVerified) {
    return res.json({ message: 'Cuenta ya verificada.' });
  }

  const code = req.user.generateVerificationCode();
  await req.user.save();
  sendVerificationCode(req.user, code);

  res.json({ message: 'Código reenviado a tu email.' });
}));

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/?error=google-auth-failed` }),
  (req, res) => {
    const token = generateToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/#token=${token}`);
  }
);

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({ user: req.user.toJSON() });
}));

router.put('/profile', authenticate, [
  body('name').optional().trim().notEmpty()
], asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (name) req.user.name = name;
  await req.user.save();
  res.json({ user: req.user.toJSON() });
}));

module.exports = router;
