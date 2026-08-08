/**
 * StudyGen AI — Smart Document Scanner Logic
 * Camera simulation, edge detection state, shutter flash, multi-page capture
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  let pageCount = 0;
  let currentMode = 'single';
  let isFlashOn = false;

  const captureBtn   = document.getElementById('captureBtn');
  const shutterFlash = document.getElementById('shutterFlash');
  const pageCounter  = document.getElementById('pageCounter');
  const thumbStrip   = document.getElementById('thumbStrip');
  const doneBtn      = document.getElementById('doneBtn');
  const flashToggle  = document.getElementById('flashToggle');
  const flashIcon    = document.getElementById('flashIcon');
  const closeBtn     = document.getElementById('closeBtn');
  const galleryBtn   = document.getElementById('galleryBtn');

  // ── Flashlight Toggle ───────────────────────────────────────────────────────
  if (flashToggle) {
    flashToggle.addEventListener('click', () => {
      isFlashOn = !isFlashOn;
      flashIcon.textContent = isFlashOn ? 'flash_on' : 'flash_off';
      flashToggle.style.color = isFlashOn ? 'var(--warning)' : 'white';
      StudyGenApp.toast.show(isFlashOn ? 'Flashlight ON 💡' : 'Flashlight OFF');
    });
  }

  // ── Close Scanner ──────────────────────────────────────────────────────────
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.location.href = 'home.html';
    });
  }

  // ── Mode Switcher ──────────────────────────────────────────────────────────
  const modePills = document.querySelectorAll('.mode-pill');
  modePills.forEach(pill => {
    pill.addEventListener('click', () => {
      modePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentMode = pill.getAttribute('data-mode');
      StudyGenApp.toast.show(`Mode: ${pill.textContent}`);
    });
  });

  // ── Capture Action ─────────────────────────────────────────────────────────
  if (captureBtn) {
    captureBtn.addEventListener('click', () => {
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(30);

      // Shutter flash effect
      shutterFlash.style.opacity = '1';
      setTimeout(() => shutterFlash.style.opacity = '0', 150);

      // Increment count
      pageCount++;
      pageCounter.textContent = `${pageCount} ${pageCount === 1 ? 'Page' : 'Pages'}`;

      // Show thumb strip
      thumbStrip.classList.remove('hidden');
      const thumb = document.createElement('div');
      thumb.className = 'thumb-item flex-center';
      thumb.innerHTML = `<span class="material-icons-round" style="font-size:16px;color:var(--primary)">article</span>`;
      thumbStrip.appendChild(thumb);

      // Show Done / Continue button
      if (doneBtn) doneBtn.classList.remove('hidden');

      // Auto-navigate if single mode
      if (currentMode === 'single') {
        setTimeout(() => {
          sessionStorage.setItem('sg_scan_count', pageCount);
          window.location.href = 'scan-preview.html';
        }, 400);
      }
    });
  }

  // ── Done / Continue Action ─────────────────────────────────────────────────
  if (doneBtn) {
    doneBtn.addEventListener('click', () => {
      sessionStorage.setItem('sg_scan_count', Math.max(1, pageCount));
      window.location.href = 'scan-preview.html';
    });
  }

  // ── Gallery Import Mock ────────────────────────────────────────────────────
  if (galleryBtn) {
    galleryBtn.addEventListener('click', () => {
      StudyGenApp.toast.show('Importing from Gallery...');
      setTimeout(() => {
        sessionStorage.setItem('sg_scan_count', 1);
        window.location.href = 'scan-preview.html';
      }, 600);
    });
  }

});
