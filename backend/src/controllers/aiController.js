'use strict';

/**
 * StudyGen AI — AI Generation Controller
 *
 * Endpoints:
 *   POST /api/ai/summary     — Generate summary (Transient — NO DB save)
 *   POST /api/ai/study-notes — Generate study notes (Transient — NO DB save)
 *   POST /api/ai/quiz        — Generate quiz (Transient — NO DB save)
 *   POST /api/ai/flashcards  — Generate flashcards (Transient — NO DB save)
 *   POST /api/ai/explain     — Explain concept (Transient — NO DB save)
 *   POST /api/ai/chat        — AI Chat (Auto-persisted via Chat model)
 *
 * All uploaded temporary PDF files are deleted in `finally` blocks.
 * Original PDFs and raw extracted texts are NEVER permanently saved to MongoDB.
 */

const { extractDocumentContent } = require('../services/documentExtractor');
const geminiService = require('../services/geminiService');
const Chat = require('../models/Chat');
const { deleteFile } = require('../utils/cleanup');
const { sendSuccess } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const { upsertHistory } = require('../utils/historyHelper');

/**
 * Helper to process optional temp file from req.file.
 */
async function getExtractedContentFromFile(req) {
  if (!req.file) return { text: null, imageContent: null };

  const extracted = await extractDocumentContent(req.file.path, req.file.mimetype);
  if (extracted.isImage) {
    return { text: null, imageContent: extracted };
  }
  return { text: extracted.text, imageContent: null };
}

/**
 * POST /api/ai/summary
 * Generate document summary & key points. Transient (no DB save).
 */
async function generateSummary(req, res, next) {
  try {
    const { textContext } = req.body || {};
    let docText = textContext || null;
    let imageContent = null;

    if (req.file) {
      const extracted = await getExtractedContentFromFile(req);
      docText = extracted.text || docText;
      imageContent = extracted.imageContent;
    }

    if (!docText && !imageContent) {
      return next(
        new AppError('Please provide a document file or text context.', 400, 'VALIDATION_ERROR')
      );
    }

    const result = await geminiService.generateSummary(docText, imageContent);
    return sendSuccess(res, 200, 'Summary generated successfully.', result);
  } catch (err) {
    next(err);
  } finally {
    if (req.file && req.file.path) {
      deleteFile(req.file.path);
    }
  }
}

/**
 * POST /api/ai/study-notes
 * Generate comprehensive study notes. Transient (no DB save).
 */
async function generateStudyNotes(req, res, next) {
  try {
    const { textContext } = req.body || {};
    let docText = textContext || null;
    let imageContent = null;

    if (req.file) {
      const extracted = await getExtractedContentFromFile(req);
      docText = extracted.text || docText;
      imageContent = extracted.imageContent;
    }

    if (!docText && !imageContent) {
      return next(
        new AppError('Please provide a document file or text context.', 400, 'VALIDATION_ERROR')
      );
    }

    const result = await geminiService.generateStudyNotes(docText, imageContent);
    return sendSuccess(res, 200, 'Study notes generated successfully.', result);
  } catch (err) {
    next(err);
  } finally {
    if (req.file && req.file.path) {
      deleteFile(req.file.path);
    }
  }
}

/**
 * POST /api/ai/quiz
 * Generate multiple choice quiz questions. Transient (no DB save).
 */
async function generateQuiz(req, res, next) {
  try {
    const { textContext, numQuestions } = req.body || {};
    let docText = textContext || null;
    let imageContent = null;

    if (req.file) {
      const extracted = await getExtractedContentFromFile(req);
      docText = extracted.text || docText;
      imageContent = extracted.imageContent;
    }

    if (!docText && !imageContent) {
      return next(
        new AppError('Please provide a document file or text context.', 400, 'VALIDATION_ERROR')
      );
    }

    const result = await geminiService.generateQuiz(docText, imageContent, numQuestions);
    return sendSuccess(res, 200, 'Quiz generated successfully.', result);
  } catch (err) {
    next(err);
  } finally {
    if (req.file && req.file.path) {
      deleteFile(req.file.path);
    }
  }
}

/**
 * POST /api/ai/flashcards
 * Generate flashcard deck. Transient (no DB save).
 */
