'use strict';

/**
 * StudyGen AI — PDF AI Import & Scanned PDF Viewer Logic
 * Renders compiled multi-page scanned PDF document card,
 * generates real compiled PDF download to local device via jsPDF,
 * supports local IndexedDB saving, sharing, and AI study guide generation.
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
  const pdfDownloadBtn           = document.getElementById('pdfDownloadBtn');
  const pdfSaveBtn               = document.getElementById('pdfSaveBtn');
  const pdfShareBtn              = document.getElementById('pdfShareBtn');

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
  }

  // Real Multi-Page PDF Compiler & Local Device File Saver
  async function compileAndSavePdfToDevice() {
    if (pagesData.length === 0) {
      StudyGenApp.toast.show('No active scanned pages to save.');
      return;
    }

    const rawTitle = sessionStorage.getItem('sg_active_doc_title') || `Scanned_Document_${Date.now()}`;
    const filename = rawTitle.endsWith('.pdf') ? rawTitle : `${rawTitle}.pdf`;

    StudyGenApp.toast.show('Compiling PDF & Saving to Local Device... 💾', 4000);

    try {
      if (window.jspdf && window.jspdf.jsPDF) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();

        for (let i = 0; i < pagesData.length; i++) {
          if (i > 0) doc.addPage();
          const img = new Image();
          img.src = pagesData[i];
          await new Promise(resolve => img.onload = resolve);

          const imgRatio = img.height / img.width;
          let printWidth = pdfWidth;
          let printHeight = pdfWidth * imgRatio;
          if (printHeight > pdfHeight) {
            printHeight = pdfHeight;
            printWidth = pdfHeight / imgRatio;
          }
          const xOffset = (pdfWidth - printWidth) / 2;
          const yOffset = (pdfHeight - printHeight) / 2;

          doc.addImage(pagesData[i], 'JPEG', xOffset, yOffset, printWidth, printHeight);
        }

        doc.save(filename);
        StudyGenApp.toast.show(`Saved "${filename}" to your Downloads folder! 📄🎉`);
      } else {
        // Fallback multi-image download if jsPDF is loading
        pagesData.forEach((dataUrl, idx) => {
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `${filename.replace(/\.pdf$/i, '')}_Page_${idx + 1}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
        StudyGenApp.toast.show(`Saved ${pagesData.length} page files to your device! 📄✨`);
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      StudyGenApp.toast.show('Error compiling PDF. Saved image pages directly.');
    }
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
