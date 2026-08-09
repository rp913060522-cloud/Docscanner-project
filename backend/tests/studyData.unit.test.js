'use strict';

/**
 * StudyGen AI — Phase 3 Unit Tests
 *
 * Tests model schemas, validation, ObjectId middleware, and security constraints
 * without needing an active MongoDB server.
 *
 * Run: node tests/studyData.unit.test.js
 */

process.env.PORT = '5000';
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://placeholder';
process.env.JWT_SECRET = 'test_secret_at_least_32_chars_long_xxxx';
process.env.JWT_EXPIRES_IN = '7d';
process.env.CLIENT_ORIGIN = 'http://localhost:5500';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.GEMINI_MODEL = 'gemini-2.5-flash';

const mongoose = require('mongoose');
const Note = require('../src/models/Note');
const Quiz = require('../src/models/Quiz');
const Flashcard = require('../src/models/Flashcard');
const Chat = require('../src/models/Chat');
const History = require('../src/models/History');
const validateObjectId = require('../src/middleware/validateObjectId');

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
// 1. NO PDF BINARY OR TEXT FIELDS IN SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

test('Models do NOT contain PDF binary, raw text, or base64 fields', () => {
  const forbidden = ['pdfBinary', 'pdfData', 'pdfText', 'extractedText', 'rawPdf', 'scanImage', 'pdfBuffer'];
  const models = [Note, Quiz, Flashcard, Chat, History];

  models.forEach((model) => {
    const paths = Object.keys(model.schema.paths);
    forbidden.forEach((field) => {
      assert(
        !paths.includes(field),
        `Model ${model.modelName} must NOT contain forbidden field "${field}"`
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. MODEL VALIDATIONS
// ─────────────────────────────────────────────────────────────────────────────

test('Note model validation: requires userId, localPdfId, documentTitle', () => {
  const note = new Note({});
  const err = note.validateSync();
  assert(err && err.errors.userId, 'userId must be required');
  assert(err && err.errors.localPdfId, 'localPdfId must be required');
  assert(err && err.errors.documentTitle, 'documentTitle must be required');
});

test('Quiz model validation: requires questions', () => {
  const quiz = new Quiz({
    userId: new mongoose.Types.ObjectId(),
    localPdfId: 'pdf_123',
    documentTitle: 'Math Quiz',
    questions: [],
  });
  const err = quiz.validateSync();
  assert(err && err.errors.questions, 'Quiz must require at least one question');
});

test('Quiz model validation: questions require at least 2 options', () => {
  const quiz = new Quiz({
    userId: new mongoose.Types.ObjectId(),
    localPdfId: 'pdf_123',
    documentTitle: 'Math Quiz',
    questions: [
      {
        question: '2+2?',
        options: ['4'],
        correctIndex: 0,
      },
    ],
  });
  const err = quiz.validateSync();
  assert(err && err.errors['questions.0.options'], 'Quiz question must have >=2 options');
});

test('Flashcard model validation: requires front and back', () => {
  const deck = new Flashcard({
    userId: new mongoose.Types.ObjectId(),
    localPdfId: 'pdf_123',
    documentTitle: 'Vocab',
    cards: [{ front: '', back: '' }],
  });
  const err = deck.validateSync();
  assert(err && err.errors['cards.0.front'], 'Front is required');
  assert(err && err.errors['cards.0.back'], 'Back is required');
});

test('Chat model validation: allows role assistant, user, system', () => {
  const chat = new Chat({
    userId: new mongoose.Types.ObjectId(),
    localPdfId: 'pdf_123',
    documentTitle: 'Physics Chat',
    messages: [
      { role: 'user', text: 'Hello' },
      { role: 'assistant', text: 'Hi there' },
    ],
  });
  const err = chat.validateSync();
  assert(!err, 'Chat with valid roles should pass validation');
});

test('Chat model validation: rejects invalid role', () => {
  const chat = new Chat({
    userId: new mongoose.Types.ObjectId(),
    localPdfId: 'pdf_123',
    documentTitle: 'Physics Chat',
    messages: [{ role: 'hacker', text: 'Hello' }],
  });
  const err = chat.validateSync();
  assert(err && err.errors['messages.0.role'], 'Invalid message role must be rejected');
});

test('History model validation: accepts valid links', () => {
  const history = new History({
    userId: new mongoose.Types.ObjectId(),
    localPdfId: 'pdf_123',
    documentTitle: 'Physics 101',
    noteId: new mongoose.Types.ObjectId(),
  });
  const err = history.validateSync();
  assert(!err, 'History with valid links should pass validation');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. OBJECT ID MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

test('validateObjectId middleware: passes valid ObjectId', () => {
  const mw = validateObjectId('id');
  const req = { params: { id: new mongoose.Types.ObjectId().toString() } };
  let called = false;
  mw(req, {}, (err) => {
    called = true;
    assert(!err, 'Valid ObjectId should pass');
  });
  assert(called, 'Next must be called');
});

test('validateObjectId middleware: rejects invalid ObjectId', () => {
  const mw = validateObjectId('id');
  const req = { params: { id: 'invalid-id-123' } };
  let caughtErr = null;
  mw(req, {}, (err) => {
    caughtErr = err;
  });
  assert(caughtErr, 'Invalid ObjectId must trigger error');
  assertEqual(caughtErr.statusCode, 400, 'Status code must be 400');
  assertEqual(caughtErr.code, 'INVALID_ID', 'Error code must be INVALID_ID');
});

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║        Phase 3 — Study Data Unit Tests           ║');
console.log('╚══════════════════════════════════════════════════╝\n');

results.forEach((r) => {
  const icon = r.status === 'PASS' ? '✔' : '✗';
  const label = r.status === 'PASS' ? 'PASS' : 'FAIL';
  console.log(`  ${icon}  [${label}] ${r.name}`);
  if (r.error) console.log(`         → ${r.error}`);
});

console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}\n`);

if (failed > 0) process.exit(1);
