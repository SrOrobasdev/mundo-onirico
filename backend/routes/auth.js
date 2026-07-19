const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const passport = require('passport');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { sendWelcomeEmail, sendVerificationCode } = require('../services/email');

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
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Este correo ya está registrado' });
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
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

router.post('/login', [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const remaining = Math.ceil((user.lockUntil - new Date()) / 60000);
      return res.status(429).json({ error: `Demasiados intentos. Cuenta bloqueada ${remaining} min.` });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 10) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        user.failedLoginAttempts = 0;
        await user.save();
        return res.status(429).json({ error: 'Demasiados intentos. Cuenta bloqueada 30 min.' });
      }
      await user.save();
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Cuenta desactivada' });
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.post('/verify', authenticate, [
  body('code').trim().notEmpty().withMessage('Código requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.emailVerified) {
      return res.json({ message: 'Cuenta ya verificada.', user: req.user.toJSON() });
    }

    if (!req.user.compareVerificationCode(req.body.code)) {
      return res.status(400).json({ error: 'Código incorrecto.' });
    }

    req.user.emailVerified = true;
    req.user.verificationCode = null;
    await req.user.save();

    res.json({ message: 'Cuenta verificada con éxito.', user: req.user.toJSON() });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Error al verificar cuenta' });
  }
});

router.post('/resend-code', authenticate, async (req, res) => {
  try {
    if (req.user.emailVerified) {
      return res.json({ message: 'Cuenta ya verificada.' });
    }

    const code = req.user.generateVerificationCode();
    await req.user.save();
    sendVerificationCode(req.user, code);

    res.json({ message: 'Código reenviado a tu email.' });
  } catch (error) {
    console.error('Resend error:', error);
    res.status(500).json({ error: 'Error al reenviar código' });
  }
});

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/?error=google-auth-failed` }),
  (req, res) => {
    const token = generateToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard.html#token=${token}`);
  }
);

router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user.toJSON() });
});

router.put('/profile', authenticate, [
  body('name').optional().trim().notEmpty()
], async (req, res) => {
  try {
    const { name } = req.body;
    if (name) req.user.name = name;
    await req.user.save();
    res.json({ user: req.user.toJSON() });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

module.exports = router;
