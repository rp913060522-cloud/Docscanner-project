'use strict';

/**
 * StudyGen AI — Gemini AI Integration Service
 *
 * Handles backend interaction with Google Gemini API using @google/genai SDK.
 * Includes automatic dev fallback generation when GEMINI_API_KEY is unconfigured locally.
 * All API key credentials remain strictly on the backend.
 */

const { GoogleGenAI } = require('@google/genai');
const config = require('../config/env');
const AppError = require('../utils/AppError');

// Initialize GoogleGenAI client singleton
let aiClient = null;

function isDevNoApiKey() {
  return !config.geminiApiKey || config.geminiApiKey.includes('REPLACE_WITH_REAL');
}

function getAiClient() {
  if (isDevNoApiKey()) return null;

  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return aiClient;
}

/**
 * Clean markdown code block fences and parse JSON string.
 */
function cleanAndParseJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new AppError('AI returned an empty response.', 502, 'GEMINI_EMPTY_RESPONSE');
  }

  let cleaned = rawText.trim();

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse Gemini JSON output:', err.message);
    throw new AppError(
      'Failed to parse structured response from AI model.',
      502,
      'GEMINI_PARSE_ERROR'
    );
  }
}

/**
 * Generate a mock AI response based on the prompt content.
 * Used when no API key is set OR when the real API call fails.
 */
function getMockResponse(contents) {
  const promptStr = typeof contents[0] === 'string' ? contents[0] : '';

  if (promptStr.includes('StudyGen AI') || promptStr.includes('USER QUESTION:')) {
    const questionMatch = promptStr.match(/USER QUESTION:\s*"([^"]+)"/i);
    const q = questionMatch ? questionMatch[1] : 'your question';
    return `Based on your document analysis, here is the explanation for "${q}":\n\n• Core Overview: The document covers essential principles, structured section notes, and practical definitions.\n• Key Takeaways: Review the formulas and key takeaways to solidify your understanding.\n\nFeel free to ask for specific section explanations or practice questions!`;
  }

  if (promptStr.includes('quiz') || promptStr.toLowerCase().includes('multiple-choice')) {
    return JSON.stringify({
      docTitle: 'Document Quiz',
      questions: [
        { question: 'What is the primary topic covered in this document?', options: ['Core Concepts', 'Historical Overview', 'Experimental Results', 'General Summary'], correctIndex: 0, explanation: 'The document focuses on fundamental core principles.' },
        { question: 'Which methodology is emphasized in section 1?', options: ['Analytical Review', 'Comparative Study', 'Practical Application', 'Theoretical Model'], correctIndex: 2, explanation: 'Section 1 highlights practical hands-on application.' },
        { question: 'What is the key takeaway from the conclusions?', options: ['Further Research Required', 'High Efficiency Confirmed', 'Initial Hypothesis Rejected', 'No Significant Finding'], correctIndex: 1, explanation: 'The findings confirm high efficiency and utility.' },
        { question: 'How is data structured within the material?', options: ['Chronologically', 'Categorically', 'Hierarchically', 'Randomly'], correctIndex: 1, explanation: 'Material is organized into distinct categories.' },
        { question: 'What is the recommended next step for study?', options: ['Review Key Terms', 'Practice Exercises', 'Group Discussion', 'Complete Revision'], correctIndex: 3, explanation: 'Comprehensive revision consolidates understanding.' }
      ]
    });
  }

  if (promptStr.includes('flashcard') || promptStr.includes('flashcards')) {
    return JSON.stringify({
      docTitle: 'Document Flashcards',
      cards: [
        { front: 'Primary Subject', back: 'Core document concepts and fundamental definitions.' },
        { front: 'Key Metric', back: 'Quantifiable measures and performance indicators.' },
        { front: 'Central Principle', back: 'The governing rule or foundational law described.' },
        { front: 'Important Formula', back: 'Mathematical or logical model used for analysis.' },
        { front: 'Main Conclusion', back: 'Final takeaway and practical application of results.' }
      ]
    });
  }

  // Default Study Notes / Summary mock
  return JSON.stringify({
    shortNotes: 'Key Document Insights:\n• Comprehensive overview of core concepts.\n• Step-by-step breakdown of fundamental rules.\n• Summary of critical formulas and key takeaways.',
    detailedNotes: 'Section 1: Fundamental Concepts\nDetailed explanation of key terminology, foundational theory, and practical applications.\n\nSection 2: Analytical Methods\nIn-depth analysis of methodologies, structured models, and empirical observations.\n\nSection 3: Key Takeaways\nFinal conclusions, recommended practice questions, and study strategies.',
    summary: 'This document provides a structured analysis of core academic concepts, featuring key definitions, empirical takeaways, and step-by-step revision points.',
    keyPoints: [
      'Comprehensive breakdown of core subject material',
      'Structured section-by-section analysis and formulas',
      'Key revision questions for self-assessment'
    ],
    importantQuestions: [
      { question: 'What are the main principles outlined in this document?', answer: 'The document details fundamental principles, key definitions, and practical methodologies.' },
      { question: 'How can these concepts be applied in practice?', answer: 'By applying structured analytical models and reviewing key formulas.' }
    ],
    formulas: [
      { title: 'Core Model Ratio', formula: 'Result = Input × Efficiency Factor', explanation: 'Calculates expected study output efficiency.' }
    ]
  });
}

