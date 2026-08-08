/**
 * StudyGen AI — Authentication Logic
 * Handles Login & Sign Up validation, password show/hide, mock authentication
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // ── Password Visibility Toggle ──────────────────────────────────────────────
  const passwordInput = document.getElementById('password');
  const toggleBtn     = document.getElementById('togglePassword');
  const toggleIcon    = document.getElementById('togglePasswordIcon');

  if (toggleBtn && passwordInput && toggleIcon) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPass = passwordInput.type === 'password';
      passwordInput.type = isPass ? 'text' : 'password';
      toggleIcon.textContent = isPass ? 'visibility' : 'visibility_off';
    });
  }

  // ── Forgot Password Modal/Toast ─────────────────────────────────────────────
  const forgotBtn = document.getElementById('forgotPasswordBtn');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('email');
      const email = emailInput ? emailInput.value.trim() : '';
      if (email && StudyGenApp.utils.isValidEmail(email)) {
        StudyGenApp.toast.show(`Password reset link sent to ${email}`);
      } else {
        StudyGenApp.toast.show('Please enter your registered email address first.');
        if (emailInput) emailInput.focus();
      }
    });
  }

  // ── LOGIN FORM SUBMISSION ───────────────────────────────────────────────────
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const emailEl    = document.getElementById('email');
      const passwordEl = document.getElementById('password');
      const emailErr   = document.getElementById('emailError');
      const passErr    = document.getElementById('passwordError');
      const formErr    = document.getElementById('formError');
      const submitBtn  = document.getElementById('submitBtn');

      let isValid = true;

      // Email validation
      const email = emailEl ? emailEl.value.trim() : '';
      if (!email || !StudyGenApp.utils.isValidEmail(email)) {
        emailEl.classList.add('error');
        if (emailErr) emailErr.classList.remove('hidden');
        isValid = false;
      } else {
        emailEl.classList.remove('error');
        if (emailErr) emailErr.classList.add('hidden');
      }

      // Password validation
      const password = passwordEl ? passwordEl.value.trim() : '';
      if (!password || password.length < 6) {
        passwordEl.classList.add('error');
        if (passErr) passErr.classList.remove('hidden');
        isValid = false;
      } else {
        passwordEl.classList.remove('error');
        if (passErr) passErr.classList.add('hidden');
      }

      if (!isValid) return;

      // Submit mock login
      submitBtn.classList.add('loading');
      if (formErr) formErr.classList.add('hidden');

      setTimeout(() => {
        const res = StudyGenApp.auth.login(email, password);
        submitBtn.classList.remove('loading');

        if (res.success) {
          StudyGenApp.toast.show(`Welcome back, ${res.user.name.split(' ')[0]}! 👋`);
          setTimeout(() => {
            window.location.href = 'home.html';
          }, 300);
        } else {
          if (formErr) {
            const msgEl = document.getElementById('formErrorMsg');
            if (msgEl) msgEl.textContent = res.error;
            formErr.classList.remove('hidden');
          }
        }
      }, 700);
    });
  }

  // ── SIGN UP FORM SUBMISSION ─────────────────────────────────────────────────
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameEl     = document.getElementById('fullname');
      const emailEl    = document.getElementById('email');
      const passwordEl = document.getElementById('password');
      
      const nameErr  = document.getElementById('nameError');
      const emailErr = document.getElementById('emailError');
      const passErr  = document.getElementById('passwordError');
      const formErr  = document.getElementById('formError');
      const submitBtn = document.getElementById('submitBtn');

      let isValid = true;

      // Name validation
      const name = nameEl ? nameEl.value.trim() : '';
      if (!name || name.length < 2) {
        nameEl.classList.add('error');
        if (nameErr) nameErr.classList.remove('hidden');
        isValid = false;
      } else {
        nameEl.classList.remove('error');
        if (nameErr) nameErr.classList.add('hidden');
      }

      // Email validation
      const email = emailEl ? emailEl.value.trim() : '';
      if (!email || !StudyGenApp.utils.isValidEmail(email)) {
        emailEl.classList.add('error');
        if (emailErr) emailErr.classList.remove('hidden');
        isValid = false;
      } else {
        emailEl.classList.remove('error');
        if (emailErr) emailErr.classList.add('hidden');
      }

      // Password validation
      const password = passwordEl ? passwordEl.value.trim() : '';
      if (!password || password.length < 6) {
        passwordEl.classList.add('error');
        if (passErr) passErr.classList.remove('hidden');
        isValid = false;
      } else {
        passwordEl.classList.remove('error');
        if (passErr) passErr.classList.add('hidden');
      }

      if (!isValid) return;

      submitBtn.classList.add('loading');
      if (formErr) formErr.classList.add('hidden');

      setTimeout(() => {
        const res = StudyGenApp.auth.signup(name, email, password);
        submitBtn.classList.remove('loading');

        if (res.success) {
          StudyGenApp.toast.show(`Account created! Welcome, ${name.split(' ')[0]}! 🎉`);
          setTimeout(() => {
            window.location.href = 'home.html';
          }, 300);
        } else {
          if (formErr) {
            const msgEl = document.getElementById('formErrorMsg');
            if (msgEl) msgEl.textContent = res.error;
            formErr.classList.remove('hidden');
          }
        }
      }, 700);
    });
  }

});
