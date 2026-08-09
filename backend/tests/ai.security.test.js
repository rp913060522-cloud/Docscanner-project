'use strict';

/**
 * StudyGen AI — Phase 4 AI Controller & Pipeline Security Audit
 *
 * Verifies code properties:
 * 1. AI controllers use `finally` block with `deleteFile` on temporary file paths.
 * 2. Manual save behavior: AI generation controllers (/summary, /study-notes, /quiz, /flashcards, /explain)
 *    do NOT invoke Note.create, Quiz.create, or Flashcard.create.
 * 3. Chat controller (/chat) persists history via Chat model.
 * 4. API keys are strictly accessed via backend config and never sent in response payloads.
 */

const fs = require('fs');
const path = require('path');

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

const aiControllerPath = path.join(__dirname, '../src/controllers/aiController.js');
const aiControllerContent = fs.readFileSync(aiControllerPath, 'utf8');

const geminiServicePath = path.join(__dirname, '../src/services/geminiService.js');
const geminiServiceContent = fs.readFileSync(geminiServicePath, 'utf8');

const aiRoutesPath = path.join(__dirname, '../src/routes/aiRoutes.js');
const aiRoutesContent = fs.readFileSync(aiRoutesPath, 'utf8');

// 1. Temporary File Cleanup Verification
test('AI Audit: aiController has finally block calling deleteFile', () => {
  assert(
    aiControllerContent.includes('finally') && aiControllerContent.includes('deleteFile('),
    'aiController must contain finally blocks with deleteFile to clean temp files'
  );
});

// 2. Manual Save Verification for Summary, Study Notes, Quiz, Flashcards
test('AI Audit: generateSummary does NOT auto-save Note to DB', () => {
  const summaryFunc = aiControllerContent.slice(
    aiControllerContent.indexOf('async function generateSummary'),
    aiControllerContent.indexOf('async function generateStudyNotes')
  );
  assert(!summaryFunc.includes('Note.create'), 'generateSummary must not auto-save Note');
});

test('AI Audit: generateStudyNotes does NOT auto-save Note to DB', () => {
  const notesFunc = aiControllerContent.slice(
    aiControllerContent.indexOf('async function generateStudyNotes'),
    aiControllerContent.indexOf('async function generateQuiz')
  );
  assert(!notesFunc.includes('Note.create'), 'generateStudyNotes must not auto-save Note');
});

test('AI Audit: generateQuiz does NOT auto-save Quiz to DB', () => {
  const quizFunc = aiControllerContent.slice(
    aiControllerContent.indexOf('async function generateQuiz'),
    aiControllerContent.indexOf('async function generateFlashcards')
  );
  assert(!quizFunc.includes('Quiz.create'), 'generateQuiz must not auto-save Quiz');
});

test('AI Audit: generateFlashcards does NOT auto-save Flashcard to DB', () => {
  const flashcardFunc = aiControllerContent.slice(
    aiControllerContent.indexOf('async function generateFlashcards'),
    aiControllerContent.indexOf('async function explainTopic')
  );
  assert(!flashcardFunc.includes('Flashcard.create'), 'generateFlashcards must not auto-save Flashcard');
});

// 3. Chat Persistence Verification
test('AI Audit: chatWithDocument auto-persists to Chat model', () => {
  const chatFunc = aiControllerContent.slice(
    aiControllerContent.indexOf('async function chatWithDocument')
  );
  assert(
    chatFunc.includes('Chat.create') || chatFunc.includes('chatSession.save'),
    'chatWithDocument must persist to Chat model'
  );
  assert(chatFunc.includes('upsertHistory'), 'chatWithDocument must update History metadata');
});

// 4. API Key Isolation Verification
test('Security Audit: geminiService reads API key from config only', () => {
  assert(
    geminiServiceContent.includes('config.geminiApiKey'),
    'geminiService must read config.geminiApiKey'
  );
  assert(
    !geminiServiceContent.includes('res.json') && !geminiServiceContent.includes('res.send'),
    'geminiService must not write responses directly'
  );
});

test('Security Audit: aiRoutes enforces protect middleware and rate limiting', () => {
  assert(aiRoutesContent.includes('router.use(protect)'), 'aiRoutes must enforce protect');
  assert(aiRoutesContent.includes('rateLimit'), 'aiRoutes must enforce rate limiting');
});

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║     Phase 4 — AI & Pipeline Security Audit       ║');
console.log('╚══════════════════════════════════════════════════╝\n');

results.forEach((r) => {
  const icon = r.status === 'PASS' ? '✔' : '✗';
  console.log(`  ${icon}  [${r.status}] ${r.name}`);
});

console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}\n`);

if (failed > 0) process.exit(1);
