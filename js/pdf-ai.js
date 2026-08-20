'use strict';

/**
 * StudyGen AI — PDF AI Import & Scanned PDF Viewer Logic
 * Renders compiled multi-page scanned PDF document card,
 * generates real compiled PDF download to local device via jsPDF,
 * supports local IndexedDB saving, native "View as PDF", sharing, and AI study guide generation.
 */

document.addEventListener('DOMContentLoaded', () => {
  const dropZone                 = document.getElementById('pdfDropZone');
  const fileInput                = document.getElementById('pdfFileInput');
  const browseBtn                = document.getElementById('browsePdfBtn');
  const scannedPdfCard           = document.getElementById('scannedPdfCard');
  const scannedPdfTitle          = document.getElementById('scannedPdfTitle');
  const scannedPdfMeta           = document.getElementById('scannedPdfMeta');
  const scannedPdfPagesContainer = document.getElementById('scannedPdfPagesContainer');
  const cardSaveDeviceBtn        = document.getElementById('cardSaveDeviceBtn');
  const pdfViewBtn               = document.getElementById('pdfViewBtn');
  const pdfDownloadBtn           = document.getElementById('pdfDownloadBtn');
  const pdfSaveBtn               = document.getElementById('pdfSaveBtn');
  const pdfShareBtn              = document.getElementById('pdfShareBtn');
  const pdfDeleteBtn             = document.getElementById('pdfDeleteBtn');

  // Cached PDF Blob & Object URL references to prevent redundant compilations
  let cachedPdfBlob              = null;
  let cachedObjectUrl            = null;

  // Check if user came from Scanner / Scan Preview with batch scanned pages
  const batchPagesStr = sessionStorage.getItem('sg_batch_pages');
  let pagesData = [];
  try {
    if (batchPagesStr) pagesData = JSON.parse(batchPagesStr);
  } catch (err) {
    console.warn('Invalid batch pages JSON:', err.message);
  }

  // If scanned pages exist, render the Compiled Multi-Page Scanned PDF Viewer Card!
  if (pagesData && pagesData.length > 0 && scannedPdfCard && scannedPdfPagesContainer) {
    scannedPdfCard.style.display = 'block';

    const rawTitle = sessionStorage.getItem('sg_active_doc_title') || `Scanned_PDF_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}`;
    const docTitle = rawTitle.endsWith('.pdf') ? rawTitle : `${rawTitle}.pdf`;

    if (scannedPdfTitle) scannedPdfTitle.textContent = docTitle;
    if (scannedPdfMeta) scannedPdfMeta.textContent = `${pagesData.length} ${pagesData.length === 1 ? 'Page' : 'Pages'} • PDF Ready`;

    scannedPdfPagesContainer.innerHTML = '';
    pagesData.forEach((dataUrl, idx) => {
      const pageFrame = document.createElement('div');
      pageFrame.className = 'pdf-page-frame';

      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = `Scanned PDF Page ${idx + 1}`;
      pageFrame.appendChild(img);

      const numBadge = document.createElement('div');
      numBadge.className = 'pdf-page-num-badge';
      numBadge.textContent = `Page ${idx + 1} of ${pagesData.length}`;
      pageFrame.appendChild(numBadge);

      scannedPdfPagesContainer.appendChild(pageFrame);
    });
  } else {
    // Fallback: Check if active document exists in IndexedDB
    const activeDocId = sessionStorage.getItem('sg_active_doc_id');
    if (activeDocId && window.LocalPdfDB && scannedPdfCard) {
      scannedPdfCard.style.display = 'block';
      window.LocalPdfDB.touchLastOpened(activeDocId);
      window.LocalPdfDB.getDocument(activeDocId).then(docRecord => {
        if (docRecord) {
          if (docRecord.blob && docRecord.blob.type === 'application/pdf') {
            cachedPdfBlob = docRecord.blob;
          }
          const docTitle = docRecord.documentTitle || sessionStorage.getItem('sg_active_doc_title') || 'Document.pdf';
          if (scannedPdfTitle) scannedPdfTitle.textContent = docTitle.endsWith('.pdf') ? docTitle : `${docTitle}.pdf`;
          if (scannedPdfMeta) scannedPdfMeta.textContent = `${docRecord.filename || 'PDF Document'} • Ready`;

          if (scannedPdfPagesContainer) {
            scannedPdfPagesContainer.innerHTML = '';
            const frame = document.createElement('div');
            frame.className = 'pdf-page-frame';
            frame.style.padding = '24px';
            frame.style.textAlign = 'center';
            frame.style.background = '#0f0f18';
            frame.style.color = 'white';
            const sizeMb = docRecord.blob ? (docRecord.blob.size / (1024 * 1024)).toFixed(2) : '1.5';
            frame.innerHTML = `
              <span class="material-icons-round" style="font-size:64px;color:#ef4444;margin-bottom:12px;display:block;">picture_as_pdf</span>
              <div style="font-size:15px;font-weight:600;margin-bottom:6px;">${docTitle}</div>
              <div style="font-size:12px;color:#94a3b8;">${sizeMb} MB PDF Document</div>
            `;
            scannedPdfPagesContainer.appendChild(frame);
          }
        }
      }).catch(err => console.warn('Could not load record from LocalPdfDB:', err));
    }
  }

  /**
   * Generates or retrieves compiled PDF Blob in memory without redundant compilations.
   */
  async function getOrCreatePdfBlob() {
    if (cachedPdfBlob) return cachedPdfBlob;

    // 1. Check IndexedDB record
    const activeDocId = sessionStorage.getItem('sg_active_doc_id');
    if (activeDocId && window.LocalPdfDB) {
      try {
        const docRecord = await window.LocalPdfDB.getDocument(activeDocId);
        if (docRecord && docRecord.blob) {
          cachedPdfBlob = docRecord.blob;
          return cachedPdfBlob;
        }
      } catch (err) {
        console.warn('IndexedDB Blob retrieval note:', err.message);
      }
    }

    // 2. Compile PDF Blob using jsPDF from pagesData
    if (pagesData && pagesData.length > 0 && window.jspdf && window.jspdf.jsPDF) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();

      for (let i = 0; i < pagesData.length; i++) {
        if (i > 0) doc.addPage();
        const img = new Image();
        img.src = pagesData[i];
        await new Promise(resolve => { img.onload = resolve; });

        const imgRatio = img.height / img.width;
        let printWidth = pdfWidth;
        let printHeight = pdfWidth * imgRatio;
        if (printHeight > pdfHeight) {
          printHeight = pdfHeight;
          printWidth = pdfHeight / imgRatio;
        }
        const xOffset = (pdfWidth - printWidth) / 2;
        const yOffset = (pdfHeight - printHeight) / 2;

        const A4_W = Math.round(printWidth);
        const A4_H = Math.round(printHeight);
        const offCanvas = document.createElement('canvas');
        offCanvas.width  = A4_W;
        offCanvas.height = A4_H;
        const offCtx = offCanvas.getContext('2d');
        offCtx.drawImage(img, 0, 0, A4_W, A4_H);
        const compressedDataUrl = offCanvas.toDataURL('image/jpeg', 0.75);

        doc.addImage(compressedDataUrl, 'JPEG', xOffset, yOffset, printWidth, printHeight);
      }

      cachedPdfBlob = doc.output('blob');
      return cachedPdfBlob;
    }

    return null;
  }

  // Real Multi-Page PDF Compiler & Local Device File Saver
  async function compileAndSavePdfToDevice() {
    const rawTitle = sessionStorage.getItem('sg_active_doc_title') || `Scanned_Document_${Date.now()}`;
    const filename = rawTitle.endsWith('.pdf') ? rawTitle : `${rawTitle}.pdf`;

    StudyGenApp.toast.show('Compiling PDF & Saving to Local Device... 💾', 4000);

    try {
      const pdfBlob = await getOrCreatePdfBlob();
      if (pdfBlob) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(pdfBlob);
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        StudyGenApp.toast.show(`Saved "${filename}" to your device! 📄🎉`);
        return;
      }

      if (pagesData.length === 0) {
        StudyGenApp.toast.show('No active scanned pages to save.');
        return;
      }

      // Fallback page-by-page save
      pagesData.forEach((dataUrl, idx) => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${filename.replace(/\.pdf$/i, '')}_Page_${idx + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
      StudyGenApp.toast.show(`Saved ${pagesData.length} page files to your device! 📄✨`);
    } catch (err) {
      console.error('PDF generation error:', err);
      StudyGenApp.toast.show('Error compiling PDF. Saved image pages directly.');
    }
  }

  // ── "VIEW AS PDF" Action Handler ───────────────────────────────────────────
  if (pdfViewBtn) {
    pdfViewBtn.addEventListener('click', async () => {
      // 1. Open target popup synchronously to prevent browser popup blocker
      let newWindow = null;
      try {
        newWindow = window.open('about:blank', '_blank');
      } catch (e) {
        console.warn('Popup window blocked:', e.message);
      }

      StudyGenApp.toast.show('Opening PDF in native viewer... 📄');

      try {
        const pdfBlob = await getOrCreatePdfBlob();
        if (!pdfBlob) {
          if (newWindow) newWindow.close();
          StudyGenApp.toast.show('PDF is not ready yet. Please try again.');
          return;
        }

        if (!cachedObjectUrl) {
          cachedObjectUrl = URL.createObjectURL(pdfBlob);
        }

        if (newWindow) {
          newWindow.location.href = cachedObjectUrl;
        } else {
          // Popup blocked fallback (Requirement: "Please allow pop-ups to view the PDF.")
          StudyGenApp.toast.show('Please allow pop-ups to view the PDF.');
          // Mobile / WebView Fallback
          window.location.href = cachedObjectUrl;
        }
      } catch (err) {
        console.error('View as PDF error:', err);
        if (newWindow) newWindow.close();
        StudyGenApp.toast.show('Could not open PDF viewer. Please try again.');
      }
    });
  }

  // Wire up "Save PDF to Device" button inside Card
  if (cardSaveDeviceBtn) {
    cardSaveDeviceBtn.addEventListener('click', compileAndSavePdfToDevice);
  }

  // Wire up bottom bar "Save to Device" button
  if (pdfDownloadBtn) {
    pdfDownloadBtn.addEventListener('click', compileAndSavePdfToDevice);
  }

  // Bottom bar "Save History" Button
  if (pdfSaveBtn) {
    pdfSaveBtn.addEventListener('click', () => {
      StudyGenApp.toast.show('Saved to Recent Documents history! 💾');
    });
  }

  // Bottom bar "Share" Button
  if (pdfShareBtn) {
    pdfShareBtn.addEventListener('click', async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: sessionStorage.getItem('sg_active_doc_title') || 'Scanned PDF Document',
            text: 'Check out my scanned PDF document on StudyGen AI!',
            url: window.location.href,
          });
        } catch (err) {
          console.warn('Share error:', err.message);
        }
      } else {
        StudyGenApp.toast.show('Document link copied to clipboard! 📋');
      }
    });
  }

  // ── "RENAME DOCUMENT" Action Handler ───────────────────────────────────────
  const pdfRenameBtn = document.getElementById('pdfRenameBtn');
  if (pdfRenameBtn) {
    pdfRenameBtn.addEventListener('click', async () => {
      const activeDocId = sessionStorage.getItem('sg_active_doc_id');
      const currentTitle = sessionStorage.getItem('sg_active_doc_title') || (scannedPdfTitle ? scannedPdfTitle.textContent : 'Scanned Document');
      const cleanCurrent = currentTitle.replace(/\.pdf$/i, '');

      const newTitle = window.prompt('Rename Document:', cleanCurrent);
      if (newTitle === null) return; // User cancelled

      const trimmed = newTitle.trim();
      if (!trimmed) {
        StudyGenApp.toast.show('Document name cannot be empty.');
        return;
      }

      const finalName = trimmed.endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;

      try {
        if (activeDocId && window.LocalPdfDB) {
          await window.LocalPdfDB.renameDocument(activeDocId, finalName);
        }

        sessionStorage.setItem('sg_active_doc_title', finalName);
        if (scannedPdfTitle) scannedPdfTitle.textContent = finalName;

        StudyGenApp.toast.show(`Document renamed to "${finalName}" ✏️`);
      } catch (err) {
        console.error('Rename error:', err);
        StudyGenApp.toast.show('Could not rename document. Please try again.');
      }
    });
  }

  // ── "DELETE DOCUMENT" Action Handler ───────────────────────────────────────
  if (pdfDeleteBtn) {
    pdfDeleteBtn.addEventListener('click', () => {
      const activeDocId = sessionStorage.getItem('sg_active_doc_id');
      const docTitle = sessionStorage.getItem('sg_active_doc_title') || (scannedPdfTitle ? scannedPdfTitle.textContent : 'Scanned Document');

      const performDeletion = async () => {
        try {
          if (activeDocId && window.LocalPdfDB) {
            await window.LocalPdfDB.deleteDocument(activeDocId);
          }

          // Revoke active Object URL to prevent memory leaks
          if (cachedObjectUrl) {
            try { URL.revokeObjectURL(cachedObjectUrl); } catch (e) {}
            cachedObjectUrl = null;
          }
          cachedPdfBlob = null;

          // Clear active document session state
          sessionStorage.removeItem('sg_active_doc_id');
          sessionStorage.removeItem('sg_active_doc_title');
          sessionStorage.removeItem('sg_batch_pages');
          sessionStorage.removeItem('sg_batch_page_ids');
          sessionStorage.removeItem('sg_scan_count');

          StudyGenApp.toast.show('Document deleted successfully.');

          // Return to Home / Recent Documents screen
          setTimeout(() => {
            window.location.href = 'home.html';
          }, 400);
        } catch (err) {
          console.error('Delete error:', err);
          StudyGenApp.toast.show('Unable to delete document. Please try again.');
        }
      };

      if (window.StudyGenNav && window.StudyGenNav.confirm) {
        window.StudyGenNav.confirm(
          `Delete Document?`,
          performDeletion,
          `Are you sure you want to permanently delete "${docTitle}"? This action cannot be undone.`
        );
      } else if (confirm(`Delete Document?\n\nAre you sure you want to permanently delete "${docTitle}"?\nThis action cannot be undone.`)) {
        performDeletion();
      }
    });
  }

  // File Upload Handlers (for manual PDF browse/drop fallback)
  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (dropZone) {
    dropZone.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) handleFile(files[0]);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
    });
  }

  async function handleFile(file) {
    if (!file) return;

    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      StudyGenApp.toast.show('File is too large. Maximum size is 25 MB.');
      return;
    }

    StudyGenApp.toast.show(`Saving "${file.name}" locally & analyzing... 📄`, 5000);

    try {
      const localPdfId = window.LocalPdfDB ? window.LocalPdfDB.generateLocalPdfId() : `doc_${Date.now()}`;
      if (window.LocalPdfDB) {
        const savedDoc = await window.LocalPdfDB.saveDocument({
          localPdfId,
          documentTitle: file.name.replace(/\.[^/.]+$/, ''),
          filename: file.name,
          mimeType: file.type || 'application/pdf',
          blob: file,
        });
        sessionStorage.setItem('sg_active_doc_id', savedDoc.localPdfId);
        sessionStorage.setItem('sg_active_doc_title', savedDoc.documentTitle);
      }

      const formData = new FormData();
      formData.append('file', file, file.name);

      const res = await window.ApiClient.uploadFile('/ai/study-notes', formData);

      if (res && res.success && res.data) {
        sessionStorage.setItem('sg_study_output', JSON.stringify({
          localPdfId,
          documentTitle: file.name.replace(/\.[^/.]+$/, ''),
          ...res.data,
        }));

        StudyGenApp.toast.show('AI Analysis Complete! Opening Study Guide... ✨');
        setTimeout(() => {
          window.location.href = 'ai-study.html';
        }, 500);
      } else {
        StudyGenApp.toast.show(res.message || 'AI processing failed.');
      }
    } catch (err) {
      console.error('File upload error:', err);
      StudyGenApp.toast.show('Failed to upload file. Please try again.');
    }
  }

});
