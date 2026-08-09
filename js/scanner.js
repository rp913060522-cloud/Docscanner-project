'use strict';

/**
 * StudyGen AI — Smart Document Scanner Logic
 * Simulates camera page captures, creates a local IndexedDB document record,
 * and passes the scanned document to preview/study screens.
 */

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

  if (flashToggle) {
    flashToggle.addEventListener('click', () => {
      isFlashOn = !isFlashOn;
      if (flashIcon) flashIcon.textContent = isFlashOn ? 'flash_on' : 'flash_off';
      flashToggle.style.color = isFlashOn ? 'var(--warning)' : 'white';
      StudyGenApp.toast.show(isFlashOn ? 'Flashlight ON 💡' : 'Flashlight OFF');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.location.href = 'home.html';
    });
  }

  const modePills = document.querySelectorAll('.mode-pill');
  modePills.forEach(pill => {
    pill.addEventListener('click', () => {
      modePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentMode = pill.getAttribute('data-mode');
      StudyGenApp.toast.show(`Mode: ${pill.textContent}`);
    });
  });

  async function processCapturedScan() {
    try {
      const localPdfId = window.LocalPdfDB.generateLocalPdfId();
      const title = `Scan_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}_${pageCount}P`;

      // Create a lightweight image/canvas blob representing the scanned page
      const dummyCanvas = document.createElement('canvas');
      dummyCanvas.width = 600;
      dummyCanvas.height = 800;
      const ctx = dummyCanvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 600, 800);
      ctx.fillStyle = '#333333';
      ctx.font = '20px Inter, sans-serif';
      ctx.fillText(`Scanned Document: ${title}`, 50, 100);
      ctx.fillText(`Pages Captured: ${pageCount}`, 50, 140);
      ctx.fillText(`Date: ${new Date().toLocaleString()}`, 50, 180);

      const blob = await new Promise(resolve => dummyCanvas.toBlob(resolve, 'image/jpeg', 0.9));

      const savedDoc = await window.LocalPdfDB.saveDocument({
        localPdfId,
        documentTitle: title,
        filename: `${title}.jpg`,
        mimeType: 'image/jpeg',
        blob,
      });

      sessionStorage.setItem('sg_active_doc_id', savedDoc.localPdfId);
      sessionStorage.setItem('sg_active_doc_title', savedDoc.documentTitle);
      sessionStorage.setItem('sg_scan_count', pageCount);

      window.location.href = 'scan-preview.html';
    } catch (err) {
      console.error('Scan save error:', err);
      window.location.href = 'scan-preview.html';
    }
  }

  if (captureBtn) {
    captureBtn.addEventListener('click', () => {
      if (navigator.vibrate) navigator.vibrate(30);

      if (shutterFlash) {
        shutterFlash.style.opacity = '1';
        setTimeout(() => shutterFlash.style.opacity = '0', 150);
      }

      pageCount++;
      if (pageCounter) pageCounter.textContent = `${pageCount} ${pageCount === 1 ? 'Page' : 'Pages'}`;

      if (thumbStrip) {
        thumbStrip.classList.remove('hidden');
        const thumb = document.createElement('div');
        thumb.className = 'thumb-item flex-center';
        thumb.innerHTML = `<span class="material-icons-round" style="font-size:16px;color:var(--primary)">article</span>`;
        thumbStrip.appendChild(thumb);
      }

      if (doneBtn) doneBtn.classList.remove('hidden');

      if (currentMode === 'single') {
        setTimeout(() => {
          processCapturedScan();
        }, 400);
      }
    });
  }

  if (doneBtn) {
    doneBtn.addEventListener('click', () => {
      pageCount = Math.max(1, pageCount);
      processCapturedScan();
    });
  }

  if (galleryBtn) {
    galleryBtn.addEventListener('click', () => {
      StudyGenApp.toast.show('Importing from Gallery...');
      pageCount = 1;
      setTimeout(() => {
        processCapturedScan();
      }, 600);
    });
  }

});
