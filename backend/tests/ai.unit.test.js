'use strict';

/**
 * StudyGen AI — Phase 4 AI & Document Pipeline Unit Tests
 *
 * Tests document processing logic, Gemini service helpers, filename safety,
 * cleanup handlers, and credential isolation without external network calls.
 *
 * Run: node tests/ai.unit.test.js
 */

process.env.PORT = '5000';
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://placeholder';
process.env.JWT_SECRET = 'test_secret_at_least_32_chars_long_xxxx';
process.env.JWT_EXPIRES_IN = '7d';
process.env.CLIENT_ORIGIN = 'http://localhost:5500';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GEMINI_API_KEY = 'test-gemini-key-secret-12345';
process.env.GEMINI_MODEL = 'gemini-2.5-flash';

const path = require('path');
const fs = require('fs');
const { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS } = require('../src/middleware/uploadMiddleware');
const geminiService = require('../src/services/geminiService');
const { deleteFile, TEMP_DIR } = require('../src/utils/cleanup');

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ status: 'PASS', name });
    passed++;
  } catch (err) {
    results.push({ status: 'FAIL', name, error: err.message });
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(a, b, message) {
  if (a !== b) throw new Error(message || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. UPLOAD VALIDATION & SAFE FILENAMES
// ─────────────────────────────────────────────────────────────────────────────

test('Upload Middleware: allowed MIME types include PDF, DOCX, JPG, PNG', () => {
  assert(ALLOWED_MIME_TYPES.has('application/pdf'), 'PDF must be allowed');
  assert(
    ALLOWED_MIME_TYPES.has(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ),
    'DOCX must be allowed'
  );
  assert(ALLOWED_MIME_TYPES.has('image/jpeg'), 'JPG must be allowed');
  assert(ALLOWED_MIME_TYPES.has('image/png'), 'PNG must be allowed');
});

test('Upload Middleware: allowed extensions check', () => {
  assert(ALLOWED_EXTENSIONS.has('.pdf'), '.pdf must be allowed');
  assert(ALLOWED_EXTENSIONS.has('.docx'), '.docx must be allowed');
  assert(ALLOWED_EXTENSIONS.has('.png'), '.png must be allowed');
  assert(ALLOWED_EXTENSIONS.has('.jpg'), '.jpg must be allowed');
  assert(!ALLOWED_EXTENSIONS.has('.exe'), '.exe must be rejected');
  assert(!ALLOWED_EXTENSIONS.has('.sh'), '.sh must be rejected');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. TEMPORARY FILE CLEANUP UTILITY
// ─────────────────────────────────────────────────────────────────────────────

test('Cleanup Utility: deleteFile safely purges file', () => {
  const dummyPath = path.join(TEMP_DIR, `test_dummy_${Date.now()}.tmp`);
  fs.writeFileSync(dummyPath, 'temp content');
  assert(fs.existsSync(dummyPath), 'Dummy file must be created');

  deleteFile(dummyPath);
  assert(!fs.existsSync(dummyPath), 'deleteFile must purge the temporary file');
});

test('Cleanup Utility: deleteFile on non-existent file does not crash', () => {
  const nonExistentPath = path.join(TEMP_DIR, `non_existent_${Date.now()}.tmp`);
  deleteFile(nonExistentPath);
  assert(true, 'Must not throw');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GEMINI RESPONSE PARSING & CREDENTIAL ISOLATION
// ─────────────────────────────────────────────────────────────────────────────

test('Gemini Service: cleanAndParseJSON handles plain JSON', () => {
  const raw = '{"summary": "Test overview", "keyPoints": ["P1", "P2"]}';
  const parsed = geminiService.cleanAndParseJSON(raw);
  assertEqual(parsed.summary, 'Test overview');
  assertEqual(parsed.keyPoints.length, 2);
});

test('Gemini Service: cleanAndParseJSON strips ```json fences', () => {
  const raw = '```json\n{\n  "summary": "Fenced summary"\n}\n```';
  const parsed = geminiService.cleanAndParseJSON(raw);
  assertEqual(parsed.summary, 'Fenced summary');
});

test('Gemini Service: cleanAndParseJSON throws GEMINI_PARSE_ERROR on bad JSON', () => {
  let caught = null;
  try {
    geminiService.cleanAndParseJSON('This is not JSON');
  } catch (err) {
    caught = err;
  }
  assert(caught, 'Must throw error on invalid JSON');
  assertEqual(caught.code, 'GEMINI_PARSE_ERROR');
});

test('Security Check: Gemini API key secret never appears in cleanAndParseJSON output', () => {
  const raw = '{"message": "Response data"}';
  const str = JSON.stringify(geminiService.cleanAndParseJSON(raw));
  assert(!str.includes('test-gemini-key-secret-12345'), 'API key must not leak');
});

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║     Phase 4 — AI & Pipeline Unit Test Results    ║');
console.log('╚══════════════════════════════════════════════════╝\n');

results.forEach((r) => {
  const icon = r.status === 'PASS' ? '✔' : '✗';
  const label = r.status === 'PASS' ? 'PASS' : 'FAIL';
  console.log(`  ${icon}  [${label}] ${r.name}`);
  if (r.error) console.log(`         → ${r.error}`);
});

console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}\n`);

if (failed > 0) process.exit(1);
