'use strict';

/**
 * StudyGen AI — Quiz Controller
 *
 * Endpoints:
 *   POST   /api/quizzes      — Create quiz
 *   GET    /api/quizzes      — List user's quizzes
 *   GET    /api/quizzes/:id  — Get single quiz
 *   PUT    /api/quizzes/:id  — Update quiz
 *   DELETE /api/quizzes/:id  — Delete quiz
 *
 * All operations enforce strict ownership using req.user.id.
 */

const Quiz = require('../models/Quiz');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { upsertHistory } = require('../utils/historyHelper');

/**
 * POST /api/quizzes
 * Save a generated quiz.
 */
async function createQuiz(req, res, next) {
  try {
    const { localPdfId, documentTitle, questions, score } = req.body;

    if (!localPdfId || typeof localPdfId !== 'string' || !localPdfId.trim()) {
      return next(new AppError('localPdfId is required.', 400, 'VALIDATION_ERROR'));
    }

    if (!documentTitle || typeof documentTitle !== 'string' || !documentTitle.trim()) {
      return next(new AppError('documentTitle is required.', 400, 'VALIDATION_ERROR'));
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return next(new AppError('Quiz must contain at least one question.', 400, 'VALIDATION_ERROR'));
    }

    const quiz = await Quiz.create({
      userId: req.user.id,
      localPdfId: localPdfId.trim(),
      documentTitle: documentTitle.trim(),
      questions,
      score: typeof score === 'number' ? score : null,
    });

    await upsertHistory({
      userId: req.user.id,
      localPdfId: quiz.localPdfId,
      documentTitle: quiz.documentTitle,
      quizId: quiz._id,
    });

    return sendSuccess(res, 201, 'Quiz saved successfully.', { quiz });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/quizzes
 * List quizzes belonging to authenticated user.
 */
async function getQuizzes(req, res, next) {
  try {
    const filter = { userId: req.user.id };
    if (req.query.localPdfId) {
      filter.localPdfId = req.query.localPdfId;
    }

    const quizzes = await Quiz.find(filter).sort({ updatedAt: -1 });
    return sendSuccess(res, 200, 'Quizzes retrieved successfully.', { quizzes, count: quizzes.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/quizzes/:id
 * Get single quiz by ID.
 */
async function getQuizById(req, res, next) {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findOne({ _id: id, userId: req.user.id });

    if (!quiz) {
      return next(new AppError('Quiz not found.', 404, 'NOT_FOUND'));
    }

    return sendSuccess(res, 200, 'Quiz retrieved successfully.', { quiz });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/quizzes/:id
 * Update quiz (e.g. submit score or modify questions).
 */
async function updateQuiz(req, res, next) {
  try {
    const { id } = req.params;
    const { questions, score, documentTitle } = req.body;

    const updateData = {};
    if (questions !== undefined && Array.isArray(questions)) updateData.questions = questions;
    if (score !== undefined) updateData.score = typeof score === 'number' ? score : null;
    if (documentTitle && typeof documentTitle === 'string') updateData.documentTitle = documentTitle.trim();

    const quiz = await Quiz.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!quiz) {
      return next(new AppError('Quiz not found.', 404, 'NOT_FOUND'));
    }

    await upsertHistory({
      userId: req.user.id,
      localPdfId: quiz.localPdfId,
      documentTitle: quiz.documentTitle,
      quizId: quiz._id,
    });

    return sendSuccess(res, 200, 'Quiz updated successfully.', { quiz });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/quizzes/:id
 * Delete quiz by ID.
 */
async function deleteQuiz(req, res, next) {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!quiz) {
      return next(new AppError('Quiz not found.', 404, 'NOT_FOUND'));
    }

    return sendSuccess(res, 200, 'Quiz deleted successfully.', { id });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
};
