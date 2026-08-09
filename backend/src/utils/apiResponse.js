'use strict';

/**
 * StudyGen AI — Standardized HTTP Response Utility
 *
 * All controllers use these helpers to emit consistent JSON envelopes.
 *
 * Success:  { success: true,  message: String, data: Object|Array }
 * Error:    { success: false, error: { code: String, message: String } }
 */

/**
 * Send a success response.
 *
 * @param {import('express').Response} res
 * @param {number}  statusCode  HTTP status code (default: 200)
 * @param {string}  message     Human-readable message
 * @param {*}       data        Response payload (object, array, or null)
 */
function sendSuccess(res, statusCode = 200, message = 'Success', data = null) {
  const body = { success: true, message };
  if (data !== null && data !== undefined) body.data = data;
  return res.status(statusCode).json(body);
}

/**
 * Send an error response.
 *
 * @param {import('express').Response} res
 * @param {number}  statusCode  HTTP status code (default: 500)
 * @param {string}  message     Human-readable error description
 * @param {string}  code        Machine-readable error code (e.g. 'NOT_FOUND')
 */
function sendError(res, statusCode = 500, message = 'Internal server error', code = 'SERVER_ERROR') {
  return res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}

module.exports = { sendSuccess, sendError };
