'use strict';

/**
 * StudyGen AI — Application Error Class
 *
 * A custom error class that carries an HTTP status code and a
 * machine-readable error code so the global error middleware can
 * emit consistent JSON error envelopes without exposing stack traces.
 *
 * Usage:
 *   throw new AppError('Email already registered.', 409, 'EMAIL_EXISTS');
 *   next(new AppError('Not authenticated.', 401, 'UNAUTHORIZED'));
 */
class AppError extends Error {
  /**
   * @param {string} message     Human-readable error description
   * @param {number} statusCode  HTTP status code (e.g. 400, 401, 404, 409, 500)
   * @param {string} code        Machine-readable code (e.g. 'UNAUTHORIZED', 'EMAIL_EXISTS')
   */
  constructor(message, statusCode, code) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code || 'APP_ERROR';

    // Capture stack trace, excluding the constructor from it
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

module.exports = AppError;
