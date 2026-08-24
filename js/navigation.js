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

    // Determine display name & initials: 'New User' for new/unauthenticated users, real name for registered users
    let displayName = 'New User';
    let userInitials = 'NU';

    if (user && user.name && user.name !== 'Dev Guest' && user.email !== 'guest@studygen.local') {
      displayName = user.name.split(' ')[0];
      userInitials = getInitials(user.name);
    }

    // 1. Update Greeting Banner Text (#greetingText)
    const greetingEl = document.getElementById('greetingText');
    if (greetingEl) {
      greetingEl.textContent = `${timeGreeting}, ${displayName}! 👋`;
    }

    // 2. Update Header Avatar Badge Elements (.app-bar__avatar, #avatarBtn)
    document.querySelectorAll('.app-bar__avatar, #avatarBtn').forEach(el => {
      const imgUrl = (user && (user.avatar || user.avatarUrl)) ? (user.avatar || user.avatarUrl) : null;
      if (imgUrl) {
        el.innerHTML = `<img src="${imgUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
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

  function showActionSheet({ title = '', actions = [] }) {
    const existing = document.getElementById('studygenActionSheet');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'studygenActionSheet';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;

    const sheet = document.createElement('div');
    sheet.style.cssText = `
      width: 100%;
      max-width: var(--screen-max, 430px);
      background: var(--surface, #ffffff);
      border-radius: 20px 20px 0 0;
      padding: 16px 20px 24px;
      box-shadow: var(--shadow-lg, 0 -8px 24px rgba(0,0,0,0.15));
      transform: translateY(100%);
      transition: transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1);
    `;

    let actionsHtml = '';
    if (title) {
      actionsHtml += `
        <div style="text-align:center;padding-bottom:12px;margin-bottom:10px;border-bottom:1px solid var(--border,#e2e8f0);">
          <div style="width:36px;height:4px;background:var(--border,#cbd5e1);border-radius:2px;margin:0 auto 10px;"></div>
          <div style="font-size:13px;font-weight:700;color:var(--text-secondary,#64748b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90%;margin:0 auto;">${title}</div>
        </div>
      `;
    }

    sheet.innerHTML = actionsHtml + `
      <div class="action-sheet-buttons" style="display:flex;flex-direction:column;gap:8px;">
        ${actions.map((act, index) => `
          <button type="button" class="btn ${act.danger ? 'btn-outlined' : 'btn-ghost'}" data-index="${index}" style="width:100%;justify-content:flex-start;padding:12px 16px;font-size:14px;border-radius:12px;${act.danger ? 'color:#ef4444;border-color:rgba(239,68,68,0.25);background:rgba(239,68,68,0.04);' : 'color:var(--text-primary,#0f172a);background:var(--bg,#f8fafc);'}">
            <span>${act.label}</span>
          </button>
        `).join('')}
        <button type="button" class="btn btn-outlined cancel-action-btn" style="width:100%;margin-top:6px;padding:10px;font-size:13px;border-radius:12px;color:var(--text-secondary,#64748b);">
          Cancel
        </button>
      </div>
    `;

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      sheet.style.transform = 'translateY(0)';
    });

    const closeSheet = () => {
      overlay.style.opacity = '0';
      sheet.style.transform = 'translateY(100%)';
      setTimeout(() => overlay.remove(), 250);
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSheet();
    });

    sheet.querySelector('.cancel-action-btn')?.addEventListener('click', closeSheet);

    sheet.querySelectorAll('[data-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        closeSheet();
        if (actions[idx] && typeof actions[idx].onClick === 'function') {
          actions[idx].onClick();
        }
      });
    });
  }

  function confirm(title, onConfirm, description = '') {
    const existing = document.getElementById('studygen-confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'studygen-confirm-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.65);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
      transition: opacity 0.2s ease;
      backdrop-filter: blur(4px);
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: var(--surface, #ffffff);
      color: var(--text-primary, #0f172a);
      border-radius: 24px;
      padding: 24px 20px;
      max-width: 340px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      transform: scale(0.9);
      transition: transform 0.2s ease;
      text-align: center;
    `;

    modal.innerHTML = `
      <div style="width: 52px; height: 52px; background: rgba(239, 68, 68, 0.12); color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
        <span class="material-icons-round" style="font-size: 28px;">delete_outline</span>
      </div>
      <h3 style="font-size: 17px; font-weight: 700; margin: 0 0 8px; color: var(--text-primary, #0f172a);">${title || 'Delete Document?'}</h3>
      <p style="font-size: 13px; color: var(--text-secondary, #64748b); margin: 0 0 20px; line-height: 1.5;">${description || 'Are you sure you want to delete this document? This action cannot be undone.'}</p>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button type="button" class="btn btn-primary confirm-action-btn" style="width: 100%; background: #ef4444; border: none; padding: 12px; font-size: 14px; font-weight: 700; border-radius: 12px; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);">
          <span>Delete Permanently</span>
        </button>
        <button type="button" class="btn btn-outlined cancel-action-btn" style="width: 100%; border-color: var(--border, #e2e8f0); color: var(--text-secondary, #64748b); padding: 10px; font-size: 13px; border-radius: 12px;">
          Cancel
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      modal.style.transform = 'scale(1)';
    });

    const closeModal = () => {
      overlay.style.opacity = '0';
      modal.style.transform = 'scale(0.9)';
      setTimeout(() => overlay.remove(), 200);
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    modal.querySelector('.cancel-action-btn')?.addEventListener('click', closeModal);

    modal.querySelector('.confirm-action-btn')?.addEventListener('click', async () => {
      closeModal();
      if (typeof onConfirm === 'function') {
        await onConfirm();
      }
    });
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
    showActionSheet,
    confirm,
  };

})();

window.StudyGenNav = StudyGenNav;
