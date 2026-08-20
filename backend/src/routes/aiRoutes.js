'use strict';

/**
 * StudyGen AI — AI Routes
 *
 * Base path: /api/ai
 * All routes are protected by authMiddleware.
 * Stricter rate limiting applied to AI generation endpoints.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const { uploadSingleTempFile } = require('../middleware/uploadMiddleware');

const router = express.Router();

// Strict AI-specific rate limiter (15 requests per 15 minutes per IP)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many AI generation requests. Please try again in a few minutes.',
    },
  },
});

router.use(protect);
router.use(aiLimiter);

router.post('/summary', uploadSingleTempFile('file'), aiController.generateSummary);
router.post('/study-notes', uploadSingleTempFile('file'), aiController.generateStudyNotes);
router.post('/quiz', uploadSingleTempFile('file'), aiController.generateQuiz);
router.post('/flashcards', uploadSingleTempFile('file'), aiController.generateFlashcards);
router.post('/explain', aiController.explainTopic);
router.post('/chat', uploadSingleTempFile('file'), aiController.chatWithDocument);

module.exports = router;
