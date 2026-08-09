'use strict';

/**
 * StudyGen AI — Global Error Handling Middleware
 *
 * Catches every error passed to next(err) in the Express pipeline.
 * Responsibilities:
 *   - Delete temporary uploaded file if present (Cleanup Tier 2 — Error Path)
 *   - Emit a consistent JSON error envelope
 *   - Never leak stack traces to the client in production
 */

const { deleteFile } = require('../utils/cleanup');
const { sendError } = require('../utils/apiResponse');

/**
 * Express global error handler.
 * Must be registered AFTER all routes in app.js / server.js.
 * Signature must have exactly 4 parameters for Express to treat it as error middleware.
 *
 * @param {Error}                       err
 * @param {import('express').Request}   req
 * @param {import('express').Response}  res
 * @param {import('express').NextFunction} next  (required even if unused)
 */
// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  // ── Cleanup Tier 2: Delete temp file uploaded with this failed request ───────
  if (req.file && req.file.path) {
    deleteFile(req.file.path);
  }

  // ── Handle Mongoose Validation Errors ────────────────────────────────────────
  // Convert Mongoose ValidationError into a structured 400 AppError
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed.' },
      errors,
    });
  }

  // ── Determine HTTP status code ────────────────────────────────────────────────
  // Use err.statusCode if the error was intentionally thrown with one,
  // otherwise fall back to 500 (Internal Server Error).
  const statusCode = err.statusCode || 500;
  const code = err.code || 'SERVER_ERROR';

  // ── Error message ─────────────────────────────────────────────────────────────
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred. Please try again.'
      : err.message || 'Internal server error';

  // ── Log error details on the server (never sent to client) ───────────────────
  console.error(`[ERROR] ${statusCode} ${code}: ${err.message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  return sendError(res, statusCode, message, code);
}

/**
 * 404 Not Found handler.
 * Registered AFTER all routes to catch requests to undefined endpoints.
 *
 * @param {import('express').Request}   req
 * @param {import('express').Response}  res
 */
function notFoundMiddleware(req, res) {
  return sendError(
    res,
    404,
    `Route ${req.method} ${req.originalUrl} not found.`,
    'NOT_FOUND'
  );
}

module.exports = { errorMiddleware, notFoundMiddleware };
