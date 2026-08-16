'use strict';

/**
 * StudyGen AI — Authentication Middleware
 *
 * The `protect` middleware guards every route that requires authentication.
 * It must be used as the first middleware on any protected route:
 *
 *   router.get('/me', protect, authController.getMe);
 *
 * How it works:
 *   1. Reads the sg_jwt cookie (HttpOnly — JS cannot forge this)
 *   2. Verifies the JWT signature and expiry
 *   3. Loads the user document from MongoDB (ensures user still exists)
 *   4. Attaches the safe user object to req.user
 *   5. Calls next() — or throws AppError on any failure
 *
 * Security guarantee:
 *   req.user.id is ALWAYS set from the verified JWT payload, never from
 *   any value sent by the frontend in the request body or query string.
 *   All downstream controllers must use req.user.id for ownership checks.
 */

const User = require('../models/User');
const { COOKIE_NAME, verifyToken } = require('../utils/tokenUtils');
const AppError = require('../utils/AppError');

/**
 * Express middleware that authenticates the incoming request.
 * Sets req.user on success. Throws AppError on failure.
 *
 * @param {import('express').Request}    req
 * @param {import('express').Response}   res
 * @param {import('express').NextFunction} next
 */
async function protect(req, res, next) {
  try {
    // ── Step 1: Extract token from HttpOnly cookie ──────────────────────────
    let token = req.cookies[COOKIE_NAME];

    if (!token && process.env.NODE_ENV !== 'production') {
      // Dev mode: attach a synthetic guest user — no DB lookup required.
      // This ensures all AI endpoints work locally without needing a login session.
      req.user = {
        id: 'dev_guest_user_000',
        name: 'Dev Guest',
        email: 'guest@studygen.local',
        authProvider: 'local',
        avatar: null,
        isPremium: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return next();
    }

    if (!token) {
      return next(
        new AppError('Not authenticated. Please log in.', 401, 'UNAUTHORIZED')
      );
    }

    // ── Step 2: Verify JWT (throws AppError on invalid/expired) ─────────────
    const decoded = verifyToken(token);

    // ── Step 3: Load user from DB ────────────────────────────────────────────
    // passwordHash is excluded (select:false). If the user was deleted after
    // the JWT was issued, this returns null and we reject the request.
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(
        new AppError('The account associated with this session no longer exists.', 401, 'USER_NOT_FOUND')
      );
    }

    // ── Step 4: Attach safe user to request ─────────────────────────────────
    // req.user is always built from the DB document, never from request body.
    // passwordHash is never in `user` here (select:false in schema).
    req.user = {
      id: user._id.toString(),   // String form for consistent usage in controllers
      name: user.name,
      email: user.email,
      authProvider: user.authProvider,
      avatar: user.avatar,
      isPremium: user.isPremium,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    next();
  } catch (err) {
    // AppErrors from verifyToken are passed through directly.
    // Unexpected errors (e.g. DB failure) become generic 500s.
    next(err);
  }
}

module.exports = { protect };
