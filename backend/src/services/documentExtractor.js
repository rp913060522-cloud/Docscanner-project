'use strict';

/**
 * StudyGen AI — Document Text Extraction Service
 *
 * Extracts text/content from temporary files in memory during the request lifecycle.
 * Discards all extracted text after request completion.
 * NEVER persists raw text to MongoDB.
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const AppError = require('../utils/AppError');

/**
 * Extracts content from a temporary file path.
 *
 * @param {string} filePath Absolute path to temporary uploaded file
 * @param {string} mimeType File MIME type
 * @returns {Promise<{ text: string, isImage: boolean, buffer?: Buffer, mimeType: string }>}
 */
async function extractDocumentContent(filePath, mimeType) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new AppError('Temporary document file not found.', 400, 'FILE_NOT_FOUND');
  }

  const ext = path.extname(filePath).toLowerCase();
  const fileBuffer = fs.readFileSync(filePath);

  // 1. PDF Extraction
  if (mimeType === 'application/pdf' || ext === '.pdf') {
    try {
      const data = await pdfParse(fileBuffer);
      const text = (data.text || '').trim();

      // If PDF has readable text, return it directly
      if (text && text.length > 20) {
        return {
          text,
          isImage: false,
          numPages: data.numpages,
          mimeType: 'application/pdf',
        };
      }

      // Scanned/image-only PDF: pass as image buffer for Gemini Vision
      // Gemini accepts PDF bytes directly as application/pdf inline data
      console.log('ℹ️  Scanned PDF detected — sending as Vision image to Gemini...');
      return {
        text: '',
        isImage: true,
        buffer: fileBuffer,
        mimeType: 'application/pdf',
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      // If pdf-parse itself fails, still try to send raw bytes to Gemini
      console.warn('⚠️  pdf-parse failed, attempting Vision fallback:', err.message);
      return {
        text: '',
        isImage: true,
        buffer: fileBuffer,
        mimeType: 'application/pdf',
      };
    }
  }

  // 2. Image files (JPG, PNG, WEBP)
  if (
    mimeType.startsWith('image/') ||
    ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
  ) {
    return {
      text: '',
      isImage: true,
      buffer: fileBuffer,
      mimeType: mimeType || (ext === '.png' ? 'image/png' : 'image/jpeg'),
    };
  }

  // 3. Plain text or DOCX fallback
  if (
    mimeType.includes('officedocument') ||
    mimeType.includes('word') ||
    ext === '.docx' ||
    ext === '.doc'
  ) {
    // Basic text extraction for DOCX/TXT streams
    const rawText = fileBuffer
      .toString('utf8')
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!rawText || rawText.length < 10) {
      throw new AppError(
        'Could not extract readable text from DOCX file.',
        400,
        'EXTRACTION_FAILED'
      );
    }

    return {
      text: rawText,
      isImage: false,
      mimeType: 'text/plain',
    };
  }

  throw new AppError(
    `Unsupported document format: ${mimeType || ext}`,
    400,
    'UNSUPPORTED_FILE_TYPE'
  );
}

module.exports = {
  extractDocumentContent,
};
