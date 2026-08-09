'use strict';

/**
 * StudyGen AI — History Controller
 *
 * Endpoints:
 *   GET    /api/history      — List user's history metadata records
 *   GET    /api/history/:id  — Get single history record
 *   DELETE /api/history/:id  — Delete history record
 *
 * All operations enforce strict ownership using req.user.id.
 */

const History = require('../models/History');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * GET /api/history
 * List history metadata entries for authenticated user.
 */
async function getHistory(req, res, next) {
  try {
    const history = await History.find({ userId: req.user.id })
      .populate('noteId', 'documentTitle summary updatedAt')
      .populate('quizId', 'documentTitle updatedAt score')
      .populate('flashcardId', 'documentTitle updatedAt')
      .populate('chatId', 'documentTitle title updatedAt')
      .sort({ lastAccessedAt: -1 });

    return sendSuccess(res, 200, 'History retrieved successfully.', {
      history,
      count: history.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/history/:id
 * Get single history item by ID.
 */
async function getHistoryById(req, res, next) {
  try {
    const { id } = req.params;
    const historyItem = await History.findOne({ _id: id, userId: req.user.id })
      .populate('noteId')
      .populate('quizId')
      .populate('flashcardId')
      .populate('chatId');

    if (!historyItem) {
      return next(new AppError('History record not found.', 404, 'NOT_FOUND'));
    }

    return sendSuccess(res, 200, 'History record retrieved successfully.', {
      historyItem,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/history/:id
 * Delete a history item by ID.
 */
async function deleteHistory(req, res, next) {
  try {
    const { id } = req.params;
    const historyItem = await History.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!historyItem) {
      return next(new AppError('History record not found.', 404, 'NOT_FOUND'));
    }

    return sendSuccess(res, 200, 'History record deleted successfully.', { id });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHistory,
  getHistoryById,
  deleteHistory,
};
