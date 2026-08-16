'use strict';

/**
 * StudyGen AI — Continuous Document Scanner & Batch Capture Logic
 * Enables continuous multi-page document scanning.
 * Each shutter tap captures a page and updates the thumbnail strip & counter.
 * Navigates to scan-preview.html ONLY when the user clicks 'Continue' or taps thumbnails.
 */

document.addEventListener('DOMContentLoaded', async () => {

  let isFlashOn = false;
  let mediaStream = null;
  let capturedPageBlobs = [];

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

  // Restore existing batch pages ONLY if explicitly returning via "Add Page" button (?mode=add_page)
  const isAddPageMode = window.location.search.includes('mode=add_page');
  const existingBatchStr = sessionStorage.getItem('sg_batch_pages');

  if (isAddPageMode && existingBatchStr) {
    try {
      const dataUrls = JSON.parse(existingBatchStr);
      for (const url of dataUrls) {
        const fetchRes = await fetch(url);
        const b = await fetchRes.blob();
        addCapturedPage(b, false); // Add without toast alert
      }
    } catch (err) {
      console.warn('Could not restore previous batch pages:', err.message);
    }
  } else {
    // Fresh scanner visit: Purge old unsaved temporary session images
    sessionStorage.removeItem('sg_batch_pages');
    sessionStorage.removeItem('sg_scan_count');
  }

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
      sessionStorage.removeItem('sg_batch_pages');
      sessionStorage.removeItem('sg_scan_count');
      window.location.href = 'home.html';
    });
  }

  const modePills = document.querySelectorAll('.mode-pill');
  modePills.forEach(pill => {
    pill.addEventListener('click', () => {
      modePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      StudyGenApp.toast.show(`Mode: ${pill.textContent}`);
    });
  });

  // Saves all captured page Blobs to IndexedDB and routes to scan-preview.html
  async function finalizeDocumentAndNavigate(originalFilename = null) {
    if (capturedPageBlobs.length === 0) return;

    try {
      const localPdfId = window.LocalPdfDB ? window.LocalPdfDB.generateLocalPdfId() : `doc_${Date.now()}`;
      const dateStr = new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
      const count = capturedPageBlobs.length;
      const title = originalFilename ? originalFilename.replace(/\.[^/.]+$/, "") : `Scan_${dateStr}_${count}P`;

      // Save primary Blob (first page or merged document) to IndexedDB
      const primaryBlob = capturedPageBlobs[0];
      if (window.LocalPdfDB && primaryBlob) {
        const savedDoc = await window.LocalPdfDB.saveDocument({
          localPdfId,
          documentTitle: title,
          filename: originalFilename || `${title}.jpg`,
          mimeType: primaryBlob.type || 'image/jpeg',
          blob: primaryBlob,
        });

        sessionStorage.setItem('sg_active_doc_id', savedDoc.localPdfId);
        sessionStorage.setItem('sg_active_doc_title', savedDoc.documentTitle);
      }

      sessionStorage.setItem('sg_scan_count', count);

      // Store data URLs for multi-page carousel preview in scan-preview.html
      const dataUrls = await Promise.all(capturedPageBlobs.map(b => new Promise(res => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.readAsDataURL(b);
      })));
      sessionStorage.setItem('sg_batch_pages', JSON.stringify(dataUrls));

      stopCameraStream();
      window.location.href = 'scan-preview.html';
    } catch (err) {
      console.error('Scan save error:', err);
      stopCameraStream();
      window.location.href = 'scan-preview.html';
    }
  }

  // Adds a page Blob to current document batch and updates thumbnail strip & counter
  function addCapturedPage(blob, showNotification = true) {
    if (!blob) return;
    capturedPageBlobs.push(blob);

    const count = capturedPageBlobs.length;
    if (pageCounter) pageCounter.textContent = `${count} ${count === 1 ? 'Page' : 'Pages'}`;

    if (thumbStrip) {
      thumbStrip.classList.remove('hidden');
      const thumb = document.createElement('div');
      thumb.className = 'thumb-item flex-center';
      thumb.style.overflow = 'hidden';
      thumb.style.position = 'relative';
      thumb.style.cursor = 'pointer';

      const img = document.createElement('img');
      img.src = URL.createObjectURL(blob);
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      thumb.appendChild(img);

      // Page number badge on thumbnail
      const badge = document.createElement('span');
      badge.textContent = count;
      badge.style.position = 'absolute';
      badge.style.bottom = '2px';
      badge.style.right = '2px';
      badge.style.background = 'rgba(0,0,0,0.7)';
      badge.style.color = 'white';
      badge.style.fontSize = '9px';
      badge.style.padding = '1px 3px';
      badge.style.borderRadius = '3px';
      thumb.appendChild(badge);

      // Tapping thumbnail opens preview
      thumb.addEventListener('click', () => {
        finalizeDocumentAndNavigate();
      });

      thumbStrip.appendChild(thumb);
    }

    if (doneBtn) doneBtn.classList.remove('hidden');

    if (showNotification) {
      StudyGenApp.toast.show(`Page ${count} captured! Tap shutter for next page or 'Continue' when done. 📷`);
    }
  }

  // Captures a frame from active live video camera feed
  // Max resolution capped at 1920px wide to keep file sizes manageable
  async function captureVideoFrame() {
    if (!cameraVideo || !cameraVideo.videoWidth) return null;
    const MAX_W = 1920;
    const srcW  = cameraVideo.videoWidth;
    const srcH  = cameraVideo.videoHeight;
    const scale = srcW > MAX_W ? MAX_W / srcW : 1;
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(srcW * scale);
    canvas.height = Math.round(srcH * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
    // 0.75 quality gives good visual quality at ~70% smaller file size
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.75));
  }

  // Handle Capture Button click — Continuous capture stays on camera view!
  if (captureBtn) {
    captureBtn.addEventListener('click', async () => {
      if (navigator.vibrate) navigator.vibrate(30);

      if (shutterFlash) {
        shutterFlash.style.opacity = '1';
        setTimeout(() => shutterFlash.style.opacity = '0', 150);
      }

      // If live video stream is active
      if (cameraVideo && cameraVideo.srcObject && cameraVideo.videoWidth > 0) {
        const frameBlob = await captureVideoFrame();
        if (frameBlob) {
          addCapturedPage(frameBlob);
          return;
        }
      }

      // If live video is inactive, fallback to native camera file input
      if (cameraFileInput) {
        cameraFileInput.click();
      }
    });
  }

  // Handle mobile native camera file capture selection
  if (cameraFileInput) {
    cameraFileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      addCapturedPage(file);
    });
  }

  // Handle Mobile Gallery Selection (Both galleryBtn and galleryThumb)
  function triggerGalleryPicker() {
    if (galleryInput) {
      galleryInput.value = '';
      galleryInput.click();
    } else {
      StudyGenApp.toast.show('Gallery picker unavailable on this browser.');
    }
  }

  if (galleryBtn) galleryBtn.addEventListener('click', triggerGalleryPicker);
  if (galleryThumb) galleryThumb.addEventListener('click', triggerGalleryPicker);

  if (galleryInput) {
    galleryInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      StudyGenApp.toast.show(`Importing ${files.length} ${files.length === 1 ? 'file' : 'files'}...`);
      for (const file of files) {
        addCapturedPage(file, false);
      }
      await finalizeDocumentAndNavigate(files[0].name);
    });
  }

  // Done / Continue button — Finishes continuous scanning and opens preview screen
  if (doneBtn) {
    doneBtn.addEventListener('click', async () => {
      if (capturedPageBlobs.length === 0) {
        // Fallback canvas if no pages captured
        const dummyCanvas = document.createElement('canvas');
        dummyCanvas.width = 600;
        dummyCanvas.height = 800;
        const ctx = dummyCanvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 600, 800);
        ctx.fillStyle = '#333333';
        ctx.font = '20px Inter, sans-serif';
        ctx.fillText(`Scanned Document`, 50, 100);
        const blob = await new Promise(resolve => dummyCanvas.toBlob(resolve, 'image/jpeg', 0.75));
        addCapturedPage(blob, false);
      }
      await finalizeDocumentAndNavigate();
    });
  }

});
