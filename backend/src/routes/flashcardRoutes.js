'use strict';

/**
 * StudyGen AI — Flashcard Routes
 *
 * Base path: /api/flashcards
 * All routes protected.
 */

const express = require('express');
const flashcardController = require('../controllers/flashcardController');
const { protect } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.use(protect);

router.post('/', flashcardController.createFlashcards);
router.get('/', flashcardController.getFlashcards);
router.get('/:id', validateObjectId('id'), flashcardController.getFlashcardById);
router.put('/:id', validateObjectId('id'), flashcardController.updateFlashcards);
router.delete('/:id', validateObjectId('id'), flashcardController.deleteFlashcards);

module.exports = router;
