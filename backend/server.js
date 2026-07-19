require('dotenv').config();
const Sentry = require('@sentry/node');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/User');

if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

const authRoutes = require('./routes/auth');
const dreamRoutes = require('./routes/dreams');
const adminRoutes = require('./routes/admin');
const symbolRoutes = require('./routes/symbols');
const reviewRoutes = require('./routes/reviews');
const adminReviewRoutes = require('./routes/admin-reviews');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

const path = require('path');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.tailwindcss.com", "https://browser.sentry-cdn.com", "'unsafe-inline'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://mundo-onirico.onrender.com',
  credentials: true
}));
app.use(express.json({ limit: '30kb' }));

const frontendPath = path.join(__dirname, '..', 'frontend');

if (process.env.SENTRY_DSN) {
  const fs = require('fs');
  let cachedHtml = null;
  app.use((req, res, next) => {
    if (req.path === '/' || req.path === '/index.html') {
      if (!cachedHtml) {
        cachedHtml = fs.readFileSync(path.join(frontendPath, 'index.html'), 'utf8')
          .replace('</head>', `<script src="https://browser.sentry-cdn.com/7.120.3/bundle.min.js" crossorigin="anonymous"></script>\n<script>Sentry.init({ dsn: '${process.env.SENTRY_DSN}' });</script>\n</head>`);
      }
      res.type('html').send(cachedHtml);
    } else {
      next();
    }
  });
}

app.use(express.static(frontendPath));

if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
}

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Demasiadas peticiones, intenta de nuevo en un minuto' }
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de inicio de sesión, espera un minuto' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de verificación, espera un minuto' }
});
app.use('/api/auth/verify', verifyLimiter);

const resendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: 'Demasiados reenvíos, espera un minuto' }
});
app.use('/api/auth/resend-code', resendLimiter);

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
          user.googleId = profile.id;
          user.avatar = profile.photos[0]?.value || user.avatar;
          await user.save();
        } else {
          user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            avatar: profile.photos[0]?.value || ''
          });
          await user.save();
        }
      }
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
} else {
  console.log('⚠️ Google OAuth no configurado - omitido');
}

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Demasiadas peticiones administrativas, espera un minuto' }
});
app.use('/api/admin', adminLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/dreams', dreamRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/symbols', symbolRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin/reviews', adminReviewRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return;
  res.sendFile(path.join(frontendPath, 'index.html'));
});

if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB conectado');

    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (!adminExists) {
      const admin = new User({
        name: 'Administrador',
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        role: 'admin'
      });
      await admin.save();
      console.log('✅ Admin creado:', process.env.ADMIN_EMAIL);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err.message);
    process.exit(1);
  });
