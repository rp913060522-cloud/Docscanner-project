/**
 * StudyGen AI — PDF AI Logic
 * Handles file picking, upload simulation, drag & drop, and action buttons
 */

'use strict';

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

  function handleFile(file) {
    StudyGenApp.toast.show(`Uploading "${file.name}"... 📄`);
    setTimeout(() => {
      StudyGenApp.toast.show('PDF analyzed successfully! Redirecting to AI Study...');
      setTimeout(() => {
        window.location.href = 'ai-study.html';
      }, 500);
    }, 1000);
  }

  document.getElementById('pdfDownloadBtn')?.addEventListener('click', () => StudyGenApp.toast.show('Downloading selected PDF...'));
  document.getElementById('pdfSaveBtn')?.addEventListener('click', () => StudyGenApp.toast.show('PDF saved to Library! 📁'));
  document.getElementById('pdfShareBtn')?.addEventListener('click', () => StudyGenApp.toast.show('PDF share link copied! 📋'));

});
