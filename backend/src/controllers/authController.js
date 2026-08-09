'use strict';

/**
 * StudyGen AI — Authentication Controller
 *
 * Endpoints:
 *   POST   /api/auth/register  — Email/password registration
 *   POST   /api/auth/login     — Email/password login
 *   POST   /api/auth/logout    — Clear session cookie
 *   GET    /api/auth/me        — Get current authenticated user
 *   POST   /api/auth/google    — Google Sign-In / Sign-Up
 *
 * Security rules enforced here:
 *   - passwordHash is NEVER included in any response
 *   - Ownership always uses req.user.id (set by authMiddleware from verified JWT)
 *   - Generic error messages for credential failures (prevents user enumeration)
 *   - Google tokens are verified server-side before any account action
 */

const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { generateToken, setTokenCookie, clearTokenCookie } = require('../utils/tokenUtils');
const { validateRegistration, validateLogin } = require('../utils/validators');
const config = require('../config/env');

// ── Google OAuth2 client (singleton) ─────────────────────────────────────────
const googleClient = new OAuth2Client(config.googleClientId);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Issues a JWT, sets the HttpOnly cookie, and returns a safe user payload.
 * Used by register, login, and Google sign-in to avoid code repetition.
 *
 * @param {import('express').Response} res
 * @param {import('../models/User')}   user   Mongoose document
 * @param {number}                     status HTTP status code for the response
 * @param {string}                     message
 */
function issueSessionAndRespond(res, user, status, message) {
  const token = generateToken(user._id.toString());
  setTokenCookie(res, token);

  // user.toJSON() already strips passwordHash, googleId, __v via the schema transform
  return sendSuccess(res, status, message, { user: user.toJSON() });
}

// ── Controller Functions ──────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 *
 * Creates a new local (email/password) user account.
 * Returns HTTP 201 with a session cookie on success.
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // ── 1. Validate input ──────────────────────────────────────────────────
    const validation = validateRegistration({ name, email, password });
    if (!validation.valid) {
      return next(new AppError('Validation failed.', 400, 'VALIDATION_ERROR'));
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ── 2. Check for duplicate email ───────────────────────────────────────
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      // Do not reveal whether it's a local or Google account
      return next(new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS'));
    }

    // ── 3. Create user — passwordHash will be hashed by the pre-save hook ──
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: password,    // Plain password — hashed in pre-save hook
      authProvider: 'local',
    });

    // ── 4. Issue session ───────────────────────────────────────────────────
    return issueSessionAndRespond(res, user, 201, 'Account created successfully.');
  } catch (err) {
    // Mongoose duplicate key error (race condition)
    if (err.code === 11000) {
      if (err.keyPattern && err.keyPattern.email) {
        return next(new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS'));
      }
      return next(new AppError('Account creation failed due to duplicate entry.', 409, 'DUPLICATE_ENTRY'));
    }
    next(err);
  }
}

/**
 * POST /api/auth/login
 *
 * Authenticates an existing local user with email and password.
 * Returns HTTP 200 with a session cookie on success.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // ── 1. Validate input presence ─────────────────────────────────────────
    const validation = validateLogin({ email, password });
    if (!validation.valid) {
      return next(new AppError('Email and password are required.', 400, 'VALIDATION_ERROR'));
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ── 2. Find user — explicitly select passwordHash (it is select:false) ─
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    // ── 3. Check user exists ───────────────────────────────────────────────
    // Use the same generic message for "not found" and "wrong password"
    // to prevent user enumeration attacks.
    if (!user) {
      return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    }

    // ── 4. Check if this is a Google-only account ──────────────────────────
    if (user.authProvider === 'google' && !user.passwordHash) {
      return next(
        new AppError(
          'This account uses Google Sign-In. Please sign in with Google.',
          401,
          'GOOGLE_ACCOUNT'
        )
      );
    }

    // ── 5. Compare password ────────────────────────────────────────────────
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    }

    // ── 6. Issue session ───────────────────────────────────────────────────
    return issueSessionAndRespond(res, user, 200, 'Logged in successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 *
 * Clears the sg_jwt HttpOnly cookie.
 * This route is intentionally public — calling it without a session is harmless.
 */
async function logout(req, res, next) {
  try {
    clearTokenCookie(res);
    return sendSuccess(res, 200, 'Logged out successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's profile.
 * Requires the `protect` middleware to be applied on the route.
 * req.user is already populated and safe (no passwordHash).
 */
async function getMe(req, res, next) {
  try {
    // req.user is set by authMiddleware.protect — no DB call needed here.
    return sendSuccess(res, 200, 'User profile retrieved.', { user: req.user });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/google
 *
 * Verifies a Google ID token issued by the frontend (Google Sign-In button).
 * Account-linking rules:
 *   A) googleId found in DB   → existing Google user → sign in
 *   B) email found, no googleId → existing local user → link Google to account, sign in
 *   C) no match               → new user → create Google account, sign in
 *
 * The frontend sends: { credential: "<Google ID token string>" }
 */
async function googleSignIn(req, res, next) {
  try {
    const { credential } = req.body;

    if (!credential || typeof credential !== 'string') {
      return next(new AppError('Google credential is required.', 400, 'VALIDATION_ERROR'));
    }

    // ── 1. Verify the Google ID token on the server ────────────────────────
    let googlePayload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: config.googleClientId,
      });
      googlePayload = ticket.getPayload();
    } catch {
      // Catches expired, tampered, or wrong-audience tokens
      return next(new AppError('Google authentication failed. Please try again.', 401, 'GOOGLE_TOKEN_INVALID'));
    }

    if (!googlePayload || !googlePayload.email_verified) {
      return next(new AppError('Google account email is not verified.', 401, 'GOOGLE_EMAIL_UNVERIFIED'));
    }

    const { sub: googleId, email, name, picture: avatar } = googlePayload;
    const normalizedEmail = email.toLowerCase();

    // ── 2. Find or create user ─────────────────────────────────────────────

    // Case A: Existing Google user (matched by googleId)
    let user = await User.findOne({ googleId }).select('+googleId');

    if (user) {
      // Refresh avatar in case it changed on Google's side
      if (avatar && user.avatar !== avatar) {
        user.avatar = avatar;
        await user.save();
      }
      return issueSessionAndRespond(res, user, 200, 'Signed in with Google.');
    }

    // Case B: Existing local account with same email → link Google to it
    user = await User.findOne({ email: normalizedEmail }).select('+googleId');

    if (user) {
      // Link the Google identity to the existing account
      user.googleId = googleId;
      if (!user.avatar && avatar) user.avatar = avatar;
      await user.save();
      return issueSessionAndRespond(res, user, 200, 'Google account linked and signed in.');
    }

    // Case C: Brand new user — create a Google account
    user = await User.create({
      name: name || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      googleId,
      authProvider: 'google',
      avatar: avatar || null,
      // passwordHash intentionally NOT set — Google-only account
    });

    return issueSessionAndRespond(res, user, 201, 'Account created with Google.');
  } catch (err) {
    if (err.code === 11000) {
      // Race condition: duplicate email or googleId created concurrently
      return next(new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS'));
    }
    next(err);
  }
}

module.exports = { register, login, logout, getMe, googleSignIn };
