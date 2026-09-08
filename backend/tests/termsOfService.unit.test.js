'use strict';

/**
 * EasyScan — Terms of Service Unit Test Suite
 *
 * Verifies:
 * 1. Terms page exists on disk
 * 2. Page loads successfully with valid HTML and EasyScan branding
 * 3. Page contains official support email: rp960522@gmail.com
 * 4. Page does NOT contain old placeholder email: support@easyscan.com
 * 5. Settings Terms navigation works (#btnTerms -> terms-of-service.html & back button)
 * 6. Privacy Policy cross-link exists (href="privacy-policy.html")
 * 7. Contact Support cross-reference exists
 * 8. All 21 required structural sections exist
 * 9. AI provider/model references match actual implementation (Groq AI API, openai/gpt-oss-120b; Gemini not active)
 * 10. No unsupported payment/subscription claims exist (accurately describes current free status)
 * 11. No fake account-deletion functionality is claimed (directs requests to rp960522@gmail.com)
 * 12. Governing law uses clear placeholder [Governing law and jurisdiction to be finalized before public launch.]
 * 13. Security audit: zero API keys, secrets, or MongoDB connection strings exposed
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

const termsPath = path.join(__dirname, '../../pages/terms-of-service.html');
const settingsPath = path.join(__dirname, '../../pages/settings.html');
const settingsJsPath = path.join(__dirname, '../../js/settings.js');

// 1. TERMS PAGE EXISTS
test('Terms: file exists on disk', () => {
  assert(fs.existsSync(termsPath), 'pages/terms-of-service.html must exist');
});

const termsHtml = fs.readFileSync(termsPath, 'utf8');
const settingsHtml = fs.readFileSync(settingsPath, 'utf8');
const settingsJs = fs.readFileSync(settingsJsPath, 'utf8');

// 2. PAGE LOADS SUCCESSFULLY & CONTAINS EASYSCAN BRANDING
test('Terms: valid HTML structure with EasyScan branding', () => {
  assert(termsHtml.includes('<!DOCTYPE html>'), 'Must start with DOCTYPE');
  assert(termsHtml.includes('<title>Terms of Service — EasyScan</title>'), 'Must contain EasyScan title');
  assert(termsHtml.includes('EasyScan is a smart document scanning'), 'Must describe EasyScan');
  assert(termsHtml.includes('Last Updated: September 8, 2026'), 'Must display Last Updated date');
});

// 3. OFFICIAL SUPPORT EMAIL PRESENT
test('Support Email: contains official email rp960522@gmail.com', () => {
  assert(termsHtml.includes('rp960522@gmail.com'), 'Must contain official email rp960522@gmail.com');
  assert(termsHtml.includes('mailto:rp960522@gmail.com'), 'Must contain clickable mailto:rp960522@gmail.com');
});

// 4. OLD PLACEHOLDER EMAIL IS NOT PRESENT
test('Email Cleanup: does NOT contain old placeholder support@easyscan.com', () => {
  assert(!termsHtml.includes('support@easyscan.com'), 'Must NOT contain support@easyscan.com');
});

// 5. SETTINGS NAVIGATION & BACK BUTTON INTEGRATION
test('Settings Integration: #btnTerms navigates to terms-of-service.html and back button works', () => {
  assert(settingsHtml.includes('href="terms-of-service.html" class="settings-item" id="btnTerms"'), 'settings.html must link btnTerms to terms-of-service.html');
  assert(settingsJs.includes("StudyGenNav.navigate('terms-of-service.html')"), 'settings.js must navigate to terms-of-service.html');
  assert(termsHtml.includes("StudyGenNav.goBack('settings.html')"), 'terms-of-service.html must have back button returning to settings');
});

// 6. PRIVACY POLICY CROSS-LINK EXISTS
test('Cross-Links: Privacy Policy link exists in Terms', () => {
  assert(termsHtml.includes('href="privacy-policy.html"'), 'Must link to privacy-policy.html');
});

// 7. CONTACT SUPPORT & HELP CENTER CROSS-LINKS EXIST
test('Cross-Links: Help Center link and Contact Support reference exist', () => {
  assert(termsHtml.includes('href="help-center.html"'), 'Must link to help-center.html');
  assert(termsHtml.includes('Settings &rarr; Contact Support') || termsHtml.includes('Contact Support'), 'Must reference Contact Support');
});

// 8. ALL 21 REQUIRED SECTIONS PRESENT
test('Terms: contains all 21 audited structural sections', () => {
  const sections = [
    '1. Acceptance of Terms',
    '2. Eligibility and Account Registration',
    '3. Guest and Registered Accounts',
    '4. Permitted Use and User Responsibilities',
    '5. Prohibited Activities',
    '6. Documents, Files, and Local Storage',
    '7. AI Features and AI Output Disclaimer',
    '8. User Content and Intellectual Property',
    '9. EasyScan Intellectual Property',
    '10. Third-Party Services',
    '11. Fees and Subscriptions',
    '12. Account Suspension and Termination',
    '13. Disclaimers',
    '14. Limitation of Liability',
    '15. Indemnification',
    '16. Privacy',
    '17. Export Controls and Lawful Use',
    '18. Severability and Entire Agreement',
    '19. Governing Law and Dispute Resolution',
    '20. Changes to These Terms',
    '21. Contact Information'
  ];

  sections.forEach((sec) => {
    assert(termsHtml.includes(sec), `Terms of Service must contain section: ${sec}`);
  });
});

// 9. AI PROVIDER & MODEL (GROQ AI API, NO ACTIVE GEMINI)
test('AI Provider: identifies Groq AI API and does NOT state Gemini as active', () => {
  assert(termsHtml.includes('Groq AI API'), 'Must mention Groq AI API');
  assert(termsHtml.includes('openai/gpt-oss-120b'), 'Must identify active model openai/gpt-oss-120b');
  assert(termsHtml.includes('Gemini is <strong>NOT</strong> the active AI provider') || termsHtml.includes('Gemini is NOT the active'), 'Must explicitly confirm Gemini is not active');
  assert(!termsHtml.includes('Gemini is our active') && !termsHtml.includes('powered by Gemini') && !termsHtml.includes('uses Gemini'), 'Must NOT describe Gemini as active AI provider');
});

// 10. NO UNSUPPORTED PAYMENT/SUBSCRIPTION CLAIMS (FREE STATUS)
test('Fees & Subscriptions: accurately describes current free status with no active billing', () => {
  assert(termsHtml.includes('free of charge'), 'Must state service is free of charge');
  assert(termsHtml.includes('no active payment gateway'), 'Must state no active payment gateway exists');
  assert(termsHtml.includes('isPremium'), 'Must clarify unused isPremium flag');
});

// 11. NO FAKE ACCOUNT DELETION FUNCTIONALITY
test('Account Deletion: accurately directs deletion requests to rp960522@gmail.com without claiming UI button', () => {
  assert(termsHtml.includes('rp960522@gmail.com'), 'Must direct deletion requests to official support email');
  assert(!termsHtml.includes('Users can delete their account from Settings'), 'Must NOT falsely claim self-service account deletion in Settings');
});

// 12. GOVERNING LAW USES NEUTRAL PLACEHOLDER
test('Governing Law: contains required placeholder without inventing false jurisdiction', () => {
  assert(termsHtml.includes('[Governing law and jurisdiction to be finalized before public launch.]'), 'Must contain exact governing law placeholder');
});

// 13. SECURITY AUDIT: ZERO SECRETS EXPOSED
test('Security Audit: zero API keys, secrets, or MongoDB connection strings in Terms', () => {
  assert(!termsHtml.includes('mongodb+srv'), 'Must NOT contain mongodb connection string');
  assert(!termsHtml.includes('JWT_SECRET') && !termsHtml.includes('studygen_dev_jwt_secret'), 'Must NOT contain JWT secret');
  assert(!termsHtml.includes('gsk_') && !termsHtml.includes('AQ.Ab8RN'), 'Must NOT contain API keys');
  assert(!termsHtml.includes('password123') && !termsHtml.includes('ravi_scanner'), 'Must NOT contain database password');
});

// RESULTS
console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║       Terms of Service Unit Test Results         ║');
console.log('╚══════════════════════════════════════════════════╝\n');

results.forEach((r) => {
  const icon = r.status === 'PASS' ? '✔' : '✗';
  console.log(`  ${icon}  [${r.status}] ${r.name}`);
  if (r.error) console.log(`         → ${r.error}`);
});

console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}\n`);

if (failed > 0) process.exit(1);
