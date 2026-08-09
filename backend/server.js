'use strict';

/**
 * StudyGen AI — Server Entry Point
 *
 * Startup sequence:
 *   1. Load and validate environment variables
 *   2. Ensure temp_uploads directory exists
 *   3. Purge any orphan temp files from a previous crash (Cleanup Tier 3)
 *   4. Connect to MongoDB Atlas
 *   5. Start Express server on configured PORT
 *   6. Register scheduled TTL cleanup cron (Cleanup Tier 4 — runs every 15 min)
 *   7. Register graceful shutdown handlers
 */

// Step 1: config must be loaded first — it calls dotenv and validates env vars
const config = require('./src/config/env');

const app = require('./app');
const connectDB = require('./src/config/db');
const { purgeOrphansOnStartup, purgeStaleTempFiles, ensureTempDir } = require('./src/utils/cleanup');

async function startServer() {
  // ── Step 2: Ensure /temp_uploads directory exists ──────────────────────────
  ensureTempDir();

  // ── Step 3: Startup orphan purge (Cleanup Tier 3) ──────────────────────────
  purgeOrphansOnStartup();

  // ── Step 4: Connect to MongoDB Atlas ───────────────────────────────────────
  await connectDB();

  // ── Step 5: Start HTTP server ───────────────────────────────────────────────
  const server = app.listen(config.port, () => {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log(`║   StudyGen AI Backend — ${config.nodeEnv.padEnd(24)}║`);
    console.log(`║   Listening on port ${String(config.port).padEnd(29)}║`);
    console.log('╚══════════════════════════════════════════════════╝');
  });

  // ── Step 6: Scheduled TTL cron (Cleanup Tier 4) ────────────────────────────
  // Runs every 15 minutes. Deletes any temp file older than 10 minutes.
  const CRON_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
  const cronJob = setInterval(() => {
    console.log('[Cron] Running scheduled temp file TTL cleanup...');
    purgeStaleTempFiles();
  }, CRON_INTERVAL_MS);

  // Prevent cron from blocking Node.js process exit
  cronJob.unref();

  // ── Step 7: Graceful Shutdown ───────────────────────────────────────────────
  // On SIGTERM (container stop) or SIGINT (Ctrl+C), close the HTTP server
  // gracefully before exiting so in-flight requests can finish.
  const shutdown = (signal) => {
    console.log(`\n⚠  ${signal} received. Shutting down gracefully...`);
    clearInterval(cronJob);
    server.close(() => {
      console.log('✔  HTTP server closed.');
      process.exit(0);
    });

    // Force exit after 10 s if graceful close hangs
    setTimeout(() => {
      console.error('✗  Forced exit after 10 s timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // Catch unhandled promise rejections — log and exit
  process.on('unhandledRejection', (reason) => {
    console.error('✗  Unhandled Rejection:', reason);
    server.close(() => process.exit(1));
  });
}

startServer();
