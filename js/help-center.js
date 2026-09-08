/**
 * EasyScan — Help Center & FAQ Logic (`js/help-center.js`)
 *
 * Implements:
 * 1. 8 Verified FAQ Categories matching EasyScan's real architecture
 * 2. Instant client-side search across question, answer, and category
 * 3. Dynamic category chip filtering
 * 4. Accessible accordion expand/collapse with ARIA attributes
 * 5. Empty search state and keyword highlighting
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize standard EasyScan navigation (Settings tab active)
  if (window.StudyGenNav && StudyGenNav.init) {
    StudyGenNav.init({ activePage: 'settings', requireAuth: false });
  }

  // ── 8 FAQ Categories & Verified Questions Matrix ───────────────────────────
  const FAQ_DATA = [
    // 1. GETTING STARTED
    {
      id: 'gs-1',
      category: 'getting-started',
      categoryLabel: 'Getting Started',
      question: 'What is EasyScan?',
      answer: 'EasyScan is a smart, mobile-first document scanner and study companion. It allows you to scan physical papers, textbooks, and notes using your device camera or photo gallery, auto-detect document borders, apply enhancement filters, generate clean multi-page PDF files, and use AI study tools to create summaries, quizzes, and revision notes.'
    },
    {
      id: 'gs-2',
      category: 'getting-started',
      categoryLabel: 'Getting Started',
      question: 'How do I scan my first document?',
      answer: 'Tap the prominent <strong>Scan</strong> button on the home screen or the bottom navigation bar. Grant camera permissions when prompted, position your paper within the camera frame, and tap the blue capture button. You can then preview, crop, filter, and save your document directly as a PDF.'
    },
    {
      id: 'gs-3',
      category: 'getting-started',
      categoryLabel: 'Getting Started',
      question: 'Do I need an account to use EasyScan?',
      answer: 'No, you can start using EasyScan immediately as a guest. All scanning, cropping, edge detection, and local document management features work right out of the box using your browser\'s local storage. Creating a free account enables cross-device sync for your study notes and quizzes.'
    },

    // 2. SCANNING
    {
      id: 'sc-1',
      category: 'scanning',
      categoryLabel: 'Scanning',
      question: 'How do I capture a document using the camera?',
      answer: 'Open the Scanner screen, point your camera at the document under good lighting, and tap the round shutter button. Ensure the page edges contrast clearly against the background table or surface for optimal edge detection.'
    },
    {
      id: 'sc-2',
      category: 'scanning',
      categoryLabel: 'Scanning',
      question: 'Can I scan multiple pages in a single document?',
      answer: 'Yes! On the camera screen, select the <strong>Batch / Multi-Page</strong> mode pill. You can snap Page 1, Page 2, Page 3, and so on continuously. A thumbnail strip at the bottom tracks all captured pages. When finished, tap <strong>Done</strong> to open all pages together in the preview and crop editor.'
    },
    {
      id: 'sc-3',
      category: 'scanning',
      categoryLabel: 'Scanning',
      question: 'How does auto edge detection work?',
      answer: 'EasyScan uses a real-time computer-vision loop that analyzes the camera feed to find document corners and edges. When a paper is detected, a blue boundary polygon automatically frames the document. You can toggle auto edge detection on or off anytime in Settings under Preferences.'
    },
    {
      id: 'sc-4',
      category: 'scanning',
      categoryLabel: 'Scanning',
      question: 'Can I manually crop a scanned document?',
      answer: 'Yes. In the Scan Preview screen, tap the <strong>Crop</strong> tool. An interactive editor appears with 4 draggable corner handles. Move each handle to precisely fit your paper boundaries, then tap <strong>Apply Crop</strong> or tap <strong>Reset</strong> to undo.'
    },
    {
      id: 'sc-5',
      category: 'scanning',
      categoryLabel: 'Scanning',
      question: 'How do I rotate a scanned page?',
      answer: 'In the Scan Preview screen, tap the <strong>Rotate</strong> button. Each tap rotates the currently selected page 90 degrees clockwise.'
    },
    {
      id: 'sc-6',
      category: 'scanning',
      categoryLabel: 'Scanning',
      question: 'What image enhancement filters are available?',
      answer: 'EasyScan offers 4 optimized visual filters in the preview screen:<ul><li><strong>Original:</strong> Natural, unmodified camera capture.</li><li><strong>Magic Color:</strong> Boosts sharpness, contrast, and brightness for clean, legible text.</li><li><strong>Vibrant Color:</strong> Enhances colorful diagrams, charts, and illustrations.</li><li><strong>B&W / Grayscale:</strong> High-contrast black and white mode ideal for receipts and printed book pages.</li></ul>'
    },
    {
      id: 'sc-7',
      category: 'scanning',
      categoryLabel: 'Scanning',
      question: 'What should I do if the camera does not open or permission is denied?',
      answer: 'If camera permission was denied, click the lock/settings icon next to the URL in your browser address bar and set Camera to <em>Allow</em>, then reload the page. Alternatively, tap the <strong>Gallery</strong> button on the bottom left of the scanner to pick an existing image file from your device.'
    },

    // 3. DOCUMENTS
    {
      id: 'doc-1',
      category: 'documents',
      categoryLabel: 'Documents',
      question: 'Where can I find Recent Files and My Documents?',
      answer: 'Your latest documents are listed under <strong>Recent Files</strong> on the Home screen. To browse, search, and manage your complete document library, tap <strong>History</strong> in the bottom navigation to open <strong>My Documents</strong>.'
    },
    {
      id: 'doc-2',
      category: 'documents',
      categoryLabel: 'Documents',
      question: 'How do I view a saved PDF document?',
      answer: 'In Home or My Documents, simply tap on any document card. EasyScan opens the built-in full-screen PDF viewer with zoom controls, pinch-to-zoom, and smooth page scrolling.'
    },
    {
      id: 'doc-3',
      category: 'documents',
      categoryLabel: 'Documents',
      question: 'How do I rename a document?',
      answer: 'Tap the three-dot menu (⋮) on any document card in My Documents or Recent Files, select <strong>Rename</strong>, enter your desired document title, and tap Save.'
    },
    {
      id: 'doc-4',
      category: 'documents',
      categoryLabel: 'Documents',
      question: 'How do I delete a document?',
      answer: 'Tap the three-dot menu (⋮) on the document card, select <strong>Delete</strong>, and confirm the prompt. The document and its stored pages will be permanently removed from your device storage.'
    },
    {
      id: 'doc-5',
      category: 'documents',
      categoryLabel: 'Documents',
      question: 'Can I mark documents as favorites?',
      answer: 'Yes! In My Documents, tap the star icon on any document card to add it to your favorites. You can click the <strong>Favorites</strong> filter chip at the top to instantly view all your starred files.'
    },

    // 4. STORAGE
    {
      id: 'st-1',
      category: 'storage',
      categoryLabel: 'Storage',
      question: 'Where are my scanned documents stored?',
      answer: 'All scanned documents, captured images, and generated PDF files are stored directly on your device inside your browser\'s <strong>IndexedDB database</strong> (<code>studygen_pdf_db</code>). They do not take up cloud database storage.'
    },
    {
      id: 'st-2',
      category: 'storage',
      categoryLabel: 'Storage',
      question: 'Can I view my saved documents offline?',
      answer: 'Yes! Because your documents are stored locally in IndexedDB, you can open, read, and view all previously saved documents even without an active internet connection.'
    },
    {
      id: 'st-3',
      category: 'storage',
      categoryLabel: 'Storage',
      question: 'How much storage space can EasyScan use on my device?',
      answer: 'EasyScan uses your browser\'s local IndexedDB storage quota. Modern mobile and desktop browsers typically allocate hundreds of megabytes or gigabytes depending on your device\'s free disk space.'
    },
    {
      id: 'st-4',
      category: 'storage',
      categoryLabel: 'Storage',
      question: 'What happens to my documents if I clear my browser browsing data?',
      answer: 'Because documents are stored in local browser storage, completely clearing your browser\'s site data or website cache for EasyScan will delete your local documents. We strongly recommend downloading or sharing important PDFs to save them to your permanent device storage or cloud drive.'
    },

    // 5. PDF
    {
      id: 'pdf-1',
      category: 'pdf',
      categoryLabel: 'PDF',
      question: 'How is a scanned document converted to PDF?',
      answer: 'When you tap <strong>Save PDF</strong> on the preview screen, EasyScan\'s client-side PDF engine compiles your enhanced page images into a single standardized PDF file.'
    },
    {
      id: 'pdf-2',
      category: 'pdf',
      categoryLabel: 'PDF',
      question: 'Does the generated PDF include a watermark?',
      answer: 'Yes. Generated PDFs include a clean, bold footer watermark on the bottom center of each page with the text <strong>"Scanned with EasyScan"</strong> in red lettering.'
    },
    {
      id: 'pdf-3',
      category: 'pdf',
      categoryLabel: 'PDF',
      question: 'How do I share or download a generated PDF?',
      answer: 'Tap the <strong>Share</strong> button on any document card or in the preview screen. On mobile devices supporting the native Web Share API, this opens your system share sheet (WhatsApp, Gmail, Drive, etc.). On desktop browsers, it automatically downloads the <code>.pdf</code> file to your device.'
    },

    // 6. AI LEARNING TOOLS
    {
      id: 'ai-1',
      category: 'ai',
      categoryLabel: 'AI Learning Tools',
      question: 'What can EasyScan AI do?',
      answer: 'EasyScan AI transforms your scanned notes or study chapters into comprehensive learning aids:<ul><li><strong>Executive Summaries:</strong> Key takeaways, bullet points, and core findings.</li><li><strong>Comprehensive Study Notes:</strong> Structured revision notes with concepts and definitions.</li><li><strong>Interactive Quizzes:</strong> Multiple-choice questions with answer explanations and instant scoring.</li><li><strong>Flashcard Decks:</strong> Digital flip cards with questions and answers for active recall.</li><li><strong>Chat with Document:</strong> Ask direct questions about formulas, theories, and examples in your document.</li></ul>'
    },
    {
      id: 'ai-2',
      category: 'ai',
      categoryLabel: 'AI Learning Tools',
      question: 'Which AI service does EasyScan currently use?',
      answer: 'EasyScan is currently powered by the <strong>Groq AI API</strong>, providing ultra-fast inference speed and high-accuracy document comprehension.'
    },
    {
      id: 'ai-3',
      category: 'ai',
      categoryLabel: 'AI Learning Tools',
      question: 'How do I use the AI study features?',
      answer: 'Go to <strong>AI Study Tools</strong> from the Home screen or upload screen. Select any existing scanned document from your library or upload a PDF/photo, then choose what you want to generate: Summary, Study Notes, Quiz, Flashcards, or Chat.'
    },
    {
      id: 'ai-4',
      category: 'ai',
      categoryLabel: 'AI Learning Tools',
      question: 'Why is uploading one chapter or section recommended for AI?',
      answer: 'Uploading focused chapters or sections (~1 to 30 pages) yields significantly higher quality results. It allows the Groq AI model to capture fine details, generate specific exam questions, and produce thorough notes without exceeding prompt limits or omitting crucial concepts.'
    },
    {
      id: 'ai-5',
      category: 'ai',
      categoryLabel: 'AI Learning Tools',
      question: 'Can I chat directly with my scanned document?',
      answer: 'Yes! Use the <strong>Chat with Document</strong> feature. You can type any question, request simplification of complex paragraphs, or ask for examples, and the AI answers strictly based on the text in your document.'
    },

    // 7. DATA & PRIVACY
    {
      id: 'pr-1',
      category: 'privacy',
      categoryLabel: 'Data & Privacy',
      question: 'Are my scanned documents stored in your cloud database?',
      answer: '<strong>No.</strong> Your scanned document photos, raw images, and generated PDF binaries are <strong>never stored</strong> in our MongoDB database. They remain stored strictly on your own device inside the browser\'s local IndexedDB.'
    },
    {
      id: 'pr-2',
      category: 'privacy',
      categoryLabel: 'Data & Privacy',
      question: 'What information is stored in the database?',
      answer: 'Our cloud database stores only essential account information (your name, email, and encrypted password hash for login) and optional study resources you explicitly save (notes text, quiz scores, flashcards). Document binary files are never stored in the database.'
    },
    {
      id: 'pr-3',
      category: 'privacy',
      categoryLabel: 'Data & Privacy',
      question: 'Does EasyScan store my documents permanently on the server when using AI?',
      answer: '<strong>No.</strong> When you upload a document for AI study tools, the file is saved temporarily in a secure scratch folder solely to extract text for processing. As soon as the AI response is prepared, the temporary file is immediately purged using backend cleanup routines (<code>deleteFile</code>). A background cron job also deletes any orphan files every 15 minutes.'
    },
    {
      id: 'pr-4',
      category: 'privacy',
      categoryLabel: 'Data & Privacy',
      question: 'Is my document sent for AI processing?',
      answer: 'Only when you explicitly request an AI action (such as generating study notes, quizzes, or document chat), the extracted text is securely transmitted to the Groq AI API to generate your response. Your files are never sold, rented, or shared with third-party advertisers.'
    },

    // 8. ACCOUNT & SETTINGS
    {
      id: 'acc-1',
      category: 'account',
      categoryLabel: 'Account & Settings',
      question: 'How do I edit my profile or update my password?',
      answer: 'Tap <strong>Profile</strong> in the bottom navigation bar. You can edit your display name or update your account password under the Security section.'
    },
    {
      id: 'acc-2',
      category: 'account',
      categoryLabel: 'Account & Settings',
      question: 'How does Google login work?',
      answer: 'On the login or signup screen, tap <strong>Sign in with Google</strong>. EasyScan verifies your Google account securely via Google OAuth and issues an authenticated session cookie. EasyScan never sees or stores your Google password.'
    },
    {
      id: 'acc-3',
      category: 'account',
      categoryLabel: 'Account & Settings',
      question: 'How do I switch between Light and Dark themes?',
      answer: 'Go to <strong>Settings</strong> from the bottom navigation. Under <strong>Preferences</strong>, toggle the <strong>Dark Theme</strong> switch. The theme changes instantly and is remembered across sessions.'
    },
    {
      id: 'acc-4',
      category: 'account',
      categoryLabel: 'Account & Settings',
      question: 'How do I change the app language to Hindi?',
      answer: 'In <strong>Settings</strong>, tap the <strong>Switch</strong> button next to <strong>App Language</strong> to toggle between English and Hindi (हिंदी).'
    },
    {
      id: 'acc-5',
      category: 'account',
      categoryLabel: 'Account & Settings',
      question: 'How do I log out of my account?',
      answer: 'Open the <strong>Profile</strong> screen, scroll to the bottom, and tap the red <strong>Sign Out</strong> button. This securely clears your authentication session cookie.'
    }
  ];

  // ── DOM References ────────────────────────────────────────────────────────
  const searchInput     = document.getElementById('faqSearch');
  const clearSearchBtn  = document.getElementById('clearFaqSearch');
  const chipContainer   = document.getElementById('faqCategoryChips');
  const accordionGroup  = document.getElementById('faqAccordionGroup');
  const emptyState      = document.getElementById('faqEmptyState');
  const emptyQueryText  = document.getElementById('emptyQueryText');
  const resetSearchBtn  = document.getElementById('resetSearchBtn');
  const matchCountText  = document.getElementById('faqMatchCount');

  let activeCategory    = 'all';
  let searchQuery       = '';

  // ── Render FAQ Accordion List ─────────────────────────────────────────────
  function renderFAQ() {
    const q = searchQuery.trim().toLowerCase();

    // Filter items
    const filtered = FAQ_DATA.filter(item => {
      const matchCat = (activeCategory === 'all') || (item.category === activeCategory);
      if (!matchCat) return false;

      if (!q) return true;

      const inQ = item.question.toLowerCase().includes(q);
      const inA = item.answer.toLowerCase().includes(q);
      const inC = item.categoryLabel.toLowerCase().includes(q);
      return inQ || inA || inC;
    });

    // Update Match Count Badge
    if (matchCountText) {
      if (q || activeCategory !== 'all') {
        matchCountText.textContent = `${filtered.length} of ${FAQ_DATA.length} answers`;
      } else {
        matchCountText.textContent = `${FAQ_DATA.length} answers`;
      }
    }

    // Toggle Empty State vs List
    if (filtered.length === 0) {
      accordionGroup.style.display = 'none';
      emptyState.style.display = 'flex';
      if (emptyQueryText) {
        emptyQueryText.textContent = q ? `"${searchQuery}"` : 'the selected category';
      }
      return;
    }

    accordionGroup.style.display = 'flex';
    emptyState.style.display = 'none';

    // Helper for highlight
    function highlight(text, term) {
      if (!term) return text;
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<mark class="faq-highlight">$1</mark>');
    }

    accordionGroup.innerHTML = filtered.map((item) => {
      const isAutoExpanded = (filtered.length <= 2 && q.length > 1);
      const qHtml = q ? highlight(item.question, q) : item.question;
      const aHtml = q ? highlight(item.answer, q) : item.answer;

      return `
        <article class="faq-item ${isAutoExpanded ? 'is-expanded' : ''}" id="faq-${item.id}" data-category="${item.category}">
          <button
            type="button"
            class="faq-trigger"
            aria-expanded="${isAutoExpanded ? 'true' : 'false'}"
            aria-controls="faq-ans-${item.id}"
            id="faq-btn-${item.id}"
          >
            <div class="faq-trigger__question">
              <span class="faq-item__cat-pill">${item.categoryLabel}</span>
              <span>${qHtml}</span>
            </div>
            <div class="faq-trigger__icon" aria-hidden="true">
              <span class="material-icons-round" style="font-size:20px;">expand_more</span>
            </div>
          </button>
          <div
            class="faq-content"
            id="faq-ans-${item.id}"
            role="region"
            aria-labelledby="faq-btn-${item.id}"
            aria-hidden="${isAutoExpanded ? 'false' : 'true'}"
          >
            <div class="faq-content__inner">
              <div class="faq-answer-text">${aHtml}</div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach click listeners to accordion triggers
    accordionGroup.querySelectorAll('.faq-trigger').forEach(trigger => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.faq-item');
        const content = item.querySelector('.faq-content');
        const isCurrentlyExpanded = item.classList.contains('is-expanded');

        // Close others in non-search view for clean mobile reading
        if (!isCurrentlyExpanded && !q) {
          accordionGroup.querySelectorAll('.faq-item.is-expanded').forEach(other => {
            if (other !== item) {
              other.classList.remove('is-expanded');
              other.querySelector('.faq-trigger')?.setAttribute('aria-expanded', 'false');
              other.querySelector('.faq-content')?.setAttribute('aria-hidden', 'true');
            }
          });
        }

        // Toggle this item
        if (isCurrentlyExpanded) {
          item.classList.remove('is-expanded');
          trigger.setAttribute('aria-expanded', 'false');
          content?.setAttribute('aria-hidden', 'true');
        } else {
          item.classList.add('is-expanded');
          trigger.setAttribute('aria-expanded', 'true');
          content?.setAttribute('aria-hidden', 'false');
        }
      });
    });
  }

  // ── Search Input Event ────────────────────────────────────────────────────
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchQuery ? 'flex' : 'none';
      }
      renderFAQ();
    });
  }

  // Clear search button
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      renderFAQ();
    });
  }

  // Reset button in empty state
  if (resetSearchBtn) {
    resetSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      activeCategory = 'all';
      if (clearSearchBtn) clearSearchBtn.style.display = 'none';

      // Update chips UI
      chipContainer?.querySelectorAll('.chip').forEach(chip => {
        chip.classList.toggle('active', chip.getAttribute('data-category') === 'all');
      });

      renderFAQ();
    });
  }

  // ── Category Chip Filter Handling ─────────────────────────────────────────
  if (chipContainer) {
    chipContainer.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chipContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        activeCategory = chip.getAttribute('data-category') || 'all';
        renderFAQ();
      });
    });
  }

  // Initial Render
  renderFAQ();
});
