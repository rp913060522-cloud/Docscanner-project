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
// Critical secrets MUST be present in process.env or the server exits.
const REQUIRED_VARS = [
  'MONGO_URI',
  'JWT_SECRET',
  'GEMINI_API_KEY',
];

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('╔══════════════════════════════════════════════════╗');
    console.error('║   FATAL: Missing required environment variables   ║');
    console.error('╚══════════════════════════════════════════════════╝');
    missing.forEach((key) => console.error(`   ✗ ${key} is not set`));
    console.error('\nPlease set these Environment Variables in your server dashboard or .env file.');
    process.exit(1);
  }
}

validateEnv();

// ── Export Typed Config Object ────────────────────────────────────────────────
const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'production',
  isProduction: (process.env.NODE_ENV || 'production') === 'production',

  // MongoDB
  mongoUri: process.env.MONGO_URI,

  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Client (for CORS)
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5500',

  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || 'not_configured',

  // Gemini AI
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash',

  // Groq AI
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',

  // File upload limits
  maxUploadSizeBytes: parseInt(process.env.MAX_UPLOAD_SIZE_BYTES, 10) || 26214400, // 25 MB
  tempFileTtlMs: parseInt(process.env.TEMP_FILE_TTL_MS, 10) || 600000, // 10 minutes
};

module.exports = config;
