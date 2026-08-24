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
  // ── 1. Render Document Pages & Metadata ─────────────────────────────────────
  async function renderDocPages() {
    if (!scannedPdfCard || !scannedPdfPagesContainer) return;
    scannedPdfCard.style.display = 'block';

    const activeDocId = sessionStorage.getItem('sg_active_doc_id');
    let docRecord = null;

    if (activeDocId && window.LocalPdfDB) {
      try {
        docRecord = await window.LocalPdfDB.getDocument(activeDocId);
        if (docRecord) {
          window.LocalPdfDB.touchLastOpened(activeDocId);
          if (docRecord.blob && docRecord.blob.type === 'application/pdf') {
            cachedPdfBlob = docRecord.blob;
          }
        }
      } catch (err) {
        console.warn('LocalPdfDB retrieval warning:', err.message);
      }
    }

    const rawTitle = (docRecord && docRecord.documentTitle) || sessionStorage.getItem('sg_active_doc_title') || `Scanned_PDF_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}`;
    const docTitle = rawTitle.endsWith('.pdf') ? rawTitle : `${rawTitle}.pdf`;

    // Filter valid base64 data URLs from batch pages
    const validDataImages = (pagesData || []).filter(p => typeof p === 'string' && p.startsWith('data:image'));
    const totalPages = validDataImages.length || (docRecord && docRecord.pageCount) || 1;

    if (scannedPdfTitle) scannedPdfTitle.textContent = docTitle;
    if (scannedPdfMeta) scannedPdfMeta.textContent = `${totalPages} ${totalPages === 1 ? 'Page' : 'Pages'} • PDF Ready`;

    scannedPdfPagesContainer.innerHTML = '';

    if (validDataImages.length > 0) {
      validDataImages.forEach((dataUrl, idx) => {
        const pageFrame = document.createElement('div');
        pageFrame.className = 'pdf-page-frame';

        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = `Scanned PDF Page ${idx + 1}`;
        img.onerror = () => {
          img.style.display = 'none';
        };
        pageFrame.appendChild(img);

        const numBadge = document.createElement('div');
        numBadge.className = 'pdf-page-num-badge';
        numBadge.textContent = `Page ${idx + 1} of ${validDataImages.length}`;
        pageFrame.appendChild(numBadge);

        scannedPdfPagesContainer.appendChild(pageFrame);
      });
    } else if (docRecord && docRecord.thumbnail && docRecord.thumbnail.startsWith('data:image')) {
      const pageFrame = document.createElement('div');
      pageFrame.className = 'pdf-page-frame';

      const img = document.createElement('img');
      img.src = docRecord.thumbnail;
      img.alt = `Scanned Document Preview`;
      pageFrame.appendChild(img);

      const numBadge = document.createElement('div');
      numBadge.className = 'pdf-page-num-badge';
      numBadge.textContent = `Page 1 of ${totalPages}`;
      pageFrame.appendChild(numBadge);

      scannedPdfPagesContainer.appendChild(pageFrame);
    } else {
      const frame = document.createElement('div');
      frame.className = 'pdf-page-frame';
      frame.style.padding = '32px 16px';
      frame.style.textAlign = 'center';
      frame.style.background = '#0f0f18';
      frame.style.color = 'white';
      const sizeMb = docRecord && docRecord.blob ? (docRecord.blob.size / (1024 * 1024)).toFixed(2) : '1.0';
      frame.innerHTML = `
        <span class="material-icons-round" style="font-size:56px;color:#ef4444;margin-bottom:10px;display:block;">picture_as_pdf</span>
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;color:#ffffff;">${docTitle}</div>
        <div style="font-size:12px;color:#94a3b8;">${sizeMb} MB &bull; ${totalPages} ${totalPages === 1 ? 'Page' : 'Pages'} &bull; PDF Ready</div>
      `;
      scannedPdfPagesContainer.appendChild(frame);
    }
  }

  renderDocPages();

  // ── 2. Retrieve or Compile PDF Blob ─────────────────────────────────────────
  async function getOrCreatePdfBlob() {
    if (cachedPdfBlob) return cachedPdfBlob;

    // 1. Check IndexedDB record
    const activeDocId = sessionStorage.getItem('sg_active_doc_id');
    if (activeDocId && window.LocalPdfDB) {
      try {
        const docRecord = await window.LocalPdfDB.getDocument(activeDocId);
        if (docRecord && docRecord.blob) {
          if (docRecord.blob.type === 'application/pdf') {
            cachedPdfBlob = docRecord.blob;
            return cachedPdfBlob;
          }
        }
      } catch (err) {
        console.warn('IndexedDB Blob retrieval note:', err.message);
      }
    }

    // 2. Compile PDF Blob from valid image data URLs
    const validDataImages = (pagesData || []).filter(p => typeof p === 'string' && p.startsWith('data:image'));
    const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;

    if (validDataImages.length > 0 && jsPDFClass) {
      const doc = new jsPDFClass({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();

      for (let i = 0; i < validDataImages.length; i++) {
        if (i > 0) doc.addPage();
        const imgData = validDataImages[i];
        try {
          const img = new Image();
          await new Promise((resolve) => {
            const timeout = setTimeout(resolve, 2000);
            img.onload = () => { clearTimeout(timeout); resolve(); };
            img.onerror = () => { clearTimeout(timeout); resolve(); };
            img.src = imgData;
          });

          const imgW = img.naturalWidth || 800;
          const imgH = img.naturalHeight || 1100;
          const scale = Math.min(pdfWidth / imgW, pdfHeight / imgH);
          const w = imgW * scale;
          const h = imgH * scale;
          const x = (pdfWidth - w) / 2;
          const y = (pdfHeight - h) / 2;

          doc.addImage(imgData, 'JPEG', x, y, w, h);
        } catch (e) {
          console.warn('Page compile note:', e);
        }
      }

      cachedPdfBlob = doc.output('blob');
      return cachedPdfBlob;
    }

    // 3. Fallback: check thumbnail from active document
    if (activeDocId && window.LocalPdfDB && jsPDFClass) {
      try {
        const docRecord = await window.LocalPdfDB.getDocument(activeDocId);
        if (docRecord && docRecord.thumbnail && docRecord.thumbnail.startsWith('data:image')) {
          const doc = new jsPDFClass({ orientation: 'portrait', unit: 'pt', format: 'a4' });
          const pdfWidth = doc.internal.pageSize.getWidth();
          const pdfHeight = doc.internal.pageSize.getHeight();
          doc.addImage(docRecord.thumbnail, 'JPEG', 20, 20, pdfWidth - 40, pdfHeight - 40);
          cachedPdfBlob = doc.output('blob');
          return cachedPdfBlob;
        }
      } catch (e) {}
    }

    return null;
  }

  // ── 3. Save PDF Document to Local Device ─────────────────────────────────────
  async function compileAndSavePdfToDevice() {
    const rawTitle = sessionStorage.getItem('sg_active_doc_title') || (scannedPdfTitle ? scannedPdfTitle.textContent : 'Scanned_Document');
    const filename = rawTitle.endsWith('.pdf') ? rawTitle : `${rawTitle}.pdf`;

    StudyGenApp.toast.show('Compiling PDF & Saving to Local Device... 💾', 3000);

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

      StudyGenApp.toast.show('Document ready. Please try again.');
    } catch (err) {
      console.error('PDF generation error:', err);
      StudyGenApp.toast.show('Error saving PDF document.');
    }
  }

  // ── 4. "VIEW AS PDF" Action Handler ──────────────────────────────────────────
  if (pdfViewBtn) {
    pdfViewBtn.addEventListener('click', async () => {
      StudyGenApp.toast.show('Opening PDF document... 📄');

      try {
        const pdfBlob = await getOrCreatePdfBlob();
        if (!pdfBlob) {
          StudyGenApp.toast.show('PDF is preparing. Please try again.');
          return;
        }

        const blobUrl = URL.createObjectURL(pdfBlob);
        cachedObjectUrl = blobUrl;

        // Open directly in a new browser tab with native PDF reader
        const win = window.open(blobUrl, '_blank');
        if (!win || win.closed || typeof win.closed === 'undefined') {
          // If popup blocker triggered, trigger download/view link
          const link = document.createElement('a');
          link.href = blobUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (err) {
        console.error('View as PDF error:', err);
        StudyGenApp.toast.show('Could not open PDF viewer.');
      }
    });
  }

  // Wire up "Save PDF to Device" button inside Card
  if (cardSaveDeviceBtn) {
    cardSaveDeviceBtn.addEventListener('click', compileAndSavePdfToDevice);
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

          // Also delete associated batch page IDs if present
          const batchIdStr = sessionStorage.getItem('sg_batch_page_ids');
          if (batchIdStr && window.LocalPdfDB) {
            try {
              const ids = JSON.parse(batchIdStr);
              for (const childId of ids) {
                await window.LocalPdfDB.deleteDocument(childId);
              }
            } catch (e) {}
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

          StudyGenApp.toast.show('Document deleted successfully 🗑️');

          // Return to Home / Recent Documents screen
          setTimeout(() => {
            window.location.href = 'home.html';
          }, 300);
        } catch (err) {
          console.error('Delete error:', err);
          StudyGenApp.toast.show('Unable to delete document.');
        }
      };

      if (window.StudyGenNav && window.StudyGenNav.confirm) {
        window.StudyGenNav.confirm(
          `Delete "${docTitle}"?`,
          performDeletion,
          `Are you sure you want to delete this document from your device? This action cannot be undone.`
        );
      } else {
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
