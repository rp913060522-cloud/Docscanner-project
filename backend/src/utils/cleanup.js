'use strict';

/**
 * StudyGen AI — Temporary File Cleanup Utility
 *
 * Provides helpers for safe, atomic deletion of temporary PDF files
 * that were uploaded to /temp_uploads for AI processing.
 *
 * Called from three separate cleanup tiers:
 *   1. Immediate cleanup (finally block in controllers)
 *   2. Startup orphan purge (called from server.js on boot)
 *   3. Scheduled TTL cron (called from server.js on interval)
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/env');

// Resolved absolute path to the temp uploads directory
const TEMP_DIR = path.resolve(__dirname, '..', '..', 'temp_uploads');

// ── Ensure temp_uploads directory exists ──────────────────────────────────────
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    console.log(`✔  Created temp_uploads directory: ${TEMP_DIR}`);
  }
}

/**
 * Safely deletes a single temporary file.
 * Logs success or failure. Never throws — cleanup must not crash the app.
 *
 * @param {string} filePath  Absolute path to the file to delete
 */
function deleteFile(filePath) {
  if (!filePath) return;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✔  Temp file purged: ${path.basename(filePath)}`);
    }
  } catch (err) {
    // Log but never rethrow — a cleanup error must not crash the request cycle
    console.error(`✗  Failed to delete temp file: ${path.basename(filePath)} —`, err.message);
  }
}

/**
 * Startup orphan purge (Cleanup Tier 3 — Crash Recovery).
 *
 * Scans temp_uploads on server boot and deletes every file found.
 * These are orphans left by a previous crash where finally did not run.
 */
function purgeOrphansOnStartup() {
  ensureTempDir();

  let files;
  try {
    files = fs.readdirSync(TEMP_DIR);
  } catch (err) {
    console.error('✗  Could not read temp_uploads on startup:', err.message);
    return;
  }

  if (files.length === 0) {
    console.log('✔  temp_uploads is clean on startup.');
    return;
  }

  console.log(`⚠  Found ${files.length} orphan file(s) in temp_uploads — purging...`);
  files.forEach((file) => {
    deleteFile(path.join(TEMP_DIR, file));
  });
  console.log('✔  Startup orphan purge complete.');
}

/**
 * Scheduled TTL cleanup (Cleanup Tier 4 — Stale File Cron).
 *
 * Scans temp_uploads and deletes any file whose creation time
 * is older than config.tempFileTtlMs (default: 10 minutes).
 * This catches files missed by the finally/error handlers (e.g., stuck requests).
 */
function purgeStaleTempFiles() {
  if (!fs.existsSync(TEMP_DIR)) return;

  let files;
  try {
    files = fs.readdirSync(TEMP_DIR);
  } catch (err) {
    console.error('✗  Could not read temp_uploads during TTL cron:', err.message);
    return;
  }

  if (files.length === 0) return;

  const now = Date.now();
  const ttl = config.tempFileTtlMs;
  let purgedCount = 0;

  files.forEach((file) => {
    const filePath = path.join(TEMP_DIR, file);
    try {
      const stat = fs.statSync(filePath);
      const ageMs = now - stat.birthtimeMs;
      if (ageMs > ttl) {
        deleteFile(filePath);
        purgedCount++;
      }
    } catch (err) {
      // File may have already been deleted by another cleanup tier — safe to ignore
      console.warn(`⚠  Could not stat temp file: ${file} —`, err.message);
    }
  });

  if (purgedCount > 0) {
    console.log(`✔  TTL cron purged ${purgedCount} stale temp file(s).`);
  }
}

module.exports = {
  ensureTempDir,
  deleteFile,
  purgeOrphansOnStartup,
  purgeStaleTempFiles,
  TEMP_DIR,
};
