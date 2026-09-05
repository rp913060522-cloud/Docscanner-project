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
  };

  // State cache for current user session
  let currentUser = null;
  let isSessionChecked = false;
  let pendingAuthPromise = null;

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

    setUser(user) {
      currentUser = user;
      isSessionChecked = true;
    },

    clearCache() {
      currentUser = null;
      isSessionChecked = false;
      pendingAuthPromise = null;
    },

    /**
     * Single-flight + in-memory cached session checker.
     * Prevents duplicate GET /api/auth/me requests across components.
     */
    async checkSession(options = {}) {
      const forceRefresh = options && options.forceRefresh === true;

      // 1. In-memory cached session check (0 network calls)
      if (!forceRefresh && isSessionChecked && !pendingAuthPromise) {
        return currentUser;
      }

      // 2. Single-flight deduplication: reuse active pending promise (0 duplicate network calls)
      if (pendingAuthPromise) {
        return pendingAuthPromise;
      }

      // 3. Initiate single-flight GET /api/auth/me request
      pendingAuthPromise = (async () => {
        try {
          const res = await window.ApiClient.get('/auth/me');
          if (res && res.success && res.data && res.data.user) {
            currentUser = res.data.user;
          } else {
            currentUser = null;
          }
        } catch (err) {
          // If 401 or 429 occurs, set currentUser = null without crashing or looping
          currentUser = null;
        } finally {
          isSessionChecked = true;
          pendingAuthPromise = null;
        }
        return currentUser;
      })();

      return pendingAuthPromise;
    },

    async login(email, password) {
      try {
        const res = await window.ApiClient.post('/auth/login', { email, password });
        if (res && res.success && res.data && res.data.user) {
          currentUser = res.data.user;
          isSessionChecked = true;
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
          isSessionChecked = true;
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
          isSessionChecked = true;
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
        this.clearCache();
        window.location.href = ROUTES.login;
      }
    },

    async requireAuth() {
      if (!isSessionChecked) {
        await this.checkSession();
      }
      return this.isLoggedIn();
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
  // WATERMARK SERVICE (EasyScan PDF Branding & Extensibility)
  // ─────────────────────────────────────────────────────────────────────────
  const watermark = {
    enabled: true,
    text: 'Scanned with EasyScan',
    fontSize: 10,
    textColor: [220, 38, 38], // Vibrant red (#dc2626) for clear visibility
    bottomMargin: 18,

    /**
     * Applies watermark to all pages of a jsPDF document instance
     * @param {Object} doc - jsPDF instance
     * @param {Object} [options] - optional overrides
     */
    applyToDoc(doc, options = {}) {
      if (!this.enabled && !options.force) return;
      if (!doc || !doc.internal) return;

      try {
        const text = options.text || this.text;
        const fontSize = options.fontSize || this.fontSize;
        const color = options.textColor || this.textColor;
        const bottomMargin = options.bottomMargin || this.bottomMargin;
        const totalPages = doc.internal.getNumberOfPages ? doc.internal.getNumberOfPages() : 1;

        for (let p = 1; p <= totalPages; p++) {
          doc.setPage(p);
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(fontSize);
          doc.setTextColor(color[0], color[1], color[2]);

          const textWidth = doc.getTextWidth ? doc.getTextWidth(text) : 115;
          const xPos = (pageWidth - textWidth) / 2;
          const yPos = pageHeight - bottomMargin;

          doc.text(text, xPos, yPos);
        }
      } catch (err) {
        console.warn('EasyScan watermark application note:', err);
      }
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UNIVERSAL PDF SHARING SERVICE
  // ─────────────────────────────────────────────────────────────────────────
  const share = {
    /**
     * Download blob directly to user's device
     */
    downloadBlob(blob, filename) {
      if (!blob) return;
      const cleanName = (filename || 'document.pdf').endsWith('.pdf') ? filename : `${filename}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    },

    /**
     * Open a sleek, interactive PDF Share Sheet modal
     */
    openShareSheet({ blob, filename, title }) {
      const cleanName = (filename || 'document.pdf').endsWith('.pdf') ? filename : `${filename}.pdf`;
      const cleanTitle = title || cleanName.replace(/\.pdf$/i, '');
      const blobUrl = blob ? URL.createObjectURL(blob) : null;

      // Remove existing share modal if present
      const existing = document.getElementById('sg-share-modal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'sg-share-modal';
      modal.className = 'sg-share-modal-overlay';
      modal.innerHTML = `
        <div class="sg-share-modal-card" role="dialog" aria-modal="true" aria-label="Share Document">
          <div class="sg-share-header">
            <div class="sg-share-icon-wrap">
              <span class="material-icons-round" style="font-size:26px;color:#3b7bf8;">share</span>
            </div>
            <div style="flex:1;overflow:hidden;">
              <h3 class="sg-share-title">Share PDF Document</h3>
              <p class="sg-share-subtitle">${cleanName}</p>
            </div>
            <button class="sg-share-close-btn" id="sgShareCloseBtn" aria-label="Close">
              <span class="material-icons-round" style="font-size:18px;">close</span>
            </button>
          </div>

          <div class="sg-share-options">
            <button class="sg-share-opt-btn" id="sgShareWhatsApp">
              <div class="sg-share-opt-icon" style="background:#25D366;color:white;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.84a8.18 8.18 0 0 1-5.82 2.41c-1.46 0-2.88-.38-4.14-1.11l-.3-.17-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.44c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.43 1.03 2.6c.13.17 1.77 2.7 4.29 3.78.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.29z"/></svg>
              </div>
              <div class="sg-share-opt-text">
                <span class="sg-share-opt-title">Share on WhatsApp</span>
                <span class="sg-share-opt-desc">Send to WhatsApp chat or contact</span>
              </div>
              <span class="material-icons-round" style="color:var(--text-tertiary);font-size:18px;">arrow_forward_ios</span>
            </button>

            <button class="sg-share-opt-btn" id="sgShareDownload">
              <div class="sg-share-opt-icon" style="background:#2563eb;color:white;">
                <span class="material-icons-round" style="font-size:22px;">download</span>
              </div>
              <div class="sg-share-opt-text">
                <span class="sg-share-opt-title">Save PDF to Device</span>
                <span class="sg-share-opt-desc">Direct download to device storage</span>
              </div>
              <span class="material-icons-round" style="color:var(--text-tertiary);font-size:18px;">arrow_forward_ios</span>
            </button>

            <button class="sg-share-opt-btn" id="sgShareEmail">
              <div class="sg-share-opt-icon" style="background:#ea4335;color:white;">
                <span class="material-icons-round" style="font-size:22px;">mail</span>
              </div>
              <div class="sg-share-opt-text">
                <span class="sg-share-opt-title">Share via Email</span>
                <span class="sg-share-opt-desc">Send with Gmail or default mail app</span>
              </div>
              <span class="material-icons-round" style="color:var(--text-tertiary);font-size:18px;">arrow_forward_ios</span>
            </button>

            <button class="sg-share-opt-btn" id="sgSharePreview">
              <div class="sg-share-opt-icon" style="background:#7b52f4;color:white;">
                <span class="material-icons-round" style="font-size:22px;">visibility</span>
              </div>
              <div class="sg-share-opt-text">
                <span class="sg-share-opt-title">View / Print PDF</span>
                <span class="sg-share-opt-desc">Open in browser PDF viewer or print</span>
              </div>
              <span class="material-icons-round" style="color:var(--text-tertiary);font-size:18px;">arrow_forward_ios</span>
            </button>

            <button class="sg-share-opt-btn" id="sgShareCopy">
              <div class="sg-share-opt-icon" style="background:#64748b;color:white;">
                <span class="material-icons-round" style="font-size:22px;">content_copy</span>
              </div>
              <div class="sg-share-opt-text">
                <span class="sg-share-opt-title">Copy Document Info</span>
                <span class="sg-share-opt-desc">Copy title and details</span>
              </div>
              <span class="material-icons-round" style="color:var(--text-tertiary);font-size:18px;">arrow_forward_ios</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      requestAnimationFrame(() => modal.classList.add('sg-share-modal--visible'));

      function closeModal() {
        modal.classList.remove('sg-share-modal--visible');
        setTimeout(() => {
          if (modal.parentNode) modal.parentNode.removeChild(modal);
          if (blobUrl) URL.revokeObjectURL(blobUrl);
        }, 240);
      }

      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      const closeBtn = document.getElementById('sgShareCloseBtn');
      if (closeBtn) closeBtn.addEventListener('click', closeModal);

      // 1. WhatsApp Handler
      const waBtn = document.getElementById('sgShareWhatsApp');
      if (waBtn) {
        waBtn.addEventListener('click', async () => {
          const pdfFile = blob ? new File([blob], cleanName, { type: 'application/pdf' }) : null;

          // On mobile devices supporting Web Share File API, share actual PDF file to WhatsApp
          if (pdfFile && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            try {
              await navigator.share({
                files: [pdfFile],
                title: cleanTitle,
                text: `Sharing "${cleanName}" scanned with EasyScan AI`,
              });
              toast.show('PDF Document shared to WhatsApp! 📄✨');
              closeModal();
              return;
            } catch (err) {
              if (err.name === 'AbortError') {
                closeModal();
                return;
              }
              console.warn('Native WhatsApp share file note:', err);
            }
          }

          // Desktop Web / Fallback: Download the PDF file + open WhatsApp Web with clear guidance
          if (blob) share.downloadBlob(blob, cleanName);
          const shareText = `📚 Check out my study document "${cleanTitle}" scanned with EasyScan!`;
          const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
          window.open(waUrl, '_blank');
          toast.show(`📄 "${cleanName}" downloaded! WhatsApp khul gaya hai — chat mein 📎 Attach > Document dabayein ya file drag karein.`, 6000);
          closeModal();
        });
      }

      // 2. Download Handler
      const dlBtn = document.getElementById('sgShareDownload');
      if (dlBtn) {
        dlBtn.addEventListener('click', () => {
          if (blob) share.downloadBlob(blob, cleanName);
          toast.show(`"${cleanName}" device par save ho gaya! 💾✨`, 3000);
          closeModal();
        });
      }

      // 3. Email Handler
      const mailBtn = document.getElementById('sgShareEmail');
      if (mailBtn) {
        mailBtn.addEventListener('click', () => {
          if (blob) share.downloadBlob(blob, cleanName);
          const subject = `EasyScan Document: ${cleanTitle}`;
          const body = `Hi,\n\nI am sharing "${cleanName}" scanned with EasyScan AI.\n\n(The PDF file has been downloaded to your device so you can attach it).\n\nBest regards!`;
          window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          toast.show('PDF download ho gaya! Email mein attach karein 📧', 4000);
          closeModal();
        });
      }

      // 4. View / Print Handler
      const pvBtn = document.getElementById('sgSharePreview');
      if (pvBtn) {
        pvBtn.addEventListener('click', () => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          }
          closeModal();
        });
      }

      // 5. Copy Info Handler
      const cpBtn = document.getElementById('sgShareCopy');
      if (cpBtn) {
        cpBtn.addEventListener('click', async () => {
          const text = `Document: ${cleanName}\nScanned with EasyScan AI`;
          try {
            await navigator.clipboard.writeText(text);
            toast.show('Document info copied! 📋', 2500);
          } catch (e) {
            toast.show('Could not copy to clipboard.');
          }
          closeModal();
        });
      }
    },

    /**
     * Universal Share method:
     * - Tries native Web Share File API first (Mobile Android/iOS)
     * - If unsupported or fails, opens the rich interactive Share Sheet
     */
    async sharePdf({ blob, filename, title }) {
      if (!blob) {
        toast.show('PDF document not available.');
        return;
      }

      const cleanName = (filename || 'document.pdf').endsWith('.pdf') ? filename : `${filename}.pdf`;
      const cleanTitle = title || cleanName.replace(/\.pdf$/i, '');
      const pdfFile = new File([blob], cleanName, { type: 'application/pdf' });

      // Check if browser genuinely supports sharing files natively
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: cleanTitle,
            text: `Sharing "${cleanName}" scanned with EasyScan`,
          });
          toast.show('Document shared! 📄✨');
          return;
        } catch (err) {
          if (err.name === 'AbortError') {
            // User cancelled OS share sheet
            return;
          }
          console.warn('Native share file failed, falling back to Share Sheet:', err);
        }
      }

      // Fallback to interactive Share Sheet modal
      this.openShareSheet({ blob, filename: cleanName, title: cleanTitle });
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
    watermark,
    share,
  };
})();

window.StudyGenApp = StudyGenApp;
window.EasyScanApp = StudyGenApp;
