'use strict';

/**
 * StudyGen AI — Phase 2 Integration Tests
 *
 * Tests all auth endpoints against a live running server with real MongoDB.
 *
 * Prerequisites:
 *   1. Fill in backend/.env with a real MONGO_URI (can be a test DB)
 *   2. Start the server: npm run dev
 *   3. Run this script: node tests/auth.integration.test.js
 *
 * The script tests the following scenarios:
 *   - Register success
 *   - Duplicate registration (same email)
 *   - Invalid registration (bad email, short password)
 *   - Login success
 *   - Login wrong password
 *   - Login non-existent user
 *   - /me authenticated (with session cookie)
 *   - /me unauthenticated (no cookie)
 *   - /me invalid JWT (tampered cookie)
 *   - Logout
 *   - /me after logout (cookie cleared)
 *   - passwordHash never appears in any response body
 */

const http = require('http');

// ── Configuration ─────────────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = `test_${Date.now()}@studygen-test.com`;
const TEST_PASSWORD = 'Testing123';
const TEST_NAME = 'Integration Tester';

// ── Test runner ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const results = [];

async function test(name, fn) {
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

// ── HTTP helper ───────────────────────────────────────────────────────────────
/**
 * Makes an HTTP request and returns { statusCode, body, headers, cookies }.
 */
function request(method, path, body, cookieHeader) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsedBody;
        try { parsedBody = JSON.parse(data); } catch { parsedBody = data; }

        // Extract Set-Cookie header
        const setCookieHeader = res.headers['set-cookie'] || [];
        const cookiesMap = {};
        setCookieHeader.forEach(c => {
          const [pair] = c.split(';');
          const [key, val] = pair.split('=');
          cookiesMap[key.trim()] = val || '';
        });

        resolve({
          statusCode: res.statusCode,
          body: parsedBody,
          headers: res.headers,
          cookies: cookiesMap,
          rawSetCookie: setCookieHeader,
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Session cookie store ──────────────────────────────────────────────────────
let sessionCookie = null;  // 'sg_jwt=<token>' — carried between tests

// ── Test Suites ───────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║    Phase 2 — Auth Integration Tests               ║');
  console.log(`║    Test email: ${TEST_EMAIL.slice(0, 32).padEnd(32)}║`);
  console.log('╚══════════════════════════════════════════════════╝\n');

  // ── Health check first ──────────────────────────────────────────────────────
  await test('Server is reachable (GET /api/health)', async () => {
    const res = await request('GET', '/api/health');
    assertEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
    assert(res.body.success === true, 'Expected success:true');
  });

  // ── REGISTER ────────────────────────────────────────────────────────────────

  await test('Register: success with valid data (201)', async () => {
    const res = await request('POST', '/api/auth/register', {
      name: TEST_NAME,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    assertEqual(res.statusCode, 201, `Got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    assert(res.body.success === true, 'Expected success:true');
    assert(res.body.data.user, 'Expected user in response data');
    assert(res.body.data.user.email === TEST_EMAIL, 'Email must match');

    // Save session cookie for next tests
    if (res.cookies['sg_jwt']) {
      sessionCookie = `sg_jwt=${res.cookies['sg_jwt']}`;
    }
    assert(sessionCookie, 'Expected sg_jwt cookie to be set');
  });

  await test('Register: passwordHash is NEVER in response body', async () => {
    const bodyStr = JSON.stringify(
      await (async () => {
        const r = await request('POST', '/api/auth/register', {
          name: 'Test User 2',
          email: `another_${Date.now()}@test.com`,
          password: 'Testing456',
        });
        return r.body;
      })()
    );
    assert(!bodyStr.includes('passwordHash'), 'passwordHash must NOT appear in response');
    assert(!bodyStr.includes('password'), 'password field must NOT appear in response');
  });

  await test('Register: duplicate email returns 409', async () => {
    const res = await request('POST', '/api/auth/register', {
      name: TEST_NAME,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    assertEqual(res.statusCode, 409, `Expected 409, got ${res.statusCode}`);
    assertEqual(res.body.error.code, 'EMAIL_EXISTS');
  });

  await test('Register: missing name returns 400', async () => {
    const res = await request('POST', '/api/auth/register', {
      name: '',
      email: 'new@test.com',
      password: 'Testing123',
    });
    assertEqual(res.statusCode, 400, `Expected 400, got ${res.statusCode}`);
  });

  await test('Register: invalid email returns 400', async () => {
    const res = await request('POST', '/api/auth/register', {
      name: 'Test',
      email: 'not-an-email',
      password: 'Testing123',
    });
    assertEqual(res.statusCode, 400);
  });

  await test('Register: weak password (no digit) returns 400', async () => {
    const res = await request('POST', '/api/auth/register', {
      name: 'Test',
      email: 'weak@test.com',
      password: 'onlyletters',
    });
    assertEqual(res.statusCode, 400);
  });

  await test('Register: weak password (too short) returns 400', async () => {
    const res = await request('POST', '/api/auth/register', {
      name: 'Test',
      email: 'short@test.com',
      password: 'Ab1',
    });
    assertEqual(res.statusCode, 400);
  });

  // ── LOGOUT (before login test to clear cookie state) ────────────────────────

  await test('Logout: clears sg_jwt cookie (200)', async () => {
    const res = await request('POST', '/api/auth/logout', null, sessionCookie);
    assertEqual(res.statusCode, 200);
    assert(res.body.success === true, 'Expected success:true');

    // After logout, check /me returns 401
    const meRes = await request('GET', '/api/auth/me');
    assertEqual(meRes.statusCode, 401, 'After logout, /me must return 401');
    sessionCookie = null;
  });

  // ── LOGIN ────────────────────────────────────────────────────────────────────

  await test('Login: success with correct credentials (200)', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    assertEqual(res.statusCode, 200, `Got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    assert(res.body.success === true);
    assert(res.body.data.user.email === TEST_EMAIL);

    // Save new session cookie
    if (res.cookies['sg_jwt']) {
      sessionCookie = `sg_jwt=${res.cookies['sg_jwt']}`;
    }
    assert(sessionCookie, 'Expected sg_jwt cookie after login');
  });

  await test('Login: passwordHash is NEVER in response body', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    const bodyStr = JSON.stringify(res.body);
    assert(!bodyStr.includes('passwordHash'), 'passwordHash must NOT appear in login response');
    assert(!bodyStr.includes('"password"'), 'password field must NOT appear in login response');
  });

  await test('Login: wrong password returns 401 (generic message)', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: 'WrongPassword999',
    });
    assertEqual(res.statusCode, 401);
    assertEqual(res.body.error.code, 'INVALID_CREDENTIALS');
    // Ensure the message is generic (doesn't say "wrong password" or "user not found")
    assert(
      !res.body.error.message.toLowerCase().includes('not found'),
      'Error message must not reveal user existence'
    );
  });

  await test('Login: non-existent email returns 401 (same generic message)', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'doesnotexist@test.com',
      password: 'Testing123',
    });
    assertEqual(res.statusCode, 401);
    assertEqual(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  await test('Login: missing email returns 400', async () => {
    const res = await request('POST', '/api/auth/login', { email: '', password: 'Test123' });
    assertEqual(res.statusCode, 400);
  });

  await test('Login: missing password returns 400', async () => {
    const res = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: '' });
    assertEqual(res.statusCode, 400);
  });

  // ── GET /me ──────────────────────────────────────────────────────────────────

  await test('/me: authenticated returns user profile (200)', async () => {
    const res = await request('GET', '/api/auth/me', null, sessionCookie);
    assertEqual(res.statusCode, 200, `Got ${res.statusCode}`);
    assert(res.body.success === true);
    assert(res.body.data.user, 'Must have user data');
    assertEqual(res.body.data.user.email, TEST_EMAIL);
  });

  await test('/me: passwordHash is NEVER in response body', async () => {
    const res = await request('GET', '/api/auth/me', null, sessionCookie);
    const bodyStr = JSON.stringify(res.body);
    assert(!bodyStr.includes('passwordHash'), 'passwordHash must NOT appear in /me response');
  });

  await test('/me: unauthenticated (no cookie) returns 401', async () => {
    const res = await request('GET', '/api/auth/me');
    assertEqual(res.statusCode, 401);
    assertEqual(res.body.error.code, 'UNAUTHORIZED');
  });

  await test('/me: tampered/invalid JWT cookie returns 401', async () => {
    const res = await request('GET', '/api/auth/me', null, 'sg_jwt=tampered.token.value');
    assertEqual(res.statusCode, 401);
    assertEqual(res.body.error.code, 'TOKEN_INVALID');
  });

  // ── 404 on unknown auth route ─────────────────────────────────────────────

  await test('Unknown route returns 404 with NOT_FOUND code', async () => {
    const res = await request('GET', '/api/auth/nonexistent');
    assertEqual(res.statusCode, 404);
    assertEqual(res.body.error.code, 'NOT_FOUND');
  });

  // ── Print results ──────────────────────────────────────────────────────────
  console.log('Results:');
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✔' : '✗';
    console.log(`  ${icon}  [${r.status}] ${r.name}`);
    if (r.error) console.log(`         → ${r.error}`);
  });

  console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    console.log('NOTE: Some tests failed. Ensure:');
    console.log('  1. The server is running: npm run dev');
    console.log('  2. backend/.env has a valid MONGO_URI');
    console.log('  3. The MongoDB Atlas cluster is accessible\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('\n✗  Integration test runner error:', err.message);
  console.error('   Is the server running? Start it with: npm run dev\n');
  process.exit(1);
});
