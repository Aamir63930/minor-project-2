require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const hpp = require('hpp');
const connectDB = require('./config/db');

const app = express();

// ─── Trust Proxy (Important for deployment) ───
app.set('trust proxy', 1);

// ─── Connect Database ───────────────────────
connectDB().catch(err => {
  console.error('❌ DB Connection Failed:', err);
  process.exit(1);
});

// ─── Hide Express Signature ────────────────
app.disable('x-powered-by');

// ─── Security Headers ──────────────────────
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
      frameSrc: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      workerSrc: ["'self'", "blob:"],
    }
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: "no-referrer" }
}));

// ─── Compression ───────────────────────────
app.use(compression());

// ─── Logging ───────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ─── Prevent Parameter Pollution ───────────
app.use(hpp());

// ─── Rate Limiting ─────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests. Try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Try again later.',
  skipSuccessfulRequests: true,
});

// Apply limiter only to API routes (better performance)
app.use('/auth', generalLimiter);
app.use('/student', generalLimiter);
app.use('/faculty', generalLimiter);
app.use('/auth/login', loginLimiter);

// ─── Body Parsers ──────────────────────────
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));

// ─── Cookies ───────────────────────────────
app.use(cookieParser());

// ─── Static Files ──────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── View Engine ───────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Health Check Route (for deployment) ───
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// ─── Routes ────────────────────────────────
app.use('/auth', require('./routes/auth'));
app.use('/student', require('./routes/student'));
app.use('/faculty', require('./routes/faculty'));
app.use('/notifications', require('./routes/notifications'));
app.use('/announcements', require('./routes/announcements'));
app.use('/bookmarks', require('./routes/bookmarks'));
app.use('/ratings', require('./routes/ratings'));
app.use('/forum', require('./routes/forum'));
app.use('/bulk', require('./routes/bulk'));

// ─── Root Redirect ─────────────────────────
app.get('/', (req, res) => res.redirect('/auth/landing'));

// ─── 404 Handler ───────────────────────────
app.use((req, res) => {
  res.status(404).render('404', { url: req.originalUrl });
});

// ─── Global Error Handler ──────────────────
app.use((err, req, res, next) => {
  console.error('💥 Error:', err.stack);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).render('error', {
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong.'
      : err.message,
    user: req.user || null
  });
});

// ─── Graceful Shutdown ─────────────────────
process.on('SIGINT', () => {
  console.log('\n🛑 Server shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Closing server...');
  process.exit(0);
});

// ─── Start Server ──────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 SOET Portal running at http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});