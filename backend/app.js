'use strict';

/**
 * StudyGen AI — Express Application
 *
 * Wires together all middleware, routes, and error handlers.
 * Kept separate from server.js so the app can be imported for testing
 * without actually starting a TCP listener.
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const config = require('./src/config/env');

// ── Route imports ─────────────────────────────────────────────────────────────
const healthRoutes    = require('./src/routes/healthRoutes');
const authRoutes      = require('./src/routes/authRoutes');
const noteRoutes      = require('./src/routes/noteRoutes');
const quizRoutes      = require('./src/routes/quizRoutes');
const flashcardRoutes = require('./src/routes/flashcardRoutes');
const chatRoutes      = require('./src/routes/chatRoutes');
const historyRoutes   = require('./src/routes/historyRoutes');
const aiRoutes        = require('./src/routes/aiRoutes');

// ── Middleware imports ────────────────────────────────────────────────────────
const { errorMiddleware, notFoundMiddleware } = require('./src/middleware/errorMiddleware');
const sanitizeInputMiddleware = require('./src/middleware/sanitizeMiddleware');

const app = express();

// Trust reverse proxy headers (Nginx/Cloudflare/AWS ALB) for HTTPS cookie security
app.set('trust proxy', 1);

// ── 1. CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = new Set([
  config.clientOrigin,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
]);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.has(origin) || config.nodeEnv === 'test') {
        callback(null, true);
      } else if (config.isProduction) {
        callback(new Error('CORS request rejected from untrusted origin.'));
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── 2. Body Parsers & Sanitizer ───────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));          // JSON body (1 MB cap for JSON payloads)
app.use(express.urlencoded({ extended: true }));   // URL-encoded form data
app.use(cookieParser());                           // Parse HttpOnly cookies
app.use(sanitizeInputMiddleware);                  // Prevent NoSQL operator injection

// ── 3. Global Rate Limiter ────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again after 15 minutes.',
    },
  },
});
app.use(globalLimiter);

// ── 4. Production Security Headers ────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://accounts.google.com;"
  );
  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ── 5. Routes ─────────────────────────────────────────────────────────────────
app.use('/api/health',     healthRoutes);
app.use('/api/auth',       authRoutes);
app.use('/api/notes',      noteRoutes);
app.use('/api/quizzes',    quizRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/chats',      chatRoutes);
app.use('/api/history',    historyRoutes);
app.use('/api/ai',         aiRoutes);

// ── 6. 404 Handler — must be after all routes ─────────────────────────────────
app.use(notFoundMiddleware);

// ── 7. Global Error Handler — must be last ────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
