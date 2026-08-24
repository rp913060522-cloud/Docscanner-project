'use strict';

/**
 * StudyGen AI — AI Learning Features Logic
 * Handles Quiz game, Flashcard player, AI Chat, Explain concept, and real API integrations.
 */

document.addEventListener('DOMContentLoaded', async () => {

  const activeDocId    = sessionStorage.getItem('sg_active_doc_id') || 'pdf_default';
  const activeDocTitle = sessionStorage.getItem('sg_active_doc_title') || 'Study Document';

  // ── Language Toggle ─────────────────────────────────────────────────────────
  const langToggle = document.getElementById('langToggle');
  if (langToggle) {
    langToggle.checked = StudyGenApp.lang.current === 'hi';
    langToggle.addEventListener('change', () => {
      const code = StudyGenApp.lang.toggle();
      StudyGenApp.toast.show(code === 'hi' ? 'भाषा: हिंदी' : 'Language: English');
    });
  }

  // ── Tab Switcher Logic ──────────────────────────────────────────────────────
  const chips = document.querySelectorAll('#featureTabRow .chip');
  const tabQuiz = document.getElementById('tabQuizContent');
  const tabFlash = document.getElementById('tabFlashcardsContent');
  const tabChat = document.getElementById('tabChatContent');
  const featList = document.getElementById('featureListContainer');

  function showTab(target) {
    chips.forEach(c => c.classList.remove('active'));
    const activeChip = [...chips].find(c => c.getAttribute('data-tab') === target);
    if (activeChip) activeChip.classList.add('active');

    if (tabQuiz) tabQuiz.classList.toggle('hidden', target !== 'quiz');
    if (tabFlash) tabFlash.classList.toggle('hidden', target !== 'flashcards');
    if (tabChat) tabChat.classList.toggle('hidden', target !== 'chat');
    if (featList) featList.classList.toggle('hidden', target !== 'all');
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      showTab(chip.getAttribute('data-tab'));
    });
  });

  // Handle URL query parameter tab auto-selection (?tab=quiz, ?tab=flash, ?tab=chat)
  const urlTab = new URLSearchParams(window.location.search).get('tab');
  if (urlTab === 'quiz') showTab('quiz');
  else if (urlTab === 'flash' || urlTab === 'flashcards') showTab('flashcards');
  else if (urlTab === 'chat') showTab('chat');

  document.getElementById('featQuizBtn')?.addEventListener('click', () => showTab('quiz'));
  document.getElementById('featFlashBtn')?.addEventListener('click', () => showTab('flashcards'));
  document.getElementById('featChatBtn')?.addEventListener('click', () => showTab('chat'));

  // ── 1. EXPLAIN FEATURE (POST /api/ai/explain) ──────────────────────────────
  document.getElementById('featExplainBtn')?.addEventListener('click', async () => {
    StudyGenApp.toast.show('Simplifying notes into 5-year-old language... ✨');
    try {
      const res = await window.ApiClient.post('/ai/explain', {
        topicText: `${activeDocTitle}: Cellular Respiration and Energy Production`,
        targetAge: 12,
      });
      if (res && res.success && res.data) {
        StudyGenApp.toast.show(`Explanation: ${res.data.simplifiedExplanation.slice(0, 80)}...`, 6000);
      }
    } catch (err) {
      StudyGenApp.toast.show(err.message || 'Could not generate explanation.');
    }
  });

  document.getElementById('featReadAloudBtn')?.addEventListener('click', () => StudyGenApp.toast.show('🔊 Playing audio summary...'));
  document.getElementById('featAskBtn')?.addEventListener('click', () => showTab('chat'));
  document.getElementById('featHomeworkBtn')?.addEventListener('click', () => StudyGenApp.toast.show('Homework help assistant activated! 📚'));

  // ── Parse AI output from upload-ai.html if present ────────────────────────
  const storedOutputStr = sessionStorage.getItem('sg_study_output');
  let dynamicQuizQuestions = null;
  let dynamicFlashcards = null;

  if (storedOutputStr) {
    try {
      const parsedOutput = JSON.parse(storedOutputStr);
      if (parsedOutput.questions && Array.isArray(parsedOutput.questions) && parsedOutput.questions.length > 0) {
        dynamicQuizQuestions = parsedOutput.questions;
      }
      if (parsedOutput.cards && Array.isArray(parsedOutput.cards) && parsedOutput.cards.length > 0) {
        dynamicFlashcards = parsedOutput.cards;
      }
    } catch (e) {
      console.warn('sg_study_output parse warning:', e.message);
    }
  }

  // ── 2. QUIZ GAME LOGIC (POST /api/ai/quiz & POST /api/quizzes) ────────────
  let currentQuizIdx = 0;
  let quizQuestions = dynamicQuizQuestions || [
    { question: 'What is the primary concept covered in this document?', options: ['Core Theory', 'Historical Context', 'Practical Method', 'General Overview'], correctIndex: 0, explanation: 'The document outlines core foundational concepts.' },
    { question: 'What is the main takeaway from Section 1?', options: ['Key Definitions', 'Experimental Data', 'Formula Derivation', 'Practice Exercises'], correctIndex: 0, explanation: 'Section 1 introduces fundamental definitions.' },
    { question: 'What is the recommended application of the principles?', options: ['Practical Exercises', 'Further Research', 'Reviewing Formulae', 'Self-Assessment'], correctIndex: 0, explanation: 'Practical application reinforces theoretical learning.' },
  ];
  let userScore = 0;

  const quizQuestion = document.getElementById('quizQuestion');
  const quizOptions  = document.getElementById('quizOptions');
  const quizScore    = document.getElementById('quizScore');
  const nextQuizBtn  = document.getElementById('nextQuizBtn');
  const prevQuizBtn  = document.getElementById('prevQuizBtn');

  function renderQuiz(idx) {
    if (!quizQuestion || !quizOptions) return;
    if (!quizQuestions || quizQuestions.length === 0) return;

    const q = quizQuestions[idx];
    quizQuestion.textContent = q.question;
    if (quizScore) quizScore.textContent = `Question ${idx + 1} of ${quizQuestions.length}`;

    const letters = ['A', 'B', 'C', 'D'];
    quizOptions.innerHTML = (q.options || []).map((opt, i) => `
      <button class="quiz-option" data-idx="${i}">
        <span class="quiz-option__letter">${letters[i] || i+1}</span>
        <span style="flex:1;">${opt}</span>
      </button>
    `).join('');

    document.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = parseInt(btn.getAttribute('data-idx'));
        const options = document.querySelectorAll('.quiz-option');
        options.forEach(o => o.style.pointerEvents = 'none');

        const correctIdx = typeof q.correctIndex === 'number' ? q.correctIndex : q.correct || 0;

        if (selected === correctIdx) {
          btn.classList.add('correct');
          userScore++;
          StudyGenApp.toast.show('Correct! 🎉');
        } else {
          btn.classList.add('wrong');
          if (options[correctIdx]) options[correctIdx].classList.add('correct');
          StudyGenApp.toast.show('Incorrect answer.');
        }
      });
    });
  }

  if (nextQuizBtn) {
    nextQuizBtn.addEventListener('click', async () => {
      if (currentQuizIdx < quizQuestions.length - 1) {
        currentQuizIdx++;
        renderQuiz(currentQuizIdx);
      } else {
        StudyGenApp.toast.show(`Quiz Complete! Score: ${userScore}/${quizQuestions.length} 🌟`);

        // Save Quiz to backend upon completion if user chooses
        try {
          await window.ApiClient.post('/quizzes', {
            localPdfId: activeDocId,
            documentTitle: activeDocTitle,
            questions: quizQuestions,
            score: userScore,
          });
          StudyGenApp.toast.show('Quiz results saved to History! 📁');
        } catch (err) {
          console.warn('Quiz save warning:', err.message);
        }
      }
    });
  }

  if (prevQuizBtn) {
    prevQuizBtn.addEventListener('click', () => {
      if (currentQuizIdx > 0) {
        currentQuizIdx--;
        renderQuiz(currentQuizIdx);
      }
    });
  }

  renderQuiz(0);

  // ── 3. FLASHCARD LOGIC (POST /api/ai/flashcards & POST /api/flashcards) ────
  let currentCardIdx = 0;
  let flashcards = dynamicFlashcards || [
    { front: 'Primary Subject', back: 'Core document concepts and fundamental definitions.' },
    { front: 'Key Metric', back: 'Quantifiable measures and performance indicators.' },
    { front: 'Central Principle', back: 'The governing rule or foundational law described in the material.' },
  ];

  const cardElement   = document.getElementById('flashcardElement');
  const cardFrontText = document.getElementById('cardFrontText');
  const cardBackText  = document.getElementById('cardBackText');
  const cardCounter   = document.getElementById('cardCounter');
  const nextCardBtn   = document.getElementById('nextCardBtn');
  const prevCardBtn   = document.getElementById('prevCardBtn');

  function renderFlashcard(idx) {
    if (!cardFrontText || !cardBackText) return;
    if (!flashcards || flashcards.length === 0) return;

    if (cardElement) cardElement.classList.remove('flipped');
    const c = flashcards[idx];
    cardFrontText.textContent = c.front;
    cardBackText.textContent = c.back;
    if (cardCounter) cardCounter.textContent = `Card ${idx + 1} of ${flashcards.length}`;
  }

  if (cardElement) {
    cardElement.addEventListener('click', () => {
      cardElement.classList.toggle('flipped');
    });
  }

  if (nextCardBtn) {
    nextCardBtn.addEventListener('click', () => {
      if (currentCardIdx < flashcards.length - 1) {
        currentCardIdx++;
        renderFlashcard(currentCardIdx);
      }
    });
  }

  if (prevCardBtn) {
    prevCardBtn.addEventListener('click', () => {
      if (currentCardIdx > 0) {
        currentCardIdx--;
        renderFlashcard(currentCardIdx);
      }
    });
  }

  renderFlashcard(0);

  // ── 4. AI CHAT LOGIC (POST /api/ai/chat) ───────────────────────────────────
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const chatMessagesList = document.getElementById('chatMessagesList');
  let activeChatId = null;

  async function sendChatMessage() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';

    // Append user message to UI
    if (chatMessagesList) {
      const userBubble = document.createElement('div');
      userBubble.className = 'chat-message chat-message--user';
      userBubble.innerHTML = `<div class="chat-bubble">${text}</div>`;
      chatMessagesList.appendChild(userBubble);
      chatMessagesList.scrollTop = chatMessagesList.scrollHeight;
    }

    // Check if local PDF exists in IndexedDB for temporary context upload
    let localDoc = null;
    try {
      localDoc = await window.LocalPdfDB.getDocument(activeDocId);
    } catch {}

    const formData = new FormData();
    formData.append('userQuery', text);
    formData.append('localPdfId', activeDocId);
    formData.append('documentTitle', activeDocTitle);
    if (activeChatId) formData.append('chatId', activeChatId);

    if (localDoc && localDoc.blob) {
      formData.append('file', localDoc.blob, localDoc.filename || 'document.pdf');
    } else {
      StudyGenApp.toast.show('Note: Local PDF file unavailable — answering from chat history.', 4000);
    }

    try {
      const res = await window.ApiClient.uploadFile('/ai/chat', formData);

      if (res && res.success && res.data) {
        const answer = res.data.answer;
        if (res.data.chatId) activeChatId = res.data.chatId;

        if (chatMessagesList) {
          const aiBubble = document.createElement('div');
          aiBubble.className = 'chat-message chat-message--ai';
          aiBubble.innerHTML = `<div class="chat-bubble">${answer}</div>`;
          chatMessagesList.appendChild(aiBubble);
          chatMessagesList.scrollTop = chatMessagesList.scrollHeight;
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      if (chatMessagesList) {
        const errBubble = document.createElement('div');
        errBubble.className = 'chat-message chat-message--ai';
        errBubble.innerHTML = `<div class="chat-bubble" style="background:rgba(255,59,48,0.1);color:var(--error);">${err.message || 'Could not get response from AI.'}</div>`;
        chatMessagesList.appendChild(errBubble);
      }
    }
  }

  const chatForm = document.getElementById('chatForm');
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sendChatMessage();
    });
  }

  if (chatSendBtn) {
    chatSendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sendChatMessage();
    });
  }

  // ── Bottom Bar Bookmark & Share Handlers ────────────────────────────────────
  const bookmarkBtn = document.getElementById('bookmarkBtn');
  let isBookmarked = false;
  if (bookmarkBtn) {
    bookmarkBtn.addEventListener('click', () => {
      isBookmarked = !isBookmarked;
      const icon = bookmarkBtn.querySelector('.material-icons-round');
      if (icon) icon.textContent = isBookmarked ? 'bookmark' : 'bookmark_border';
      if (isBookmarked) {
        bookmarkBtn.style.color = '#3b7bf8';
        StudyGenApp.toast.show('Lesson bookmarked to study collection! 🔖');
      } else {
        bookmarkBtn.style.color = '';
        StudyGenApp.toast.show('Bookmark removed.');
      }
    });
  }

  const shareFeatBtn = document.getElementById('shareFeatBtn');
  if (shareFeatBtn) {
    shareFeatBtn.addEventListener('click', async () => {
      const shareTitle = 'StudyGen AI Interactive Learning';
      const shareText = `🧠 Check out this interactive StudyGen AI quiz, flashcard deck, and AI tutor!`;
      if (navigator.share) {
        try {
          await navigator.share({ title: shareTitle, text: shareText, url: window.location.href });
        } catch (err) {
          if (err.name !== 'AbortError') {
            copyShareText(shareText);
          }
        }
      } else {
        copyShareText(shareText);
      }
    });
  }

  function copyShareText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        StudyGenApp.toast.show('Learning link copied to clipboard! 📋');
      }).catch(() => {
        StudyGenApp.toast.show('Share link ready!');
      });
    } else {
      StudyGenApp.toast.show('Learning link ready to share!');
    }
  }

});
