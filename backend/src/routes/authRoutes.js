'use strict';

/**
 * StudyGen AI — Authentication Routes
 *
 * All routes are prefixed with /api/auth (mounted in app.js).
 *
 * Public routes (no authentication required):
 *   POST /api/auth/register   — Create local account
 *   POST /api/auth/login      — Email/password login
 *   POST /api/auth/logout     — Clear session cookie
 *   POST /api/auth/google     — Google Sign-In / Sign-Up
 *
 * Protected routes (valid sg_jwt cookie required):
 *   GET  /api/auth/me         — Get current user profile
 *
 * Rate limiting:
 *   A strict auth-specific rate limiter (20 req / 15 min per IP) is applied
 *   to all routes in this router, over the global 100 req / 15 min limiter.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');

const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// ── Auth-specific rate limiter ────────────────────────────────────────────────
// Stricter than the global limiter to throttle brute-force login/register attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                    // 20 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
  },
});

router.use(authLimiter);

// ── Public Routes ─────────────────────────────────────────────────────────────

/** POST /api/auth/register */
router.post('/register', authController.register);

/** POST /api/auth/login */
router.post('/login', authController.login);

/** POST /api/auth/logout */
router.post('/logout', authController.logout);

/** POST /api/auth/google */
router.post('/google', authController.googleSignIn);

// ── Protected Routes ──────────────────────────────────────────────────────────

/** GET /api/auth/me — requires valid session */
router.get('/me', protect, authController.getMe);

/** PUT /api/auth/me & PUT /api/auth/profile — update profile details */
router.put('/me', protect, authController.updateProfile);
router.put('/profile', protect, authController.updateProfile);

/** PUT /api/auth/password — change user password */
router.put('/password', protect, authController.changePassword);

module.exports = router;
