'use strict';

/**
 * StudyGen AI — Input Validation Utilities
 *
 * Pure functions — no side effects, no database calls, no HTTP.
 * Used by auth controllers to validate request bodies before any DB access.
 *
 * All validators return:
 *   { valid: true }  on success
 *   { valid: false, errors: [{ field, message }] }  on failure
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 60;

// ── Helpers ───────────────────────────────────────────────────────────────────

function isString(value) {
  return typeof value === 'string';
}

function isNonEmpty(value) {
  return isString(value) && value.trim().length > 0;
}

// ── Exported Validators ───────────────────────────────────────────────────────

/**
 * Validates the registration request body.
 *
 * Rules:
 *  - name: 2–60 characters, required
 *  - email: valid RFC-ish email format, required
 *  - password: 8–128 characters, must contain at least one letter
 *              and at least one digit, required
 *
 * @param {{ name: any, email: any, password: any }} body
 * @returns {{ valid: boolean, errors?: Array<{ field: string, message: string }> }}
 */
function validateRegistration({ name, email, password }) {
  const errors = [];

  // ── Name ──
  if (!isNonEmpty(name)) {
    errors.push({ field: 'name', message: 'Name is required.' });
  } else if (name.trim().length < NAME_MIN_LENGTH) {
    errors.push({ field: 'name', message: `Name must be at least ${NAME_MIN_LENGTH} characters.` });
  } else if (name.trim().length > NAME_MAX_LENGTH) {
    errors.push({ field: 'name', message: `Name must be at most ${NAME_MAX_LENGTH} characters.` });
  }

  // ── Email ──
  if (!isNonEmpty(email)) {
    errors.push({ field: 'email', message: 'Email is required.' });
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'Please provide a valid email address.' });
  }

  // ── Password ──
  if (!isNonEmpty(password)) {
    errors.push({ field: 'password', message: 'Password is required.' });
  } else {
    if (password.length < PASSWORD_MIN_LENGTH) {
      errors.push({ field: 'password', message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` });
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      errors.push({ field: 'password', message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters.` });
    }
    if (!/[a-zA-Z]/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one letter.' });
    }
    if (!/\d/.test(password)) {
      errors.push({ field: 'password', message: 'Password must contain at least one number.' });
    }
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

/**
 * Validates the login request body.
 *
 * Rules:
 *  - email: present and non-empty
 *  - password: present and non-empty
 *
 * (No strength checks on login — only presence. The DB comparison determines validity.)
 *
 * @param {{ email: any, password: any }} body
 * @returns {{ valid: boolean, errors?: Array<{ field: string, message: string }> }}
 */
function validateLogin({ email, password }) {
  const errors = [];

  if (!isNonEmpty(email)) {
    errors.push({ field: 'email', message: 'Email is required.' });
  }

  if (!isNonEmpty(password)) {
    errors.push({ field: 'password', message: 'Password is required.' });
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

module.exports = {
  validateRegistration,
  validateLogin,
  EMAIL_REGEX,
  PASSWORD_MIN_LENGTH,
  NAME_MIN_LENGTH,
};