/**
 * Calls Groq Cloud AI API with high-speed models.
 */
async function callGroq(contents) {
  if (!config.groqApiKey || config.groqApiKey.includes('REPLACE_WITH_REAL')) return null;

  const model = config.groqModel || 'openai/gpt-oss-120b';

  let userText = '';
  for (const item of contents) {
    if (typeof item === 'string') {
      userText += item + '\n';
    } else if (item && item.text) {
      userText += item.text + '\n';
    }
  }

  const isJsonExpected = userText.includes('JSON') || userText.includes('json');

  const messages = [
    {
      role: 'system',
      content: isJsonExpected
        ? 'You are StudyGen AI, an expert educational AI assistant. Always return valid, clean JSON with no extra conversational preamble or markdown code blocks outside the JSON.'
        : 'You are StudyGen AI, a friendly, intelligent, and accurate study assistant. Help students understand topics, documents, and exam questions clearly.',
    },
    {
      role: 'user',
      content: userText.trim(),
    },
  ];

  try {
    const apiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: isJsonExpected ? 0.2 : 0.6,
      }),
    });

    if (!apiRes.ok) {
      const errBody = await apiRes.text();
      console.warn(`⚠️ Groq API responded with status ${apiRes.status}:`, errBody);
      return null;
    }

    const data = await apiRes.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
    if (reply && reply.trim()) {
      return reply.trim();
    }
    return null;
  } catch (err) {
    console.warn('⚠️ Groq API connection error:', err.message);
    return null;
  }
}

/**
 * Calls AI API (Groq / Gemini) with dev mock fallback when API key is missing.
 */
