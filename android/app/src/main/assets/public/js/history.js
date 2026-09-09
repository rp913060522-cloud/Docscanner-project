'use strict';

/**
 * StudyGen AI — My Documents Library Manager (`js/history.js`)
 *
 * Provides complete local document management:
 * - Real-time display of all IndexedDB saved documents
 * - Instant live search filtering by title & filename
 * - Category filter chips (All, Recent, Favorites)
 * - Dynamic database document counts (My Documents (X))
 * - Single source of truth event listening (`studygen:doc-changed`)
 * - Document actions: Open, Rename, Favorite toggle, Delete with confirmation dialog
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Navigation Init
  if (window.StudyGenNav) {
    StudyGenNav.init({ activePage: 'history', requireAuth: false });
  }

  // DOM Elements
  const searchInput    = document.getElementById('historySearch');
  const clearSearch    = document.getElementById('clearSearchBtn');
  const pdfsList       = document.getElementById('pdfsList');
  const emptyState     = document.getElementById('emptyHistoryState');
  const titleCountEl   = document.getElementById('myDocsTitle');
  const headerLabelEl  = document.getElementById('secHeaderLabel');

  // Rename Modal Elements
  const renameModal    = document.getElementById('renameDocModal');
  const renameInput    = document.getElementById('renameDocInput');
  const cancelRename   = document.getElementById('cancelRenameBtn');
  const confirmRename  = document.getElementById('confirmRenameBtn');
  let activeRenameId   = null;

  let activeCat = 'all'; // 'all', 'recent', 'favorite'

  function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function relTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }

  async function loadHistory() {
    if (!pdfsList) return;

    try {
      const q = searchInput ? searchInput.value.trim() : '';
      const filterFav = activeCat === 'favorite';
      const sortBy = activeCat === 'recent' ? 'lastOpenedAt' : 'updatedAt';

      let docs = [];
      let totalCount = 0;

      if (window.LocalPdfDB) {
        docs = await window.LocalPdfDB.listDocuments({
          searchQuery: q,
          filterFavorite: filterFav,
          sortBy: sortBy,
        });
      }

      // Filter out individual page clutter items (_p1, _p2...) so only compiled PDFs show
      docs = docs.filter(d => {
        const title = d.documentTitle || d.filename || '';
        return !/_p\d+$/i.test(title);
      });
      totalCount = docs.length;

      // Check backend history for any saved items
      try {
        const res = await window.ApiClient.get('/history');
        if (res && res.success && res.data && Array.isArray(res.data.history)) {
          for (const item of res.data.history) {
            if (item.localPdfId) {
              const exists = await window.LocalPdfDB.documentExists(item.localPdfId);
              if (!exists && !docs.some(d => d.localPdfId === item.localPdfId)) {
                const title = item.documentTitle || item.title || '';
                if (!/_p\d+$/i.test(title)) {
                  docs.push({
                    localPdfId: item.localPdfId,
                    documentTitle: title || 'Untitled Document',
                    filename: item.filename || 'document.pdf',
                    isDeletedLocally: true,
                    updatedAt: item.updatedAt || item.createdAt,
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Backend history sync note:', err.message);
      }

      // Update Header Title with Real-Time Database Count (Requirement 6)
      if (titleCountEl) {
        titleCountEl.textContent = `My Documents (${totalCount})`;
      }

      // Section Header Label
      if (headerLabelEl) {
        if (activeCat === 'recent') headerLabelEl.textContent = 'RECENTLY OPENED';
        else if (activeCat === 'favorite') headerLabelEl.textContent = 'FAVORITE DOCUMENTS';
        else headerLabelEl.textContent = 'ALL DOCUMENTS';
      }

      if (!docs || docs.length === 0) {
        pdfsList.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
      }

      if (emptyState) emptyState.classList.add('hidden');

      pdfsList.innerHTML = docs.map(doc => {
        const title = doc.documentTitle || doc.filename || 'Untitled Document';
        const timeStr = relTime(doc.lastOpenedAt || doc.updatedAt || doc.createdAt);
        const sizeStr = formatSize(doc.sizeBytes);
        const pagesStr = doc.pageCount ? `${doc.pageCount} ${doc.pageCount === 1 ? 'page' : 'pages'}` : 'PDF';
        const metaInfo = [pagesStr, sizeStr, timeStr].filter(Boolean).join(' • ');

        const thumbHtml = (doc.thumbnail && (doc.thumbnail.startsWith('data:image') || doc.thumbnail.startsWith('http')))
          ? `<img src="${doc.thumbnail}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="Thumbnail" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=\\'material-icons-round\\'>picture_as_pdf</span>';" />`
          : `<span class="material-icons-round">picture_as_pdf</span>`;

        const favIcon = doc.isFavorite ? 'star' : 'star_outline';
        const favStyle = doc.isFavorite ? 'color:#f59e0b;' : 'color:var(--text-secondary);';

        return `
          <div class="list-item doc-card-item" data-id="${doc.localPdfId}" data-title="${title}" style="cursor:pointer;position:relative;">
            <div class="icon-container ic-pdf" style="overflow:hidden;">
              ${thumbHtml}
            </div>
            <div class="list-item__content">
              <div class="list-item__title" style="font-weight:700;">
                ${title} ${doc.isDeletedLocally ? '<span class="badge" style="background:rgba(255,59,48,0.12);color:var(--error);font-size:10px;margin-left:6px;">[Local File Deleted]</span>' : ''}
              </div>
              <div class="list-item__subtitle">${metaInfo}</div>
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
              <button type="button" class="btn-icon fav-btn" data-id="${doc.localPdfId}" title="Favorite" style="width:34px;height:34px;">
                <span class="material-icons-round" style="${favStyle}">${favIcon}</span>
              </button>
              <button type="button" class="btn-icon doc-options-btn" data-id="${doc.localPdfId}" data-title="${title}" title="Options" style="width:34px;height:34px;">
                <span class="material-icons-round">more_vert</span>
              </button>
            </div>
          </div>`;
      }).join('');

      _attachItemHandlers();
    } catch (err) {
      console.warn('My Documents load error:', err.message);
    }
  }

  function _attachItemHandlers() {
    // Open Document Handler
    document.querySelectorAll('.doc-card-item').forEach(el => {
      el.addEventListener('click', async (e) => {
        if (e.target.closest('.fav-btn') || e.target.closest('.doc-options-btn')) return;

        const id = el.getAttribute('data-id');
        const title = el.getAttribute('data-title');
        if (id && window.LocalPdfDB) {
          await window.LocalPdfDB.touchLastOpened(id);
          sessionStorage.setItem('sg_active_doc_id', id);
          if (title) sessionStorage.setItem('sg_active_doc_title', title);
          // Purge stale batch session from previous scan
          sessionStorage.removeItem('sg_batch_pages');
          sessionStorage.removeItem('sg_batch_page_ids');
          sessionStorage.removeItem('sg_study_output');
          window.location.href = 'pdf-ai.html';
        }
      });
    });

    // Favorite Toggle Handler
    document.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (id && window.LocalPdfDB) {
          const updated = await window.LocalPdfDB.toggleFavorite(id);
          StudyGenApp.toast.show(updated?.isFavorite ? 'Added to Favorites ⭐' : 'Removed from Favorites');
          loadHistory();
        }
      });
    });

    // Options Menu (Rename / Delete / Open / Study with AI)
    document.querySelectorAll('.doc-options-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const title = btn.getAttribute('data-title');

        if (window.StudyGenNav && window.StudyGenNav.showActionSheet) {
          window.StudyGenNav.showActionSheet({
            title: title,
            actions: [
              {
                label: '👁️ Open / View Document',
                onClick: async () => {
                  if (window.LocalPdfDB) await window.LocalPdfDB.touchLastOpened(id);
                  sessionStorage.setItem('sg_active_doc_id', id);
                  if (title) sessionStorage.setItem('sg_active_doc_title', title);
                  sessionStorage.removeItem('sg_batch_pages');
                  sessionStorage.removeItem('sg_batch_page_ids');
                  sessionStorage.removeItem('sg_study_output');
                  window.location.href = 'pdf-ai.html';
                }
              },
              {
                label: '🤖 Study with AI (Summary, Quiz, Flashcards)',
                onClick: async () => {
                  if (window.LocalPdfDB) await window.LocalPdfDB.touchLastOpened(id);
                  sessionStorage.setItem('sg_active_doc_id', id);
                  if (title) sessionStorage.setItem('sg_active_doc_title', title);
                  sessionStorage.removeItem('sg_batch_pages');
                  sessionStorage.removeItem('sg_batch_page_ids');
                  sessionStorage.removeItem('sg_study_output');
                  window.location.href = 'upload-ai.html';
                }
              },
              {
                label: '📤 Share PDF Document',
                onClick: async () => {
                  try {
                    if (!window.LocalPdfDB) return;
                    const docRecord = await window.LocalPdfDB.getDocument(id);
                    if (!docRecord) {
                      StudyGenApp.toast.show('Document not found.');
                      return;
                    }
                    const cleanTitle = (title || 'document').replace(/\.pdf$/i, '');
                    const filename = `${cleanTitle}.pdf`;

                    let blobToShare = docRecord.blob;
                    if (!blobToShare && docRecord.thumbnail && window.jspdf) {
                      const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
                      const doc = new jsPDFClass({ orientation: 'portrait', unit: 'pt', format: 'a4' });
                      doc.addImage(docRecord.thumbnail, 'JPEG', 20, 20, 555, 750);
                      if (window.StudyGenApp && window.StudyGenApp.watermark) {
                        window.StudyGenApp.watermark.applyToDoc(doc);
                      }
                      blobToShare = doc.output('blob');
                    }

                    if (blobToShare && window.StudyGenApp && window.StudyGenApp.share) {
                      await window.StudyGenApp.share.sharePdf({
                        blob: blobToShare,
                        filename,
                        title: cleanTitle,
                      });
                    } else if (blobToShare) {
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blobToShare);
                      a.download = filename;
                      a.click();
                      StudyGenApp.toast.show('Document saved to device! 💾');
                    } else {
                      StudyGenApp.toast.show('Document file not available.');
                    }
                  } catch (err) {
                    if (err.name !== 'AbortError') {
                      console.warn('Share error:', err);
                      StudyGenApp.toast.show('Could not share document.');
                    }
                  }
                }
              },
              {
                label: '✏️ Rename Document',
                onClick: () => _openRenameModal(id, title)
              },
              {
                label: '⭐ Toggle Favorite',
                onClick: async () => {
                  if (window.LocalPdfDB) {
                    const u = await window.LocalPdfDB.toggleFavorite(id);
                    StudyGenApp.toast.show(u?.isFavorite ? 'Added to Favorites ⭐' : 'Removed from Favorites');
                    loadHistory();
                  }
                }
              },
              {
                label: '🗑️ Delete Document',
                danger: true,
                onClick: () => _confirmDeleteDoc(id, title)
              }
            ]
          });
        } else {
          // Fallback confirmation dialog
          _confirmDeleteDoc(id, title);
        }
      });
    });
  }

  // Rename Modal Functions
  function _openRenameModal(id, currentTitle) {
    activeRenameId = id;
    if (renameInput) renameInput.value = currentTitle || '';
    if (renameModal) renameModal.style.display = 'flex';
  }

  function _closeRenameModal() {
    activeRenameId = null;
    if (renameModal) renameModal.style.display = 'none';
  }

  if (cancelRename) {
    cancelRename.addEventListener('click', _closeRenameModal);
  }

  if (confirmRename) {
    confirmRename.addEventListener('click', async () => {
      const newTitle = renameInput ? renameInput.value.trim() : '';
      if (!newTitle) {
        StudyGenApp.toast.show('Please enter a valid document name.');
        return;
      }

      if (activeRenameId && window.LocalPdfDB) {
        await window.LocalPdfDB.renameDocument(activeRenameId, newTitle);
        StudyGenApp.toast.show('Document renamed successfully ✨');
        _closeRenameModal();
        loadHistory();
      }
    });
  }

  // Delete Confirmation Dialog (Requirement 4)
  function _confirmDeleteDoc(id, title) {
    if (window.StudyGenNav && window.StudyGenNav.confirm) {
      window.StudyGenNav.confirm(
        `Delete this document?`,
        async () => {
          if (window.LocalPdfDB) {
            await window.LocalPdfDB.deleteDocument(id);
          }
          StudyGenApp.toast.show('Document deleted from device 🗑️');
          loadHistory();
        },
        'This document will be removed from this device.'
      );
    } else if (confirm(`Delete "${title}"?\nThis document will be removed from this device.`)) {
      (async () => {
        if (window.LocalPdfDB) {
          await window.LocalPdfDB.deleteDocument(id);
        }
        StudyGenApp.toast.show('Document deleted 🗑️');
        loadHistory();
      })();
    }
  }

  // Filter Chips Listener
  const chips = document.querySelectorAll('#historyFilterChips .chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCat = chip.getAttribute('data-cat');
      loadHistory();
    });
  });

  // Live Instant Search Listener (Requirement 5)
  if (searchInput) {
    searchInput.addEventListener('input', () => loadHistory());
  }

  if (clearSearch) {
    clearSearch.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        loadHistory();
      }
    });
  }

  // Filter Modal Header Button Handler
  const filterModalBtn = document.getElementById('filterModalBtn');
  if (filterModalBtn) {
    filterModalBtn.addEventListener('click', () => {
      if (window.StudyGenNav && window.StudyGenNav.showActionSheet) {
        window.StudyGenNav.showActionSheet({
          title: 'Filter Documents',
          actions: [
            {
              label: '📁 All Documents',
              onClick: () => {
                const chip = document.querySelector('#historyFilterChips [data-cat="all"]');
                if (chip) chip.click();
              }
            },
            {
              label: '🕒 Recent Documents',
              onClick: () => {
                const chip = document.querySelector('#historyFilterChips [data-cat="recent"]');
                if (chip) chip.click();
              }
            },
            {
              label: '⭐ Starred Favorites',
              onClick: () => {
                const chip = document.querySelector('#historyFilterChips [data-cat="favorites"]');
                if (chip) chip.click();
              }
            }
          ]
        });
      }
    });
  }

  // Initial Data Load (Requirement 9)
  await loadHistory();

  // Single Source of Truth Real-time UI Synchronization (Requirement 7)
  window.addEventListener('studygen:doc-changed', () => {
    loadHistory();
  });
});
