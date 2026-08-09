'use strict';

/**
 * StudyGen AI — Smart Document Scanner & Mobile Gallery Integration
 * Connects HTML5 mediaDevices camera stream, native mobile camera capture,
 * and mobile phone gallery image/PDF selection to IndexedDB.
 */

document.addEventListener('DOMContentLoaded', () => {

  let pageCount = 0;
  let currentMode = 'single';
  let isFlashOn = false;
  let mediaStream = null;

  const captureBtn       = document.getElementById('captureBtn');
  const shutterFlash     = document.getElementById('shutterFlash');
  const pageCounter      = document.getElementById('pageCounter');
  const thumbStrip       = document.getElementById('thumbStrip');
  const doneBtn          = document.getElementById('doneBtn');
  const flashToggle      = document.getElementById('flashToggle');
  const flashIcon        = document.getElementById('flashIcon');
  const closeBtn         = document.getElementById('closeBtn');
  const galleryBtn       = document.getElementById('galleryBtn');
  const galleryThumb     = document.getElementById('galleryThumb');
  const cameraVideo      = document.getElementById('cameraVideo');
  const docSimOverlay    = document.getElementById('docSimOverlay');
  const galleryInput     = document.getElementById('galleryInput');
  const cameraFileInput  = document.getElementById('cameraFileInput');

  // Initialize live mobile HTML5 camera stream if supported
  async function initCameraStream() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });
        if (cameraVideo) {
          cameraVideo.srcObject = mediaStream;
          cameraVideo.style.display = 'block';
          if (docSimOverlay) docSimOverlay.style.display = 'none';
        }
      } catch (err) {
        console.warn('Live camera stream fallback to native camera file picker:', err.message);
      }
    }
  }

  initCameraStream();

  // Stop camera tracks when navigating away
  function stopCameraStream() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
  }

  if (flashToggle) {
    flashToggle.addEventListener('click', () => {
      isFlashOn = !isFlashOn;
      if (flashIcon) flashIcon.textContent = isFlashOn ? 'flash_on' : 'flash_off';
      flashToggle.style.color = isFlashOn ? 'var(--warning)' : 'white';

      // Attempt web track flashlight if supported on mobile Chrome
      if (mediaStream) {
        const track = mediaStream.getVideoTracks()[0];
        if (track && track.getCapabilities && track.getCapabilities().torch) {
          track.applyConstraints({ advanced: [{ torch: isFlashOn }] }).catch(() => {});
        }
      }
      StudyGenApp.toast.show(isFlashOn ? 'Flashlight ON 💡' : 'Flashlight OFF');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      stopCameraStream();
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

  // Saves a File or Blob to local IndexedDB and routes to preview
  async function processAndSaveDocument(blob, originalFilename = null, mimeType = 'image/jpeg') {
    try {
      const localPdfId = window.LocalPdfDB.generateLocalPdfId();
      const dateStr = new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
      const title = originalFilename ? originalFilename.replace(/\.[^/.]+$/, "") : `Scan_${dateStr}_P${Math.max(1, pageCount)}`;
      const filename = originalFilename || `${title}.jpg`;

      const savedDoc = await window.LocalPdfDB.saveDocument({
        localPdfId,
        documentTitle: title,
        filename,
        mimeType: mimeType || blob.type || 'image/jpeg',
        blob,
      });

      sessionStorage.setItem('sg_active_doc_id', savedDoc.localPdfId);
      sessionStorage.setItem('sg_active_doc_title', savedDoc.documentTitle);
      sessionStorage.setItem('sg_scan_count', pageCount || 1);

      stopCameraStream();
      window.location.href = 'scan-preview.html';
    } catch (err) {
      console.error('Scan save error:', err);
      stopCameraStream();
      window.location.href = 'scan-preview.html';
    }
  }

  // Captures a frame from active live video camera feed
  async function captureVideoFrame() {
    if (!cameraVideo || !cameraVideo.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  }

  // Handle Capture Button click
  if (captureBtn) {
    captureBtn.addEventListener('click', async () => {
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

      // If live video is active, capture video frame
      if (cameraVideo && cameraVideo.srcObject && cameraVideo.videoWidth > 0) {
        const frameBlob = await captureVideoFrame();
        if (frameBlob && currentMode === 'single') {
          await processAndSaveDocument(frameBlob);
          return;
        }
      }

      // If live video stream is not active, trigger mobile native camera file input
      if (cameraFileInput && currentMode === 'single') {
        cameraFileInput.click();
      }
    });
  }

  // Handle mobile native camera file capture selection
  if (cameraFileInput) {
    cameraFileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      StudyGenApp.toast.show('Processing captured photo...');
      await processAndSaveDocument(file, file.name, file.type);
    });
  }

  // Handle Mobile Gallery Selection (Both galleryBtn and galleryThumb)
  function triggerGalleryPicker() {
    if (galleryInput) {
      galleryInput.click();
    } else {
      StudyGenApp.toast.show('Gallery picker unavailable on this browser.');
    }
  }

  if (galleryBtn) galleryBtn.addEventListener('click', triggerGalleryPicker);
  if (galleryThumb) galleryThumb.addEventListener('click', triggerGalleryPicker);

  if (galleryInput) {
    galleryInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      StudyGenApp.toast.show(`Importing ${file.name}...`);
      await processAndSaveDocument(file, file.name, file.type);
    });
  }

  if (doneBtn) {
    doneBtn.addEventListener('click', async () => {
      pageCount = Math.max(1, pageCount);
      if (cameraVideo && cameraVideo.srcObject && cameraVideo.videoWidth > 0) {
        const frameBlob = await captureVideoFrame();
        if (frameBlob) {
          await processAndSaveDocument(frameBlob);
          return;
        }
      }
      if (galleryInput && galleryInput.files && galleryInput.files[0]) {
        const file = galleryInput.files[0];
        await processAndSaveDocument(file, file.name, file.type);
      } else {
        // Fallback demo canvas if no media captured
        const dummyCanvas = document.createElement('canvas');
        dummyCanvas.width = 600;
        dummyCanvas.height = 800;
        const ctx = dummyCanvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 600, 800);
        ctx.fillStyle = '#333333';
        ctx.font = '20px Inter, sans-serif';
        ctx.fillText(`Scanned Document: Mobile Capture`, 50, 100);
        const blob = await new Promise(resolve => dummyCanvas.toBlob(resolve, 'image/jpeg', 0.9));
        await processAndSaveDocument(blob);
      }
    });
  }

});