async function generateFlashcards(req, res, next) {
  try {
    const { textContext } = req.body || {};
    let docText = textContext || null;
    let imageContent = null;

    if (req.file) {
      const extracted = await getExtractedContentFromFile(req);
      docText = extracted.text || docText;
      imageContent = extracted.imageContent;
    }

    if (!docText && !imageContent) {
      return next(
        new AppError('Please provide a document file or text context.', 400, 'VALIDATION_ERROR')
      );
    }

    const result = await geminiService.generateFlashcards(docText, imageContent);
    return sendSuccess(res, 200, 'Flashcards generated successfully.', result);
  } catch (err) {
    next(err);
  } finally {
    if (req.file && req.file.path) {
      deleteFile(req.file.path);
    }
  }
}

/**
 * POST /api/ai/explain
 * Explain concept simplified for a target age. Transient (no DB save).
 */
async function explainTopic(req, res, next) {
  try {
    const { topicText, targetAge } = req.body || {};

    if (!topicText || typeof topicText !== 'string' || !topicText.trim()) {
      return next(new AppError('topicText is required.', 400, 'VALIDATION_ERROR'));
    }

    const result = await geminiService.generateExplanation(topicText.trim(), targetAge);
    return sendSuccess(res, 200, 'Topic explanation generated.', result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/ai/chat
 * AI Document Chat. Auto-persists conversation history in Chat model.
 */
async function chatWithDocument(req, res, next) {
  try {
    const { userQuery, chatId, localPdfId, documentTitle } = req.body || {};
    let docText = null;
    let imageContent = null;

    if (!userQuery || typeof userQuery !== 'string' || !userQuery.trim()) {
      return next(new AppError('userQuery is required.', 400, 'VALIDATION_ERROR'));
    }

    if (req.file) {
      const extracted = await getExtractedContentFromFile(req);
      docText = extracted.text;
      imageContent = extracted.imageContent;
    }

    // Load existing chat session if chatId is provided (safe for offline/guest mode)
    let chatSession = null;
    try {
      if (req.user && req.user.id !== '000000000000000000000000') {
        if (chatId) {
          chatSession = await Chat.findOne({ _id: chatId, userId: req.user.id });
        } else if (localPdfId) {
          chatSession = await Chat.findOne({ localPdfId, userId: req.user.id });
        }
      }
    } catch (dbFindErr) {
      console.warn('DB chat lookup skipped:', dbFindErr.message);
    }

    const historyMessages = chatSession ? chatSession.messages : [];

    // Call AI Service (Groq / Gemini)
    const aiResponse = await geminiService.generateChatResponse(
      userQuery.trim(),
      historyMessages,
      docText,
      imageContent
    );

    // Save or update Chat document automatically if DB is active
    try {
      if (req.user && req.user.id !== '000000000000000000000000') {
        const userMsg = { role: 'user', text: userQuery.trim(), timestamp: new Date() };
        const assistantMsg = { role: 'assistant', text: aiResponse.answer, timestamp: new Date() };

        if (!chatSession && localPdfId && documentTitle) {
          chatSession = await Chat.create({
            userId: req.user.id,
            localPdfId,
            documentTitle,
            title: `Chat: ${documentTitle}`,
            messages: [userMsg, assistantMsg],
          });
        } else if (chatSession) {
          chatSession.messages.push(userMsg, assistantMsg);
          await chatSession.save();
        }

        if (chatSession) {
          await upsertHistory({
            userId: req.user.id,
            localPdfId: chatSession.localPdfId,
            documentTitle: chatSession.documentTitle,
            chatId: chatSession._id,
          });
        }
      }
    } catch (dbSaveErr) {
      console.warn('DB chat save skipped:', dbSaveErr.message);
    }

    return sendSuccess(res, 200, 'Chat response generated.', {
      answer: aiResponse.answer,
      docContextAvailable: aiResponse.docContextAvailable,
      chatId: chatSession ? chatSession._id : null,
    });
  } catch (err) {
    next(err);
  } finally {
    if (req.file && req.file.path) {
      deleteFile(req.file.path);
    }
  }
}

module.exports = {
  generateSummary,
  generateStudyNotes,
  generateQuiz,
  generateFlashcards,
  explainTopic,
  chatWithDocument,
};
