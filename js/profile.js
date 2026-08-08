/**
 * StudyGen AI — Profile Screen Logic
 * Populates user data & stats, handles menu items and logout confirm
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  StudyGenNav.init({ activePage: 'profile', requireAuth: false });

  const user  = StudyGenApp.auth.getUser() || StudyGenApp.MOCK.user;
  const stats = user.stats || StudyGenApp.MOCK.user.stats;

  // Set user info
  const nameEl   = document.getElementById('userName');
  const emailEl  = document.getElementById('userEmail');
  const avatarEl = document.getElementById('profileAvatar');
  const badgeEl  = document.getElementById('userBadge');

  if (nameEl) nameEl.textContent = user.name || 'Ravi Sharma';
  if (emailEl) emailEl.textContent = user.email || 'ravi@studygenai.com';
  if (avatarEl) avatarEl.textContent = user.initials || 'RS';

  if (user.isPremium && badgeEl) {
    badgeEl.className = 'badge badge-premium';
    badgeEl.innerHTML = `<span class="material-icons-round" style="font-size:14px;">star</span><span>PRO Member</span>`;
  }

  // Set stats
  const statScanned = document.getElementById('statScanned');
  const statNotes   = document.getElementById('statNotes');
  const statPdfs    = document.getElementById('statPdfs');
  const statQuizzes = document.getElementById('statQuizzes');

  if (statScanned) statScanned.textContent = stats.totalDocs || 24;
  if (statNotes)   statNotes.textContent   = stats.aiNotes || 156;
  if (statPdfs)    statPdfs.textContent    = stats.pdfs || 42;
  if (statQuizzes) statQuizzes.textContent = stats.quizzes || 12;

  // Menu click toasts
  document.getElementById('btnEditProfile')?.addEventListener('click', (e) => { e.preventDefault(); StudyGenApp.toast.show('Edit profile modal coming soon!'); });
  document.getElementById('btnChangePass')?.addEventListener('click', (e) => { e.preventDefault(); StudyGenApp.toast.show('Password reset link sent to your email.'); });
  document.getElementById('btnDownloads')?.addEventListener('click', (e) => { e.preventDefault(); StudyGenApp.toast.show('Opened My Downloads folder.'); });
  document.getElementById('btnFavorites')?.addEventListener('click', (e) => { e.preventDefault(); StudyGenApp.toast.show('Showing starred notes.'); });

  // Logout button handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      StudyGenNav.confirm(
        'Are you sure you want to logout?',
        () => {
          StudyGenApp.auth.logout();
        }
      );
    });
  }
});
