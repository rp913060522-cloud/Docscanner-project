'use strict';

/**
 * StudyGen AI — NoSQL Injection Sanitizer Middleware
 *
 * Recursively strips keys starting with '$' or containing '.' from req.body,
 * req.query, and req.params to prevent MongoDB operator injection attacks.
 */

function sanitizeObject(target) {
  if (!target || typeof target !== 'object') return target;

  if (Array.isArray(target)) {
    return target.map((item) => sanitizeObject(item));
  }

  const clean = {};
  Object.keys(target).forEach((key) => {
    // Strip keys starting with $ or containing .
    if (key.startsWith('$') || key.includes('.')) {
      return;
    }
    const value = target[key];
    if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeObject(value);
    } else {
      clean[key] = value;
    }
  });

  return clean;
}

function sanitizeInputMiddleware(req, res, next) {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
}

module.exports = sanitizeInputMiddleware;
