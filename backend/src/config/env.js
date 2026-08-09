'use strict';

/**
 * StudyGen AI — Environment Configuration Validator
 *
 * Validates all required environment variables at startup.
 * The server will NOT boot if critical variables are missing.
 * This prevents silent misconfiguration in production.
 */

const dotenv = require('dotenv');

// Load .env file into process.env
dotenv.config();

// ── Required Variables ────────────────────────────────────────────────────────
// These MUST be present in .env or the process will exit immediately.
const REQUIRED_VARS = [
  'PORT',
  'NODE_ENV',
  'MONGO_URI',
  'JWT_SECRET',
  'CLIENT_ORIGIN',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'GOOGLE_CLIENT_ID',
];

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('╔══════════════════════════════════════════════════╗');
    console.error('║   FATAL: Missing required environment variables   ║');
    console.error('╚══════════════════════════════════════════════════╝');
    missing.forEach((key) => console.error(`   ✗ ${key} is not set`));
    console.error('\nCopy .env.example to .env and fill in all values.');
    process.exit(1);
  }
}

validateEnv();

// ── Export Typed Config Object ────────────────────────────────────────────────
// All code reads environment values through this object.
// No raw process.env references scattered through the codebase.
const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === 'production',

  // MongoDB
  mongoUri: process.env.MONGO_URI,

  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Client (for CORS)
  clientOrigin: process.env.CLIENT_ORIGIN,

  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID,

  // Gemini AI
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',

  // File upload limits
  maxUploadSizeBytes: parseInt(process.env.MAX_UPLOAD_SIZE_BYTES, 10) || 26214400, // 25 MB
  tempFileTtlMs: parseInt(process.env.TEMP_FILE_TTL_MS, 10) || 600000, // 10 minutes
};

module.exports = config;