async function callGemini(contents) {
  // 1. Try Groq AI first if key is available (fastest response)
  if (config.groqApiKey) {
    const groqReply = await callGroq(contents);
    if (groqReply) {
      return groqReply;
    }
  }

  const client = getAiClient();

  // Dev mode mock fallback if no API key set
  if (!client) {
    console.log('ℹ️  Using mock AI response.');
    return getMockResponse(contents);
  }

  const modelName = config.geminiModel || 'gemini-2.5-flash';

  try {
    const AI_TIMEOUT_MS = 45000;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new AppError('AI request timed out. Please try again.', 504, 'GEMINI_TIMEOUT'));
      }, AI_TIMEOUT_MS);
    });

    const apiPromise = client.models.generateContent({
      model: modelName,
      contents,
    });

    const response = await Promise.race([apiPromise, timeoutPromise]);

    const text = response.text || '';
    if (!text.trim()) {
      throw new AppError('Gemini API returned an empty response.', 502, 'GEMINI_EMPTY_RESPONSE');
    }
    return text;
  } catch (err) {
    if (err instanceof AppError) throw err;

    const msg = err.message || '';
    if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      throw new AppError(
        'Gemini API quota/rate limit exceeded. Please try again later.',
        429,
        'GEMINI_RATE_LIMIT'
      );
    }

    // For model not found (404), invalid key (401/403), or other Gemini errors in dev mode —
    // fallback to mock response instead of returning a 502 to the user.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`⚠️  Gemini API error (dev mode — using mock fallback): ${msg}`);
      return getMockResponse(contents);
    }

    if (msg.includes('API_KEY_INVALID') || msg.includes('UNAUTHENTICATED')) {
      throw new AppError('Invalid Gemini API key configuration.', 500, 'GEMINI_AUTH_ERROR');
    }

    console.error('Gemini API call error:', msg);
    throw new AppError(
      'Failed to process request with Gemini AI.',
      502,
      'GEMINI_API_ERROR'
    );
  }
}

/**
 * Builds Gemini contents payload with text and optional image inlineData.
 */
