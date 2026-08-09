'use strict';

/**
 * StudyGen AI — PDF AI Import & Processing Logic
 * Saves original PDF Blob locally in IndexedDB (studygen_pdf_db),
 * temporarily uploads file to backend /api/ai/study-notes for AI generation,
 * and passes response data to AI Study screen.
 */

document.addEventListener('DOMContentLoaded', () => {
  const dropZone  = document.getElementById('pdfDropZone');
  const fileInput = document.getElementById('pdfFileInput');
  const browseBtn = document.getElementById('browsePdfBtn');

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

    // Check size limit (25 MB)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      StudyGenApp.toast.show('File is too large. Maximum size is 25 MB.');
      return;
    }

    StudyGenApp.toast.show(`Saving "${file.name}" locally & analyzing... 📄`, 5000);

    try {
      // 1. Save original PDF Blob locally in browser IndexedDB
      const localPdfId = window.LocalPdfDB.generateLocalPdfId();
      const savedDoc = await window.LocalPdfDB.saveDocument({
        localPdfId,
        documentTitle: file.name.replace(/\.[^/.]+$/, ''),
        filename: file.name,
        mimeType: file.type || 'application/pdf',
        blob: file,
      });

      sessionStorage.setItem('sg_active_doc_id', savedDoc.localPdfId);
      sessionStorage.setItem('sg_active_doc_title', savedDoc.documentTitle);

      // 2. Prepare temporary multipart FormData for backend AI processing
      const formData = new FormData();
      formData.append('file', file, file.name);

      // 3. Call backend API POST /api/ai/study-notes
      const res = await window.ApiClient.uploadFile('/ai/study-notes', formData);

      if (res && res.success && res.data) {
        // Store generated AI response in sessionStorage for ai-study screen
        sessionStorage.setItem('sg_study_output', JSON.stringify({
          localPdfId: savedDoc.localPdfId,
          documentTitle: savedDoc.documentTitle,
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
      console.error('PDF Import error:', err);
      StudyGenApp.toast.show(err.message || 'Failed to process document with AI.');
    }
  }

  document.getElementById('pdfDownloadBtn')?.addEventListener('click', () => StudyGenApp.toast.show('Downloading document...'));
  document.getElementById('pdfSaveBtn')?.addEventListener('click', () => StudyGenApp.toast.show('PDF saved to local device library! 📁'));
  document.getElementById('pdfShareBtn')?.addEventListener('click', () => StudyGenApp.toast.show('Share link copied! 📋'));
});
