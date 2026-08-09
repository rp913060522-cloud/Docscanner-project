'use strict';

/**
 * StudyGen AI — Flashcard Mongoose Model
 *
 * Stores flashcard decks (front/back cards) generated from document study.
 * Does NOT store the original PDF binary or raw extracted text.
 */

const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema(
  {
    front: {
      type: String,
      required: [true, 'Card front text is required.'],
      trim: true,
    },
    back: {
      type: String,
      required: [true, 'Card back text is required.'],
      trim: true,
    },
  },
  { _id: true }
);

const flashcardSchema = new mongoose.Schema(
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
    cards: {
      type: [cardSchema],
      validate: [
        function (c) {
          return c && c.length > 0;
        },
        'Flashcard deck must contain at least one card.',
      ],
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

flashcardSchema.index({ userId: 1, localPdfId: 1 });
flashcardSchema.index({ userId: 1, createdAt: -1 });

const Flashcard = mongoose.model('Flashcard', flashcardSchema);

module.exports = Flashcard;
