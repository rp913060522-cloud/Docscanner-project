/**
 * StudyGen AI — AI Study Assistant Logic
 * Displays extracted study notes, summary, key points, formulas, and handles save/share
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  const data = StudyGenApp.MOCK.aiStudyOutput;

  const displayArea  = document.getElementById('materialDisplayArea');
  const displayTitle = document.getElementById('displayTitle');
  const displayBody  = document.getElementById('displayBody');
  const closeDispBtn = document.getElementById('closeDisplayBtn');

  // Card mappings
  const cards = [
    { id: 'cardShortNotes',    title: 'Short Notes',          content: data.shortNotes },
    { id: 'cardDetailedNotes', title: 'Detailed Notes',       content: data.detailedNotes },
    { id: 'cardSummary',       title: 'Summary',              content: data.summary },
    { id: 'cardKeyPoints',     title: 'Key Points',           content: `<ul>${data.keyPoints.map(k => `<li style="margin-bottom:6px;">• ${k}</li>`).join('')}</ul>` },
    { id: 'cardQuestions',     title: 'Important Questions',  content: `1. What is ATP and why is it important?<br>2. Explain the difference between aerobic and anaerobic respiration.<br>3. Where does the Krebs cycle take place?` },
    { id: 'cardFormula',       title: 'Chemical Equations',   content: `<b>Overall Respiration Equation:</b><br><code style="font-size:15px;color:var(--primary);">${data.formula}</code>` },
  ];

  cards.forEach(card => {
    const el = document.getElementById(card.id);
    if (el) {
      el.addEventListener('click', () => {
        if (displayTitle && displayBody && displayArea) {
          displayTitle.textContent = card.title;
          displayBody.innerHTML = card.content;
          displayArea.classList.remove('hidden');
          displayArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }
  });

  if (closeDispBtn && displayArea) {
    closeDispBtn.addEventListener('click', () => {
      displayArea.classList.add('hidden');
    });
  }

  // Save Notes Action
  const saveBtn = document.getElementById('saveNotesBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      StudyGenApp.toast.show('Notes saved to History! 📁');
    });
  }

  // Download PDF Action
  const downloadBtn = document.getElementById('downloadPdfBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      StudyGenApp.toast.show('Downloading PDF summary...');
    });
  }

  // Share Action
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({ title: 'StudyGen AI Notes', text: data.shortNotes });
      } else {
        StudyGenApp.toast.show('Share link copied to clipboard! 📋');
      }
    });
  }

});
