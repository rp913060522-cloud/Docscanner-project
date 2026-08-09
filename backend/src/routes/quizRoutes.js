'use strict';

/**
 * StudyGen AI — Quiz Routes
 *
 * Base path: /api/quizzes
 * All routes protected.
 */

const express = require('express');
const quizController = require('../controllers/quizController');
const { protect } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.use(protect);

router.post('/', quizController.createQuiz);
router.get('/', quizController.getQuizzes);
router.get('/:id', validateObjectId('id'), quizController.getQuizById);
router.put('/:id', validateObjectId('id'), quizController.updateQuiz);
router.delete('/:id', validateObjectId('id'), quizController.deleteQuiz);

module.exports = router;
