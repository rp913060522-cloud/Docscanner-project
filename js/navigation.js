/**
 * StudyGen AI — Navigation System
 * Handles: Bottom navigation, app bar scroll behavior, back navigation,
 *           active tab highlighting, page-to-page transitions.
 */

'use strict';

const StudyGenNav = (() => {

  // ── Bottom Nav Tab Config ────────────────────────────────────────────────
  const NAV_TABS = [
    { id: 'home',     label: 'Home',    icon: 'home',    labelHi: 'होम',     href: 'home.html'    },
    { id: 'history',  label: 'History', icon: 'history', labelHi: 'इतिहास',  href: 'history.html' },
    { id: 'profile',  label: 'Profile', icon: 'person',  labelHi: 'प्रोफ़ाइल', href: 'profile.html' },
    { id: 'settings', label: 'Settings',icon: 'settings',labelHi: 'सेटिंग्स', href: 'settings.html'},
  ];

  // ── Detect current active page from URL ──────────────────────────────────
  function getCurrentPage() {
    const path = window.location.pathname;
    const file = path.split('/').pop().replace('.html', '');
    return file || 'home';
  }

  // ── Render Bottom Navigation HTML ─────────────────────────────────────────
  function renderBottomNav(activePage) {
    const current = activePage || getCurrentPage();
    const isHindi = StudyGenApp.lang.current === 'hi';

    const html = `
      <nav class="bottom-nav" role="navigation" aria-label="Main navigation">
        ${NAV_TABS.map(tab => `
          <a
            href="${tab.href}"
            class="bottom-nav__item ${current === tab.id ? 'active' : ''}"
            aria-label="${tab.label}"
            aria-current="${current === tab.id ? 'page' : 'false'}"
            id="nav-${tab.id}"
          >
            <div class="bottom-nav__indicator"></div>
            <span class="material-icons-round bottom-nav__icon">${tab.icon}</span>
            <span class="bottom-nav__label" data-en="${tab.label}" data-hi="${tab.labelHi}">${isHindi ? tab.labelHi : tab.label}</span>
          </a>
        `).join('')}
      </nav>
    `;

    return html;
  }

  // ── Inject Bottom Nav into Page ───────────────────────────────────────────
  function injectBottomNav(activePage) {
    const existing = document.querySelector('.bottom-nav');
    if (existing) existing.remove();

    const nav = document.createElement('div');
    nav.innerHTML = renderBottomNav(activePage);
    const target = document.querySelector('.screen') || document.body;
    target.appendChild(nav.firstElementChild);

    _attachNavClickHandlers();
  }

  // ── Attach smooth nav click transitions ───────────────────────────────────
  function _attachNavClickHandlers() {
    document.querySelectorAll('.bottom-nav__item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const href = item.getAttribute('href');
        if (!href) return;

        // Haptic feedback on mobile
        if (navigator.vibrate) navigator.vibrate(10);

        // Set active state immediately for visual feedback
        document.querySelectorAll('.bottom-nav__item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Navigate with slight delay for animation
        setTimeout(() => {
          window.location.href = href;
        }, 100);
      });
    });
  }

  // ── App Bar Scroll Behavior ───────────────────────────────────────────────
  function initScrollBehavior(scrollTarget) {
    const appBar = document.querySelector('.app-bar');
    if (!appBar) return;

    const el = scrollTarget || document.querySelector('.page-scroll') || window;

    const onScroll = StudyGenApp.utils.debounce(() => {
      const scrollY = el === window ? window.scrollY : el.scrollTop;
      appBar.classList.toggle('scrolled', scrollY > 8);
    }, 50);

    el.addEventListener('scroll', onScroll, { passive: true });
  }

  // ── Build Standard App Bar (with logo & actions) ──────────────────────────
  function renderHomeAppBar(userInitials) {
    return `
      <header class="app-bar" id="appBar" role="banner">
        <div class="app-bar__logo">
          <div class="app-bar__logo-icon">
            <span class="material-icons-round" style="font-size:20px;color:white">menu_book</span>
          </div>
          <span class="app-bar__title">StudyGen AI</span>
        </div>
        <div class="app-bar__actions">
          <button class="app-bar__action-btn" id="notifBtn" aria-label="Notifications">
            <span class="material-icons-round">notifications_none</span>
          </button>
          <div class="app-bar__avatar avatar-placeholder" id="avatarBtn" style="width:36px;height:36px;font-size:14px;cursor:pointer" role="button" aria-label="Profile">
            ${userInitials || 'RS'}
          </div>
        </div>
      </header>
    `;
  }

  // ── Build Back App Bar (with back button) ─────────────────────────────────
  function renderBackAppBar(title, actions = '') {
    return `
      <header class="app-bar" id="appBar" role="banner">
        <button class="app-bar__back" onclick="history.back()" aria-label="Go back">
          <span class="material-icons-round">arrow_back_ios_new</span>
        </button>
        <span class="app-bar__center">${title}</span>
        <div class="app-bar__actions">${actions}</div>
      </header>
    `;
  }

  // ── Navigate to page with transition ─────────────────────────────────────
  function navigate(href) {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.15s ease';
    setTimeout(() => {
      window.location.href = href;
    }, 150);
  }

  // ── Back navigation helper ────────────────────────────────────────────────
  function goBack(fallback = 'home.html') {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(fallback);
    }
  }

  // ── Confirm dialog helper ─────────────────────────────────────────────────
  function confirm(message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay visible';

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
      width: 100%; max-width: 430px; background: var(--bg);
      border-radius: 20px 20px 0 0; padding: 24px 16px 40px;
      z-index: 210; font-family: var(--font);
    `;
    dialog.innerHTML = `
      <div style="width:40px;height:4px;background:var(--border);border-radius:100px;margin:0 auto 20px;"></div>
      <p style="font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:8px;text-align:center;">${message}</p>
      <p style="font-size:13px;color:var(--text-secondary);text-align:center;margin-bottom:24px;">This action cannot be undone.</p>
      <div style="display:flex;gap:12px;">
        <button id="cancelBtn" class="btn btn-outlined" style="width:50%;">Cancel</button>
        <button id="confirmBtn" class="btn btn-danger" style="width:50%;">Delete</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(dialog);

    overlay.addEventListener('click', cleanup);
    dialog.querySelector('#cancelBtn').addEventListener('click', () => { cleanup(); if (onCancel) onCancel(); });
    dialog.querySelector('#confirmBtn').addEventListener('click', () => { cleanup(); if (onConfirm) onConfirm(); });

    function cleanup() {
      overlay.remove();
      dialog.remove();
    }
  }

  // ── Initialize current page ────────────────────────────────────────────────
  function init(options = {}) {
    const {
      activePage,
      showNav = true,
      requireAuth = false,
      onReady,
    } = options;

    // Auth guard
    if (requireAuth && !StudyGenApp.auth.isLoggedIn()) {
      window.location.href = 'login.html';
      return;
    }

    const runInit = () => {
      // Inject bottom nav if needed
      if (showNav) {
        injectBottomNav(activePage);
      }

      // Init scroll behavior
      initScrollBehavior();

      // Page enter animation
      const screen = document.querySelector('.screen, main');
      if (screen) StudyGenApp.utils.pageEnter(screen);

      // Wire avatar → profile navigation
      const avatar = document.getElementById('avatarBtn');
      if (avatar) avatar.addEventListener('click', () => navigate('profile.html'));

      // Wire notification button
      const notifBtn = document.getElementById('notifBtn');
      if (notifBtn) notifBtn.addEventListener('click', () => StudyGenApp.toast.show('No new notifications'));

      // Call ready callback
      if (onReady) onReady();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runInit);
    } else {
      runInit();
    }
  }

  // ── PUBLIC API ─────────────────────────────────────────────────────────────
  return {
    init,
    injectBottomNav,
    renderHomeAppBar,
    renderBackAppBar,
    navigate,
    goBack,
    confirm,
    getCurrentPage,
    initScrollBehavior,
  };

})();

window.StudyGenNav = StudyGenNav;
