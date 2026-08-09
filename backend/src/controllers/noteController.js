'use strict';

/**
 * StudyGen AI — Note Controller
 *
 * Endpoints:
 *   POST   /api/notes      — Create note
 *   GET    /api/notes      — List user's notes
 *   GET    /api/notes/:id  — Get single note
 *   PUT    /api/notes/:id  — Update note
 *   DELETE /api/notes/:id  — Delete note
 *
 * All operations enforce strict ownership using req.user.id.
 */

const Note = require('../models/Note');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { upsertHistory } = require('../utils/historyHelper');

/**
 * POST /api/notes
 * Create a new note record.
 */
async function createNote(req, res, next) {
  try {
    const {
      localPdfId,
      documentTitle,
      shortNotes,
      detailedNotes,
      summary,
      keyPoints,
      importantQuestions,
      formulas,
    } = req.body;

    if (!localPdfId || typeof localPdfId !== 'string' || !localPdfId.trim()) {
      return next(new AppError('localPdfId is required.', 400, 'VALIDATION_ERROR'));
    }

    if (!documentTitle || typeof documentTitle !== 'string' || !documentTitle.trim()) {
      return next(new AppError('documentTitle is required.', 400, 'VALIDATION_ERROR'));
    }

    // Always enforce userId from req.user.id
    const note = await Note.create({
      userId: req.user.id,
      localPdfId: localPdfId.trim(),
      documentTitle: documentTitle.trim(),
      shortNotes: shortNotes || '',
      detailedNotes: detailedNotes || '',
      summary: summary || '',
      keyPoints: Array.isArray(keyPoints) ? keyPoints : [],
      importantQuestions: Array.isArray(importantQuestions) ? importantQuestions : [],
      formulas: Array.isArray(formulas) ? formulas : [],
    });

    // Automatically update History
    await upsertHistory({
      userId: req.user.id,
      localPdfId: note.localPdfId,
      documentTitle: note.documentTitle,
      noteId: note._id,
    });

    return sendSuccess(res, 201, 'Note saved successfully.', { note });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notes
 * List all notes belonging to the authenticated user.
 * Optional query parameter: ?localPdfId=...
 */
async function getNotes(req, res, next) {
  try {
    const filter = { userId: req.user.id };
    if (req.query.localPdfId) {
      filter.localPdfId = req.query.localPdfId;
    }

    const notes = await Note.find(filter).sort({ updatedAt: -1 });
    return sendSuccess(res, 200, 'Notes retrieved successfully.', { notes, count: notes.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notes/:id
 * Get a specific note by ID (must belong to authenticated user).
 */
async function getNoteById(req, res, next) {
  try {
    const { id } = req.params;
    const note = await Note.findOne({ _id: id, userId: req.user.id });

    if (!note) {
      return next(new AppError('Note not found.', 404, 'NOT_FOUND'));
    }

    return sendSuccess(res, 200, 'Note retrieved successfully.', { note });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/notes/:id
 * Update a note by ID (must belong to authenticated user).
 */
async function updateNote(req, res, next) {
  try {
    const { id } = req.params;
    const {
      shortNotes,
      detailedNotes,
      summary,
      keyPoints,
      importantQuestions,
      formulas,
      documentTitle,
    } = req.body;

    const updateData = {};
    if (shortNotes !== undefined) updateData.shortNotes = shortNotes;
    if (detailedNotes !== undefined) updateData.detailedNotes = detailedNotes;
    if (summary !== undefined) updateData.summary = summary;
    if (keyPoints !== undefined && Array.isArray(keyPoints)) updateData.keyPoints = keyPoints;
    if (importantQuestions !== undefined && Array.isArray(importantQuestions)) {
      updateData.importantQuestions = importantQuestions;
    }
    if (formulas !== undefined && Array.isArray(formulas)) updateData.formulas = formulas;
    if (documentTitle && typeof documentTitle === 'string') updateData.documentTitle = documentTitle.trim();

    const note = await Note.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!note) {
      return next(new AppError('Note not found.', 404, 'NOT_FOUND'));
    }

    // Update history timestamp
    await upsertHistory({
      userId: req.user.id,
      localPdfId: note.localPdfId,
      documentTitle: note.documentTitle,
      noteId: note._id,
    });

    return sendSuccess(res, 200, 'Note updated successfully.', { note });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/notes/:id
 * Delete a note by ID (must belong to authenticated user).
 */
async function deleteNote(req, res, next) {
  try {
    const { id } = req.params;
    const note = await Note.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!note) {
      return next(new AppError('Note not found.', 404, 'NOT_FOUND'));
    }

    return sendSuccess(res, 200, 'Note deleted successfully.', { id });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
};
