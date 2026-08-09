'use strict';

/**
 * StudyGen AI — Quiz Mongoose Model
 *
 * Stores generated multiple-choice quiz questions and options.
 * Does NOT store the original PDF binary or raw extracted text.
 */

const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Question text is required.'],
      trim: true,
    },
    options: {
      type: [{ type: String, required: true, trim: true }],
      validate: [
        function (opts) {
          return opts && opts.length >= 2;
        },
        'Quiz questions must have at least 2 options.',
      ],
    },
    correctIndex: {
      type: Number,
      required: [true, 'correctIndex is required.'],
      min: 0,
    },
    explanation: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
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
    questions: {
      type: [quizQuestionSchema],
      validate: [
        function (qs) {
          return qs && qs.length > 0;
        },
        'Quiz must contain at least one question.',
      ],
    },
    score: {
      type: Number,
      default: null,
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

quizSchema.index({ userId: 1, localPdfId: 1 });
quizSchema.index({ userId: 1, createdAt: -1 });

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
