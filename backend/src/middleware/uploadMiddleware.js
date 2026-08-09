'use strict';

/**
 * StudyGen AI — Upload Middleware
 *
 * Configures Multer for temporary file uploads to /temp_uploads.
 * Enforces file size limits, safe random filenames (UUID), and file type checks.
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');
const { TEMP_DIR, ensureTempDir } = require('../utils/cleanup');
const AppError = require('../utils/AppError');

// Ensure upload directory exists
ensureTempDir();

// Allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
]);

// Allowed file extensions as fallback sanity check
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png', '.webp']);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, TEMP_DIR);
  },
  filename: function (req, file, cb) {
    // Generate safe UUID filename without relying on user-provided name
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.tmp';
    const safeFilename = `${uuidv4()}${safeExt}`;
    cb(null, safeFilename);
  },
});

function fileFilter(req, file, cb) {
  const mime = (file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (ALLOWED_MIME_TYPES.has(mime) || ALLOWED_EXTENSIONS.has(ext)) {
    return cb(null, true);
  }

  return cb(
    new AppError(
      'Unsupported file type. Only PDF, DOCX, JPG, and PNG files are allowed.',
      400,
      'UNSUPPORTED_FILE_TYPE'
    ),
    false
  );
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxUploadSizeBytes, // 25 MB
    files: 1, // Single file per request
  },
});

/**
 * Single file upload middleware handler with custom error handling for multer limits.
 */
function uploadSingleTempFile(fieldName = 'file') {
  const single = upload.single(fieldName);

  return function (req, res, next) {
    single(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new AppError(
              `File is too large. Maximum allowed size is ${Math.round(
                config.maxUploadSizeBytes / (1024 * 1024)
              )} MB.`,
              400,
              'FILE_TOO_LARGE'
            )
          );
        }
        return next(new AppError(`Upload error: ${err.message}`, 400, 'UPLOAD_ERROR'));
      } else if (err) {
        return next(err);
      }
      next();
    });
  };
}

module.exports = {
  uploadSingleTempFile,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
};
