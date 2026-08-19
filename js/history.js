'use strict';

/**
 * StudyGen AI — History Screen Logic
 * Connects real backend GET /api/history and DELETE /api/history/:id APIs.
 * Checks local IndexedDB for PDF existence and displays `[Local File Deleted]` badge if removed locally,
 * while keeping saved Notes, Quizzes, Flashcards, and Chat accessible from MongoDB.
 */

document.addEventListener('DOMContentLoaded', async () => {

  const searchInput = document.getElementById('historySearch');
  const clearSearch = document.getElementById('clearSearchBtn');
  const notesList   = document.getElementById('notesList');
  const pdfsList    = document.getElementById('pdfsList');
  const guidesList  = document.getElementById('guidesList');
  const emptyState  = document.getElementById('emptyHistoryState');

  const secNotes  = document.getElementById('secNotes');
  const secPdfs   = document.getElementById('secPdfs');
  const secGuides = document.getElementById('secGuides');

  let activeCat = 'all';
  let historyItems = [];
  let localPdfPresenceMap = {};

  async function loadHistory() {
    try {
      const res = await window.ApiClient.get('/history');
      if (res && res.success && res.data) {
        historyItems = res.data.history || [];
      }
    } catch (err) {
      console.error('Failed to load history:', err);
      StudyGenApp.toast.show(err.message || 'Failed to load history from server.');
      historyItems = [];
    }

    // Check IndexedDB for each item's localPdfId
    localPdfPresenceMap = {};
    for (const item of historyItems) {
      if (item.localPdfId) {
        const exists = await window.LocalPdfDB.documentExists(item.localPdfId);
        localPdfPresenceMap[item.localPdfId] = exists;
      }
    }

    renderAll();
  }

  function renderItem(item) {
    const isPdfAvailable = localPdfPresenceMap[item.localPdfId] === true;
    const dateFormatted = StudyGenApp.utils.relativeTime(item.lastAccessedAt || item.updatedAt);
    const pdfBadgeHtml = !isPdfAvailable
      ? `<span class="badge" style="background:rgba(255,59,48,0.12);color:var(--error);font-size:10px;margin-left:6px;">[Local File Deleted]</span>`
      : '';

    let type = 'pdf';
    let iconName = 'picture_as_pdf';
    let iconClass = 'ic-pdf';
    let routeTarget = 'pdf-ai.html';

    if (item.noteId) {
      type = 'note';
      iconName = 'description';
      iconClass = 'ic-notes';
      routeTarget = `ai-study.html?id=${item.noteId._id || item.noteId}`;
    } else if (item.quizId) {
      type = 'quiz';
      iconName = 'quiz';
      iconClass = 'ic-quiz';
      routeTarget = 'ai-learning.html?tab=quiz';
    } else if (item.chatId) {
      type = 'chat';
      iconName = 'forum';
      iconClass = 'ic-notes';
      routeTarget = 'ai-learning.html?tab=chat';
    }

    return `
      <div class="list-item" data-id="${item._id}" data-localpdfid="${item.localPdfId}" data-type="${type}" data-title="${item.documentTitle}" data-route="${routeTarget}" data-pdfavailable="${isPdfAvailable}">
        <div class="icon-container ${iconClass}">
          <span class="material-icons-round">${iconName}</span>
        </div>
        <div class="list-item__content">
          <div class="list-item__title">${item.documentTitle} ${pdfBadgeHtml}</div>
          <div class="list-item__subtitle">${dateFormatted}</div>
        </div>
        <button class="dot-menu-btn item-menu-btn" title="Options">
          <span class="material-icons-round">more_vert</span>
        </button>
      </div>
    `;
  }

  function renderAll() {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filterFn = (item) => !query || (item.documentTitle || '').toLowerCase().includes(query);

    const filtered = historyItems.filter(filterFn);

    const filteredNotes  = filtered.filter(i => i.noteId);
    const filteredGuides = filtered.filter(i => i.quizId || i.chatId || i.flashcardId);
    const filteredPdfs   = filtered.filter(i => !i.noteId && !i.quizId && !i.chatId);

    const showNotes  = (activeCat === 'all' || activeCat === 'notes') && filteredNotes.length > 0;
    const showPdfs   = (activeCat === 'all' || activeCat === 'pdfs') && filteredPdfs.length > 0;
    const showGuides = (activeCat === 'all' || activeCat === 'guides') && filteredGuides.length > 0;

    if (secNotes) secNotes.classList.toggle('hidden', !showNotes);
    if (secPdfs) secPdfs.classList.toggle('hidden', !showPdfs);
    if (secGuides) secGuides.classList.toggle('hidden', !showGuides);

    if (notesList)  notesList.innerHTML  = filteredNotes.map(renderItem).join('');
    if (pdfsList)   pdfsList.innerHTML   = filteredPdfs.map(renderItem).join('');
    if (guidesList) guidesList.innerHTML = filteredGuides.map(renderItem).join('');

    const totalVisible = (showNotes ? filteredNotes.length : 0) + (showPdfs ? filteredPdfs.length : 0) + (showGuides ? filteredGuides.length : 0);
    if (emptyState) emptyState.classList.toggle('hidden', totalVisible > 0);

    _attachItemHandlers();
  }

  function _attachItemHandlers() {
    document.querySelectorAll('.list-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.item-menu-btn')) {
          e.stopPropagation();
          const title = el.getAttribute('data-title');
          const id = el.getAttribute('data-id');
          _openItemMenu(id, title);
        } else {
          const route = el.getAttribute('data-route');
          const isPdfAvailable = el.getAttribute('data-pdfavailable') === 'true';
          const localPdfId = el.getAttribute('data-localpdfid');

          if (localPdfId) sessionStorage.setItem('sg_active_doc_id', localPdfId);

          if (!isPdfAvailable && route === 'pdf-ai.html') {
            StudyGenApp.toast.show('The original PDF file was deleted from this device. Saved notes & chats remain accessible.', 5000);
            return;
          }

          window.location.href = route;
        }
      });
    });
  }

  function _openItemMenu(id, title) {
    StudyGenNav.confirm(
      `Delete history entry for "${title}"?`,
      async () => {
        try {
          await window.ApiClient.delete(`/history/${id}`);
          historyItems = historyItems.filter(i => i._id !== id);
          renderAll();
          StudyGenApp.toast.show('History entry deleted.');
        } catch (err) {
          StudyGenApp.toast.show(err.message || 'Failed to delete history record.');
        }
      }
    );
  }

  const chips = document.querySelectorAll('#historyFilterChips .chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCat = chip.getAttribute('data-cat');
      renderAll();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => renderAll());
  }

  const filterModalBtn = document.getElementById('filterModalBtn');
  if (filterModalBtn) {
    filterModalBtn.addEventListener('click', () => {
      const cats = ['all', 'notes', 'pdfs', 'guides'];
      const nextIdx = (cats.indexOf(activeCat) + 1) % cats.length;
      activeCat = cats[nextIdx];

      chips.forEach(c => {
        const isMatch = c.getAttribute('data-cat') === activeCat;
        c.classList.toggle('active', isMatch);
      });

      renderAll();
      const catNames = { all: 'All Items', notes: 'Notes', pdfs: 'PDFs', guides: 'AI Study Guides' };
      StudyGenApp.toast.show(`Filter: ${catNames[activeCat]}`);
    });
  }

  if (clearSearch) {
    clearSearch.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        renderAll();
      }
    });
  }

  await loadHistory();
});
