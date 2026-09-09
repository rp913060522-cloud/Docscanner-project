'use strict';

/**
 * EasyScan — Web Assets Sync Script for Capacitor
 *
 * Copies the root frontend assets (index.html, pages/, css/, js/, favicon.svg)
 * into the `www/` directory so Capacitor can package them without bundling backend files.
 */

const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const targetDir = path.join(rootDir, 'www');

// Ensure clean www directory
if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}
fs.mkdirSync(targetDir, { recursive: true });

// Items to mirror to www/
const assetsToCopy = [
  'index.html',
  'favicon.svg',
  'pages',
  'css',
  'js',
  'Doc'
];

assetsToCopy.forEach((item) => {
  const src = path.join(rootDir, item);
  const dest = path.join(targetDir, item);

  if (fs.existsSync(src)) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
      console.log(`Copied directory: ${item} -> www/${item}`);
    } else {
      fs.copyFileSync(src, dest);
      console.log(`Copied file: ${item} -> www/${item}`);
    }
  }
});

console.log('Web assets successfully synchronized to www/');
