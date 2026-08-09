'use strict';

/**
 * StudyGen AI — AI Chat Mongoose Model
 *
 * Stores conversation history between user and AI assistant per document.
 * Remains accessible even after temporary server PDF and local PDF are deleted.
 * Does NOT store PDF binary or raw extracted PDF text.
 */

const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: {
        values: ['user', 'assistant', 'system'],
        message: 'Message role must be "user", "assistant", or "system".',
      },
      required: [true, 'Message role is required.'],
    },
    text: {
      type: String,
      required: [true, 'Message text is required.'],
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const chatSchema = new mongoose.Schema(
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
    title: {
      type: String,
      default: 'Study Chat',
      trim: true,
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
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

chatSchema.index({ userId: 1, localPdfId: 1 });
chatSchema.index({ userId: 1, createdAt: -1 });

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
