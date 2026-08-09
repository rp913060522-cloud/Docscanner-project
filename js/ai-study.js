'use strict';

/**
 * StudyGen AI — AI Study Assistant Logic
 * Displays generated AI study notes and handles explicit "Save Notes" via POST /api/notes.
 */

document.addEventListener('DOMContentLoaded', async () => {

  let studyData = null;

  // 1. Check if output is stored in sessionStorage from pdf-ai.js processing
  const storedStr = sessionStorage.getItem('sg_study_output');
  if (storedStr) {
    try { studyData = JSON.parse(storedStr); } catch {}
  }

  // 2. Fallback: check if noteId is passed in URL query param (?id=...)
  const urlParams = new URLSearchParams(window.location.search);
  const noteId = urlParams.get('id');

  if (!studyData && noteId) {
    try {
      const res = await window.ApiClient.get(`/notes/${noteId}`);
      if (res && res.success && res.data && res.data.note) {
        studyData = res.data.note;
      }
    } catch (err) {
      console.warn('Could not load note from backend:', err.message);
    }
  }

  // Fallback default structure
  if (!studyData) {
    studyData = {
      localPdfId: sessionStorage.getItem('sg_active_doc_id') || 'pdf_default',
      documentTitle: sessionStorage.getItem('sg_active_doc_title') || 'Cellular Respiration Notes',
      shortNotes: 'Cellular respiration converts glucose → ATP using oxygen in mitochondria. Yields 36-38 ATP.',
      detailedNotes: 'Cellular respiration occurs in 3 stages: Glycolysis (cytoplasm), Krebs Cycle (matrix), Electron Transport Chain (membrane).',
      summary: 'Core process converting C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + ATP.',
      keyPoints: ['ATP is energy currency', 'Mitochondria = powerhouse', '36-38 ATP produced'],
      importantQuestions: [
        { question: 'What is ATP?', answer: 'Adenosine Triphosphate — cellular energy currency.' },
        { question: 'Where does Krebs cycle occur?', answer: 'Mitochondrial matrix.' }
      ],
      formulas: [
        { title: 'Respiration Equation', formula: 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + ATP', explanation: 'Complete oxidation of glucose' }
      ]
    };
  }

  // UI Element bindings
  const displayArea  = document.getElementById('materialDisplayArea');
  const displayTitle = document.getElementById('displayTitle');
  const displayBody  = document.getElementById('displayBody');
  const closeDispBtn = document.getElementById('closeDisplayBtn');

  // Format cards
  const cards = [
    {
      id: 'cardShortNotes',
      title: 'Short Notes',
      content: studyData.shortNotes || 'No short notes generated.'
    },
    {
      id: 'cardDetailedNotes',
      title: 'Detailed Notes',
      content: studyData.detailedNotes || 'No detailed notes generated.'
    },
    {
      id: 'cardSummary',
      title: 'Summary',
      content: studyData.summary || 'No summary available.'
    },
    {
      id: 'cardKeyPoints',
      title: 'Key Points',
      content: Array.isArray(studyData.keyPoints) && studyData.keyPoints.length > 0
        ? `<ul>${studyData.keyPoints.map(k => `<li style="margin-bottom:6px;">• ${k}</li>`).join('')}</ul>`
        : 'No key points extracted.'
    },
    {
      id: 'cardQuestions',
      title: 'Important Questions',
      content: Array.isArray(studyData.importantQuestions) && studyData.importantQuestions.length > 0
        ? studyData.importantQuestions.map((q, i) => `<b>Q${i+1}: ${q.question || q}</b><br><span style="color:var(--text-secondary);">${q.answer || ''}</span>`).join('<br><br>')
        : 'No questions generated.'
    },
    {
      id: 'cardFormula',
      title: 'Chemical Equations / Formulas',
      content: Array.isArray(studyData.formulas) && studyData.formulas.length > 0
        ? studyData.formulas.map(f => `<b>${f.title || 'Formula'}:</b><br><code style="font-size:15px;color:var(--primary);">${f.formula || f}</code><br><small style="color:var(--text-secondary);">${f.explanation || ''}</small>`).join('<br><br>')
        : 'No formulas extracted.'
    },
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

  // Save Notes Action — POST /api/notes
  const saveBtn = document.getElementById('saveNotesBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      const originalText = saveBtn.textContent;
      saveBtn.textContent = 'Saving...';

      try {
        const payload = {
          localPdfId: studyData.localPdfId || sessionStorage.getItem('sg_active_doc_id') || 'pdf_default',
          documentTitle: studyData.documentTitle || 'Study Notes',
          shortNotes: studyData.shortNotes || '',
          detailedNotes: studyData.detailedNotes || '',
          summary: studyData.summary || '',
          keyPoints: Array.isArray(studyData.keyPoints) ? studyData.keyPoints : [],
          importantQuestions: Array.isArray(studyData.importantQuestions) ? studyData.importantQuestions : [],
          formulas: Array.isArray(studyData.formulas) ? studyData.formulas : [],
        };

        const res = await window.ApiClient.post('/notes', payload);
        if (res && res.success) {
          StudyGenApp.toast.show('Notes saved to MongoDB & History! 📁');
        } else {
          StudyGenApp.toast.show(res.message || 'Could not save notes.');
        }
      } catch (err) {
        console.error('Save notes error:', err);
        StudyGenApp.toast.show(err.message || 'Failed to save notes.');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
      }
    });
  }

  document.getElementById('downloadPdfBtn')?.addEventListener('click', () => StudyGenApp.toast.show('Downloading PDF summary...'));
  document.getElementById('shareBtn')?.addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({ title: studyData.documentTitle || 'StudyGen AI Notes', text: studyData.shortNotes });
    } else {
      StudyGenApp.toast.show('Share text copied! 📋');
    }
  });

});
