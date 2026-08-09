'use strict';

/**
 * StudyGen AI — User Mongoose Model
 *
 * Security rules enforced at the schema level:
 *   1. passwordHash has select:false — NEVER returned in any query by default.
 *   2. toJSON transform strips passwordHash, googleId, __v from all serialized output.
 *   3. comparePassword() uses bcrypt.compare() — safe timing-attack-resistant comparison.
 *   4. Pre-save hook hashes the password if modified (bcrypt, cost factor 12).
 *
 * Auth providers:
 *   'local'  — email + password (passwordHash is set)
 *   'google' — Google Sign-In (googleId is set, passwordHash is null)
 *
 * An account can have BOTH authProvider values (linked account), handled
 * in the controller during Google Sign-In of an existing local user.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const BCRYPT_SALT_ROUNDS = 12;

// ── Schema Definition ─────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    // ── Core Identity ──────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters.'],
      maxlength: [60, 'Name must be at most 60 characters.'],
    },

    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address.',
      ],
    },

    // ── Authentication ─────────────────────────────────────────────────────────
    /**
     * select: false — this field is EXCLUDED from all queries by default.
     * To include it explicitly: User.findById(id).select('+passwordHash')
     * This is a critical security setting — never remove it.
     */
    passwordHash: {
      type: String,
      select: false,
    },

    /**
     * Google OAuth subject identifier (the 'sub' claim in Google's ID token).
     * Unique sparse index: allows multiple documents with null value (local-only users)
     * while enforcing uniqueness among documents that DO have a googleId.
     */
    googleId: {
      type: String,
      select: false,  // Not exposed in API responses
      default: null,
    },

    /**
     * Tracks how the user originally signed up.
     * 'local'  — registered with email + password
     * 'google' — signed up via Google Sign-In
     * A user who signed up locally and later linked Google keeps 'local'.
     */
    authProvider: {
      type: String,
      enum: {
        values: ['local', 'google'],
        message: 'authProvider must be "local" or "google".',
      },
      required: true,
      default: 'local',
    },

    // ── Profile ────────────────────────────────────────────────────────────────
    /**
     * Avatar URL — populated from Google profile picture on Google sign-in,
     * or left null for local users (frontend generates initials avatar).
     */
    avatar: {
      type: String,
      default: null,
    },

    // ── Subscription ───────────────────────────────────────────────────────────
    isPremium: {
      type: Boolean,
      default: false,
    },

    premiumExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    // ── Schema Options ─────────────────────────────────────────────────────────
    timestamps: true,   // Adds createdAt and updatedAt automatically

    /**
     * toJSON transform: runs whenever mongoose serializes a document to JSON
     * (e.g., res.json(user)).  Strips all sensitive/internal fields so they
     * can never accidentally leak through any API response.
     */
    toJSON: {
      transform(doc, ret) {
        // Remove sensitive/internal fields from ALL JSON responses
        delete ret.passwordHash;
        delete ret.googleId;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// email is already indexed via unique:true in the field definition.
// googleId needs a sparse index (allows multiple null values but unique non-null).
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

// ── Pre-save Hook: Password Hashing ──────────────────────────────────────────

/**
 * Hashes passwordHash before saving, but ONLY when it has been modified.
 * This prevents re-hashing an already-hashed value on unrelated document updates.
 *
 * IMPORTANT: This hook only runs when passwordHash is explicitly set,
 * meaning Google-only users (no password) are never affected.
 */
userSchema.pre('save', async function hashPassword(next) {
  // 'this' refers to the document being saved
  if (!this.isModified('passwordHash') || !this.passwordHash) {
    return next();
  }

  try {
    this.passwordHash = await bcrypt.hash(this.passwordHash, BCRYPT_SALT_ROUNDS);
    next();
  } catch (err) {
    next(err);
  }
});

// ── Instance Methods ──────────────────────────────────────────────────────────

/**
 * Compares a plaintext candidate password against the stored hash.
 * Uses bcrypt.compare() which is timing-safe.
 *
 * To use, the document must have been queried with .select('+passwordHash'):
 *   const user = await User.findOne({ email }).select('+passwordHash');
 *   const isMatch = await user.comparePassword(candidatePassword);
 *
 * @param {string} candidatePassword  Plaintext password from the login request
 * @returns {Promise<boolean>}         true if match, false otherwise
 */
userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Returns a safe plain object representation of the user,
 * suitable for embedding in API responses.
 * The toJSON transform already handles this when calling JSON.stringify or res.json(),
 * but this method is available for manual use if needed.
 *
 * @returns {Object}
 */
userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    authProvider: this.authProvider,
    avatar: this.avatar,
    isPremium: this.isPremium,
    premiumExpiresAt: this.premiumExpiresAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// ── Model Export ──────────────────────────────────────────────────────────────

const User = mongoose.model('User', userSchema);

module.exports = User;
