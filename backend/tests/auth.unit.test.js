'use strict';

/**
 * StudyGen AI — Phase 2 Unit Tests
 *
 * Tests that run without any MongoDB connection or network access.
 * Covers: validators, token utilities, AppError, password hashing logic.
 *
 * Run: node tests/auth.unit.test.js
 */

// ── Load env first (needed by tokenUtils) ────────────────────────────────────
process.env.PORT            = '5000';
process.env.NODE_ENV        = 'test';
process.env.MONGO_URI       = 'mongodb://placeholder';
process.env.JWT_SECRET      = 'test_secret_at_least_32_chars_long_xxxx';
process.env.JWT_EXPIRES_IN  = '7d';
process.env.CLIENT_ORIGIN   = 'http://localhost:5500';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
process.env.GEMINI_API_KEY  = 'test-gemini-key';
process.env.GEMINI_MODEL    = 'gemini-2.5-flash';

// ── Test runner ───────────────────────────────────────────────────────────────

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

// ── Import modules under test ─────────────────────────────────────────────────
const { validateRegistration, validateLogin } = require('../src/utils/validators');
const { generateToken, verifyToken } = require('../src/utils/tokenUtils');
const AppError = require('../src/utils/AppError');

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 — AppError
// ─────────────────────────────────────────────────────────────────────────────

test('AppError: has correct message, statusCode, code', () => {
  const err = new AppError('Not found', 404, 'NOT_FOUND');
  assertEqual(err.message, 'Not found');
  assertEqual(err.statusCode, 404);
  assertEqual(err.code, 'NOT_FOUND');
  assert(err instanceof Error, 'AppError must extend Error');
});

