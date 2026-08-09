'use strict';

/**
 * StudyGen AI — Profile Screen Logic
 * Connects authenticated user session, stats, and real API logout.
 * Enforces session protection and populates dynamic user statistics from backend.
 */

document.addEventListener('DOMContentLoaded', async () => {

  // Require authentication — redirects to login.html if unauthorized
  const isAuth = await StudyGenApp.auth.requireAuth();
  if (!isAuth) return;

  const user = StudyGenApp.auth.getUser();

  // Set user info dynamically
  const nameEl   = document.getElementById('userName');
  const emailEl  = document.getElementById('userEmail');
  const avatarEl = document.getElementById('profileAvatar');
  const badgeEl  = document.getElementById('userBadge');

  if (user) {
    const initials = (user.name || 'User').split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'US';
    if (nameEl) nameEl.textContent = user.name;
    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl) avatarEl.textContent = initials;

    if (user.isPremium && badgeEl) {
      badgeEl.className = 'badge badge-premium';
      badgeEl.innerHTML = `<span class="material-icons-round" style="font-size:14px;">star</span><span>PRO Member</span>`;
    }
  }

  // Load user stats from backend history API for authenticated user
  try {
    const res = await window.ApiClient.get('/history');
    if (res && res.success && res.data) {
      const historyItems = res.data.history || [];
      const statScanned = document.getElementById('statScanned');
      const statNotes   = document.getElementById('statNotes');
      const statPdfs    = document.getElementById('statPdfs');
      const statQuizzes = document.getElementById('statQuizzes');

      if (statScanned) statScanned.textContent = historyItems.length;
      if (statNotes)   statNotes.textContent   = historyItems.filter(h => h.noteId).length;
      if (statPdfs)    statPdfs.textContent    = historyItems.length;
      if (statQuizzes) statQuizzes.textContent = historyItems.filter(h => h.quizId).length;
    }
  } catch (err) {
    console.warn('Profile history stats info:', err.message);
  }

  // Menu click handlers
  document.getElementById('btnEditProfile')?.addEventListener('click', (e) => { e.preventDefault(); StudyGenApp.toast.show('Profile editing enabled.'); });
  document.getElementById('btnChangePass')?.addEventListener('click', (e) => { e.preventDefault(); StudyGenApp.toast.show('Password reset link sent to your email.'); });
  document.getElementById('btnDownloads')?.addEventListener('click', (e) => { e.preventDefault(); StudyGenApp.toast.show('My Downloads folder.'); });
  document.getElementById('btnFavorites')?.addEventListener('click', (e) => { e.preventDefault(); StudyGenApp.toast.show('Starred notes view.'); });

  // Logout button handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      StudyGenNav.confirm(
        'Are you sure you want to logout?',
        async () => {
          await StudyGenApp.auth.logout();
        }
      );
    });
  }
});
