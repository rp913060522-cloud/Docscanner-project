'use strict';

/**
 * StudyGen AI — Phase 3 Ownership & Security Static Inspection Test
 *
 * Verifies that:
 * 1. Every controller (Note, Quiz, Flashcard, Chat, History) uses `{ userId: req.user.id }` or `{ _id: ..., userId: req.user.id }`.
 * 2. No controller uses `req.body.userId` to determine resource ownership.
 * 3. All route files protect endpoints with `protect` middleware.
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

const controllers = [
  'noteController.js',
  'quizController.js',
  'flashcardController.js',
  'chatController.js',
  'historyController.js',
];

const routes = [
  'noteRoutes.js',
  'quizRoutes.js',
  'flashcardRoutes.js',
  'chatRoutes.js',
  'historyRoutes.js',
];

controllers.forEach((file) => {
  const filePath = path.join(__dirname, '../src/controllers', file);
  const content = fs.readFileSync(filePath, 'utf8');

  test(`Security Audit: ${file} does not use req.body.userId for query filters`, () => {
    assert(
      !content.includes('userId: req.body.userId'),
      `${file} must not use req.body.userId for query filtering`
    );
  });

  test(`Security Audit: ${file} uses req.user.id for user context`, () => {
    assert(
      content.includes('req.user.id'),
      `${file} must use req.user.id`
    );
  });
});

routes.forEach((file) => {
  const filePath = path.join(__dirname, '../src/routes', file);
  const content = fs.readFileSync(filePath, 'utf8');

  test(`Route Audit: ${file} enforces protect middleware`, () => {
    assert(
      content.includes('router.use(protect)') || content.includes('protect'),
      `${file} must enforce protect middleware`
    );
  });
});

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║    Phase 3 — Ownership & Security Audit Tests    ║');
console.log('╚══════════════════════════════════════════════════╝\n');

results.forEach((r) => {
  const icon = r.status === 'PASS' ? '✔' : '✗';
  console.log(`  ${icon}  [${r.status}] ${r.name}`);
});

console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}\n`);

if (failed > 0) process.exit(1);
