# StudyGen AI — Web Frontend

> **AI Powered Study Scanner & Smart Learning App**
> Scan · Learn · Revise · Succeed

---

## Technology Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (Vanilla — no frameworks) |
| Logic | Vanilla JavaScript (ES6+) |
| Icons | Google Material Icons Round |
| Fonts | Inter (Google Fonts) |

## How to Run

**No server required. Open directly in browser:**

```
Double-click:   index.html
```

Or open in VS Code and use the **Live Server** extension for auto-reload.

## Folder Structure

```
studygen-ai/
│
├── index.html              ← Splash screen (entry point)
│
├── pages/
│   ├── login.html          ← Login screen
│   ├── signup.html         ← Sign Up screen
│   ├── home.html           ← Home (main screen with bottom nav)
│   ├── scanner.html        ← Smart Document Scanner
│   ├── scan-preview.html   ← Scan Preview & Crop
│   ├── ai-study.html       ← AI Study Assistant
│   ├── ai-learning.html    ← AI Learning Features
│   ├── pdf-ai.html         ← PDF AI
│   ├── history.html        ← History
│   ├── profile.html        ← Profile
│   ├── settings.html       ← Settings
│   └── premium.html        ← Premium / Upgrade
│
├── css/
│   ├── style.css           ← Design tokens, base styles, layout, typography
│   ├── components.css      ← All reusable UI components
│   └── responsive.css      ← Mobile-first responsive breakpoints
│
├── js/
│   ├── app.js              ← Theme, language, auth, mock data, utilities
│   ├── navigation.js       ← Bottom nav, app bar, page transitions
│   ├── auth.js             ← Login/signup form logic (Phase 2)
│   ├── scanner.js          ← Scanner UI & camera logic (Phase 2)
│   ├── ai-study.js         ← AI output & quiz/flashcard logic (Phase 2)
│   ├── ai-learning.js      ← AI learning features logic (Phase 2)
│   ├── pdf-ai.js           ← PDF upload & AI actions (Phase 2)
│   ├── history.js          ← History filter & search (Phase 2)
│   ├── profile.js          ← Profile stats & actions (Phase 2)
│   └── settings.js         ← Settings toggles (Phase 2)
│
└── assets/
    ├── images/             ← App illustrations & screenshots
    ├── icons/              ← Custom icon SVGs
    └── logo/               ← StudyGen AI logo files
```

## Design System

### Color Palette
| Token | Value | Usage |
|---|---|---|
| Primary | `#3B7BF8` | Buttons, active nav, links |
| Primary Dark | `#2563EB` | Button hover/press |
| Secondary | `#7B52F4` | Purple accent, premium |
| Gradient Start | `#4A7CF6` | Banner gradient start |
| Gradient End | `#7B52F4` | Banner gradient end |
| Background | `#FFFFFF` | Screen background |
| Surface | `#F5F6FA` | Card background |
| Text Primary | `#1C1C1E` | Main text |
| Text Secondary | `#6B7280` | Secondary text |
| Success | `#34C759` | Green |
| Error | `#FF3B30` | Red |
| Warning | `#FF9500` | Orange |

### CSS Variables
All design tokens are CSS custom properties defined in `css/style.css`.
Dark mode is toggled via `[data-theme="dark"]` on `<html>`.

## Navigation Flow

```
index.html (Splash, 2.6s)
    ↓ auto
login.html ←→ signup.html
    ↓ (mock login)
home.html ──── Bottom Nav ──── [history, profile, settings]
    │
    ├──→ scanner.html → scan-preview.html → ai-study.html → ai-learning.html
    ├──→ pdf-ai.html
    ├──→ ai-study.html
    ├──→ ai-learning.html
    └──→ premium.html
```

## Features (Phase 1 — Complete)

- ✅ Design system (CSS variables, typography, spacing)
- ✅ Dark mode support (toggles via `[data-theme]`)
- ✅ Hindi/English language toggle support (`[data-lang]`)
- ✅ Bottom navigation component
- ✅ App bar component with scroll behavior
- ✅ Mock authentication (localStorage)
- ✅ Page transitions
- ✅ All 13 page stubs with working links
- ✅ Toast notification system
- ✅ Responsive (mobile-first, works on desktop)
- ✅ Safe area support (iPhone notch)
- ✅ Accessibility (ARIA labels, focus-visible)

## Important Rules

- ❌ No MongoDB / backend
- ❌ No API keys
- ❌ No React/Vue/Angular/TypeScript
- ✅ Pure HTML + CSS + Vanilla JavaScript
- ✅ Works directly in browser (no build step)
- ✅ Mobile-first responsive design
- ✅ Material Design 3 inspired visual style
