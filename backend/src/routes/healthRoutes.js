'use strict';

/**
 * StudyGen AI — Health Check Route
 *
 * Provides a simple endpoint that confirms:
 *   - Express server is running
 *   - MongoDB connection state
 *   - Current environment
 *   - Server uptime
 *
 * This route is intentionally public (no authentication required).
 * Useful for monitoring, deployment health checks, and smoke testing.
 */

const express = require('express');
const mongoose = require('mongoose');
const { sendSuccess } = require('../utils/apiResponse');

const router = express.Router();

/**
 * GET /api/health
 * Returns server health status.
 */
router.get('/', (req, res) => {
  // Mongoose readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const dbState = mongoose.connection.readyState;
  const dbStatus =
    dbState === 1 ? 'connected'
    : dbState === 2 ? 'connecting'
    : 'disconnected';

  return sendSuccess(res, 200, 'StudyGen AI backend is running.', {
    status: 'ok',
    environment: process.env.NODE_ENV,
    database: dbStatus,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
