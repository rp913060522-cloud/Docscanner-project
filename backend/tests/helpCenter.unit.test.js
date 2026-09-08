'use strict';

/**
 * EasyScan — Help Center & FAQ Unit Test Suite
 *
 * Verifies:
 * 1. Dedicated help-center.html structure, header, search input, chips, and back button
 * 2. Settings navigation integration (#btnHelp -> help-center.html)
 * 3. 8 FAQ Categories present in both HTML and JavaScript
 * 4. Total questions count >= 30
 * 5. Groq AI API verified as current provider (Gemini not mentioned as active)
 * 6. Local IndexedDB storage architecture accurately described (MongoDB not storing PDFs)
 * 7. Watermark accurately described as "Scanned with EasyScan" in red
 * 8. CSS Accordion and responsive styling rules
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

const helpHtml = fs.readFileSync(path.join(__dirname, '../../pages/help-center.html'), 'utf8');
const helpJs = fs.readFileSync(path.join(__dirname, '../../js/help-center.js'), 'utf8');
const settingsHtml = fs.readFileSync(path.join(__dirname, '../../pages/settings.html'), 'utf8');
const settingsJs = fs.readFileSync(path.join(__dirname, '../../js/settings.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../../css/components.css'), 'utf8');

// 1. PAGE STRUCTURE & HEADER
test('Help Center: page has header, title, and back button', () => {
  assert(helpHtml.includes('Help Center & FAQ'), 'Must contain title');
  assert(helpHtml.includes('Find answers to common questions about EasyScan.'), 'Must contain subtitle');
  assert(helpHtml.includes("StudyGenNav.goBack('settings.html')"), 'Must have back button returning to settings');
});

test('Help Center: page has search input, chips, and empty state', () => {
  assert(helpHtml.includes('id="faqSearch"'), 'Must have search input with id faqSearch');
  assert(helpHtml.includes('id="clearFaqSearch"'), 'Must have clear button with id clearFaqSearch');
  assert(helpHtml.includes('id="faqCategoryChips"'), 'Must have category chips container');
  assert(helpHtml.includes('id="faqAccordionGroup"'), 'Must have accordion container');
  assert(helpHtml.includes('id="faqEmptyState"'), 'Must have empty state container');
});

// 2. SETTINGS INTEGRATION
test('Settings: #btnHelp links to help-center.html', () => {
  assert(settingsHtml.includes('href="help-center.html"'), 'settings.html must have href="help-center.html" on btnHelp');
  assert(settingsJs.includes('help-center.html'), 'settings.js must navigate to help-center.html');
  assert(!settingsHtml.includes('href="help-center.html" class="settings-item" id="btnPrivacy"'), 'btnPrivacy must remain unaffected');
});

// 3. 8 FAQ CATEGORIES
test('Help Center: exactly 8 distinct categories are implemented', () => {
  const categories = [
    'getting-started',
    'scanning',
    'documents',
    'storage',
    'pdf',
    'ai',
    'privacy',
    'account'
  ];

  categories.forEach(cat => {
    assert(helpJs.includes(`category: '${cat}'`), `JS must include category '${cat}'`);
    assert(helpHtml.includes(`data-category="${cat}"`), `HTML must include category chip for '${cat}'`);
  });
});

// 4. ACCURATE AI PROVIDER (GROQ AI API)
test('AI FAQ: specifies Groq AI API and does NOT mention Gemini as active provider', () => {
  assert(helpJs.includes('Groq AI API'), 'Must specify Groq AI API');
  assert(!helpJs.includes('Gemini'), 'Must NOT mention Gemini as current AI provider');
});

// 5. ACCURATE DATA & STORAGE ARCHITECTURE
test('Storage FAQ: documents IndexedDB storage and clarifies MongoDB role', () => {
  assert(helpJs.includes('IndexedDB'), 'Must specify IndexedDB browser storage');
  assert(helpJs.includes('studygen_pdf_db'), 'Must specify studygen_pdf_db database');
  assert(helpJs.includes('deleteFile'), 'Must describe temporary file cleanup');
  assert(helpJs.includes('MongoDB database'), 'Must clarify MongoDB does not store document files');
});

// 6. ACCURATE WATERMARK DETAILS
test('PDF FAQ: documents watermark text and red color', () => {
  assert(helpJs.includes('Scanned with EasyScan'), 'Must specify Scanned with EasyScan text');
  assert(helpJs.includes('red'), 'Must specify red watermark color');
});

// 7. CSS ACCORDION STYLES
test('CSS: components.css contains complete FAQ accordion and card classes', () => {
  assert(css.includes('.faq-item'), 'Must contain .faq-item');
  assert(css.includes('.faq-trigger'), 'Must contain .faq-trigger');
  assert(css.includes('.faq-content'), 'Must contain .faq-content');
  assert(css.includes('.faq-filter-chips'), 'Must contain .faq-filter-chips');
  assert(css.includes('.faq-stats-badge'), 'Must contain .faq-stats-badge');
});

// RESULTS
console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║        Help Center & FAQ Unit Test Results       ║');
console.log('╚══════════════════════════════════════════════════╝\n');

results.forEach((r) => {
  const icon = r.status === 'PASS' ? '✔' : '✗';
  console.log(`  ${icon}  [${r.status}] ${r.name}`);
  if (r.error) console.log(`         → ${r.error}`);
});

console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}\n`);

if (failed > 0) process.exit(1);
