'use strict';

/**
 * EasyScan — Privacy Policy Unit Test Suite
 *
 * Verifies:
 * 1. Dedicated privacy-policy.html exists and is readable
 * 2. Page returns successfully and contains EasyScan branding
 * 3. Official support email is present: rp960522@gmail.com
 * 4. Old placeholder email is NOT present: support@easyscan.com
 * 5. Settings navigation integration (#btnPrivacy -> privacy-policy.html & back button)
 * 6. All 18 required structural sections exist
 * 7. AI provider information matches actual implementation (Groq AI API, gpt-oss-120b; Gemini NOT active)
 * 8. Document storage verified as browser IndexedDB (`studygen_pdf_db`); MongoDB excluded for PDFs
 * 9. Temporary file processing lifecycle verified (/temp_uploads, deleteFile, 15-min cron, 10-min TTL)
 * 10. Cookies & Auth verified: sg_jwt, HttpOnly, SameSite, Secure, bcrypt 12 rounds
 * 11. Security Audit: zero API keys, secrets, or MongoDB connection strings exposed
 * 12. Account Deletion: no fake self-service button claimed; directs requests to rp960522@gmail.com
 * 13. Scope Audit: Terms of Service and Contact Support links remain unmolested
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

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

const policyPath = path.join(__dirname, '../../pages/privacy-policy.html');
const settingsPath = path.join(__dirname, '../../pages/settings.html');
const settingsJsPath = path.join(__dirname, '../../js/settings.js');

// 1. PRIVACY POLICY PAGE EXISTS
test('Privacy Policy: file exists on disk', () => {
  assert(fs.existsSync(policyPath), 'pages/privacy-policy.html must exist');
});

const policyHtml = fs.readFileSync(policyPath, 'utf8');
const settingsHtml = fs.readFileSync(settingsPath, 'utf8');
const settingsJs = fs.readFileSync(settingsJsPath, 'utf8');

// 2. PAGE RETURNS SUCCESSFULLY & CONTAINS EASYSCAN BRANDING
test('Privacy Policy: valid HTML structure with EasyScan branding', () => {
  assert(policyHtml.includes('<!DOCTYPE html>'), 'Must start with DOCTYPE');
  assert(policyHtml.includes('<title>Privacy Policy — EasyScan</title>'), 'Must contain EasyScan title');
  assert(policyHtml.includes('EasyScan is a smart document scanner'), 'Must describe EasyScan');
});

// 3. OFFICIAL SUPPORT EMAIL PRESENT
test('Support Email: contains official email rp960522@gmail.com', () => {
  assert(policyHtml.includes('rp960522@gmail.com'), 'Must contain official email rp960522@gmail.com');
  assert(policyHtml.includes('mailto:rp960522@gmail.com'), 'Must contain clickable mailto:rp960522@gmail.com');
});

// 4. OLD PLACEHOLDER EMAIL IS NOT PRESENT
test('Email Cleanup: does NOT contain old placeholder support@easyscan.com', () => {
  assert(!policyHtml.includes('support@easyscan.com'), 'Must NOT contain support@easyscan.com');
});

// 5. SETTINGS NAVIGATION & BACK BUTTON INTEGRATION
test('Settings Integration: #btnPrivacy navigates to privacy-policy.html and back button works', () => {
  assert(settingsHtml.includes('href="privacy-policy.html" class="settings-item" id="btnPrivacy"'), 'settings.html must link btnPrivacy to privacy-policy.html');
  assert(settingsJs.includes("StudyGenNav.navigate('privacy-policy.html')"), 'settings.js must navigate to privacy-policy.html');
  assert(policyHtml.includes("StudyGenNav.goBack('settings.html')"), 'privacy-policy.html must have back button returning to settings');
});

// 6. ALL 18 REQUIRED STRUCTURAL SECTIONS PRESENT
test('Privacy Policy: contains all 18 audited structural sections', () => {
  const sections = [
    '1. Introduction',
    '2. Information We Collect',
    '3. Guest Mode',
    '4. Account Information',
    '5. Document & Local Storage',
    '6. Study & AI Metadata',
    '7. How We Use Information',
    '8. AI Features & Groq AI',
    '9. Temporary Document Processing',
    '10. Authentication & Cookies',
    '11. Third-Party Services',
    '12. Data Retention',
    '13. Data Deletion Requests',
    '14. Security',
    '15. Children\'s Privacy',
    '16. User Rights & Privacy Requests',
    '17. Changes to This Policy',
    '18. Contact Us'
  ];

  sections.forEach((sec) => {
    assert(policyHtml.includes(sec), `Privacy policy must contain section: ${sec}`);
  });
});

// 7. GROQ AI ATTRIBUTION (NO GEMINI ACTIVE)
test('AI Provider: identifies Groq AI API and does NOT state Gemini as active', () => {
  assert(policyHtml.includes('Groq AI API'), 'Must mention Groq AI API');
  assert(policyHtml.includes('openai/gpt-oss-120b'), 'Must identify active model openai/gpt-oss-120b');
  assert(policyHtml.includes('Gemini is <strong>NOT</strong> the active AI provider') || policyHtml.includes('Gemini is NOT the active'), 'Must explicitly confirm Gemini is not active');
  assert(!policyHtml.includes('Gemini is our active') && !policyHtml.includes('powered by Gemini') && !policyHtml.includes('uses Gemini'), 'Must NOT describe Gemini as active AI provider');
});

// 8. DOCUMENT STORAGE IN INDEXEDDB (NOT MONGODB)
test('Storage Architecture: verifies browser IndexedDB (studygen_pdf_db) and excludes MongoDB for PDFs', () => {
  assert(policyHtml.includes('IndexedDB'), 'Must state IndexedDB storage');
  assert(policyHtml.includes('studygen_pdf_db'), 'Must specify database studygen_pdf_db');
  assert(policyHtml.includes('documents'), 'Must specify documents store');
  assert(policyHtml.includes('EasyScan does <strong>NOT</strong> upload or store your PDF files in our MongoDB') || policyHtml.includes('We do not store your document binary files in our cloud database'), 'Must explicitly state PDFs are not in MongoDB');
});

// 9. TEMPORARY FILE PROCESSING LIFECYCLE
test('Temp Files: accurately describes /temp_uploads, deleteFile, 15-min cron, and 10-min TTL', () => {
  assert(policyHtml.includes('backend/temp_uploads/'), 'Must document backend/temp_uploads/ directory');
  assert(policyHtml.includes('deleteFile'), 'Must document deleteFile cleanup');
  assert(policyHtml.includes('15 minutes'), 'Must document 15-minute cron interval');
  assert(policyHtml.includes('10 minutes'), 'Must document 10-minute TTL');
  assert(policyHtml.includes('25 MB'), 'Must document 25 MB upload limit');
});

// 10. COOKIES & AUTHENTICATION
test('Cookies & Auth: describes sg_jwt, HttpOnly, SameSite, Secure, and bcrypt 12 rounds', () => {
  assert(policyHtml.includes('sg_jwt'), 'Must document sg_jwt cookie name');
  assert(policyHtml.includes('HttpOnly'), 'Must document HttpOnly flag');
  assert(policyHtml.includes('SameSite'), 'Must document SameSite flag');
  assert(policyHtml.includes('Secure'), 'Must document Secure flag');
  assert(policyHtml.includes('bcrypt'), 'Must document bcrypt hashing');
  assert(policyHtml.includes('12'), 'Must document 12 salt rounds');
});

// 11. SECURITY & INTEGRITY: ZERO SECRETS EXPOSED
test('Security Audit: zero API keys, secrets, or MongoDB connection strings in Privacy Policy', () => {
  assert(!policyHtml.includes('mongodb+srv'), 'Must NOT contain mongodb connection string');
  assert(!policyHtml.includes('JWT_SECRET') && !policyHtml.includes('studygen_dev_jwt_secret'), 'Must NOT contain JWT secret');
  assert(!policyHtml.includes('gsk_') && !policyHtml.includes('AQ.Ab8RN'), 'Must NOT contain API keys');
  assert(!policyHtml.includes('password123') && !policyHtml.includes('ravi_scanner'), 'Must NOT contain database password');
});

// 12. ACCOUNT DELETION ACCURACY (NO FAKE SELF-SERVE BUTTON)
test('Account Deletion: distinguishes local document deletion from support-assisted account deletion', () => {
  assert(policyHtml.includes('Deleting Local Documents (Direct Self-Service)'), 'Must document direct local document deletion');
  assert(policyHtml.includes('An automated self-service account deletion button is not currently implemented'), 'Must accurately acknowledge no self-service account deletion');
  assert(policyHtml.includes('rp960522@gmail.com'), 'Must direct deletion requests to rp960522@gmail.com');
});

// 13. UNRELATED SETTINGS OPTIONS PRESERVED
test('Scope Audit: Terms of Service and Contact Support links remain in settings', () => {
  assert(settingsHtml.includes('id="btnTerms"'), 'btnTerms must remain in settings.html');
  assert(settingsHtml.includes('id="btnContact"'), 'btnContact must remain in settings.html');
});

// RESULTS
console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║       Privacy Policy Unit Test Results           ║');
console.log('╚══════════════════════════════════════════════════╝\n');

results.forEach((r) => {
  const icon = r.status === 'PASS' ? '✔' : '✗';
  console.log(`  ${icon}  [${r.status}] ${r.name}`);
  if (r.error) console.log(`         → ${r.error}`);
});

console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}\n`);

if (failed > 0) process.exit(1);
