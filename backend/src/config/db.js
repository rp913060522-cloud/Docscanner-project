'use strict';

/**
 * StudyGen AI — MongoDB Connection Manager
 *
 * Establishes and manages the Mongoose connection to MongoDB Atlas.
 * Handles connection events: connected, error, disconnected.
 * Designed to be called once at server startup.
 */

const mongoose = require('mongoose');
const dns = require('dns');
const config = require('./env');

// Set IPv4 first and add fallback public DNS (Google/Cloudflare) for mongodb+srv:// SRV resolution
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {}

/**
 * Connects to MongoDB Atlas using the URI from environment config.
 */
async function connectDB() {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    console.log(`✔  MongoDB Atlas connected: ${conn.connection.host}`);
  } catch (error) {
    // If SRV lookup failed on local DNS, try setting fallback public DNS servers (8.8.8.8, 1.1.1.1)
    if (error.message && error.message.includes('querySrv')) {
      console.warn('⚠  Local DNS SRV query failed. Retrying with Google/Cloudflare public DNS...');
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
        const conn = await mongoose.connect(config.mongoUri, {
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
        });
        console.log(`✔  MongoDB Atlas connected via fallback DNS: ${conn.connection.host}`);
        return;
      } catch (retryErr) {
        console.error('✗  MongoDB connection error after DNS fallback:', retryErr.message);
      }
    } else {
      console.error('✗  MongoDB connection error:', error.message);
    }
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
