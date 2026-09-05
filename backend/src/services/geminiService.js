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

  if (promptStr.includes('EasyScan') || promptStr.includes('StudyGen AI') || promptStr.includes('USER QUESTION:')) {
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
      docTitle: 'Document Revision Flashcards',
      cards: [
        {
          front: '1. What is Artificial Intelligence?',
          back: 'AI enables machines to think, learn, reason, solve problems and make decisions.\n\nApplications:\n• Chatbots & Voice Assistants\n• Self-driving Cars\n• Recommendation Systems & Robots\n\n💡 Hindi: Machine ko intelligent banana.'
        },
        {
          front: '2. What is meant by PEAS? Explain Agent Programs.',
          back: 'PEAS Framework:\n• P: Performance Measure\n• E: Environment\n• A: Actuators\n• S: Sensors\n\nAgent Programs:\n• Simple Reflex, Model-Based, Goal-Based, Utility-Based, Learning Agent.\n\n💡 Hindi: PEAS = Agent ke 4 parts.'
        },
        {
          front: '3. Explain BFS and DFS Algorithms with respect to AI.',
          back: 'BFS (Breadth First Search):\n• Level by level search | Queue (FIFO)\n\nDFS (Depth First Search):\n• Deep path search before backtrack | Stack (LIFO)\n\n💡 Hindi: BFS = Level by level, DFS = Deep search.'
        },
        {
          front: '4. Explain the Different Types of Environment w.r.t. AI.',
          back: 'Environment Types:\n• Fully Observable vs Partially Observable\n• Deterministic vs Stochastic\n• Episodic vs Sequential\n• Static vs Dynamic\n• Discrete vs Continuous\n• Single-Agent vs Multi-Agent\n\n💡 Hindi: 6 pairs yaad rakho.'
        },
        {
          front: '5. What are Informed Search Techniques? Explain UCS with Example.',
          back: 'Informed Search Techniques:\n• Greedy Best First Search, A* Search, Hill Climbing, Beam Search\n\nUniform Cost Search (UCS):\n• Expands node with lowest path cost g(n).\n• Example: Path A → B → D (cost 5) is selected over A → C → D (cost 6).\n\n💡 Hindi: Sabse kam cost wala path choose hota hai.'
        }
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
        ? 'You are EasyScan, an expert educational AI assistant. Always return valid, clean JSON with no extra conversational preamble or markdown code blocks outside the JSON.'
        : 'You are EasyScan, a friendly, intelligent, and accurate study assistant. Help students understand topics, documents, and exam questions clearly.',
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
Generate high-yield, structured revision flashcards from the provided document.

CRITICAL RULES FOR CARD GENERATION:
1. QUESTION-WISE 1:1 MAPPING: If the document contains numbered questions or distinct topic headings (e.g., "1.", "2.", "3.", "Q1", "Q2", "Question 1", etc.), you MUST create EXACTLY ONE comprehensive flashcard for each main question.
   - DO NOT break individual bullet points, sub-items, or small examples into separate flashcards.
   - The 'front' must be the exact Question/Topic Title (e.g., "1. What is Artificial Intelligence?" or "2. What is meant by PEAS? Explain different kinds of Agent Program").
   - The 'back' must contain the full, concise revision answer covering the core definition, key points/applications/types as bullet points, formulas/examples, and any memory hints/Hindi summary if present in the document.
   - Ensure ALL questions from the document are covered sequentially without skipping or omitting any question.
2. UNSTRUCTURED / GENERAL TEXT: If the document is general prose without numbered questions, generate 5 to 10 comprehensive key concept cards covering the whole document evenly from start to finish.
3. FORMATTING: Use clean, well-spaced text with bullet points (•) and line breaks (\n) in the 'back' field for clear reading.

Return ONLY valid JSON in the following exact format:
{
  "docTitle": "Flashcard Deck Title",
  "cards": [
    {
      "front": "1. What is Artificial Intelligence?",
      "back": "Definition:\nAI enables machines to think, learn, reason, solve problems and make decisions.\n\nApplications:\n• Chatbots — interact with users\n• Voice Assistants — respond to voice\n• Self-driving Cars — driving decisions\n• Recommendation Systems & Robots\n\n💡 Hindi Tip: Machine ko intelligent banana."
    }
  ]
}`;

  const contents = buildContents(prompt, textContext, imageContent);
  const rawResponse = await callGemini(contents);
  const result = cleanAndParseJSON(rawResponse);

  const cards = (result.cards || []).map((c) => ({
    front: c.front || 'Question / Concept',
    back: c.back || 'Answer / Definition',
  }));

  return {
    docTitle: result.docTitle || 'Revision Flashcards',
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
  let prompt = `You are EasyScan, a helpful and intelligent study assistant.
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