function buildContents(promptText, textContext, imageContent) {
  const parts = [];

  let fullPrompt = promptText;
  if (textContext) {
    const safeContext = textContext.slice(0, 100000);
    fullPrompt += `\n\nDOCUMENT CONTEXT:\n${safeContext}`;
  }

  parts.push(fullPrompt);

  if (imageContent && imageContent.buffer) {
    parts.push({
      inlineData: {
        data: imageContent.buffer.toString('base64'),
        mimeType: imageContent.mimeType,
      },
    });
  }

  return parts;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED AI GENERATION METHODS
// ─────────────────────────────────────────────────────────────────────────────

async function generateSummary(textContext, imageContent) {
  const prompt = `You are an expert AI study assistant.
Analyze and summarize the provided document thoroughly.
Return ONLY valid JSON in the following exact format without extra text:
{
  "shortNotes": "Quick revision notes bullet points...",
  "detailedNotes": "Detailed section breakdown of concepts...",
  "summary": "Clear, concise overview of the document contents...",
  "keyPoints": [
    "Key takeaway point 1",
    "Key takeaway point 2",
    "Key takeaway point 3"
  ],
  "importantQuestions": [
    { "question": "Key question 1?", "answer": "Detailed answer 1" }
  ],
  "formulas": [
    { "title": "Key Concept / Formula 1", "formula": "Formula or Rule", "explanation": "Explanation..." }
  ]
}`;

  const contents = buildContents(prompt, textContext, imageContent);
  const rawResponse = await callGemini(contents);
  const result = cleanAndParseJSON(rawResponse);

  const summary = result.summary || 'Summary unavailable.';
  const keyPoints = Array.isArray(result.keyPoints) ? result.keyPoints : [];

  return {
    summary,
    keyPoints,
    shortNotes: result.shortNotes || (keyPoints.length > 0 ? keyPoints.map(k => `• ${k}`).join('\n') : summary),
    detailedNotes: result.detailedNotes || summary,
    importantQuestions: Array.isArray(result.importantQuestions) ? result.importantQuestions : [],
    formulas: Array.isArray(result.formulas) ? result.formulas : [],
  };
}

async function generateStudyNotes(textContext, imageContent) {
  const prompt = `You are an expert AI study assistant.
Generate comprehensive study notes for the provided document.
Return ONLY valid JSON in the following exact format without extra text:
{
  "shortNotes": "Quick revision notes bullet list or summary...",
  "detailedNotes": "Detailed section-by-section study notes...",
  "summary": "Core summary overview...",
  "keyPoints": ["Point 1", "Point 2"],
  "importantQuestions": [
    { "question": "Question 1?", "answer": "Detailed answer 1" }
  ],
  "formulas": [
    { "title": "Formula 1", "formula": "E = mc^2", "explanation": "Explanation..." }
  ]
}`;

  const contents = buildContents(prompt, textContext, imageContent);
  const rawResponse = await callGemini(contents);
  const result = cleanAndParseJSON(rawResponse);

  return {
    shortNotes: result.shortNotes || '',
    detailedNotes: result.detailedNotes || '',
    summary: result.summary || '',
    keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
    importantQuestions: Array.isArray(result.importantQuestions) ? result.importantQuestions : [],
    formulas: Array.isArray(result.formulas) ? result.formulas : [],
  };
}

async function generateQuiz(textContext, imageContent, numQuestions = 5) {
  const count = Math.min(Math.max(parseInt(numQuestions, 10) || 5, 1), 20);
  const prompt = `You are an expert AI quiz generator.
Create ${count} multiple-choice quiz questions based on the provided document.
Return ONLY valid JSON in the following exact format:
{
  "docTitle": "Suggested Quiz Title",
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Explanation why Option A is correct..."
    }
  ]
}`;

  const contents = buildContents(prompt, textContext, imageContent);
  const rawResponse = await callGemini(contents);
  const result = cleanAndParseJSON(rawResponse);

  const questions = (result.questions || []).map((q) => ({
    question: q.question || 'Untitled Question',
    options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['True', 'False'],
    correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 ? q.correctIndex : 0,
    explanation: q.explanation || '',
  }));

  return {
    docTitle: result.docTitle || 'Document Quiz',
    questions,
  };
}

async function generateFlashcards(textContext, imageContent) {
  const prompt = `You are an expert AI study assistant.
Generate flashcards (front question/term and back answer/definition) from the provided document.
Return ONLY valid JSON in the following exact format:
{
  "docTitle": "Flashcard Deck Title",
  "cards": [
    {
      "front": "Term or Question 1",
      "back": "Definition or Answer 1"
    }
  ]
}`;

  const contents = buildContents(prompt, textContext, imageContent);
  const rawResponse = await callGemini(contents);
  const result = cleanAndParseJSON(rawResponse);

  const cards = (result.cards || []).map((c) => ({
    front: c.front || 'Term',
    back: c.back || 'Definition',
  }));

  return {
    docTitle: result.docTitle || 'Flashcards',
    cards,
  };
}

async function generateExplanation(topicText, targetAge = '15') {
  const prompt = `You are an expert AI tutor.
Explain the following concept or topic so that a ${targetAge}-year-old student can easily understand it.
Use clear analogies and simple terms.
Topic: "${topicText}"

Return ONLY valid JSON:
{
  "simplifiedExplanation": "Clear, engaging explanation..."
}`;

  const contents = [prompt];
  const rawResponse = await callGemini(contents);
  const result = cleanAndParseJSON(rawResponse);

  return {
    simplifiedExplanation: result.simplifiedExplanation || rawResponse,
  };
}

async function generateChatResponse(userQuery, chatHistory = [], textContext = null, imageContent = null) {
  let prompt = `You are StudyGen AI, a helpful and intelligent study assistant.
Answer the student's question accurately based on the document context and previous conversation.`;

  if (!textContext && !imageContent) {
    prompt += `\nNOTE: The original document file is currently NOT attached or available on the server. Answer using prior context or general knowledge.`;
  }

  if (chatHistory && chatHistory.length > 0) {
    prompt += `\n\nRECENT CHAT HISTORY:\n`;
    chatHistory.slice(-6).forEach((msg) => {
      prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}\n`;
    });
  }

  prompt += `\n\nUSER QUESTION: "${userQuery}"`;

  const contents = buildContents(prompt, textContext, imageContent);
  const answerText = await callGemini(contents);

  return {
    answer: answerText.trim(),
    docContextAvailable: Boolean(textContext || imageContent),
  };
}

module.exports = {
  generateSummary,
  generateStudyNotes,
  generateQuiz,
  generateFlashcards,
  generateExplanation,
  generateChatResponse,
  cleanAndParseJSON,
};
