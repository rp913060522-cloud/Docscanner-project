'use strict';

/**
 * StudyGen AI — Flashcard Controller
 *
 * Endpoints:
 *   POST   /api/flashcards      — Create flashcard deck
 *   GET    /api/flashcards      — List user's decks
 *   GET    /api/flashcards/:id  — Get single deck
 *   PUT    /api/flashcards/:id  — Update deck
 *   DELETE /api/flashcards/:id  — Delete deck
 *
 * All operations enforce strict ownership using req.user.id.
 */

const Flashcard = require('../models/Flashcard');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { upsertHistory } = require('../utils/historyHelper');

/**
 * POST /api/flashcards
 * Save a generated flashcard deck.
 */
async function createFlashcards(req, res, next) {
  try {
    const { localPdfId, documentTitle, cards } = req.body;

    if (!localPdfId || typeof localPdfId !== 'string' || !localPdfId.trim()) {
      return next(new AppError('localPdfId is required.', 400, 'VALIDATION_ERROR'));
    }

    if (!documentTitle || typeof documentTitle !== 'string' || !documentTitle.trim()) {
      return next(new AppError('documentTitle is required.', 400, 'VALIDATION_ERROR'));
    }

    if (!Array.isArray(cards) || cards.length === 0) {
      return next(new AppError('Flashcard deck must contain at least one card.', 400, 'VALIDATION_ERROR'));
    }

    const flashcard = await Flashcard.create({
      userId: req.user.id,
      localPdfId: localPdfId.trim(),
      documentTitle: documentTitle.trim(),
      cards,
    });

    await upsertHistory({
      userId: req.user.id,
      localPdfId: flashcard.localPdfId,
      documentTitle: flashcard.documentTitle,
      flashcardId: flashcard._id,
    });

    return sendSuccess(res, 201, 'Flashcard deck saved successfully.', { flashcard });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/flashcards
 * List flashcard decks belonging to authenticated user.
 */
async function getFlashcards(req, res, next) {
  try {
    const filter = { userId: req.user.id };
    if (req.query.localPdfId) {
      filter.localPdfId = req.query.localPdfId;
    }

    const flashcards = await Flashcard.find(filter).sort({ updatedAt: -1 });
    return sendSuccess(res, 200, 'Flashcard decks retrieved successfully.', {
      flashcards,
      count: flashcards.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/flashcards/:id
 * Get single flashcard deck by ID.
 */
async function getFlashcardById(req, res, next) {
  try {
    const { id } = req.params;
    const flashcard = await Flashcard.findOne({ _id: id, userId: req.user.id });

    if (!flashcard) {
      return next(new AppError('Flashcard deck not found.', 404, 'NOT_FOUND'));
    }

    return sendSuccess(res, 200, 'Flashcard deck retrieved successfully.', { flashcard });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/flashcards/:id
 * Update flashcard deck by ID.
 */
async function updateFlashcards(req, res, next) {
  try {
    const { id } = req.params;
    const { cards, documentTitle } = req.body;

    const updateData = {};
    if (cards !== undefined && Array.isArray(cards)) updateData.cards = cards;
    if (documentTitle && typeof documentTitle === 'string') updateData.documentTitle = documentTitle.trim();

    const flashcard = await Flashcard.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!flashcard) {
      return next(new AppError('Flashcard deck not found.', 404, 'NOT_FOUND'));
    }

    await upsertHistory({
      userId: req.user.id,
      localPdfId: flashcard.localPdfId,
      documentTitle: flashcard.documentTitle,
      flashcardId: flashcard._id,
    });

    return sendSuccess(res, 200, 'Flashcard deck updated successfully.', { flashcard });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/flashcards/:id
 * Delete flashcard deck by ID.
 */
async function deleteFlashcards(req, res, next) {
  try {
    const { id } = req.params;
    const flashcard = await Flashcard.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!flashcard) {
      return next(new AppError('Flashcard deck not found.', 404, 'NOT_FOUND'));
    }

    return sendSuccess(res, 200, 'Flashcard deck deleted successfully.', { id });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createFlashcards,
  getFlashcards,
  getFlashcardById,
  updateFlashcards,
  deleteFlashcards,
};
