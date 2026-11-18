# ReEcap — Master Developer Handoff & Technical Context

> **Last Updated**: November 18, 2026  
> **Author & Project Owner**: lupel (`Roll No 25B11DS190`, Aditya University, B.Tech Data Science 2025–2029)  
> **Current Active Git Branch**: `nighttab` (Synced with `origin/nighttab`, HEAD commit `f4a241e`)  
> **Target Production URL**: `https://info.aec.edu.in/aus/` (Aditya University / AEC Student Portal)

---

## 1. Executive Summary & Core Philosophy

ReEcap is an open-source, client-side Manifest V3 Chrome extension designed to completely reskin and modernize the legacy ASP.NET WebForms portal of Aditya University (`https://info.aec.edu.in/aus/`) into a responsive, high-performance academic workstation.

### Inviolable Architectural Principles
1. **Zero Server Interruption**: Never modify ASP.NET form targets, postback logic (`__doPostBack`), hidden state fields (`__VIEWSTATE`, `__EVENTVALIDATION`), or session authentication. All enhancements are performed purely on the client-side via CSS token overrides, DOM decoration, and iframe orchestration.
2. **100% Faithful nightTab Design System**: The UI architecture, component specifications, color mathematics, elevation hierarchy, and preset catalog are faithfully translated from [zombieFox/nightTab](https://github.com/zombieFox/nightTab).
3. **Zero Unicode Emojis**: Strictly prohibited across all code, CSS, commit messages, comments, and agent outputs. Visual cues must use SVG iconography or semantic status chips.
4. **Identity Grounding**: The student user is recognized as **lupel** (`Roll No 25B11DS190`). The interface and Aria AI must always refer to the student directly as lupel.
5. **No Telemetry**: Completely private, client-side execution. Zero user tracking or external logging.

---

## 2. Repository & Branch State

- **Active Branch**: `nighttab`
- **Remote**: `https://github.com/lupixele/ReEcap.git`
- **Key Recent Commits**:
  - `f4a241e` — `fix(theme): unify nightTab theme propagation across portal DOM and iframes, resolve legacy theme conflicts, and fix Aria studentName error`
  - `8bd80a2` — `feat(theme): wire all 45 nightTab themes into GUI floating theme icon with search and category filters`
  - `59d89b8` — `feat(calendar): add full 8-semester academic calendar hub to sidebar and overview`
  - `b47b54f` — `fix(sidebar): restore route matching, fix sidebar link rendering, and refine masthead controls in nightTab theme`
  - `abfa714` — `feat(theme): implement full nightTab design system architecture with 45 presets and component overhaul`

---

## 3. Architecture & File Catalog

```
ReEcap/
├── extension/
│   ├── manifest.json          # Manifest V3 configuration, content scripts, permissions
│   ├── content.js             # Theme initialization, storage listeners, cross-frame message bridge
│   ├── decorators.js          # Core DOM transformations: Masthead, Sidebar, Overview, Calendar, Timetable
│   ├── style.css              # Main design system styles, layout overrides, component rules (8.3k+ lines)
│   ├── popup.html             # Browser-action extension popup UI
│   ├── popup.js               # Popup controller for presets, dark/light mode, radius, and shadows
│   ├── pdf_generator.js       # Revaluation answer script canvas stitcher & PDF downloader
│   ├── shared/
│   │   ├── aria.js            # Autonomous Aria AI assistant, offline academic engine, official calendar
│   │   ├── theme.js           # nightTab color engine: 45 presets, 14-shade math, sRGB luma, applyTheme
│   │   └── tokens.css         # nightTab CSS design tokens, shadows, auto-contrast formulas, semantic bridge
│   ├── lib/
│   │   └── jspdf.umd.min.js   # Vendor library for client-side PDF generation
│   └── icons/                 # Extension brand iconography (16, 32, 48, 64, 128px + SVG)
├── handoff.md                 # This authoritative technical handoff
├── context.md                 # Historical baseline context (July 2026)
├── CLAUDE.md                  # Development instructions & constraints
├── Readme.md                  # Public project documentation
└── proxy.py                   # Local mock/development proxy server
```

---

## 4. nightTab Design System Architecture

### 4.1 Mathematical 14-Shade HSL Color Engine
Each preset defines a base HSL range (`color.range.primary`) and a contrast range (`contrast.start` to `contrast.end`). The 14 shades are computed dynamically using:

$$L_i = \text{round}\left(\text{start} + \frac{\text{end} - \text{start}}{13} \times i\right) \quad \text{for } i \in [0, 13]$$

- **Dark Mode Mapping**: Shade 1 (`--theme-primary-010`) is the darkest background, scaling up to Shade 14 (`--theme-primary-140`) for borders and highlights.
- **Light Mode Mapping**: Inverted scale where `--theme-primary-010` maps to Shade 14 (lightest page background) down to Shade 1.

### 4.2 sRGB Luma Perceived Contrast Method
To prevent muddy or unreadable text, text lightness is calculated using ITU-R BT.709 perceived luminance constants:

$$\text{Luma} = \frac{0.2721 \times R + 0.7152 \times G + 0.1255 \times B}{255}$$

In CSS tokens, contrast evaluates dynamically:
```css
--theme-primary-text-010: 0, 0%, calc(((((var(--theme-primary-1-r) * var(--theme-t-r)) + (var(--theme-primary-1-g) * var(--theme-t-g)) + (var(--theme-primary-1-b) * var(--theme-t-b))) / 255) - var(--theme-t)) * -10000000%);
```
If luminance is above the threshold `0.55`, the multiplier clamps text lightness to `0%` (black); if below, it clamps to `100%` (white).

### 4.3 4-Layer Directional Elevation Shadows
Replaced flat drop shadows with nightTab's 4-layer directional elevation physics:
```css
--theme-shadow-bottom-small:
  0 calc(var(--theme-shadow-size-small) * 2 * var(--theme-shadow-offset-y)) calc(var(--theme-shadow-size-small) * 4 * var(--theme-shadow-blur)) rgba(0, 0, 0, calc(var(--theme-shadow-size-small) * 1 * var(--theme-shadow-opacity))),
  0 calc(var(--theme-shadow-size-small) * 4 * var(--theme-shadow-offset-y)) calc(var(--theme-shadow-size-small) * 8 * var(--theme-shadow-blur)) rgba(0, 0, 0, calc(var(--theme-shadow-size-small) * 2 * var(--theme-shadow-opacity))),
  0 calc(var(--theme-shadow-size-small) * 8 * var(--theme-shadow-offset-y)) calc(var(--theme-shadow-size-small) * 16 * var(--theme-shadow-blur)) rgba(0, 0, 0, calc(var(--theme-shadow-size-small) * 3 * var(--theme-shadow-opacity))),
  0 calc(var(--theme-shadow-size-small) * 16 * var(--theme-shadow-offset-y)) calc(var(--theme-shadow-size-small) * 32 * var(--theme-shadow-blur)) rgba(0, 0, 0, calc(var(--theme-shadow-size-small) * 4 * var(--theme-shadow-opacity)));
```

### 4.4 Complete 45-Preset Catalog
Organized into 6 thematic categories:
1. **Core & Modern**: `app` (default nightTab blue), `nord`, `obsidian`, `paper`, `gruvbox`, `dracula`, `solarized`, `tokyo`.
2. **Minimal & Nordic**: `minimal-light`, `minimal-dark`, `snow`, `mist`, `slate`, `mono`, `ash`, `quartz`.
3. **Cyberpunk & Neon**: `outrun`, `neon`, `cyber`, `matrix`, `synthwave`, `laser`, `vapor`.
4. **Space & Midnight**: `midnight`, `deepspace`, `galaxy`, `eclipse`, `void`, `black` (true AMOLED), `nebula`.
5. **Organic & Earth**: `mint`, `forest`, `terra` (warm coffee/cappuccino), `sage`, `desert`, `autumn`, `clay`, `moss`.
6. **Vivid & Creative**: `acrid` (plum & electric lime), `sol` (solar gold), `koto` (mauve rosewood), `candy`, `sunset`, `ocean`, `white` (clean daylight).

---

## 5. UI Architecture & Components

### 5.1 Masthead (`.masthead`)
- ReEcap brand block with responsive accent underline.
- Teacher top navigation tabs extracted from legacy `#tblModules`.
- Student Greeting: sanitized to `Hi, lupel` (cleans out raw ASP.NET `"Hi...GURALA RATAN TEJA"` strings).
- Aria AI quick launcher pill button (`#reecap-aria-masthead-btn`).
- Native ASP.NET Change Password and Logout action pills preserved.

### 5.2 Sidebar Navigation (`#reecap-sidebar`, `ul.menu`)
- Converted from a raw table into an accessible semantic accordion.
- Categorized sections: `Academics`, `Examinations`, `Finance`, `Account`, `Services`.
- **Dynamic Active Route Matching**: Driven by `ROUTE_TAILS` in [theme.js](file:///p:/Magnanimity/Projects/ReEcap/extension/shared/theme.js), checking the active URL or iframe path against 22 distinct route tails (e.g. `studentattendance.aspx`, `studentmarksreport.aspx`, `studentprofile.aspx`).
- Collapsible section headers with SVG chevrons and smooth grid-template animations.

### 5.3 Overview Dashboard (`#reecap-overview`)
Rendered when the portal is in overview mode (`data-overview-active="true"`):
- **Hero Status Strip (`.reecap-status-strip`)**:
  - Displays countdown and room details for the student's next class (e.g., `NEXT: Probability & Statistics • Starts at 01:00 PM • Billgates Bhavan, BGB-309`).
  - Active student identity display: `25B11DS190 • B.Tech • III Semester- 2025`.
  - Tabular monospace live clock with day and date.
- **Metrics Grid (`.overview-section-metrics`)**:
  - Attendance Ring: SVG circular progress meter showing live percentage (e.g., `78.2%`) with status indicators.
  - Active Backlogs Card: shows verified arrears count (e.g., `0 Backlogs • Academic standing in good health`).
  - Term Fees Card: displays outstanding balance and active `Pay Online` action button.
- **Split Content Row (`.overview-main-split`)**:
  - Left column: **Today's Schedule** showing subject periods, room codes, faculty names, and active period highlight.
  - Right column: **Semester III Calendar Widget** showing current upcoming exams and a direct action link to `View All 8 Semesters`.

### 5.4 Official 8-Semester Academic Calendar Hub (`#reecap-calendar-view`)
- **Data Source**: Official schedule extracted from Aditya University batch calendar (`ADITYA_ACADEMIC_CALENDAR` in [aria.js](file:///p:/Magnanimity/Projects/ReEcap/extension/shared/aria.js)).
- **Semesters Available**: Semesters I through VIII, plus Summer-2027 and Summer-2028 terms.
- **Active Semester Highlights (Semester III)**:
  - `SEE Theory Examinations`: `16.11.2026 — 28.11.2026` (`In Progress` status pill).
  - `Declaration of Results`: `12.12.2026` (`Scheduled`).
  - `SEE Script Viewing & Revaluation`: `12.12.2026 — 16.12.2026`.
  - `Commencement of IV Semester`: `30.11.2026`.
- **Features**:
  - Live search input filtering activities, dates, and terms.
  - Semester switcher tab pills (`Sem I` through `Sem VIII`).
  - Dual-path access: accessible directly from the sidebar `Academics -> Academic Calendar` or when navigating to `academiccalenderreport.aspx`.

### 5.5 Floating GUI Theme Toolbar (`#reecap-theme-toolbar`)
- 48px floating FAB at bottom-right of portal page with palette SVG icon.
- Interactive flyout menu featuring:
  - Dark / Light style toggle buttons with SVG sun/moon icons.
  - Instant live search bar (`#toolbar-theme-search`).
  - 6 Category filter pills (`All`, `Core`, `Minimal`, `Cyber`, `Space`, `Earth`, `Vivid`).
  - All 45 preset buttons with live accent color swatches, titles, and category tags.
  - Clicking any theme immediately updates the parent DOM, notifies the active iframe via `postMessage`, and syncs to `chrome.storage.sync`.

### 5.6 Digital-Material Timetable Grid
- 12-color per-subject hashed palette using DJB2 hash of course code.
- Merged continuous class blocks spanning multiple periods.
- Responsive mobile card view for small viewports.
- Bottom legend chips for quick subject reference.

### 5.7 Answer Script PDF Downloader (`pdf_generator.js`)
- Injected on `RevalutionScriptViewer.aspx`.
- Automatically observes canvas rendering of student exam booklets.
- Stitches multi-page canvas slices into a high-resolution, downloadable PDF using bundled `jspdf.umd.min.js`.

---

## 6. Autonomous Aria AI Co-Pilot (`shared/aria.js`)

Aria is an autonomous portal co-pilot embedded directly into ReEcap.

### 6.1 Endpoint Configuration
- **Primary Edge LLM**: `https://aria.lupixele.online/api/chat`
- **Default Model**: `lupixele/aura-super`
- **Local Fallback Engine**: Fully deterministic offline intelligence built into [aria.js](file:///p:/Magnanimity/Projects/ReEcap/extension/shared/aria.js) that activates automatically if the edge endpoint is unreachable.

### 6.2 Knowledge & Role Capabilities
1. **Academic Advisor**: Analyzes student dossier (CGPA, SGPA, grades per course), identifies weak subjects (grades B or below, e.g. Digital Logic Design, Basic Electrical Engineering), and recommends SGPA targets.
2. **Attendance Strategist**: Calculates exact bunk margins using the Aditya University 75% attendance rule:
   - Safe bunk calculation: $\lfloor(A - 0.75 \times H) / 0.75\rfloor$
   - Shortage classes needed: $\lceil 3H - 4A \rceil$
3. **Portal Navigator**: Emits interactive action chips in text:
   - `[action:nav:attendance|View Attendance Breakdown]`
   - `[action:nav:marks|Check Complete Marks Report]`
   - `[action:nav:calendar|Open Academic Calendar]`
   - `[action:nav:timetable|Open Full Timetable]`
   - `[action:nav:fees|Go to Fee Payment]`
   - `[action:nav:examviewer|View Exam Answer Scripts]`
4. **Current Term Schedule Intelligence**: Dynamically references Semester III schedule dates from `ADITYA_ACADEMIC_CALENDAR`.

---

## 7. Storage Schema & Cross-Frame Synchronization

Storage is managed via `chrome.storage.sync` with automatic migration from legacy versions:

```typescript
interface ReEcapStorage {
  enabled: boolean;          // Master toggle for ReEcap extensions
  nightTabPreset: string;    // Active nightTab preset ID (e.g., 'app', 'acrid', 'nord')
  nightTabStyle: 'dark' | 'light'; // Active style mode
  nightTabRadius: number;    // Corner radius factor (0 - 100, default 25)
  nightTabShadow: number;    // Shadow depth factor (0 - 100, default 75)
  themeFamily: string;       // Backward compatibility alias for nightTabPreset
  themeMode: 'dark' | 'light'; // Backward compatibility alias for nightTabStyle
}
```

### Multi-Frame Synchronization Pipeline
1. When theme is changed in `popup.js` or GUI toolbar:
   - `applyTheme(preset, style, options)` executes immediately on `window.document.documentElement`.
   - `chrome.storage.sync.set(...)` persists the settings.
   - Top-level window queries `#capIframeId` and dispatches `postMessage({ type: 'REECAP_NIGHTTAB_PRESET', ... }, '*')`.
2. Inside iframes:
   - `content.js` listens to `window.addEventListener('message')` and immediately invokes `applyTheme()` on the iframe document without page refresh.
   - `chrome.storage.onChanged` serves as a reliable secondary sync across background tabs.

---

## 8. Resolved Bugs & Solutions Log

| Issue | Root Cause | Solution |
|---|---|---|
| **Aria AI Crash** | `shared/aria.js:1028` used `${studentName}` inside `buildSystemPrompt()`, but only `studentDisplayName` was declared. | Declared `const studentName = studentDisplayName;` and verified prompt generation with Node. |
| **Theme Not Applying to Portal UI** | `applyTheme()` only set raw `--theme-primary-1..14` channels without computing semantic variables (`--surface-page`, `--surface-card`, `--accent`), and `manifest.json` lacked content script CSS. | Enhanced `applyTheme()` to calculate and set all semantic tokens directly on `root.style`. Added native `"css": ["shared/tokens.css", "style.css"]` in `manifest.json`. |
| **Undefined Storage Crash in Migration** | `migrateThemeStorage()` returned `{ preset, style }`, but callers accessed `mapped.family` and `mapped.mode`, writing `undefined` to `chrome.storage.sync`. | Updated `migrateThemeStorage()` to return unified objects with `{ preset, style, family, mode, radius, shadow }`. |
| **Iframe Theme Desynchronization** | Popups and toolbar only styled `window.top`; iframes stayed on previous or unstyled themes. | Implemented cross-frame `postMessage` relay in `content.js` and `decorators.js` to update child iframes in real-time. |
| **Missing Page Background Token** | `style.css` referenced `var(--surface-page-glow)` on `body`, but the variable was missing from `tokens.css`. | Defined `--surface-page-glow: var(--surface-page);` and `--surface-bg: var(--surface-page);` in `tokens.css`. |
| **Sidebar Route Table Missing** | `ROUTE_TAILS` was accidentally dropped in an earlier refactor, causing `routeKeyForHref()` to throw `TypeError` and blank out the sidebar. | Restored full 22-route tail lookup table and safe helper fallbacks in `shared/theme.js`. |
| **Masthead Double Buttons** | Tablet screens rendered both desktop collapse and mobile hamburger buttons. | Added responsive media queries in `style.css` hiding `.mobile-menu-btn` at $\ge 1200\text{px}$ and `.sidebar-collapse-btn` at $< 1200\text{px}$. |

---

## 9. Development, Testing & Verification Guide

### 9.1 Local Testing in Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the directory: `p:\Magnanimity\Projects\ReEcap\extension`.
4. Navigate to `https://info.aec.edu.in/aus/StudentMaster.aspx`.
5. Test preset switching from both the extension popup and the bottom-right floating GUI toolbar.
6. Test navigation between Overview, Academic Calendar Hub, Attendance, Marks, and Fees.
7. Open Aria AI (`Ctrl + /` or masthead button) and test queries like `"when are exams?"` or `"how is my attendance?"`.

### 9.2 Automated Verification Script
Run the automated test script to verify syntax, preset calculations, storage migration, and zero emojis:
```powershell
node "C:\Users\lupixele\.gemini\antigravity\brain\791d06e4-b070-4174-88aa-8101ece579d0\scratch\verify_all.js"
```

### 9.3 Git Conventions
- Always commit to branch `nighttab` unless instructed otherwise.
- Strictly **zero emojis** in commit messages.
- Always run `git status` and verify syntax before committing.
