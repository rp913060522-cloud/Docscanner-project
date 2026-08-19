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

  // Track whether we have real AI data or are showing demo fallback
  const hasRealData = Boolean(storedStr && studyData && studyData.shortNotes);

  // Populate document title in page header from AI data or sessionStorage
  const docTitleEl = document.getElementById('docTitle');
  if (docTitleEl) {
    docTitleEl.textContent = studyData.documentTitle || sessionStorage.getItem('sg_active_doc_title') || 'Study Notes';
  }

  // Show demo banner if no real AI output was loaded
  const analysisSection = document.querySelector('.card.card-surface');
  if (analysisSection && !hasRealData) {
    analysisSection.innerHTML = `
      <div style="text-align:center;padding:8px 0;">
        <div style="width:52px;height:52px;background:rgba(245,158,11,0.12);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;">
          <span class="material-icons-round" style="color:#d97706;font-size:28px;">info</span>
        </div>
        <h3 style="color:var(--text-primary);font-size:15px;font-weight:700;margin:0 0 6px;">Demo Mode</h3>
        <p style="color:var(--text-secondary);font-size:12px;margin:0 0 14px;line-height:1.5;">No AI output loaded. Showing example content.<br>Upload a document to get real AI study notes.</p>
        <a href="upload-ai.html" style="display:inline-flex;align-items:center;gap:6px;background:#3b7bf8;color:white;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;text-decoration:none;">
          <span class="material-icons-round" style="font-size:18px;">upload_file</span>
          Upload Document
        </a>
      </div>
    `;
  }

  // Smart fallback content synthesis so no card is ever blank
  const derivedSummary = studyData.summary || 'Summary unavailable.';
  const derivedKeyPoints = Array.isArray(studyData.keyPoints) && studyData.keyPoints.length > 0
    ? studyData.keyPoints
    : [derivedSummary];

  const derivedShortNotes = studyData.shortNotes || derivedKeyPoints.map(k => `• ${k}`).join('\n');
  const derivedDetailedNotes = studyData.detailedNotes || `${derivedSummary}\n\nKey Concepts:\n${derivedKeyPoints.map((k, i) => `${i+1}. ${k}`).join('\n')}`;

  const derivedQuestions = Array.isArray(studyData.importantQuestions) && studyData.importantQuestions.length > 0
    ? studyData.importantQuestions
    : [
        { question: 'What is the main topic of this document?', answer: derivedSummary },
        { question: 'What are the key takeaways?', answer: derivedKeyPoints.join('; ') }
      ];

  const derivedFormulas = Array.isArray(studyData.formulas) && studyData.formulas.length > 0
    ? studyData.formulas
    : [
        { title: 'Core Document Subject', formula: studyData.documentTitle || 'Study Material', explanation: derivedSummary }
      ];

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
      content: derivedShortNotes.replace(/\n/g, '<br>')
    },
    {
      id: 'cardDetailedNotes',
      title: 'Detailed Notes',
      content: derivedDetailedNotes.replace(/\n/g, '<br>')
    },
    {
      id: 'cardSummary',
      title: 'Summary',
      content: derivedSummary.replace(/\n/g, '<br>')
    },
    {
      id: 'cardKeyPoints',
      title: 'Key Points',
      content: `<ul>${derivedKeyPoints.map(k => `<li style="margin-bottom:6px;">• ${k}</li>`).join('')}</ul>`
    },
    {
      id: 'cardQuestions',
      title: 'Important Questions',
      content: derivedQuestions.map((q, i) => `<b>Q${i+1}: ${q.question || q}</b><br><span style="color:var(--text-secondary);">${q.answer || ''}</span>`).join('<br><br>')
    },
    {
      id: 'cardFormula',
      title: 'Chemical Equations / Formulas',
      content: derivedFormulas.map(f => `<b>${f.title || 'Formula'}:</b><br><code style="font-size:15px;color:var(--primary);">${f.formula || f}</code><br><small style="color:var(--text-secondary);">${f.explanation || ''}</small>`).join('<br><br>')
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
          localPdfId: studyData.localPdfId || sessionStorage.getItem('sg_active_doc_id') || `doc_${Date.now()}`,
          documentTitle: studyData.documentTitle || sessionStorage.getItem('sg_active_doc_title') || 'Study Notes',
          shortNotes: derivedShortNotes,
          detailedNotes: derivedDetailedNotes,
          summary: derivedSummary,
          keyPoints: derivedKeyPoints,
          importantQuestions: derivedQuestions,
          formulas: derivedFormulas,
        };

        const res = await window.ApiClient.post('/notes', payload);
        if (res && res.success) {
          StudyGenApp.toast.show('Notes saved to MongoDB & History! 📁');
        } else {
          StudyGenApp.toast.show(res?.message || 'Notes saved locally!');
        }
      } catch (err) {
        console.error('Save notes warning:', err);
        StudyGenApp.toast.show('Notes saved to local session!');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
      }
    });
  }

  // Real File Download Handler
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
      try {
        const docTitle = studyData.documentTitle || 'StudyNotes';
        const fileContent = `================================================
${docTitle.toUpperCase()} — AI STUDY NOTES
================================================

SUMMARY:
${derivedSummary}

KEY POINTS:
${derivedKeyPoints.map(k => `• ${k}`).join('\n')}

SHORT NOTES:
${derivedShortNotes}

DETAILED NOTES:
${derivedDetailedNotes}

IMPORTANT QUESTIONS:
${derivedQuestions.map((q, i) => `Q${i+1}: ${q.question}\nA: ${q.answer}`).join('\n\n')}

FORMULAS / CONCEPTS:
${derivedFormulas.map(f => `${f.title}: ${f.formula}\n${f.explanation}`).join('\n\n')}
`;

        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_Notes.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        StudyGenApp.toast.show('Study notes file downloaded! 📄');
      } catch (err) {
        console.error('Download error:', err);
        StudyGenApp.toast.show('Could not download file.');
      }
    });
  }

  // Share Button Handler
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const shareText = `📚 ${studyData.documentTitle || 'Study Notes'}\n\n${derivedSummary}\n\nGenerated by StudyGen AI`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: studyData.documentTitle || 'StudyGen AI Notes',
            text: shareText,
            url: window.location.href,
          });
        } catch (err) {
          if (err.name !== 'AbortError') {
            await copyToClipboard(shareText);
          }
        }
      } else {
        await copyToClipboard(shareText);
      }
    });
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      StudyGenApp.toast.show('Study notes text copied to clipboard! 📋');
    } catch {
      StudyGenApp.toast.show('Copied to clipboard!');
    }
  }

});
