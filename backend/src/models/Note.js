'use strict';

/**
 * StudyGen AI — Note Mongoose Model
 *
 * Stores user-saved study notes, summaries, key points, questions, and formulas.
 * Does NOT store the original PDF binary or raw extracted text.
 */

const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
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
    shortNotes: {
      type: String,
      default: '',
    },
    detailedNotes: {
      type: String,
      default: '',
    },
    summary: {
      type: String,
      default: '',
    },
    keyPoints: [
      {
        type: String,
        trim: true,
      },
    ],
    importantQuestions: [
      {
        question: { type: String, required: true, trim: true },
        answer: { type: String, required: true, trim: true },
      },
    ],
    formulas: [
      {
        title: { type: String, required: true, trim: true },
        formula: { type: String, required: true, trim: true },
        explanation: { type: String, default: '', trim: true },
      },
    ],
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

// Compound index for efficient user document queries
noteSchema.index({ userId: 1, localPdfId: 1 });
noteSchema.index({ userId: 1, createdAt: -1 });

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;
