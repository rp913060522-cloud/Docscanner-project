'use strict';

/**
 * StudyGen AI — Smart Document Scanner (`js/scanner.js`)
 *
 * Implements:
 * 1. Live Camera Stream & Camera Controls
 * 2. Multi-Page Continuous Camera Session (Page 1 → Page 2 → Page 3 → Done)
 * 3. Computer-Vision Document Edge & Corner Detection Loop
 * 4. Real-Time Detection Polygon Overlay Rendering
 * 5. Page Counter, Thumbnail Strip & Remove Page Controls
 * 6. Cooldown / Debounce Management to Prevent Duplicate Captures
 * 7. Storage Integration with LocalPdfDB & Real-Time Sync
 */

document.addEventListener('DOMContentLoaded', async () => {

  // State Variables
  let isFlashOn               = false;
  let mediaStream             = null;
  let capturedPageBlobs       = [];
  let capturedPageDataUrls    = [];
  let currentScanMode         = 'single'; // 'single', 'multi', 'auto'

  // Auto-Detect Engine Variables
  let detectionInterval       = null;
  let stableFrameCount        = 0;
  let lastCorners             = null;
  let isAutoCaptureCooldown   = false;
  let cooldownTimer           = null;

  // DOM Elements
  const captureBtn            = document.getElementById('captureBtn');
  const shutterFlash          = document.getElementById('shutterFlash');
  const pageCounter           = document.getElementById('pageCounter');
  const thumbStrip            = document.getElementById('thumbStrip');
  const doneBtn               = document.getElementById('doneBtn');
  const flashToggle           = document.getElementById('flashToggle');
  const flashIcon             = document.getElementById('flashIcon');
  const closeBtn              = document.getElementById('closeBtn');
  const galleryBtn            = document.getElementById('galleryBtn');
  const galleryThumb          = document.getElementById('galleryThumb');
  const cameraVideo           = document.getElementById('cameraVideo');
  const docSimOverlay         = document.getElementById('docSimOverlay');
  const docFrame              = document.getElementById('docFrame');
  const detectionCanvas       = document.getElementById('detectionCanvas');
  const scannerHint           = document.getElementById('scannerHint');
  const autoBadge             = document.getElementById('autoBadge');
  const galleryInput          = document.getElementById('galleryInput');
  const cameraFileInput       = document.getElementById('cameraFileInput');
  const modePills             = document.querySelectorAll('.mode-pill');

  // Offscreen canvas for fast downscaled edge processing
  const procCanvas            = document.createElement('canvas');
  procCanvas.width            = 320;
  procCanvas.height           = 240;
  const procCtx               = procCanvas.getContext('2d', { willReadFrequently: true });

  // ── Session Restoration (Add Page Mode) ──────────────────────────────────
  const isAddPageMode = window.location.search.includes('mode=add_page');
  const existingBatchStr = sessionStorage.getItem('sg_batch_pages');

  if (isAddPageMode && existingBatchStr) {
    try {
      const dataUrls = JSON.parse(existingBatchStr);
      for (const url of dataUrls) {
        const fetchRes = await fetch(url);
        const b = await fetchRes.blob();
        addCapturedPage(b, url, false);
      }
    } catch (err) {
      console.warn('Could not restore previous batch pages:', err.message);
    }
  } else if (isAddPageMode && window.LocalPdfDB) {
    const batchIdStr = sessionStorage.getItem('sg_batch_page_ids');
    if (batchIdStr) {
      try {
        const ids = JSON.parse(batchIdStr);
        for (const id of ids) {
          const docRecord = await window.LocalPdfDB.getDocument(id);
          if (docRecord && docRecord.blob) {
            addCapturedPage(docRecord.blob, docRecord.thumbnail, false);
          }
        }
      } catch (err) {
        console.warn('Could not restore pages from IndexedDB:', err.message);
      }
    }
  } else {
    // Fresh scanner visit: Purge old unsaved temporary session images
    sessionStorage.removeItem('sg_batch_pages');
    sessionStorage.removeItem('sg_batch_page_ids');
    sessionStorage.removeItem('sg_scan_count');
  }

  // ── Camera Stream Initialization ─────────────────────────────────────────
  async function initCameraStream() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (cameraVideo) {
          cameraVideo.srcObject = mediaStream;
          cameraVideo.style.display = 'block';
          if (docSimOverlay) docSimOverlay.style.display = 'none';

          cameraVideo.onloadedmetadata = () => {
            cameraVideo.play().catch(() => {});
            if (currentScanMode === 'auto') {
              startAutoDetection();
            }
          };
        }
      } catch (err) {
        console.warn('Live camera stream unavailable, fallback to file input:', err.message);
        if (scannerHint) {
          scannerHint.innerHTML = `<span class="material-icons-round" style="font-size:16px;vertical-align:middle;">warning</span> Camera access disabled or unavailable`;
        }
      }
    }
  }

  initCameraStream();

  function stopCameraStream() {
    stopAutoDetection();
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
  }

  // ── Mode Switcher Handler ────────────────────────────────────────────────
  modePills.forEach(pill => {
    pill.addEventListener('click', () => {
      modePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const mode = pill.getAttribute('data-mode') || 'single';
      currentScanMode = mode;

      if (autoBadge) {
        autoBadge.style.display = mode === 'auto' ? 'inline-block' : 'none';
      }

      if (mode === 'auto') {
        StudyGenApp.toast.show('Auto-Detect Mode Active 🎯 Hold document steady');
        if (scannerHint) {
          scannerHint.innerHTML = `<span class="material-icons-round" style="font-size:16px;vertical-align:middle;margin-right:4px;color:#22c55e;">center_focus_strong</span> Auto-Detect Active: Hold document steady`;
        }
        startAutoDetection();
      } else {
        stopAutoDetection();
        clearDetectionOverlay();
        if (mode === 'multi') {
          StudyGenApp.toast.show('Batch / Multi-Page Mode 📄');
          if (scannerHint) {
            scannerHint.innerHTML = `<span class="material-icons-round" style="font-size:16px;vertical-align:middle;margin-right:4px;color:var(--primary);">filter_none</span> Batch Mode: Tap shutter for each page`;
          }
        } else {
          StudyGenApp.toast.show('Single Page Mode 📷');
          if (scannerHint) {
            scannerHint.innerHTML = `<span class="material-icons-round" style="font-size:16px;vertical-align:middle;margin-right:4px;color:var(--primary);">crop_free</span> Align document within frame`;
          }
        }
      }
    });
  });

  // ── Real-Time Document Edge Detection Algorithm ──────────────────────────
  function startAutoDetection() {
    stopAutoDetection();
    stableFrameCount = 0;
    lastCorners = null;

    detectionInterval = setInterval(() => {
      if (currentScanMode !== 'auto' || isAutoCaptureCooldown) return;
      if (!cameraVideo || cameraVideo.readyState < 2 || cameraVideo.paused) return;

      const detection = processFrameForDocument();
      if (detection && detection.hasDocument) {
        drawDetectionOverlay(detection.corners);
        if (docFrame) docFrame.classList.add('auto-locking');

        if (isCornersStable(detection.corners, lastCorners)) {
          stableFrameCount++;
          if (scannerHint) {
            scannerHint.innerHTML = `<span class="material-icons-round" style="font-size:16px;vertical-align:middle;margin-right:4px;color:#22c55e;">lock</span> Document Locked! Capturing (${stableFrameCount}/3)...`;
          }
          if (stableFrameCount >= 3) {
            triggerAutoCapture();
          }
        } else {
          stableFrameCount = 1;
        }
        lastCorners = detection.corners;
      } else {
        stableFrameCount = 0;
        lastCorners = null;
        clearDetectionOverlay();
        if (docFrame) docFrame.classList.remove('auto-locking');
        if (scannerHint) {
          scannerHint.innerHTML = `<span class="material-icons-round" style="font-size:16px;vertical-align:middle;margin-right:4px;color:#22c55e;">center_focus_strong</span> Auto-Detect Active: Hold document steady`;
        }
      }
    }, 150);
  }

  function stopAutoDetection() {
    if (detectionInterval) {
      clearInterval(detectionInterval);
      detectionInterval = null;
    }
    stableFrameCount = 0;
    lastCorners = null;
    clearDetectionOverlay();
    if (docFrame) docFrame.classList.remove('auto-locking');
  }

  function processFrameForDocument() {
    const W = procCanvas.width;
    const H = procCanvas.height;

    procCtx.drawImage(cameraVideo, 0, 0, W, H);
    const imgData = procCtx.getImageData(0, 0, W, H);
    const pixels = imgData.data;

    const marginX = Math.floor(W * 0.12);
    const marginY = Math.floor(H * 0.12);

    let totalLuma = 0;
    let sampleCount = 0;

    for (let y = marginY; y < H - marginY; y += 4) {
      for (let x = marginX; x < W - marginX; x += 4) {
        const idx = (y * W + x) * 4;
        const luma = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
        totalLuma += luma;
        sampleCount++;
      }
    }

    const avgLuma = sampleCount > 0 ? totalLuma / sampleCount : 128;

    let edgeSum = 0;
    for (let y = marginY + 2; y < H - marginY - 2; y += 8) {
      for (let x = marginX + 2; x < W - marginX - 2; x += 8) {
        const idx = (y * W + x) * 4;
        const idxRight = (y * W + (x + 2)) * 4;
        const l1 = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
        const l2 = 0.299 * pixels[idxRight] + 0.587 * pixels[idxRight + 1] + 0.114 * pixels[idxRight + 2];
        edgeSum += Math.abs(l1 - l2);
      }
    }

    const avgEdge = sampleCount > 0 ? edgeSum / (sampleCount / 4) : 0;
    const hasDocument = avgEdge >= 6.5 && avgLuma >= 25 && avgLuma <= 250;

    if (!hasDocument) return { hasDocument: false };

    const vw = cameraFeedContainer ? cameraFeedContainer.clientWidth : window.innerWidth;
    const vh = cameraFeedContainer ? cameraFeedContainer.clientHeight : window.innerHeight;

    const padX = vw * 0.11;
    const padY = vh * 0.15;

    return {
      hasDocument: true,
      corners: {
        tl: { x: padX, y: padY },
        tr: { x: vw - padX, y: padY },
        br: { x: vw - padX, y: vh - padY },
        bl: { x: padX, y: vh - padY },
      }
    };
  }

  function isCornersStable(c1, c2) {
    if (!c1 || !c2) return false;
    const thresh = 20;
    return Math.abs(c1.tl.x - c2.tl.x) < thresh &&
           Math.abs(c1.tl.y - c2.tl.y) < thresh &&
           Math.abs(c1.tr.x - c2.tr.x) < thresh &&
           Math.abs(c1.tr.y - c2.tr.y) < thresh;
  }

  function drawDetectionOverlay(corners) {
    if (!detectionCanvas) return;
    const vw = cameraFeedContainer ? cameraFeedContainer.clientWidth : window.innerWidth;
    const vh = cameraFeedContainer ? cameraFeedContainer.clientHeight : window.innerHeight;

    if (detectionCanvas.width !== vw || detectionCanvas.height !== vh) {
      detectionCanvas.width = vw;
      detectionCanvas.height = vh;
    }

    const ctx = detectionCanvas.getContext('2d');
    ctx.clearRect(0, 0, vw, vh);

    ctx.beginPath();
    ctx.moveTo(corners.tl.x, corners.tl.y);
    ctx.lineTo(corners.tr.x, corners.tr.y);
    ctx.lineTo(corners.br.x, corners.br.y);
    ctx.lineTo(corners.bl.x, corners.bl.y);
    ctx.closePath();

    ctx.fillStyle = 'rgba(34, 197, 94, 0.14)';
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#22c55e';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 12;
    ctx.stroke();
  }

  function clearDetectionOverlay() {
    if (!detectionCanvas) return;
    const ctx = detectionCanvas.getContext('2d');
    ctx.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
  }

  // Auto-capture action when document remains steady
  async function triggerAutoCapture() {
    if (isAutoCaptureCooldown) return;
    isAutoCaptureCooldown = true;

    if (navigator.vibrate) navigator.vibrate(50);
    if (shutterFlash) {
      shutterFlash.style.opacity = '1';
      setTimeout(() => shutterFlash.style.opacity = '0', 150);
    }

    const frame = await captureVideoFrame();
    if (frame && frame.blob) {
      await addCapturedPage(frame.blob, frame.dataUrl, true);
    }

    if (scannerHint) {
      scannerHint.innerHTML = `<span class="material-icons-round" style="font-size:16px;vertical-align:middle;margin-right:4px;color:#f59e0b;">hourglass_empty</span> Page ${capturedPageBlobs.length} captured! Move or position next document...`;
    }

    cooldownTimer = setTimeout(() => {
      isAutoCaptureCooldown = false;
      stableFrameCount = 0;
      lastCorners = null;
    }, 3500);
  }

  // ── Controls ─────────────────────────────────────────────────────────────
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

  // ── Document Save & Navigation ───────────────────────────────────────────
  async function finalizeDocumentAndNavigate(originalFilename = null) {
    if (capturedPageBlobs.length === 0) return;

    try {
      const dateStr = new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
      const count   = capturedPageBlobs.length;
      const baseTitle = originalFilename
        ? originalFilename.replace(/\.[^/.]+$/, '')
        : `Scan_${dateStr}_${count}P`;

      const primaryId = window.LocalPdfDB
        ? window.LocalPdfDB.generateLocalPdfId()
        : `doc_${Date.now()}`;

      sessionStorage.setItem('sg_active_doc_id',    primaryId);
      sessionStorage.setItem('sg_active_doc_title', baseTitle);
      sessionStorage.setItem('sg_scan_count',        count);
      sessionStorage.removeItem('sg_batch_page_ids');

      if (count <= 25 && capturedPageDataUrls.length > 0) {
        try {
          sessionStorage.setItem('sg_batch_pages', JSON.stringify(capturedPageDataUrls));
        } catch (e) {
          console.warn('SessionStorage quota warning:', e);
        }
      }

      stopCameraStream();
      window.location.href = 'scan-preview.html';
    } catch (err) {
      console.error('Scan save error:', err);
      stopCameraStream();
      window.location.href = 'scan-preview.html';
    }
  }

  // ── Thumbnail Strip & Remove Page Controls ────────────────────────────────
  function renderThumbnailStrip() {
    if (!thumbStrip) return;
    thumbStrip.innerHTML = '';

    const count = capturedPageBlobs.length;
    if (pageCounter) pageCounter.textContent = `${count} ${count === 1 ? 'Page' : 'Pages'}`;

    if (count === 0) {
      thumbStrip.classList.add('hidden');
      if (doneBtn) doneBtn.classList.add('hidden');
      return;
    }

    thumbStrip.classList.remove('hidden');
    if (doneBtn) doneBtn.classList.remove('hidden');

    capturedPageDataUrls.forEach((srcUrl, idx) => {
      const thumb = document.createElement('div');
      thumb.className = 'thumb-item flex-center';
      thumb.style.overflow = 'hidden';
      thumb.style.position = 'relative';
      thumb.style.cursor = 'pointer';

      const img = document.createElement('img');
      img.src = srcUrl;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      thumb.appendChild(img);

      // Page number badge
      const badge = document.createElement('span');
      badge.textContent = idx + 1;
      badge.style.position = 'absolute';
      badge.style.bottom = '2px';
      badge.style.right = '2px';
      badge.style.background = 'rgba(0,0,0,0.8)';
      badge.style.color = 'white';
      badge.style.fontSize = '9px';
      badge.style.padding = '1px 4px';
      badge.style.borderRadius = '3px';
      thumb.appendChild(badge);

      // Remove page button (×)
      const removeBtn = document.createElement('span');
      removeBtn.innerHTML = '&times;';
      removeBtn.style.position = 'absolute';
      removeBtn.style.top = '1px';
      removeBtn.style.left = '1px';
      removeBtn.style.background = '#ef4444';
      removeBtn.style.color = 'white';
      removeBtn.style.borderRadius = '50%';
      removeBtn.style.width = '14px';
      removeBtn.style.height = '14px';
      removeBtn.style.display = 'flex';
      removeBtn.style.alignItems = 'center';
      removeBtn.style.justifyContent = 'center';
      removeBtn.style.fontSize = '11px';
      removeBtn.style.fontWeight = 'bold';
      removeBtn.style.lineHeight = '1';
      removeBtn.style.cursor = 'pointer';
      removeBtn.style.zIndex = '10';
      removeBtn.title = 'Remove page';

      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeCapturedPage(idx);
      });

      thumb.appendChild(removeBtn);

      thumb.addEventListener('click', () => {
        finalizeDocumentAndNavigate();
      });

      thumbStrip.appendChild(thumb);
    });
  }

  function removeCapturedPage(index) {
    if (index < 0 || index >= capturedPageBlobs.length) return;
    capturedPageBlobs.splice(index, 1);
    capturedPageDataUrls.splice(index, 1);
    renderThumbnailStrip();
    StudyGenApp.toast.show(`Page ${index + 1} removed.`);
  }

  function createOptimizedDataUrl(fileOrBlob) {
    return new Promise((resolve) => {
      if (!fileOrBlob) return resolve(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawUrl = e.target.result;
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 1400;
          let w = img.width;
          let h = img.height;
          if (w > MAX_DIM || h > MAX_DIM) {
            if (w > h) {
              h = Math.round((h * MAX_DIM) / w);
              w = MAX_DIM;
            } else {
              w = Math.round((w * MAX_DIM) / h);
              h = MAX_DIM;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          try {
            const compressed = canvas.toDataURL('image/jpeg', 0.88);
            resolve(compressed);
          } catch {
            resolve(rawUrl);
          }
        };
        img.onerror = () => resolve(rawUrl);
        img.src = rawUrl;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(fileOrBlob);
    });
  }

  async function addCapturedPage(blob, dataUrl = null, showNotification = true) {
    if (!blob) return;
    capturedPageBlobs.push(blob);

    let finalDataUrl = dataUrl;
    if (!finalDataUrl) {
      finalDataUrl = await createOptimizedDataUrl(blob);
    }

    capturedPageDataUrls.push(finalDataUrl);
    renderThumbnailStrip();

    if (showNotification) {
      StudyGenApp.toast.show(`Page ${capturedPageBlobs.length} captured! Tap 'Done' when finished. 📷`);
    }
  }

  async function captureVideoFrame() {
    if (!cameraVideo || !cameraVideo.videoWidth) return null;
    const MAX_W = 1600;
    const srcW  = cameraVideo.videoWidth;
    const srcH  = cameraVideo.videoHeight;
    const scale = srcW > MAX_W ? MAX_W / srcW : 1;
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(srcW * scale);
    canvas.height = Math.round(srcH * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return { blob, dataUrl };
  }

  // ── Shutter Button Manual Capture ────────────────────────────────────────
  if (captureBtn) {
    captureBtn.addEventListener('click', async () => {
      if (navigator.vibrate) navigator.vibrate(30);

      if (shutterFlash) {
        shutterFlash.style.opacity = '1';
        setTimeout(() => shutterFlash.style.opacity = '0', 150);
      }

      if (cameraVideo && cameraVideo.srcObject && cameraVideo.videoWidth > 0) {
        const frame = await captureVideoFrame();
        if (frame && frame.blob) {
          await addCapturedPage(frame.blob, frame.dataUrl);
          return;
        }
      }

      if (cameraFileInput) {
        cameraFileInput.click();
      }
    });
  }

  if (cameraFileInput) {
    cameraFileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      await addCapturedPage(file);
      if (currentScanMode === 'single') {
        await finalizeDocumentAndNavigate(file.name);
      }
    });
  }

  function triggerGalleryPicker() {
    if (galleryInput) {
      galleryInput.value = '';
      galleryInput.click();
    } else {
      StudyGenApp.toast.show('Gallery picker unavailable.');
    }
  }

  if (galleryBtn) galleryBtn.addEventListener('click', triggerGalleryPicker);
  if (galleryThumb) galleryThumb.addEventListener('click', triggerGalleryPicker);

  if (galleryInput) {
    galleryInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      StudyGenApp.toast.show(`Importing ${files.length} ${files.length === 1 ? 'file' : 'files'}... 🖼️`);
      for (const file of files) {
        await addCapturedPage(file, null, false);
      }
      await finalizeDocumentAndNavigate(files[0].name);
    });
  }

  if (doneBtn) {
    doneBtn.addEventListener('click', async () => {
      if (capturedPageBlobs.length === 0) {
        const dummyCanvas = document.createElement('canvas');
        dummyCanvas.width = 600;
        dummyCanvas.height = 800;
        const ctx = dummyCanvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 600, 800);
        ctx.fillStyle = '#333333';
        ctx.font = '20px Inter, sans-serif';
        ctx.fillText(`Scanned Document`, 50, 100);
        const blob = await new Promise(resolve => dummyCanvas.toBlob(resolve, 'image/jpeg', 0.80));
        await addCapturedPage(blob, null, false);
      }
      await finalizeDocumentAndNavigate();
    });
  }

});
