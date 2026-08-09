'use strict';

/**
 * StudyGen AI — History Upsert Helper
 *
 * Automatically records or updates a History metadata document
 * whenever a Note, Quiz, Flashcard deck, or Chat is created or accessed.
 */

const History = require('../models/History');

/**
 * Upserts a history entry for a given user and document.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.localPdfId
 * @param {string} params.documentTitle
 * @param {string} [params.noteId]
 * @param {string} [params.quizId]
 * @param {string} [params.flashcardId]
 * @param {string} [params.chatId]
 */
async function upsertHistory({
  userId,
  localPdfId,
  documentTitle,
  noteId,
  quizId,
  flashcardId,
  chatId,
}) {
  if (!userId || !localPdfId || !documentTitle) return;

  const updateFields = {
    documentTitle,
    lastAccessedAt: new Date(),
  };

  if (noteId) updateFields.noteId = noteId;
  if (quizId) updateFields.quizId = quizId;
  if (flashcardId) updateFields.flashcardId = flashcardId;
  if (chatId) updateFields.chatId = chatId;

  try {
    await History.findOneAndUpdate(
      { userId, localPdfId },
      { $set: updateFields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    // History update failure should be logged but not interrupt primary request
    console.error('History update warning:', err.message);
  }
}

module.exports = { upsertHistory };
