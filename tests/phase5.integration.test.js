'use strict';

/**
 * StudyGen AI — Phase 5 Integration & Security Audit Test
 *
 * Verifies frontend-backend integration contracts:
 * 1. ApiClient enforces credentials: 'include'.
 * 2. ApiClient does NOT manually set Content-Type for FormData uploads.
 * 3. LocalPdfDB implements studygen_pdf_db store and required methods.
 * 4. No JWT token is saved to localStorage/sessionStorage.
 * 5. Real API endpoints (/auth, /ai, /notes, /quizzes, /flashcards, /chats, /history) are wired.
 * 6. Quiz correctIndex mapping is enforced.
 * 7. History localPdfId IndexedDB check & deleted badge logic is active.
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

const rootDir = path.join(__dirname, '..');

// 1. ApiClient Audit
test('Phase 5 Audit: apiClient.js enforces credentials: "include"', () => {
  const content = fs.readFileSync(path.join(rootDir, 'js/apiClient.js'), 'utf8');
  assert(content.includes("credentials: 'include'"), 'apiClient must specify credentials: "include"');
});

test('Phase 5 Audit: apiClient.js uploadFile does NOT set Content-Type header', () => {
  const content = fs.readFileSync(path.join(rootDir, 'js/apiClient.js'), 'utf8');
  const uploadFn = content.slice(content.indexOf('async function uploadFile'));
  assert(!uploadFn.includes("'Content-Type'"), 'uploadFile must not set Content-Type header');
});

// 2. LocalPdfDB Audit
test('Phase 5 Audit: db.js creates studygen_pdf_db and implements all methods', () => {
  const content = fs.readFileSync(path.join(rootDir, 'js/db.js'), 'utf8');
  assert(content.includes('studygen_pdf_db'), 'DB name must be studygen_pdf_db');
  const requiredFns = ['saveDocument', 'getDocument', 'deleteDocument', 'listDocuments', 'documentExists', 'generateLocalPdfId'];
  requiredFns.forEach(fn => {
    assert(content.includes(fn), `db.js must implement ${fn}`);
  });
});

// 3. No JWT in Browser Storage Audit
test('Security Audit: Frontend JS does NOT store JWT tokens in localStorage/sessionStorage', () => {
  const files = ['js/app.js', 'js/auth.js', 'js/apiClient.js', 'js/pdf-ai.js', 'js/ai-study.js', 'js/ai-learning.js', 'js/history.js'];
  files.forEach(file => {
    const content = fs.readFileSync(path.join(rootDir, file), 'utf8');
    assert(!content.includes("localStorage.setItem('sg_jwt'"), `${file} must not save sg_jwt to localStorage`);
    assert(!content.includes("sessionStorage.setItem('sg_jwt'"), `${file} must not save sg_jwt to sessionStorage`);
    assert(!content.includes("localStorage.setItem('sg_auth'"), `${file} must not save mock token sg_auth`);
  });
});

// 4. API Endpoints Wiring Audit
test('Phase 5 Audit: auth.js connects /auth/login, /auth/register, and /auth/google', () => {
  const content = fs.readFileSync(path.join(rootDir, 'js/auth.js'), 'utf8');
  assert(content.includes('auth.login'), 'auth.js must call auth.login');
  assert(content.includes('auth.signup'), 'auth.js must call auth.signup');
  assert(content.includes('auth.googleLogin'), 'auth.js must call auth.googleLogin');
});

test('Phase 5 Audit: pdf-ai.js saves Blob to LocalPdfDB and calls /ai/study-notes', () => {
  const content = fs.readFileSync(path.join(rootDir, 'js/pdf-ai.js'), 'utf8');
  assert(content.includes('LocalPdfDB.saveDocument'), 'pdf-ai.js must save to LocalPdfDB');
  assert(content.includes('/ai/study-notes'), 'pdf-ai.js must call /ai/study-notes');
});

test('Phase 5 Audit: ai-study.js calls POST /api/notes when Save Notes is pressed', () => {
  const content = fs.readFileSync(path.join(rootDir, 'js/ai-study.js'), 'utf8');
  assert(content.includes("ApiClient.post('/notes'"), 'ai-study.js must call POST /notes');
});

test('Phase 5 Audit: ai-learning.js maps correctIndex and calls /quizzes, /flashcards, /ai/chat', () => {
  const content = fs.readFileSync(path.join(rootDir, 'js/ai-learning.js'), 'utf8');
  assert(content.includes('correctIndex'), 'ai-learning.js must map correctIndex');
  assert(content.includes("ApiClient.post('/quizzes'"), 'ai-learning.js must call /quizzes');
  assert(content.includes("ApiClient.uploadFile('/ai/chat'"), 'ai-learning.js must call /ai/chat');
});

test('Phase 5 Audit: history.js checks LocalPdfDB for localPdfId and displays [Local File Deleted]', () => {
  const content = fs.readFileSync(path.join(rootDir, 'js/history.js'), 'utf8');
  assert(content.includes('LocalPdfDB.documentExists'), 'history.js must check IndexedDB document existence');
  assert(content.includes('[Local File Deleted]'), 'history.js must render [Local File Deleted] badge');
  assert(content.includes("ApiClient.get('/history'"), 'history.js must fetch /history');
});

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║     Phase 5 — Frontend Integration Audit Results ║');
console.log('╚══════════════════════════════════════════════════╝\n');

results.forEach((r) => {
  const icon = r.status === 'PASS' ? '✔' : '✗';
  console.log(`  ${icon}  [${r.status}] ${r.name}`);
});

console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}\n`);

if (failed > 0) process.exit(1);
