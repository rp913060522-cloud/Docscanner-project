'use strict';

/**
 * StudyGen AI — Global App State & Services
 * Connects real backend REST APIs via ApiClient and LocalPdfDB.
 */

const StudyGenApp = (() => {
  // ── CONSTANTS ──────────────────────────────────────────────────────────────
  const KEYS = {
    THEME: 'sg_theme',
    LANGUAGE: 'sg_lang',
    ACTIVE_DOC: 'sg_active_doc_id',
  };

  const ROUTES = {
    splash: '../index.html',
    login: 'login.html',
    signup: 'signup.html',
    home: 'home.html',
    scanner: 'scanner.html',
    scanPreview: 'scan-preview.html',
    aiStudy: 'ai-study.html',
    aiLearning: 'ai-learning.html',
    pdfAI: 'pdf-ai.html',
    history: 'history.html',
    profile: 'profile.html',
    settings: 'settings.html',
    premium: 'premium.html',
  };

  // State cache for current user session
  let currentUser = null;
  let isSessionChecked = false;

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
    },
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
      elements.forEach((el) => {
        const text = el.getAttribute(`data-${code}`);
        if (text) el.textContent = text;
      });
    },

    init() {
      document.documentElement.setAttribute('data-lang', this.current);
      this._applyTranslations(this.current);
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // AUTHENTICATION SERVICES (Real Backend APIs)
  // ─────────────────────────────────────────────────────────────────────────
  const auth = {
    isLoggedIn() {
      return Boolean(currentUser);
    },

    getUser() {
      return currentUser;
    },

    async checkSession() {
      try {
        const res = await window.ApiClient.get('/auth/me');
        if (res && res.success && res.data && res.data.user) {
          currentUser = res.data.user;
        } else {
          currentUser = null;
        }
      } catch {
        currentUser = null;
      } finally {
        isSessionChecked = true;
      }
      return currentUser;
    },

    async login(email, password) {
      try {
        const res = await window.ApiClient.post('/auth/login', { email, password });
        if (res && res.success && res.data && res.data.user) {
          currentUser = res.data.user;
          return { success: true, user: currentUser, message: res.message };
        }
        return { success: false, error: res.message || 'Login failed.' };
      } catch (err) {
        return { success: false, error: err.message || 'Invalid login credentials.' };
      }
    },

    async signup(name, email, password) {
      try {
        const res = await window.ApiClient.post('/auth/register', { name, email, password });
        if (res && res.success && res.data && res.data.user) {
          currentUser = res.data.user;
          return { success: true, user: currentUser, message: res.message };
        }
        return { success: false, error: res.message || 'Registration failed.' };
      } catch (err) {
        return { success: false, error: err.message || 'Registration failed.' };
      }
    },

    async googleLogin(credential) {
      try {
        const res = await window.ApiClient.post('/auth/google', { credential });
        if (res && res.success && res.data && res.data.user) {
          currentUser = res.data.user;
          return { success: true, user: currentUser, message: res.message };
        }
        return { success: false, error: res.message || 'Google Sign-In failed.' };
      } catch (err) {
        return { success: false, error: err.message || 'Google Sign-In failed.' };
      }
    },

    async logout() {
      try {
        await window.ApiClient.post('/auth/logout');
      } catch (err) {
        console.warn('Logout API warning:', err.message);
      } finally {
        currentUser = null;
        window.location.href = ROUTES.login;
      }
    },

    async requireAuth() {
      if (!isSessionChecked) {
        await this.checkSession();
      }
      if (!this.isLoggedIn()) {
        window.location.href = ROUTES.login;
        return false;
      }
      return true;
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // TOAST NOTIFICATION HELPERS
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
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITY HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  const utils = {
    relativeTime(dateInput) {
      if (!dateInput) return 'Recently';
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return String(dateInput);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    },

    isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    formatSize(bytes) {
      if (!bytes || bytes < 1024) return (bytes || 0) + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    debounce(fn, delay = 300) {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
      };
    },

    $(selector, parent = document) {
      return parent.querySelector(selector);
    },

    $$(selector, parent = document) {
      return [...parent.querySelectorAll(selector)];
    },

    pageEnter(el) {
      if (el) {
        el.classList.add('page-enter');
        el.addEventListener('animationend', () => el.classList.remove('page-enter'), {
          once: true,
        });
      }
    },

    pageExit(el, callback) {
      if (!el) {
        if (callback) callback();
        return;
      }
      el.classList.add('page-exit');
      const done = () => {
        el.classList.remove('page-exit');
        if (callback) callback();
      };
      // If CSS animation runs, wait for it; otherwise fire immediately
      const style = window.getComputedStyle(el);
      const dur = parseFloat(style.animationDuration || '0');
      if (dur > 0) {
        el.addEventListener('animationend', done, { once: true });
      } else {
        setTimeout(done, 180); // small fallback delay for feel
      }
    },

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

    document.addEventListener('DOMContentLoaded', () => {
      const main = document.querySelector(
        '.screen, main, body > div:not(.bottom-nav):not(.app-bar)'
      );
      if (main) utils.pageEnter(main);
    });
  }

  init();

  return {
    ROUTES,
    KEYS,
    theme,
    lang,
    auth,
    toast,
    utils,
  };
})();

window.StudyGenApp = StudyGenApp;
