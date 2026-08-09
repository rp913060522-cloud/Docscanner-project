'use strict';

/**
 * StudyGen AI — JWT & Cookie Utilities
 *
 * Centralises all JWT signing/verification and sg_jwt cookie management.
 * No controller should call jsonwebtoken or set cookies directly — they
 * always go through these helpers to ensure consistent security settings.
 *
 * Cookie name: sg_jwt
 * Cookie flags:
 *   httpOnly: true        — JS cannot read it (prevents XSS token theft)
 *   secure:   true (prod) — HTTPS only in production
 *   sameSite: 'Strict'    — not sent on cross-site requests (CSRF protection)
 *   path:     '/'         — available to all API routes
 */

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const AppError = require('./AppError');

/** The cookie name used throughout the application. */
const COOKIE_NAME = 'sg_jwt';

// ── JWT helpers ───────────────────────────────────────────────────────────────

/**
 * Signs a JWT containing the userId as payload.
 *
 * @param {string} userId  MongoDB ObjectId string
 * @returns {string}       Signed JWT token string
 */
function generateToken(userId) {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,  // e.g. '7d'
    issuer: 'studygen-ai',
    audience: 'studygen-ai-client',
  });
}

/**
 * Verifies a JWT and returns its decoded payload.
 * Throws an AppError if the token is invalid or expired.
 *
 * @param {string} token  JWT string to verify
 * @returns {{ id: string, iat: number, exp: number }}
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret, {
      issuer: 'studygen-ai',
      audience: 'studygen-ai-client',
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Session expired. Please log in again.', 401, 'TOKEN_EXPIRED');
    }
    // JsonWebTokenError, NotBeforeError, etc.
    throw new AppError('Invalid authentication token.', 401, 'TOKEN_INVALID');
  }
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

/**
 * Parses the JWT expiry string (e.g. '7d', '24h', '30m') into milliseconds
 * so we can set the cookie maxAge to match the JWT expiry exactly.
 *
 * @param {string} expiresIn  e.g. '7d' | '24h' | '60m' | '3600s'
 * @returns {number}          milliseconds
 */
function parseExpiryToMs(expiresIn) {
  const units = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  const match = String(expiresIn).match(/^(\d+)([smhd])$/i);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  return parseInt(match[1], 10) * units[match[2].toLowerCase()];
}

/**
 * Sets the sg_jwt HttpOnly cookie on the response.
 *
 * @param {import('express').Response} res
 * @param {string} token  Signed JWT string
 */
function setTokenCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.isProduction,       // HTTPS only in production
    sameSite: config.isProduction ? 'Strict' : 'Lax',
    maxAge: parseExpiryToMs(config.jwtExpiresIn),
    path: '/',
  });
}

/**
 * Clears the sg_jwt cookie, effectively logging the user out.
 * Must use identical path/domain options as the original Set-Cookie call
 * for the browser to actually delete the cookie.
 *
 * @param {import('express').Response} res
 */
function clearTokenCookie(res) {
  res.cookie(COOKIE_NAME, '', {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'Strict' : 'Lax',
    maxAge: 0,      // Expire immediately
    expires: new Date(0),
    path: '/',
  });
}

module.exports = {
  COOKIE_NAME,
  generateToken,
  verifyToken,
  setTokenCookie,
  clearTokenCookie,
};
