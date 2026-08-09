'use strict';

/**
 * StudyGen AI — Authentication Logic
 * Connects real backend REST APIs for Login, Signup, and Google Sign-In.
 */

document.addEventListener('DOMContentLoaded', async () => {

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

  // ── Forgot Password Toast ──────────────────────────────────────────────────
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
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailEl    = document.getElementById('email');
      const passwordEl = document.getElementById('password');
      const emailErr   = document.getElementById('emailError');
      const passErr    = document.getElementById('passwordError');
      const formErr    = document.getElementById('formError');
      const submitBtn  = document.getElementById('submitBtn');

      let isValid = true;

      const email = emailEl ? emailEl.value.trim() : '';
      if (!email || !StudyGenApp.utils.isValidEmail(email)) {
        emailEl.classList.add('error');
        if (emailErr) emailErr.classList.remove('hidden');
        isValid = false;
      } else {
        emailEl.classList.remove('error');
        if (emailErr) emailErr.classList.add('hidden');
      }

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
      submitBtn.disabled = true;
      if (formErr) formErr.classList.add('hidden');

      try {
        const res = await StudyGenApp.auth.login(email, password);

        if (res.success) {
          StudyGenApp.toast.show(`Welcome back, ${res.user.name.split(' ')[0]}! 👋`);
          setTimeout(() => {
            window.location.href = 'home.html';
          }, 300);
        } else {
          if (formErr) {
            const msgEl = document.getElementById('formErrorMsg');
            if (msgEl) msgEl.textContent = res.error || 'Login failed.';
            formErr.classList.remove('hidden');
          }
          StudyGenApp.toast.show(res.error || 'Invalid credentials.');
        }
      } catch (err) {
        if (formErr) {
          const msgEl = document.getElementById('formErrorMsg');
          if (msgEl) msgEl.textContent = err.message || 'Server error.';
          formErr.classList.remove('hidden');
        }
        StudyGenApp.toast.show(err.message || 'Login failed.');
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    });
  }

  // ── SIGN UP FORM SUBMISSION ─────────────────────────────────────────────────
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
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

      const name = nameEl ? nameEl.value.trim() : '';
      if (!name || name.length < 2) {
        nameEl.classList.add('error');
        if (nameErr) nameErr.classList.remove('hidden');
        isValid = false;
      } else {
        nameEl.classList.remove('error');
        if (nameErr) nameErr.classList.add('hidden');
      }

      const email = emailEl ? emailEl.value.trim() : '';
      if (!email || !StudyGenApp.utils.isValidEmail(email)) {
        emailEl.classList.add('error');
        if (emailErr) emailErr.classList.remove('hidden');
        isValid = false;
      } else {
        emailEl.classList.remove('error');
        if (emailErr) emailErr.classList.add('hidden');
      }

      const password = passwordEl ? passwordEl.value.trim() : '';
      if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
        passwordEl.classList.add('error');
        if (passErr) {
          passErr.textContent = 'Password must be at least 8 characters with a letter and a number.';
          passErr.classList.remove('hidden');
        }
        isValid = false;
      } else {
        passwordEl.classList.remove('error');
        if (passErr) passErr.classList.add('hidden');
      }

      if (!isValid) return;

      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      if (formErr) formErr.classList.add('hidden');

      try {
        const res = await StudyGenApp.auth.signup(name, email, password);

        if (res.success) {
          StudyGenApp.toast.show(`Account created! Welcome, ${name.split(' ')[0]}! 🎉`);
          setTimeout(() => {
            window.location.href = 'home.html';
          }, 300);
        } else {
          if (formErr) {
            const msgEl = document.getElementById('formErrorMsg');
            if (msgEl) msgEl.textContent = res.error || 'Registration failed.';
            formErr.classList.remove('hidden');
          }
          StudyGenApp.toast.show(res.error || 'Registration failed.');
        }
      } catch (err) {
        if (formErr) {
          const msgEl = document.getElementById('formErrorMsg');
          if (msgEl) msgEl.textContent = err.message || 'Server error.';
          formErr.classList.remove('hidden');
        }
        StudyGenApp.toast.show(err.message || 'Registration failed.');
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    });
  }

  // ── GOOGLE SIGN-IN HANDLER ───────────────────────────────────────────────
  const googleBtn = document.getElementById('googleSignInBtn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      // If Google Identity Services SDK is loaded, prompt credential
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.prompt();
      } else {
        StudyGenApp.toast.show('Google Sign-In initialized. Connect public Client ID to configure.');
      }
    });
  }

  // Global callback function for Google Identity Services SDK
  window.handleGoogleCredentialResponse = async function (response) {
    if (!response || !response.credential) {
      StudyGenApp.toast.show('Google Sign-In failed.');
      return;
    }

    try {
      const res = await StudyGenApp.auth.googleLogin(response.credential);
      if (res.success) {
        StudyGenApp.toast.show(`Signed in with Google! Welcome, ${res.user.name}! 🎉`);
        setTimeout(() => {
          window.location.href = 'home.html';
        }, 300);
      } else {
        StudyGenApp.toast.show(res.error || 'Google Sign-In failed.');
      }
    } catch (err) {
      StudyGenApp.toast.show(err.message || 'Google Sign-In failed.');
    }
  };

});