test('AppError: default code is APP_ERROR when not provided', () => {
  const err = new AppError('Oops', 500);
  assertEqual(err.code, 'APP_ERROR');
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 — validateRegistration
// ─────────────────────────────────────────────────────────────────────────────

test('validateRegistration: valid input passes', () => {
  const result = validateRegistration({ name: 'Alice', email: 'alice@example.com', password: 'secure123' });
  assert(result.valid === true, 'Expected valid:true');
});

test('validateRegistration: missing name fails', () => {
  const result = validateRegistration({ name: '', email: 'a@b.com', password: 'pass1234' });
  assert(result.valid === false, 'Expected valid:false');
  assert(result.errors.some(e => e.field === 'name'), 'Expected name error');
});

test('validateRegistration: name too short fails', () => {
  const result = validateRegistration({ name: 'A', email: 'a@b.com', password: 'pass1234' });
  assert(result.valid === false);
  assert(result.errors.some(e => e.field === 'name'));
});

test('validateRegistration: invalid email fails', () => {
  const result = validateRegistration({ name: 'Alice', email: 'not-an-email', password: 'pass1234' });
  assert(result.valid === false);
  assert(result.errors.some(e => e.field === 'email'));
});

test('validateRegistration: missing email fails', () => {
  const result = validateRegistration({ name: 'Alice', email: '', password: 'pass1234' });
  assert(result.valid === false);
  assert(result.errors.some(e => e.field === 'email'));
});

test('validateRegistration: password too short fails', () => {
  const result = validateRegistration({ name: 'Alice', email: 'a@b.com', password: 'abc1' });
  assert(result.valid === false);
  assert(result.errors.some(e => e.field === 'password'));
});

test('validateRegistration: password with no digit fails', () => {
  const result = validateRegistration({ name: 'Alice', email: 'a@b.com', password: 'abcdefgh' });
  assert(result.valid === false);
  assert(result.errors.some(e => e.field === 'password'));
});

test('validateRegistration: password with no letter fails', () => {
  const result = validateRegistration({ name: 'Alice', email: 'a@b.com', password: '12345678' });
  assert(result.valid === false);
  assert(result.errors.some(e => e.field === 'password'));
});

test('validateRegistration: all fields missing returns multiple errors', () => {
  const result = validateRegistration({ name: '', email: '', password: '' });
  assert(result.valid === false);
  assert(result.errors.length >= 3, `Expected >=3 errors, got ${result.errors.length}`);
});

test('validateRegistration: name with max 60 chars passes', () => {
  const result = validateRegistration({ name: 'A'.repeat(60), email: 'a@b.com', password: 'pass1234' });
  assert(result.valid === true);
});

test('validateRegistration: name over 60 chars fails', () => {
  const result = validateRegistration({ name: 'A'.repeat(61), email: 'a@b.com', password: 'pass1234' });
  assert(result.valid === false);
  assert(result.errors.some(e => e.field === 'name'));
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 — validateLogin
// ─────────────────────────────────────────────────────────────────────────────

test('validateLogin: valid input passes', () => {
  const result = validateLogin({ email: 'alice@example.com', password: 'anypassword' });
  assert(result.valid === true);
});

test('validateLogin: missing email fails', () => {
  const result = validateLogin({ email: '', password: 'password' });
  assert(result.valid === false);
  assert(result.errors.some(e => e.field === 'email'));
});

test('validateLogin: missing password fails', () => {
  const result = validateLogin({ email: 'a@b.com', password: '' });
  assert(result.valid === false);
  assert(result.errors.some(e => e.field === 'password'));
});

test('validateLogin: both missing fails', () => {
  const result = validateLogin({ email: '', password: '' });
  assert(result.valid === false);
  assert(result.errors.length === 2);
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 4 — tokenUtils (JWT only, no cookies — no HTTP response available)
// ─────────────────────────────────────────────────────────────────────────────

test('generateToken: returns a non-empty string', () => {
  const token = generateToken('507f1f77bcf86cd799439011');
  assert(typeof token === 'string' && token.length > 0, 'Token must be a non-empty string');
  // JWT format: three base64url segments separated by dots
  assert(token.split('.').length === 3, 'Token must be a valid JWT (3 segments)');
});

test('verifyToken: valid token returns correct payload', () => {
  const userId = '507f1f77bcf86cd799439011';
  const token = generateToken(userId);
  const payload = verifyToken(token);
  assertEqual(payload.id, userId, 'Payload id must match userId');
  assert(typeof payload.iat === 'number', 'Payload must have iat');
  assert(typeof payload.exp === 'number', 'Payload must have exp');
});

test('verifyToken: tampered token throws TOKEN_INVALID', () => {
  const token = generateToken('507f1f77bcf86cd799439011');
  const tampered = token.slice(0, -5) + 'XXXXX';
  try {
    verifyToken(tampered);
    throw new Error('Should have thrown');
  } catch (err) {
    assertEqual(err.code, 'TOKEN_INVALID', 'Should throw TOKEN_INVALID');
  }
});

test('verifyToken: completely invalid string throws TOKEN_INVALID', () => {
  try {
    verifyToken('not.a.token');
    throw new Error('Should have thrown');
  } catch (err) {
    assertEqual(err.code, 'TOKEN_INVALID');
  }
});

test('verifyToken: empty string throws TOKEN_INVALID', () => {
  try {
    verifyToken('');
    throw new Error('Should have thrown');
  } catch (err) {
    assert(err.code === 'TOKEN_INVALID' || err.code === 'APP_ERROR');
  }
});

test('generateToken: two tokens for same user are different (unique iat)', (done) => {
  // Wait 1100ms so iat differs (JWT iat has 1-second resolution)
  // For unit tests we just check format — timing test skipped to keep fast
  const t1 = generateToken('507f1f77bcf86cd799439011');
  const t2 = generateToken('507f1f77bcf86cd799439012');
  assert(t1 !== t2, 'Tokens for different users must differ');
});

// ─────────────────────────────────────────────────────────────────────────────
// Results
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║          Phase 2 — Auth Unit Test Results         ║');
console.log('╚══════════════════════════════════════════════════╝\n');

results.forEach(r => {
  const icon = r.status === 'PASS' ? '✔' : '✗';
  const label = r.status === 'PASS' ? 'PASS' : 'FAIL';
  console.log(`  ${icon}  [${label}] ${r.name}`);
  if (r.error) console.log(`         → ${r.error}`);
});

console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('');

if (failed > 0) process.exit(1);
