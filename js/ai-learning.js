/**
 * StudyGen AI — AI Learning Features Logic
 * Controls Quiz game, Flashcard player, AI Chat widget, and Language toggle
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

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

  // Feature Card clicks -> activate respective tab
  document.getElementById('featQuizBtn')?.addEventListener('click', () => showTab('quiz'));
  document.getElementById('featFlashBtn')?.addEventListener('click', () => showTab('flashcards'));
  document.getElementById('featChatBtn')?.addEventListener('click', () => showTab('chat'));

  document.getElementById('featExplainBtn')?.addEventListener('click', () => StudyGenApp.toast.show('Simplifying notes into 5-year-old language... ✨'));
  document.getElementById('featReadAloudBtn')?.addEventListener('click', () => StudyGenApp.toast.show('🔊 Playing audio summary...'));
  document.getElementById('featAskBtn')?.addEventListener('click', () => showTab('chat'));
  document.getElementById('featHomeworkBtn')?.addEventListener('click', () => StudyGenApp.toast.show('Homework help assistant activated! 📚'));

  // ── 1. QUIZ GAME LOGIC ──────────────────────────────────────────────────────
  let currentQuizIdx = 0;
  const questions = StudyGenApp.MOCK.quizQuestions;

  const quizQuestion = document.getElementById('quizQuestion');
  const quizOptions  = document.getElementById('quizOptions');
  const quizScore    = document.getElementById('quizScore');
  const nextQuizBtn  = document.getElementById('nextQuizBtn');
  const prevQuizBtn  = document.getElementById('prevQuizBtn');

  function renderQuiz(idx) {
    if (!quizQuestion || !quizOptions) return;

    const q = questions[idx];
    quizQuestion.textContent = q.question;
    if (quizScore) quizScore.textContent = `Question ${idx + 1} of ${questions.length}`;

    const letters = ['A', 'B', 'C', 'D'];
    quizOptions.innerHTML = q.options.map((opt, i) => `
      <button class="quiz-option" data-idx="${i}">
        <span class="quiz-option__letter">${letters[i]}</span>
        <span style="flex:1;">${opt}</span>
      </button>
    `).join('');

    // Option click handler
    document.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = parseInt(btn.getAttribute('data-idx'));
        const options = document.querySelectorAll('.quiz-option');
        options.forEach(o => o.style.pointerEvents = 'none');

        if (selected === q.correct) {
          btn.classList.add('correct');
          StudyGenApp.toast.show('Correct! 🎉');
        } else {
          btn.classList.add('wrong');
          options[q.correct].classList.add('correct');
          StudyGenApp.toast.show('Incorrect answer.');
        }
      });
    });
  }

  if (nextQuizBtn) {
    nextQuizBtn.addEventListener('click', () => {
      if (currentQuizIdx < questions.length - 1) {
        currentQuizIdx++;
        renderQuiz(currentQuizIdx);
      } else {
        StudyGenApp.toast.show('Quiz Complete! Score: 4/5 🌟');
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

  // ── 2. FLASHCARD LOGIC ──────────────────────────────────────────────────────
  let currentCardIdx = 0;
  const cards = StudyGenApp.MOCK.flashcards;

  const cardElement   = document.getElementById('flashcardElement');
  const cardFrontText = document.getElementById('cardFrontText');
  const cardBackText  = document.getElementById('cardBackText');
  const cardCounter   = document.getElementById('cardCounter');
  const nextCardBtn   = document.getElementById('nextCardBtn');
  const prevCardBtn   = document.getElementById('prevCardBtn');

  function renderFlashcard(idx) {
    if (!cardFrontText || !cardBackText) return;

    if (cardElement) cardElement.classList.remove('flipped');
    const c = cards[idx];
    cardFrontText.textContent = c.front;
    cardBackText.textContent = c.back;
    if (cardCounter) cardCounter.textContent = `Card ${idx + 1} of ${cards.length}`;
  }

  if (cardElement) {
    cardElement.addEventListener('click', () => {
      cardElement.classList.toggle('flipped');
    });
  }

  if (nextCardBtn) {
    nextCardBtn.addEventListener('click', () => {
      if (currentCardIdx < cards.length - 1) {
        currentCardIdx++;
        renderFlashcard(currentCardIdx);
      } else {
        currentCardIdx = 0;
        renderFlashcard(0);
        StudyGenApp.toast.show('Cards reset to beginning!');
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

  // ── 3. AI CHAT LOGIC ────────────────────────────────────────────────────────
  const chatForm    = document.getElementById('chatForm');
  const chatInput   = document.getElementById('chatInput');
  const chatMsgList = document.getElementById('chatMessageList');

  const messages = StudyGenApp.MOCK.chatMessages;

  function renderMessages() {
    if (!chatMsgList) return;

    chatMsgList.innerHTML = messages.map(m => `
      <div class="chat-bubble ${m.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--ai'}">
        <div>${m.text}</div>
        <div class="chat-bubble__time">${m.time}</div>
      </div>
    `).join('');

    chatMsgList.scrollTop = chatMsgList.scrollHeight;
  }

  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = chatInput ? chatInput.value.trim() : '';
      if (!text) return;

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      messages.push({ id: Date.now(), role: 'user', text, time: now });
      chatInput.value = '';
      renderMessages();

      // Simulated AI response
      setTimeout(() => {
        const aiReplies = [
          "Great question! Cellular respiration generates ATP which powers metabolic activity.",
          "Based on your notes, the main key point is that mitochondria produce 36-38 ATP per glucose.",
          "I can help summarize that further or generate a quick 3-question quiz for practice!",
        ];
        const randomReply = aiReplies[Math.floor(Math.random() * aiReplies.length)];
        messages.push({ id: Date.now(), role: 'ai', text: randomReply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
        renderMessages();
      }, 800);
    });
  }

  renderMessages();

});
