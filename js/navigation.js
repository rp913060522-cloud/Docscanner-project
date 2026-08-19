/**
 * StudyGen AI — Navigation System & Real-Time Header Manager
 * Handles: Real-time user greeting & avatar initialization, bottom navigation,
 *           app bar scroll behavior, back navigation, active tab highlighting.
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

  // Helper to compute initials from full name
  function getInitials(name) {
    if (!name) return 'SG';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  // ── Dynamic Real-Time Time Greeting & User Avatar Manager ────────────────
  async function updateHeaderAndGreeting() {
    let user = null;
    try {
      user = await StudyGenApp.auth.checkSession();
    } catch (err) {
      console.warn('Session check warning:', err.message);
    }

    // Real-time Greeting Calculation based on Local Clock
    const hour = new Date().getHours();
    let timeGreeting = 'Good Morning';
    if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good Afternoon';
    } else if (hour >= 17 && hour < 22) {
      timeGreeting = 'Good Evening';
    } else if (hour >= 22 || hour < 5) {
      timeGreeting = 'Good Night';
    }

    // Determine display name & initials
    let displayName = 'Student';
    let userInitials = 'SG';

    if (user && user.name) {
      displayName = user.name.split(' ')[0];
      userInitials = getInitials(user.name);
    } else if (StudyGenApp.MOCK && StudyGenApp.MOCK.user && StudyGenApp.MOCK.user.name) {
      displayName = StudyGenApp.MOCK.user.name.split(' ')[0];
      userInitials = getInitials(StudyGenApp.MOCK.user.name);
    }

    // 1. Update Greeting Banner Text (#greetingText)
    const greetingEl = document.getElementById('greetingText');
    if (greetingEl) {
      greetingEl.textContent = `${timeGreeting}, ${displayName}! 👋`;
    }

    // 2. Update Header Avatar Badge Elements (.app-bar__avatar, #avatarBtn)
    document.querySelectorAll('.app-bar__avatar, #avatarBtn').forEach(el => {
      if (user && user.avatarUrl) {
        el.innerHTML = `<img src="${user.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
      } else {
        el.textContent = userInitials;
      }
    });
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

        if (navigator.vibrate) navigator.vibrate(10);

        document.querySelectorAll('.bottom-nav__item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        setTimeout(() => {
          window.location.href = href;
        }, 150);
      });
    });
  }

  // ── Render Header Helper for Sub-pages ─────────────────────────────────────
  function renderBackAppBar(title = '', backHref = 'home.html') {
    return `
      <header class="app-bar app-bar--back">
        <button class="app-bar__back" onclick="StudyGenNav.goBack('${backHref}')" aria-label="Back">
          <span class="material-icons-round">arrow_back_ios_new</span>
        </button>
        <span class="app-bar__center">${title}</span>
        <div class="app-bar__actions">
          <div class="app-bar__avatar avatar-placeholder" id="avatarBtn" role="button" aria-label="Profile">SG</div>
        </div>
      </header>
    `;
  }

  function renderHomeAppBar() {
    return `
      <header class="app-bar app-bar--home">
        <div class="app-bar__brand">
          <div class="app-bar__logo-icon">
            <span class="material-icons-round" style="font-size:20px;color:white">menu_book</span>
          </div>
          <span class="app-bar__title">StudyGen AI</span>
        </div>
        <div class="app-bar__actions">
          <button class="app-bar__action-btn" id="notifBtn" aria-label="Notifications">
            <span class="material-icons-round">notifications_none</span>
          </button>
          <div class="app-bar__avatar avatar-placeholder" id="avatarBtn" role="button" aria-label="Profile">SG</div>
        </div>
      </header>
    `;
  }

  // ── Attach Header Scroll Shadow ───────────────────────────────────────────
  function initScrollBehavior() {
    const appBar = document.querySelector('.app-bar');
    const scrollContainer = document.querySelector('.page-scroll') || window;

    if (!appBar) return;

    const handleScroll = (scrollTop) => {
      if (scrollTop > 10) {
        appBar.classList.add('app-bar--scrolled');
      } else {
        appBar.classList.remove('app-bar--scrolled');
      }
    };

    if (scrollContainer === window) {
      window.addEventListener('scroll', () => handleScroll(window.scrollY), { passive: true });
    } else {
      scrollContainer.addEventListener('scroll', () => handleScroll(scrollContainer.scrollTop), { passive: true });
    }
  }

  // ── Navigation Utilities ──────────────────────────────────────────────────
  function navigate(href) {
    const screen = document.querySelector('.screen');
    if (screen) {
      StudyGenApp.utils.pageExit(screen, () => {
        window.location.href = href;
      });
    } else {
      window.location.href = href;
    }
  }

  function goBack(fallbackHref = 'home.html') {
    if (document.referrer && document.referrer.includes(window.location.host)) {
      window.history.back();
    } else {
      navigate(fallbackHref);
    }
  }

  // ── Initialize current page ────────────────────────────────────────────────
  async function init(options = {}) {
    const {
      activePage,
      showNav = true,
      requireAuth = false,
      onReady,
    } = options;

    if (requireAuth) {
      const isAuth = await StudyGenApp.auth.requireAuth();
      if (!isAuth) return;
    }

    const runInit = async () => {
      if (showNav) {
        injectBottomNav(activePage);
      }

      initScrollBehavior();

      const screen = document.querySelector('.screen, main');
      if (screen) StudyGenApp.utils.pageEnter(screen);

      const avatar = document.getElementById('avatarBtn');
      if (avatar) avatar.addEventListener('click', () => navigate('profile.html'));

      const notifBtn = document.getElementById('notifBtn');
      if (notifBtn) notifBtn.addEventListener('click', () => StudyGenApp.toast.show('No new notifications'));

      // Real-time update greeting & user avatar
      await updateHeaderAndGreeting();

      if (onReady) onReady();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runInit);
    } else {
      await runInit();
    }
  }

  function confirm(message, onConfirm) {
    if (window.confirm(message)) {
      if (onConfirm) onConfirm();
    }
  }

  return {
    init,
    injectBottomNav,
    renderHomeAppBar,
    renderBackAppBar,
    navigate,
    goBack,
    getCurrentPage,
    initScrollBehavior,
    updateHeaderAndGreeting,
    confirm,
  };

})();

window.StudyGenNav = StudyGenNav;
