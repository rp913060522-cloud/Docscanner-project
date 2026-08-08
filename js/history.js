/**
 * StudyGen AI — History Screen Logic
 * Category filtering, live search, item deletion, and bottom nav integration
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  StudyGenNav.init({ activePage: 'history', requireAuth: false });

  let notes  = [...StudyGenApp.MOCK.recentNotes];
  let pdfs   = [...StudyGenApp.MOCK.recentPDFs];
  let guides = [...StudyGenApp.MOCK.aiStudyGuides];

  const searchInput  = document.getElementById('historySearch');
  const clearSearch  = document.getElementById('clearSearchBtn');
  const notesList    = document.getElementById('notesList');
  const pdfsList     = document.getElementById('pdfsList');
  const guidesList   = document.getElementById('guidesList');
  const emptyState   = document.getElementById('emptyHistoryState');

  const secNotes  = document.getElementById('secNotes');
  const secPdfs   = document.getElementById('secPdfs');
  const secGuides = document.getElementById('secGuides');

  let activeCat = 'all';

  function renderItem(item, iconClass, iconName, type) {
    return `
      <div class="list-item" data-id="${item.id}" data-type="${type}" data-title="${item.title}">
        <div class="icon-container ${iconClass}">
          <span class="material-icons-round">${iconName}</span>
        </div>
        <div class="list-item__content">
          <div class="list-item__title">${item.title}</div>
          <div class="list-item__subtitle">${item.date}</div>
        </div>
        <button class="dot-menu-btn item-menu-btn" title="Options">
          <span class="material-icons-round">more_vert</span>
        </button>
      </div>
    `;
  }

  function renderAll() {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    const filterFn = (item) => !query || item.title.toLowerCase().includes(query);

    const filteredNotes  = notes.filter(filterFn);
    const filteredPdfs   = pdfs.filter(filterFn);
    const filteredGuides = guides.filter(filterFn);

    const showNotes  = (activeCat === 'all' || activeCat === 'notes') && filteredNotes.length > 0;
    const showPdfs   = (activeCat === 'all' || activeCat === 'pdfs') && filteredPdfs.length > 0;
    const showGuides = (activeCat === 'all' || activeCat === 'guides') && filteredGuides.length > 0;

    if (secNotes) secNotes.classList.toggle('hidden', !showNotes);
    if (secPdfs) secPdfs.classList.toggle('hidden', !showPdfs);
    if (secGuides) secGuides.classList.toggle('hidden', !showGuides);

    if (notesList)  notesList.innerHTML  = filteredNotes.map(n => renderItem(n, 'ic-notes', 'description', 'notes')).join('');
    if (pdfsList)   pdfsList.innerHTML   = filteredPdfs.map(p => renderItem(p, 'ic-pdf', 'picture_as_pdf', 'pdfs')).join('');
    if (guidesList) guidesList.innerHTML = filteredGuides.map(g => renderItem(g, 'ic-quiz', 'auto_awesome', 'guides')).join('');

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
          const id = parseInt(el.getAttribute('data-id'));
          const type = el.getAttribute('data-type');
          _openItemMenu(id, type, title);
        } else {
          window.location.href = 'ai-study.html';
        }
      });
    });
  }

  function _openItemMenu(id, type, title) {
    StudyGenNav.confirm(
      `Delete "${title}"?`,
      () => {
        if (type === 'notes') notes = notes.filter(n => n.id !== id);
        if (type === 'pdfs') pdfs = pdfs.filter(p => p.id !== id);
        if (type === 'guides') guides = guides.filter(g => g.id !== id);
        renderAll();
        StudyGenApp.toast.show('Item deleted from history.');
      }
    );
  }

  // Category filter chips
  const chips = document.querySelectorAll('#historyFilterChips .chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCat = chip.getAttribute('data-cat');
      renderAll();
    });
  });

  // Search input handler
  if (searchInput) {
    searchInput.addEventListener('input', () => renderAll());
  }

  if (clearSearch) {
    clearSearch.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        renderAll();
      }
    });
  }

  renderAll();
});
