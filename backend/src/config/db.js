'use strict';

/**
 * StudyGen AI — MongoDB Connection Manager
 *
 * Establishes and manages the Mongoose connection to MongoDB Atlas.
 * Handles connection events: connected, error, disconnected.
 * Designed to be called once at server startup.
 */

const mongoose = require('mongoose');
const config = require('./env');

/**
 * Connects to MongoDB Atlas using the URI from environment config.
 * Exits the process on fatal connection failure so the server does
 * not boot in a broken state.
 */
async function connectDB() {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000, // Fail fast if Atlas is unreachable (10 s)
      socketTimeoutMS: 45000,          // Close socket after 45 s of inactivity
      maxPoolSize: 10,                 // Atlas Free Tier connection pool cap
    });

    console.log(`✔  MongoDB Atlas connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('✗  MongoDB connection error:', error.message);
    // Exit immediately — the application cannot function without a database
    process.exit(1);
  }
}

// ── Mongoose Connection Event Listeners ───────────────────────────────────────

mongoose.connection.on('disconnected', () => {
  console.warn('⚠  MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✔  MongoDB reconnected.');
});

mongoose.connection.on('error', (err) => {
  console.error('✗  Mongoose connection error:', err.message);
});

module.exports = connectDB;
