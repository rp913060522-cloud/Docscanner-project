'use strict';

/**
 * StudyGen AI — History Mongoose Model
 *
 * Stores lightweight metadata about document activity and linked study resources.
 * Does NOT store PDF binary data or full extracted PDF text.
 */

const mongoose = require('mongoose');

const historySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required.'],
      index: true,
    },
    localPdfId: {
      type: String,
      required: [true, 'localPdfId is required.'],
      trim: true,
      index: true,
    },
    documentTitle: {
      type: String,
      required: [true, 'documentTitle is required.'],
      trim: true,
    },
    noteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      default: null,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      default: null,
    },
    flashcardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flashcard',
      default: null,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      default: null,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index so each user has one history record per localPdfId
historySchema.index({ userId: 1, localPdfId: 1 }, { unique: true });
historySchema.index({ userId: 1, updatedAt: -1 });

const History = mongoose.model('History', historySchema);

module.exports = History;
