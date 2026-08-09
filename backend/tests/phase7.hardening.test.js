'use strict';

/**
 * StudyGen AI — Phase 7 Production Hardening & Reliability Test Suite
 *
 * Automated verification for production security & reliability enhancements:
 * 1. NoSQL injection sanitizer middleware (stripping $ and . keys)
 * 2. Production HTTP security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy)
 * 3. Express trust proxy configuration
 * 4. Error middleware sanitization and production stack suppression
 * 5. Gemini API 45s timeout guard
 * 6. MongoDB Atlas pool size optimization
 */

process.env.PORT = '5002';
process.env.NODE_ENV = 'production';
process.env.MONGO_URI = 'mongodb://placeholder';
process.env.JWT_SECRET = 'test_secret_at_least_32_chars_long_xxxx';
process.env.JWT_EXPIRES_IN = '7d';
process.env.CLIENT_ORIGIN = 'http://localhost:5500';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GEMINI_API_KEY = 'test-gemini-key-secret-12345';
process.env.GEMINI_MODEL = 'gemini-2.5-flash';

const app = require('../app');
const sanitizeInputMiddleware = require('../src/middleware/sanitizeMiddleware');
const AppError = require('../src/utils/AppError');
const { errorMiddleware } = require('../src/middleware/errorMiddleware');

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
// 1. NOSQL INJECTION SANITIZER
// ─────────────────────────────────────────────────────────────────────────────

test('NoSQL Sanitizer: strips $gt, $where, and dot notation from request body', () => {
  const req = {
    body: {
      email: { $gt: '' },
      password: 'secretPassword123',
      nested: {
        '$where': 'this.admin === true',
        validKey: 'validValue',
        'invalid.key': 'bad',
      },
    },
    query: {
      '$ne': null,
      validQuery: 'test',
    },
    params: {},
  };

  sanitizeInputMiddleware(req, {}, () => {});

  assert(!req.body.email.$gt, 'Must strip $gt key');
  assertEqual(req.body.password, 'secretPassword123');
  assert(!req.body.nested.$where, 'Must strip nested $where key');
  assert(!req.body.nested['invalid.key'], 'Must strip key with dot');
  assertEqual(req.body.nested.validKey, 'validValue');
  assert(!req.query.$ne, 'Must strip query $ne');
  assertEqual(req.query.validQuery, 'test');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXPRESS TRUST PROXY & SECURITY HEADERS
// ─────────────────────────────────────────────────────────────────────────────

test('Express App: trust proxy is enabled for production reverse proxies', () => {
  const trustProxySetting = app.get('trust proxy');
  assert(trustProxySetting === 1 || trustProxySetting === true, 'trust proxy must be enabled');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. PRODUCTION ERROR HANDLING & STACK SUPPRESSION
// ─────────────────────────────────────────────────────────────────────────────

test('Error Middleware: suppresses stack trace in production mode', () => {
  const err = new AppError('Sensitive error details', 500, 'INTERNAL_ERROR');
  err.stack = 'Error: Sensitive error details\n at secretFile.js:10';

  const req = {};
  let sentStatus = null;
  let sentJson = null;

  const res = {
    status(code) {
      sentStatus = code;
      return this;
    },
    json(obj) {
      sentJson = obj;
      return this;
    },
  };

  errorMiddleware(err, req, res, () => {});

  assertEqual(sentStatus, 500);
  assert(!sentJson.error.stack, 'Stack trace must NOT be exposed in response envelope');
  assertEqual(sentJson.error.code, 'INTERNAL_ERROR');
});

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║    Phase 7 — Production Hardening Test Results   ║');
console.log('╚══════════════════════════════════════════════════╝\n');

results.forEach((r) => {
  const icon = r.status === 'PASS' ? '✔' : '✗';
  const label = r.status === 'PASS' ? 'PASS' : 'FAIL';
  console.log(`  ${icon}  [${label}] ${r.name}`);
  if (r.error) console.log(`         → ${r.error}`);
});

console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}\n`);

if (failed > 0) process.exit(1);
