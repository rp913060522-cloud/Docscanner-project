'use strict';

/**
 * StudyGen AI — Chat Controller
 *
 * Endpoints:
 *   POST   /api/chats              — Create chat session
 *   GET    /api/chats              — List user's chats
 *   GET    /api/chats/:id          — Get chat session with messages
 *   POST   /api/chats/:id/messages — Append message to chat
 *   DELETE /api/chats/:id          — Delete chat session
 *
 * All operations enforce strict ownership using req.user.id.
 * Chat history remains accessible even if the original local/server PDF is deleted.
 */

const Chat = require('../models/Chat');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { upsertHistory } = require('../utils/historyHelper');

/**
 * POST /api/chats
 * Create a new AI chat session for a document.
 */
async function createChat(req, res, next) {
  try {
    const { localPdfId, documentTitle, title, initialMessage } = req.body;

    if (!localPdfId || typeof localPdfId !== 'string' || !localPdfId.trim()) {
      return next(new AppError('localPdfId is required.', 400, 'VALIDATION_ERROR'));
    }

    if (!documentTitle || typeof documentTitle !== 'string' || !documentTitle.trim()) {
      return next(new AppError('documentTitle is required.', 400, 'VALIDATION_ERROR'));
    }

    const messages = [];
    if (initialMessage && typeof initialMessage.text === 'string' && initialMessage.text.trim()) {
      messages.push({
        role: initialMessage.role || 'user',
        text: initialMessage.text.trim(),
        timestamp: new Date(),
      });
    }

    const chat = await Chat.create({
      userId: req.user.id,
      localPdfId: localPdfId.trim(),
      documentTitle: documentTitle.trim(),
      title: (title && typeof title === 'string' && title.trim()) || 'Study Chat',
      messages,
    });

    await upsertHistory({
      userId: req.user.id,
      localPdfId: chat.localPdfId,
      documentTitle: chat.documentTitle,
      chatId: chat._id,
    });

    return sendSuccess(res, 201, 'Chat session created.', { chat });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/chats
 * List chat sessions belonging to authenticated user.
 */
async function getChats(req, res, next) {
  try {
    const filter = { userId: req.user.id };
    if (req.query.localPdfId) {
      filter.localPdfId = req.query.localPdfId;
    }

    const chats = await Chat.find(filter).sort({ updatedAt: -1 });
    return sendSuccess(res, 200, 'Chats retrieved successfully.', { chats, count: chats.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/chats/:id
 * Get single chat session with complete message history.
 * Accessible even after PDF cleanup.
 */
async function getChatById(req, res, next) {
  try {
    const { id } = req.params;
    const chat = await Chat.findOne({ _id: id, userId: req.user.id });

    if (!chat) {
      return next(new AppError('Chat session not found.', 404, 'NOT_FOUND'));
    }

    return sendSuccess(res, 200, 'Chat retrieved successfully.', { chat });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/chats/:id/messages
 * Append a new message to an existing chat session.
 */
async function addMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { role, text } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return next(new AppError('Message text is required.', 400, 'VALIDATION_ERROR'));
    }

    const validRoles = ['user', 'assistant', 'system'];
    const msgRole = role && validRoles.includes(role) ? role : 'user';

    const chat = await Chat.findOne({ _id: id, userId: req.user.id });

    if (!chat) {
      return next(new AppError('Chat session not found.', 404, 'NOT_FOUND'));
    }

    const newMessage = {
      role: msgRole,
      text: text.trim(),
      timestamp: new Date(),
    };

    chat.messages.push(newMessage);
    await chat.save();

    await upsertHistory({
      userId: req.user.id,
      localPdfId: chat.localPdfId,
      documentTitle: chat.documentTitle,
      chatId: chat._id,
    });

    return sendSuccess(res, 200, 'Message added to chat.', {
      chatId: chat._id,
      message: newMessage,
      totalMessages: chat.messages.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/chats/:id
 * Delete chat session by ID.
 */
async function deleteChat(req, res, next) {
  try {
    const { id } = req.params;
    const chat = await Chat.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!chat) {
      return next(new AppError('Chat session not found.', 404, 'NOT_FOUND'));
    }

    return sendSuccess(res, 200, 'Chat session deleted successfully.', { id });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createChat,
  getChats,
  getChatById,
  addMessage,
  deleteChat,
};
