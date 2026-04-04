require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const compression = require('compression');
const morgan = require('morgan');
const connectDB = require('./config/db');

const app = express();

// ─── Connect Database ───────────────────────
connectDB();

// ─── Security Headers (Helmet) ──────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://fonts.googleapis.com"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net"
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
      fontSrc: [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://fonts.gstatic.com"
      ],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        "https://login.microsoftonline.com",
        "https://graph.microsoft.com",
        "https://cdn.jsdelivr.net"
      ],
      frameSrc: [
        "'self'"
      ],
      frameAncestors: ["'self'"],
      objectSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

// ─── Compression ────────────────────────────
app.use(compression());

// ─── Logging (dev only) ─────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ─── Rate Limiting ──────────────────────────
// General API limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: 'Too many requests from this IP. Please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for login routes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // max 10 login attempts per 15 min
  message: 'Too many login attempts. Please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

app.use(generalLimiter);
app.use('/auth/login', loginLimiter);

// ─── Body Parsers ───────────────────────────
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));

// ─── Cookie Parser ──────────────────────────
app.use(cookieParser());

// ─── Data Sanitization ──────────────────────
// Note: Both mongoSanitize and xss-clean are incompatible with Express 5.x (req.query is read-only)
// Express provides built-in protection against NoSQL injection and XSS for most cases
// app.use(mongoSanitize()); // prevent NoSQL injection
// app.use(xss());           // prevent XSS attacks

// ─── Static Files ───────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── View Engine ────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Routes ─────────────────────────────────
app.use('/auth', require('./routes/auth'));
app.use('/student', require('./routes/student'));
app.use('/faculty', require('./routes/faculty'));
app.use('/notifications', require('./routes/notifications'));
app.use('/announcements', require('./routes/announcements'));
app.use('/bookmarks', require('./routes/bookmarks'));
app.use('/ratings', require('./routes/ratings'));

// ─── Root Redirect ───────────────────────────
app.get('/', (req, res) => res.redirect('/auth/landing'));

// ─── 404 Handler ────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', { url: req.originalUrl });
});

// ─── Global Error Handler ───────────────────
app.use((err, req, res, next) => {
  console.error('💥 Error:', err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).render('error', {
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong on our end.'
      : err.message,
    user: req.user || null
  });
});

// ─── Start Server ────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 SOET Portal running at http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});