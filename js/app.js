/**
 * StudyGen AI — Global App State & Utilities
 * Handles: Theme, Language, Mock Auth, Toast, Navigation helpers
 * No backend required. All data is mock/local for Phase 2 frontend.
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// STUDYGEN APP — Main Namespace
// ─────────────────────────────────────────────────────────────────────────────
const StudyGenApp = (() => {

  // ── CONSTANTS ──────────────────────────────────────────────────────────────
  const KEYS = {
    THEME:      'sg_theme',
    LANGUAGE:   'sg_lang',
    AUTH_TOKEN: 'sg_auth',
    USER:       'sg_user',
  };

  const ROUTES = {
    splash:      '../index.html',
    login:       'login.html',
    signup:      'signup.html',
    home:        'home.html',
    scanner:     'scanner.html',
    scanPreview: 'scan-preview.html',
    aiStudy:     'ai-study.html',
    aiLearning:  'ai-learning.html',
    pdfAI:       'pdf-ai.html',
    history:     'history.html',
    profile:     'profile.html',
    settings:    'settings.html',
    premium:     'premium.html',
  };

  // ── MOCK DATA ──────────────────────────────────────────────────────────────
  const MOCK = {
    user: {
      name:     'Ravi Sharma',
      email:    'ravi@studygenai.com',
      avatar:   null,
      initials: 'RS',
      isPremium: false,
      stats: {
        totalDocs:  24,
        aiNotes:    156,
        pdfs:       42,
        quizzes:    12,
        flashCards: 85,
      }
    },

    recentActivity: [
      { id: 1, type: 'note',      icon: 'description',       title: 'Biology Ch.4 Summary',        time: 'Today, 2:16 PM',       route: 'ai-study.html' },
      { id: 2, type: 'flashcard', icon: 'style',             title: 'European History Flashcards',  time: 'Yesterday, 10:30 AM',  route: 'ai-learning.html' },
      { id: 3, type: 'pdf',       icon: 'picture_as_pdf',    title: 'Calculus_Exam.pdf',            time: 'Yesterday, 4:00 PM',   route: 'pdf-ai.html' },
    ],

    recentNotes: [
      { id: 1, title: 'Biology Ch.4 Summary',       date: 'Today, 2:16 PM',    pages: 12 },
      { id: 2, title: 'European History Par...',     date: 'Yesterday, 10:30 AM', pages: 8  },
      { id: 3, title: 'Chemistry Organic Notes',     date: '2 days ago',         pages: 15 },
    ],

    recentPDFs: [
      { id: 1, title: 'Calculus_Exam.pdf',           date: 'Yesterday, 4:00 PM', pages: 32 },
      { id: 2, title: 'Biology_Ch_Syllabus_FA.pdf',  date: '2 days ago',         pages: 8  },
    ],

    aiStudyGuides: [
      { id: 1, title: 'Physics Midterm Aut...',      date: 'Generated Mon, 4:00 PM' },
      { id: 2, title: 'Organic Chem Summary',        date: 'Generated Sun, 9:00 AM' },
    ],

    quizQuestions: [
      {
        id: 1,
        question: 'What is the powerhouse of the cell?',
        options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi Apparatus'],
        correct: 1,
      },
      {
        id: 2,
        question: 'What is the chemical formula for water?',
        options: ['H2O2', 'CO2', 'H2O', 'HCl'],
        correct: 2,
      },
      {
        id: 3,
        question: 'Which process converts glucose to ATP?',
        options: ['Photosynthesis', 'Fermentation', 'Cellular Respiration', 'Osmosis'],
        correct: 2,
      },
      {
        id: 4,
        question: 'What is ATP?',
        options: ['Adenosine Triphosphate', 'Amino Tri Protein', 'Adenine Trisulfate', 'Amine Triphosphate'],
        correct: 0,
      },
      {
        id: 5,
        question: 'The Krebs cycle occurs in which organelle?',
        options: ['Chloroplast', 'Ribosome', 'Nucleus', 'Mitochondria'],
        correct: 3,
      },
    ],

    flashcards: [
      { id: 1, front: 'What is ATP?',             back: 'Adenosine Triphosphate — the energy currency of the cell.' },
      { id: 2, front: 'What is photosynthesis?',  back: 'Process by which plants convert sunlight, water, and CO₂ into glucose and oxygen.' },
      { id: 3, front: 'Define osmosis',           back: 'Movement of water molecules from a region of high water potential to low water potential through a semipermeable membrane.' },
      { id: 4, front: 'What is the Krebs cycle?', back: 'A series of chemical reactions used by all aerobic organisms to release stored energy through the oxidation of acetyl-CoA.' },
      { id: 5, front: 'What is DNA?',             back: 'Deoxyribonucleic acid — the molecule carrying genetic instructions for development, functioning, growth and reproduction.' },
    ],

    chatMessages: [
      { id: 1, role: 'ai',   text: 'Hi! I have analyzed your document. I can help you understand Cellular Respiration. What would you like to know?', time: '2:16 PM' },
      { id: 2, role: 'user', text: 'Explain the Krebs cycle in simple words.',                                                                        time: '2:17 PM' },
      { id: 3, role: 'ai',   text: 'The Krebs cycle is like a recycling factory in your mitochondria. It breaks down acetyl-CoA into CO₂ and captures energy as NADH and FADH₂. Think of it as squeezing every drop of energy from your food! 🔋',  time: '2:17 PM' },
    ],

    premiumFeatures: [
      { icon: 'all_inclusive',  text: 'Unlimited AI scans & notes' },
      { icon: 'auto_awesome',   text: 'Advanced AI study assistant' },
      { icon: 'quiz',           text: 'Unlimited quizzes & flashcards' },
      { icon: 'picture_as_pdf', text: 'PDF export & share' },
      { icon: 'language',       text: 'Hindi & regional language support' },
      { icon: 'cloud_download', text: 'Offline access & cloud backup' },
    ],

    plans: [
      { id: 'monthly',  name: 'Monthly',  price: '₹199',  period: '/month', savings: '',        isBest: false },
      { id: 'yearly',   name: 'Yearly',   price: '₹999',  period: '/year',  savings: 'Save 58%',isBest: true  },
      { id: 'lifetime', name: 'Lifetime', price: '₹2999', period: 'one time', savings: '',      isBest: false },
    ],

    aiStudyOutput: {
      fileName: 'Biology_Ch4_Cellular_Respiration.pdf',
      pages: 12,
      shortNotes:    'Cellular respiration converts glucose → ATP using oxygen. Occurs in mitochondria. Produces 36-38 ATP per glucose molecule.',
      detailedNotes: 'Cellular respiration is the process by which cells break down glucose and other organic molecules to produce ATP energy. It occurs in three main stages: Glycolysis (cytoplasm), Krebs Cycle (mitochondrial matrix), and Electron Transport Chain (inner mitochondrial membrane).',
      summary:       'Key process converting C₆H₁₂O₆ + O₂ → CO₂ + H₂O + ATP energy.',
      keyPoints:     ['ATP is the energy currency', 'Mitochondria = powerhouse', '36-38 ATP per glucose', 'Aerobic vs Anaerobic respiration', 'Krebs cycle produces NADH & FADH₂'],
      formula:       'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 36-38 ATP',
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // THEME MANAGER
  // ─────────────────────────────────────────────────────────────────────────
  const theme = {
    get current() {
      return localStorage.getItem(KEYS.THEME) || 'light';
    },

    apply(mode) {
      document.documentElement.setAttribute('data-theme', mode);
      localStorage.setItem(KEYS.THEME, mode);
      // Update theme-color meta
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = mode === 'dark' ? '#1C1C1E' : '#3B7BF8';
    },

    toggle() {
      const next = this.current === 'dark' ? 'light' : 'dark';
      this.apply(next);
      return next;
    },

    isDark() {
      return this.current === 'dark';
    },

    init() {
      this.apply(this.current);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LANGUAGE MANAGER
  // ─────────────────────────────────────────────────────────────────────────
  const lang = {
    get current() {
      return localStorage.getItem(KEYS.LANGUAGE) || 'en';
    },

    toggle() {
      const next = this.current === 'en' ? 'hi' : 'en';
      localStorage.setItem(KEYS.LANGUAGE, next);
      document.documentElement.setAttribute('data-lang', next);
      this._applyTranslations(next);
      return next;
    },

    apply(code) {
      localStorage.setItem(KEYS.LANGUAGE, code);
      document.documentElement.setAttribute('data-lang', code);
      this._applyTranslations(code);
    },

    _applyTranslations(code) {
      const elements = document.querySelectorAll('[data-en]');
      elements.forEach(el => {
        const text = el.getAttribute(`data-${code}`);
        if (text) el.textContent = text;
      });
    },

    init() {
      document.documentElement.setAttribute('data-lang', this.current);
      this._applyTranslations(this.current);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MOCK AUTH MANAGER
  // ─────────────────────────────────────────────────────────────────────────
  const auth = {
    isLoggedIn() {
      return !!localStorage.getItem(KEYS.AUTH_TOKEN);
    },

    getUser() {
      const stored = localStorage.getItem(KEYS.USER);
      return stored ? JSON.parse(stored) : null;
    },

    login(email, password) {
      // Mock: accept any non-empty email + password
      if (!email || !password) return { success: false, error: 'Please fill all fields.' };
      if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };

      const user = { ...MOCK.user, email };
      localStorage.setItem(KEYS.AUTH_TOKEN, 'mock_token_' + Date.now());
      localStorage.setItem(KEYS.USER, JSON.stringify(user));
      return { success: true, user };
    },

    signup(name, email, password) {
      if (!name || !email || !password) return { success: false, error: 'Please fill all fields.' };
      if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };

      const user = { ...MOCK.user, name, email, initials: name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) };
      localStorage.setItem(KEYS.AUTH_TOKEN, 'mock_token_' + Date.now());
      localStorage.setItem(KEYS.USER, JSON.stringify(user));
      return { success: true, user };
    },

    logout() {
      localStorage.removeItem(KEYS.AUTH_TOKEN);
      localStorage.removeItem(KEYS.USER);
      window.location.href = '../pages/login.html';
    },

    requireAuth() {
      if (!this.isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
      }
      return true;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // TOAST NOTIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  const toast = {
    _el: null,
    _timer: null,

    _ensure() {
      if (!this._el) {
        this._el = document.createElement('div');
        this._el.className = 'toast';
        this._el.setAttribute('role', 'alert');
        this._el.setAttribute('aria-live', 'polite');
        document.body.appendChild(this._el);
      }
    },

    show(message, duration = 3000) {
      this._ensure();
      this._el.textContent = message;
      this._el.classList.add('show');

      clearTimeout(this._timer);
      this._timer = setTimeout(() => {
        this._el.classList.remove('show');
      }, duration);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITY FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────
  const utils = {
    // Format date to relative time
    relativeTime(dateStr) {
      return dateStr; // mock data already has formatted strings
    },

    // Validate email format
    isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    // Format file size
    formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    // Debounce
    debounce(fn, delay = 300) {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
      };
    },

    // Simple DOM query helpers
    $(selector, parent = document) {
      return parent.querySelector(selector);
    },

    $$(selector, parent = document) {
      return [...parent.querySelectorAll(selector)];
    },

    // Trigger page enter animation
    pageEnter(el) {
      if (el) {
        el.classList.add('page-enter');
        el.addEventListener('animationend', () => el.classList.remove('page-enter'), { once: true });
      }
    },

    // Create element with class
    createElement(tag, className, innerHTML = '') {
      const el = document.createElement(tag);
      if (className) el.className = className;
      if (innerHTML) el.innerHTML = innerHTML;
      return el;
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────
  function init() {
    theme.init();
    lang.init();
    // Add page enter animation to body content
    document.addEventListener('DOMContentLoaded', () => {
      const main = document.querySelector('.screen, main, body > div:not(.bottom-nav):not(.app-bar)');
      if (main) utils.pageEnter(main);
    });
  }

  // Auto-initialize
  init();

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────
  return {
    ROUTES,
    MOCK,
    KEYS,
    theme,
    lang,
    auth,
    toast,
    utils,
  };

})();

// Make globally available
window.StudyGenApp = StudyGenApp;
