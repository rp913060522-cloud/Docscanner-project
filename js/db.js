'use strict';

/**
 * StudyGen AI — Local IndexedDB Document Store (`studygen_pdf_db`)
 *
 * Primary Single Source of Truth for Local Document Management.
 * Manages persistent local document storage, metadata, thumbnails,
 * favorite status, last-opened timestamps, and dispatches real-time
 * sync events (`studygen:doc-changed`) across UI components.
 */

const LocalPdfDB = (() => {
  const DB_NAME = 'studygen_pdf_db';
  const DB_VERSION = 2; // Incremented for additional indexes (lastOpenedAt, isFavorite)
  const STORE_NAME = 'documents';

  let dbInstance = null;

  function notifyChange(action, localPdfId) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studygen:doc-changed', {
        detail: { action, localPdfId, timestamp: Date.now() }
      }));
    }
  }

  /**
   * Opens or initializes the IndexedDB database instance with safe migration.
   */
  function openDB() {
    if (dbInstance) return Promise.resolve(dbInstance);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        let store;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          store = db.createObjectStore(STORE_NAME, { keyPath: 'localPdfId' });
        } else {
          store = event.target.transaction.objectStore(STORE_NAME);
        }

        if (!store.indexNames.contains('documentTitle')) {
          store.createIndex('documentTitle', 'documentTitle', { unique: false });
        }
        if (!store.indexNames.contains('updatedAt')) {
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        if (!store.indexNames.contains('lastOpenedAt')) {
          store.createIndex('lastOpenedAt', 'lastOpenedAt', { unique: false });
        }
        if (!store.indexNames.contains('isFavorite')) {
          store.createIndex('isFavorite', 'isFavorite', { unique: false });
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
   * Normalizes document record metadata for backwards compatibility.
   */
  function normalizeRecord(doc) {
    if (!doc) return null;
    const now = new Date().toISOString();
    return {
      localPdfId: doc.localPdfId,
      documentTitle: doc.documentTitle || doc.filename || 'Untitled Document',
      filename: doc.filename || `${doc.localPdfId || 'doc'}.pdf`,
      mimeType: doc.mimeType || (doc.blob && doc.blob.type) || 'application/pdf',
      sizeBytes: doc.sizeBytes || (doc.blob ? doc.blob.size : 0),
      pageCount: doc.pageCount || 1,
      thumbnail: doc.thumbnail || null,
      folderId: doc.folderId || null,
      isFavorite: Boolean(doc.isFavorite),
      createdAt: doc.createdAt || now,
      updatedAt: doc.updatedAt || now,
      lastOpenedAt: doc.lastOpenedAt || doc.updatedAt || doc.createdAt || now,
      blob: doc.blob || null,
    };
  }

  /**
   * Saves or updates a document record locally.
   */
  async function saveDocument({
    localPdfId,
    documentTitle,
    blob,
    mimeType,
    filename,
    thumbnail,
    pageCount,
    isFavorite,
    folderId,
    lastOpenedAt,
  }) {
    const db = await openDB();
    const id = localPdfId || generateLocalPdfId();
    const existing = await getDocument(id);
    const now = new Date().toISOString();

    const record = {
      localPdfId: id,
      documentTitle: documentTitle || (existing && existing.documentTitle) || filename || 'Untitled Document',
      filename: filename || (existing && existing.filename) || `${id}.pdf`,
      mimeType: mimeType || (blob && blob.type) || (existing && existing.mimeType) || 'application/pdf',
      sizeBytes: blob ? blob.size : ((existing && existing.sizeBytes) || 0),
      pageCount: pageCount || (existing && existing.pageCount) || 1,
      thumbnail: thumbnail !== undefined ? thumbnail : (existing && existing.thumbnail) || null,
      folderId: folderId !== undefined ? folderId : (existing && existing.folderId) || null,
      isFavorite: isFavorite !== undefined ? Boolean(isFavorite) : Boolean(existing && existing.isFavorite),
      blob: blob !== undefined ? blob : (existing && existing.blob) || null,
      createdAt: (existing && existing.createdAt) || now,
      updatedAt: now,
      lastOpenedAt: lastOpenedAt || (existing && existing.lastOpenedAt) || now,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => {
        const result = normalizeRecord(record);
        notifyChange('save', id);
        resolve(result);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Gets full document record by localPdfId including Blob payload.
   */
  async function getDocument(localPdfId) {
    if (!localPdfId) return null;
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(localPdfId);

      req.onsuccess = () => {
        const raw = req.result;
        resolve(raw ? normalizeRecord(raw) : null);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Checks if a document exists locally in IndexedDB.
   */
  async function documentExists(localPdfId) {
    if (!localPdfId) return false;
    const doc = await getDocument(localPdfId);
    return Boolean(doc && (doc.blob || doc.sizeBytes > 0));
  }

  /**
   * Lists lightweight document metadata records (without heavy binary Blobs in memory).
   */
  async function listDocuments(options = {}) {
    const { searchQuery = '', filterFavorite = false, sortBy = 'updatedAt' } = options;
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const rawList = req.result || [];
        let items = rawList.map(doc => {
          const norm = normalizeRecord(doc);
          return {
            localPdfId: norm.localPdfId,
            documentTitle: norm.documentTitle,
            filename: norm.filename,
            mimeType: norm.mimeType,
            sizeBytes: norm.sizeBytes,
            pageCount: norm.pageCount,
            thumbnail: norm.thumbnail,
            folderId: norm.folderId,
            isFavorite: norm.isFavorite,
            createdAt: norm.createdAt,
            updatedAt: norm.updatedAt,
            lastOpenedAt: norm.lastOpenedAt,
            hasBlob: Boolean(doc.blob),
          };
        });

        // Search filtering
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          items = items.filter(doc =>
            (doc.documentTitle || '').toLowerCase().includes(q) ||
            (doc.filename || '').toLowerCase().includes(q)
          );
        }

        // Favorites filter
        if (filterFavorite) {
          items = items.filter(doc => doc.isFavorite);
        }

        // Sorting
        items.sort((a, b) => {
          if (sortBy === 'lastOpenedAt') {
            return new Date(b.lastOpenedAt || b.updatedAt).getTime() - new Date(a.lastOpenedAt || a.updatedAt).getTime();
          }
          if (sortBy === 'createdAt') {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          if (sortBy === 'title') {
            return (a.documentTitle || '').localeCompare(b.documentTitle || '');
          }
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        resolve(items);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Gets recent documents sorted by lastOpenedAt descending.
   */
  async function getRecentDocuments(limit = 10) {
    const all = await listDocuments({ sortBy: 'lastOpenedAt' });
    return all.slice(0, limit);
  }

  /**
   * Returns total count of documents in local store.
   */
  async function getDocumentCount() {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count();

      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  }

  /**
   * Updates lastOpenedAt timestamp when a user opens/views a document.
   */
  async function touchLastOpened(localPdfId) {
    if (!localPdfId) return null;
    const doc = await getDocument(localPdfId);
    if (!doc) return null;

    doc.lastOpenedAt = new Date().toISOString();
    return saveDocument(doc);
  }

  /**
   * Renames a document title in IndexedDB.
   */
  async function renameDocument(localPdfId, newTitle) {
    if (!localPdfId || !newTitle || !newTitle.trim()) return null;
    const doc = await getDocument(localPdfId);
    if (!doc) return null;

    doc.documentTitle = newTitle.trim();
    doc.updatedAt = new Date().toISOString();
    return saveDocument(doc);
  }

  /**
   * Toggles favorite status of a document.
   */
  async function toggleFavorite(localPdfId) {
    if (!localPdfId) return null;
    const doc = await getDocument(localPdfId);
    if (!doc) return null;

    doc.isFavorite = !doc.isFavorite;
    doc.updatedAt = new Date().toISOString();
    return saveDocument(doc);
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

      req.onsuccess = () => {
        notifyChange('delete', localPdfId);
        resolve(true);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Alias for backwards compatibility with existing callers.
   */
  async function getAllDocuments() {
    return listDocuments({ sortBy: 'updatedAt' });
  }

  return {
    generateLocalPdfId,
    saveDocument,
    getDocument,
    getAllDocuments,
    listDocuments,
    getRecentDocuments,
    getDocumentCount,
    touchLastOpened,
    renameDocument,
    toggleFavorite,
    deleteDocument,
    documentExists,
  };
})();

// Export globally
window.LocalPdfDB = LocalPdfDB;
