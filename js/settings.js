/**
 * StudyGen AI — Settings Screen Logic
 * Theme toggling, language switching, push notification preferences
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  StudyGenNav.init({ activePage: 'settings', requireAuth: false });

  // ── Dark Theme Toggle ───────────────────────────────────────────────────────
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.checked = StudyGenApp.theme.isDark();

    themeToggle.addEventListener('change', () => {
      const mode = StudyGenApp.theme.toggle();
      StudyGenApp.toast.show(mode === 'dark' ? 'Dark theme enabled 🌙' : 'Light theme enabled ☀️');
    });
  }

  // ── Language Toggle ─────────────────────────────────────────────────────────
  const langBtnText = document.getElementById('currentLangText');
  const changeLangBtn = document.getElementById('changeLangBtn');

  function updateLangUI() {
    const code = StudyGenApp.lang.current;
    if (langBtnText) langBtnText.textContent = code === 'hi' ? 'हिंदी (Hindi)' : 'English';
  }

  if (changeLangBtn) {
    changeLangBtn.addEventListener('click', () => {
      const newCode = StudyGenApp.lang.toggle();
      updateLangUI();
      StudyGenApp.toast.show(newCode === 'hi' ? 'भाषा: हिंदी' : 'Language: English');
    });
  }

  updateLangUI();

  // ── Other Toggles ───────────────────────────────────────────────────────────
  document.getElementById('notifToggle')?.addEventListener('change', (e) => {
    StudyGenApp.toast.show(e.target.checked ? 'Notifications enabled 🔔' : 'Notifications muted');
  });

  document.getElementById('autoCropToggle')?.addEventListener('change', (e) => {
    StudyGenApp.toast.show(e.target.checked ? 'Auto edge detection enabled 📐' : 'Manual cropping mode');
  });

  // Support items
  document.getElementById('btnHelp')?.addEventListener('click', (e) => { e.preventDefault(); StudyGenApp.toast.show('Opening Help Center...'); });
  document.getElementById('btnPrivacy')?.addEventListener('click', (e) => { e.preventDefault(); StudyGenApp.toast.show('Opening Privacy Policy...'); });
  document.getElementById('btnTerms')?.addEventListener('click', (e) => { e.preventDefault(); StudyGenApp.toast.show('Opening Terms of Service...'); });
  document.getElementById('btnContact')?.addEventListener('click', (e) => { e.preventDefault(); StudyGenApp.toast.show('Support email: support@studygenai.com'); });

});
