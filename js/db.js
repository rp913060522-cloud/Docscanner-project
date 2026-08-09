'use strict';

/**
 * StudyGen AI — Local IndexedDB Document Store (`studygen_pdf_db`)
 *
 * Stores original user PDF/document Blobs locally on the user's device.
 * Enforces local privacy — original document binaries are NEVER permanently
 * stored on the backend or in MongoDB.
 */

const LocalPdfDB = (() => {
  const DB_NAME = 'studygen_pdf_db';
  const DB_VERSION = 1;
  const STORE_NAME = 'documents';

  let dbInstance = null;

  /**
   * Opens or initializes the IndexedDB database instance.
   */
  function openDB() {
    if (dbInstance) return Promise.resolve(dbInstance);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'localPdfId' });
          store.createIndex('documentTitle', 'documentTitle', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        reject(new Error('Failed to open local document database.'));
      };
    });
  }

  /**
   * Generates a unique stable localPdfId string.
   */
  function generateLocalPdfId() {
    return `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Saves a document Blob locally.
   *
   * @param {Object} doc
   * @param {string} [doc.localPdfId]
   * @param {string} doc.documentTitle
   * @param {Blob|File} doc.blob
   * @param {string} [doc.mimeType]
   * @param {string} [doc.filename]
   * @returns {Promise<Object>} Safe document record
   */
  async function saveDocument({ localPdfId, documentTitle, blob, mimeType, filename }) {
    const db = await openDB();
    const id = localPdfId || generateLocalPdfId();
    const now = new Date().toISOString();

    const record = {
      localPdfId: id,
      documentTitle: documentTitle || filename || 'Untitled Document',
      filename: filename || `${id}.pdf`,
      mimeType: mimeType || (blob && blob.type) || 'application/pdf',
      sizeBytes: blob ? blob.size : 0,
      blob: blob || null,
      createdAt: now,
      updatedAt: now,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => resolve(record);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Gets a document record including the Blob by localPdfId.
   */
  async function getDocument(localPdfId) {
    if (!localPdfId) return null;
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(localPdfId);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Checks if a document exists locally in IndexedDB.
   */
  async function documentExists(localPdfId) {
    if (!localPdfId) return false;
    const doc = await getDocument(localPdfId);
    return Boolean(doc && doc.blob);
  }

  /**
   * Lists all local document metadata records (without heavy Blob payloads if needed).
   */
  async function listDocuments() {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = (req.result || []).map((doc) => ({
          localPdfId: doc.localPdfId,
          documentTitle: doc.documentTitle,
          filename: doc.filename,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          hasBlob: Boolean(doc.blob),
        }));
        resolve(records);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Deletes a document from IndexedDB by localPdfId.
   */
  async function deleteDocument(localPdfId) {
    if (!localPdfId) return false;
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(localPdfId);

      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  return {
    generateLocalPdfId,
    saveDocument,
    getDocument,
    documentExists,
    listDocuments,
    deleteDocument,
  };
})();

// Export globally
window.LocalPdfDB = LocalPdfDB;
