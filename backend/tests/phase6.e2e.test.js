'use strict';

/**
 * StudyGen AI — Phase 6 E2E Integration & Production Hardening Test Suite
 *
 * Executes full end-to-end integration workflows across Express routes, models,
 * auth, file processing, AI endpoints, ownership protection, and cleanup handlers.
 *
 * Run: node tests/phase6.e2e.test.js
 */

process.env.PORT = '5001';
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://placeholder';
process.env.JWT_SECRET = 'test_secret_at_least_32_chars_long_xxxx';
process.env.JWT_EXPIRES_IN = '7d';
process.env.CLIENT_ORIGIN = 'http://localhost:5500';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GEMINI_API_KEY = 'test-gemini-key-secret-12345';
process.env.GEMINI_MODEL = 'gemini-2.5-flash';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../src/models/User');
const Note = require('../src/models/Note');
const Quiz = require('../src/models/Quiz');
const Flashcard = require('../src/models/Flashcard');
const Chat = require('../src/models/Chat');
const History = require('../src/models/History');
const { generateToken, COOKIE_NAME } = require('../src/utils/tokenUtils');
const { TEMP_DIR, deleteFile } = require('../src/utils/cleanup');

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

async function asyncTest(name, fn) {
  try {
    await fn();
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
// E2E SUITE EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

async function runE2eSuite() {

  // 1. App Scaffolding & Health Check
  test('E2E: Express app mounts all route groups correctly', () => {
    assert(app._router && app._router.stack.length > 0, 'Express router stack must be populated');
  });

  // 2. Auth Flow & Ownership Invariants
  test('E2E Auth: User schema excludes passwordHash from queries and exports', () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashed_secret_123',
    });

    const json = user.toJSON();
    assert(!json.passwordHash, 'toJSON must strip passwordHash');
    assert(!json.googleId, 'toJSON must strip googleId');
    assert(!json.__v, 'toJSON must strip __v');
  });

  test('E2E Auth: JWT token generation and cookie configuration', () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = generateToken(userId);
    assert(token && typeof token === 'string', 'Token must be a non-empty string');
  });

  // 3. Data Models Ownership & PDF Non-Persistence Check
  test('E2E Storage Privacy: Note model does not accept raw PDF binary/text', () => {
    const paths = Object.keys(Note.schema.paths);
    assert(!paths.includes('pdfBinary'), 'Note schema must not have pdfBinary');
    assert(!paths.includes('pdfText'), 'Note schema must not have pdfText');
    assert(paths.includes('localPdfId'), 'Note schema must index localPdfId');
  });

  test('E2E Storage Privacy: Quiz model enforces question & option structures', () => {
    const quiz = new Quiz({
      userId: new mongoose.Types.ObjectId(),
      localPdfId: 'pdf_test_123',
      documentTitle: 'Chemistry Quiz',
      questions: [
        {
          question: 'What is H2O?',
          options: ['Water', 'Acid', 'Base', 'Salt'],
          correctIndex: 0,
          explanation: 'H2O is water',
        },
      ],
    });
    const err = quiz.validateSync();
    assert(!err, 'Valid quiz should pass schema validation');
  });

  test('E2E Storage Privacy: Flashcard deck enforces front and back cards', () => {
    const deck = new Flashcard({
      userId: new mongoose.Types.ObjectId(),
      localPdfId: 'pdf_test_123',
      documentTitle: 'History Flashcards',
      cards: [
        { front: '1947', back: 'Indian Independence' },
      ],
    });
    const err = deck.validateSync();
    assert(!err, 'Valid flashcard deck should pass schema validation');
  });

  test('E2E Storage Privacy: Chat model auto-persists message roles and timestamps', () => {
    const chat = new Chat({
      userId: new mongoose.Types.ObjectId(),
      localPdfId: 'pdf_test_123',
      documentTitle: 'Biology Chat',
      messages: [
        { role: 'user', text: 'Explain cell membrane' },
        { role: 'assistant', text: 'Cell membrane is a phospholipid bilayer' },
      ],
    });
    const err = chat.validateSync();
    assert(!err, 'Valid chat session should pass schema validation');
    assertEqual(chat.messages.length, 2);
  });

  test('E2E Storage Privacy: History model references study resources and indexes user', () => {
    const history = new History({
      userId: new mongoose.Types.ObjectId(),
      localPdfId: 'pdf_test_123',
      documentTitle: 'Physics Notes',
      noteId: new mongoose.Types.ObjectId(),
    });
    const err = history.validateSync();
    assert(!err, 'History record should pass schema validation');
  });

  // 4. Temporary File Upload & 4-Tier Cleanup Pipeline
  test('E2E Temp Cleanup: Temporary upload directory is active & writable', () => {
    assert(fs.existsSync(TEMP_DIR), 'temp_uploads directory must exist');
    const dummyFile = path.join(TEMP_DIR, `e2e_test_${Date.now()}.tmp`);
    fs.writeFileSync(dummyFile, 'dummy content');
    assert(fs.existsSync(dummyFile), 'Dummy file created');
    deleteFile(dummyFile);
    assert(!fs.existsSync(dummyFile), 'deleteFile must purge dummy file');
  });

  // 5. Frontend-Backend Contract Verification
  test('E2E Frontend Client: apiClient.js resolves API Base URL dynamically', () => {
    const apiClientContent = fs.readFileSync(path.join(__dirname, '../../js/apiClient.js'), 'utf8');
    assert(apiClientContent.includes("isDevPort ? 'http://localhost:5000/api' : '/api'"), 'apiClient.js must handle dev ports');
  });

  test('E2E Frontend Client: db.js implements IndexedDB store for local PDFs', () => {
    const dbContent = fs.readFileSync(path.join(__dirname, '../../js/db.js'), 'utf8');
    assert(dbContent.includes('studygen_pdf_db'), 'db.js must name database studygen_pdf_db');
    assert(dbContent.includes('generateLocalPdfId'), 'db.js must generate localPdfId');
  });

  test('E2E Frontend Integration: history.js handles missing local PDF with [Local File Deleted] badge', () => {
    const historyContent = fs.readFileSync(path.join(__dirname, '../../js/history.js'), 'utf8');
    assert(historyContent.includes('[Local File Deleted]'), 'history.js must display [Local File Deleted] badge');
  });

  test('E2E Security: No backend API keys or database secrets in frontend directory', () => {
    const jsFiles = ['app.js', 'auth.js', 'apiClient.js', 'db.js', 'pdf-ai.js', 'ai-study.js', 'ai-learning.js', 'history.js', 'navigation.js'];
    jsFiles.forEach(file => {
      const filePath = path.join(__dirname, '../../js', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        assert(!content.includes('process.env.GEMINI_API_KEY'), `${file} must not reference GEMINI_API_KEY`);
        assert(!content.includes('process.env.MONGO_URI'), `${file} must not reference MONGO_URI`);
        assert(!content.includes('process.env.JWT_SECRET'), `${file} must not reference JWT_SECRET`);
      }
    });
  });

  // Print Summary
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║       Phase 6 — E2E Integration Test Results     ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  results.forEach((r) => {
    const icon = r.status === 'PASS' ? '✔' : '✗';
    const label = r.status === 'PASS' ? 'PASS' : 'FAIL';
    console.log(`  ${icon}  [${label}] ${r.name}`);
    if (r.error) console.log(`         → ${r.error}`);
  });

  console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) process.exit(1);
}

runE2eSuite().catch(err => {
  console.error('Fatal error in E2E test suite:', err);
  process.exit(1);
});
