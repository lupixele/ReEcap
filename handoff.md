# 𝚁𝚎𝙴𝚌𝚊𝚙"/ — Comprehensive Developer Handoff

> **Last Updated:** 2026-11-18  
> **Active Branch:** `main`  
> **Remote Repository:** `https://github.com/lupixele/ReEcap.git`  
> **Brand Name:** `𝚁𝚎𝙴𝚌𝚊𝚙"/`  
> **Default Theme Preset:** `point` (Point — Dark)

---

## 1. Executive Summary & Invariants

**𝚁𝚎𝙴𝚌𝚊𝚙"/** is a Manifest V3 Chrome extension that modernizes and redesigns the Aditya University ECAP ERP student portal (`https://info.aec.edu.in/aus/`) using the nightTab design system aesthetic.

### Core Engineering Invariants
- **Strictly Client-Side Enhancement**: All modifications execute in the browser without modifying backend ASP.NET WebForms architecture.
- **Native Postback & State Integrity**: Never break or bypass ASP.NET `__VIEWSTATE`, `__EVENTVALIDATION`, form actions, or AJAX UpdatePanels.
- **Data Integrity & Non-Fabrication**: Never invent, guess, mock, or fabricate financial ledgers, grades, attendance figures, or academic records. If a native module is unavailable, present clear in-UI status cards while keeping native fallback paths operable.
- **nightTab Design System Fidelity**: Use the official 45 nightTab presets, mathematical color spaces, and semantic design tokens (`--surface-elevated`, `--surface-card`, `--surface-sunken`, `--text-primary`, `--text-secondary`, `--border-subtle`, `--accent`, `--radius-*`, `--shadow-*`). Do not invent synthetic light/dark variations.
- **Default Theme 'Point'**: The system defaults to the `point` preset (Point — Dark with vivid purple/blue accent) instead of nightTab's generic `app`.
- **Zero Hardcoded Personal Identifiers**: Extract student names and roll numbers dynamically at runtime; scrub all personal data from version-controlled files, commit histories, fixtures, and tests.
- **Zero Unicode Emojis**: Use clean inline SVG icons rather than Unicode emojis across the UI, code comments, and documentation.
- **Brand Consistency**: The brand name is strictly styled everywhere in user-facing UI as `𝚁𝚎𝙴𝚌𝚊𝚙"/` (Mathematical Monospace string `\u{1D681}\u{1D68E}\u{1D674}\u{1D68C}\u{1D68A}\u{1D699}"/`).
- **Standardized Academic Terminology**: Colloquial terms such as "bunk", "bunking", "bunk buffer", or "bunk simulator" are strictly forbidden. The system exclusively uses "skipping classes", "attendance buffer", "class margin", and "skipping classes margin".

---

## 2. Shell & Viewport Architecture

### Flush Sidebar Wall & Top-Bar Docking Architecture
- **Zero-Margin Shell Container**:
  - `body[data-reecap-master="true"] > form > center > div` and `body.bodyStyle > form > center > div` expanded from max 1536px box with 24px padding and `margin: 0 auto` to full-bleed `width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important;`.
  - Added `enforceFlushWallDock()` in [extension/decorators.js](file:///p:/Magnanimity/Projects/ReEcap/extension/decorators.js) to programmatically clear ASP.NET server-rendered `align="center"` attributes on `<center>` and `<div>` and enforce `text-align: left; margin: 0; padding: 0`.
- **Flush Top Bar Masthead**:
  - `.masthead` sits directly at the top with `margin: 0 !important; border-radius: 0 !important; border-bottom: 1px solid var(--border-light) !important; padding: 8px 16px !important;`.
  - Zero vertical gap exists between the bottom of the masthead and the top of the sidebar and content columns.
- **Wall-Docked Sidebar Column (`.reecap-sidebar-col`)**:
  - Docks flush to the left wall (`left: 0 !important; margin: 0 !important; padding: 0 !important; border-radius: 0 !important;`).
  - Styled with `border-right: 1px solid var(--border-light) !important; background-color: hsl(var(--theme-primary-010)) !important;`.
  - The inner `ul.menu` is stripped of floating card borders, rounded corners, and card drop-shadows (`border: none !important; border-radius: 0 !important; box-shadow: none !important; margin: 0 !important; padding: 12px 10px !important; background: transparent !important;`).
- **Zero-Gap Layout Grid & Spacious Content Area**:
  - `.reecap-layout-columns` removes the previous 28px gap (`gap: 0 !important; grid-template-columns: 248px minmax(0, 1fr) !important;`).
  - `.reecap-content-col` expands to consume all remaining screen width, internally cushioned with `padding: 24px 32px 36px 32px !important;` so cards have ample breathing room.
- **Collapsible Sidebar Toggle Support & Smooth 300ms Animation**:
  - Masthead houses `#reecap-sidebar-toggle-btn` which toggles `document.documentElement.classList.toggle('is-sidebar-collapsed')`.
  - In collapsed state (`html.is-sidebar-collapsed`), `.reecap-layout-columns` collapses the sidebar track from `248px` to `0px` with a smooth 300ms transition (`transition: grid-template-columns 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;`).
  - **Content Track Pinned**: To prevent CSS Grid track shifting where child #1 was squeezed into the 0px track, `.reecap-sidebar-col` is maintained in track 1 with `width: 0 !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; border-right-color: transparent !important; overflow: hidden !important;` (never `display: none`), while `.reecap-content-col` is explicitly pinned to `grid-column: 2 !important; width: 100% !important; min-width: 0 !important;`.
  - Inner `ul.menu` is pinned to `min-width: 248px !important;` so menu titles do not wrap or stutter during width interpolation.
  - A 320ms `requestAnimationFrame` loop dispatches window `resize` events and `REECAP_REQUEST_RESIZE` postMessages to embedded child iframes to synchronize internal layout.
  - Sidebar collapse state is persisted across student portal navigations via `localStorage.getItem('reecap_sidebar_collapsed')`.
- **Independent Scroll Containers**:
  - **Sidebar Column** (`.reecap-sidebar-col` / `ul.menu`): Isolated vertical scrollbar with custom nightTab styling.
  - **Content Column** (`.reecap-content-col`): Dedicated content scroll container fitted with `overscroll-behavior: contain`.
  - Hovering and scrolling inside either container moves that container exclusively without window jitter.
- **Child Iframe Wheel Forwarding**:
  - Embedded iframes forward wheel deltas via `window.parent.postMessage({ type: 'REECAP_CONTENT_WHEEL', deltaY, deltaMode }, '*')` for smooth unified scrolling.
- **Mobile Responsiveness**: Viewports `<= 1199px` revert smoothly to an off-canvas drawer navigation.

---

## 3. Brand Identity & Login Page Redesign

### Mathematical Monospace Brand Title (`𝚁𝚎𝙴𝚌𝚊𝚙"/`)
- **Login Page (`default.aspx`)**:
  - The generic ECAP login header and decorative art are hidden, replaced by a centered, modern nightTab card.
  - Displays the brand wordmark:
    ```html
    <h1 class="reecap-login-wordmark">𝚁𝚎𝙴𝚌𝚊𝚙"/</h1>
    ```
  - Formatted with `font-family: var(--font-mono, monospace), system-ui, sans-serif !important; font-size: 28px !important; letter-spacing: 0.02em !important;`.
  - Screen readers are provided an accessible hidden heading:
    ```html
    <h1 class="visually-hidden-head">𝚁𝚎𝙴𝚌𝚊𝚙"/ sign in</h1>
    ```
  - Role selection radio buttons default smoothly to "Student" with persistent role selection memory in `chrome.storage.sync`.
- **Portal Masthead & Extension Popup**:
  - In the masthead, renders a unified brand title `<h1 class="brand-title"><span class="brand-title-main">𝚁𝚎𝙴𝚌𝚊𝚙"/</span> <span class="brand-title-sub">ー 𝚊𝚗 𝚄𝚗𝚘𝚏𝚏𝚒𝚌𝚒𝚊𝚕 𝚁𝚎𝚍𝚎𝚜𝚒𝚐𝚗 𝚘𝚏 𝙰𝚍𝚒𝚝𝚢𝚊 𝚄𝚗𝚒𝚟𝚎𝚛𝚜𝚒𝚝𝚢 𝙴𝚌𝚊𝚙 𝚂𝚝𝚞𝚍𝚎𝚗𝚝 𝙿𝚘𝚛𝚝𝚊𝚕</span></h1>`, eliminating the previous separate small eyebrow and styling the tagline in `var(--accent)` (the exact accent color previously applied to the eyebrow).
  - Popup `<title>` is `𝚁𝚎𝙴𝚌𝚊𝚙"/ — nightTab Settings`.
  - Master switch button tooltip: `Toggle 𝚁𝚎𝙴𝚌𝚊𝚙"/ Extension`.
  - Extension `manifest.json` declares `"name": "𝚁𝚎𝙴𝚌𝚊𝚙\"/"` and `"default_title": "𝚁𝚎𝙴𝚌𝚊𝚙\"/"`.
- **Dynamic Student Name Greeting & Rightmost Profile Card (`.user-profile-badge`)**:
  - Extracts student name dynamically from `#lblUser` or DOM nodes, normalizing uppercase strings into proper Title Case.
  - Omitted the informal "Hi," greeting prefix per user preference.
  - The profile card is docked at the absolute rightmost position of the masthead (`.user-cluster`).
  - Left column: The profile avatar photo (`#imgstudent` / `.user-avatar`, or `.user-avatar-placeholder` fallback).
  - Right column: A dedicated vertical 2-row CSS grid (`.user-meta-grid`) housing the student's name centered above (`.user-name`) and the logout action centered directly below (`#lnkLogOut` / `.user-logout-btn`) as a nightTab pill button equipped with an enlarged 14px Feather log-out SVG icon, 11.5px monospace typography, and a 4px gap that aligns with the avatar photo height.
  - Action pills (`Aria AI`, `Change Password`) remain cleanly organized to the left of the profile card.

---

## 4. Navigation Architecture & Categorization

The native ECAP tree menu (`#MenuLink*` / `.menuLink`) is parsed and reorganized into four accordion sections with zero item duplication:

```
Navigation
├── Overview (Dedicated top hero item for students)
├── Academics
│   ├── Academic Calendar
│   ├── Attendance
│   ├── Timetable (Consolidated from Choose Timetable / Time Table)
│   ├── Course Registration
│   ├── Marks (Student Marks Report)
│   ├── Lesson Plan
│   ├── Exams Details
│   ├── Hallticket
│   ├── View Answer Sheet
│   ├── View Exam Paper
│   └── Backlogs (Standalone backlogs ledger)
├── Finance
│   ├── Fee Details (Standalone fee ledger & breakdown)
│   ├── College Fee
│   ├── Exam Fee
│   ├── Re-Valuation
│   ├── Online Transactions
│   └── Receipts (Sanitized student receipts)
├── Profile
│   ├── Bio-Data (#divProfile_BioData)
│   ├── Performance (#divProfile_Present)
│   ├── Past Performance (#divProfile_Past)
│   ├── Outings (#divProfile_Outings)
│   ├── Counseling (#divProfile_Counseling)
│   └── Disciplinary Action (#divProfile_DisciplinaryAction)
└── Account
    ├── Hostel Room Booking
    ├── Library Books
    └── Book Search
```

### Strict Non-Duplication Rule
- Duplicate sub-items previously found inside Student Profile tabs (such as Backlogs and Fee Details) are omitted from the Profile accordion group because they are already authoritative items under `Academics` and `Finance`.
- Clicking Profile sub-items executes instant in-page tab switching via `REECAP_SWITCH_TAB` postMessage when `StudentProfile.aspx` is active, avoiding full iframe reloads.
- The horizontal profile tab bar (`#reecap-profile-dashboard`) is completely suppressed inside the embedded shell to avoid redundant navigation.

---

## 5. Standalone Views & Dedicated Routing

### Dedicated Fee Details View (`data-fee-only-view="true"`)
- Navigating to Fee Details from the sidebar, Overview, or Aria action chips opens `Academics/StudentProfile.aspx?scrid=17&view=fee#divProfile_Fees`.
- The child document activates `data-fee-only-view="true"`, completely suppressing student bio data, personal information tables, and profile tab headers.
- Displays exclusively the student fee ledger, active term hero meter, semester fee breakdown cards, and official online payment gateway triggers.

### Standalone Backlogs View
- Navigating to Backlogs loads `Academics/studentbacklogs.aspx`.
- If the student has zero backlogs or the portal renders an empty table/error state, 𝚁𝚎𝙴𝚌𝚊𝚙"/ renders the "Clean Academic Record" dashboard displaying passing statistics and zero arrears.

### Academic Calendar Hub
- Live milestone dashboard featuring semester start dates, Mid-Term (Internal) Examinations I & II, fee payment windows, and Semester End Examinations (SEE Theory and Lab) for the 2025–2029 batch.
- Accessible directly from the sidebar or via one-click navigation links from error recovery cards.

---

## 6. Universal Alert Interceptor & In-UI Error Handling

### Problem & Root Cause
When navigating to restricted portal modules like Exam Details (`StudentExamDetails.aspx`), IIS returns an HTTP 401 Unauthorized XHTML error page:
```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" ...>
<title>401 - Unauthorized: Access is denied due to invalid credentials.</title>
```
Vanilla ECAP and ASP.NET AJAX (`Sys.WebForms.PageRequestManager`) caught this response and invoked native browser `window.alert(...)`, popping up a raw modal containing unformatted HTML markup.

### Solution Architecture
1. **Main World Alert Interceptor**:
   - Injected synchronously at `document_start` into `document.documentElement` before any page scripts or ASP.NET AJAX libraries parse.
   - Bypasses injection on `default.aspx` to prevent Chrome inline script CSP violations.
   - Overrides `window.alert(...)` in the Main World. If the message matches `<!DOCTYPE`, `<html`, `401 - Unauthorized`, `Access is denied`, `Server Error`, or `Sys.WebForms`, the native dialog is suppressed and a custom DOM event (`REECAP_SUPPRESSED_ALERT`) is dispatched.
2. **ASP.NET AJAX Hook**:
   - Hooks into `Sys.WebForms.PageRequestManager.getInstance().add_endRequest()`. If an asynchronous postback error contains raw HTML error strings, calls `args.set_errorHandled(true)` to prevent ASP.NET from alerting.
3. **Isolated World Interception**:
   - Overrides `window.alert(...)` inside the content script context and listens for `REECAP_SUPPRESSED_ALERT`.
4. **In-UI nightTab Error Recovery Hero Card**:
   - Replaces the suppressed alert with an elegant, centered nightTab card inside the active view (child iframe or parent shell):
     - **Status Badge**: `401 • UNAUTHORIZED ACCESS` in `--error-soft` pill style.
     - **Title**: `Exam Details Temporarily Restricted`.
     - **Explanation**: Explains that student login credentials are valid, but access to this endpoint is restricted by the university exam cell until official publication windows open.
     - **Info Callout**: Explains that examination schedules and fee windows are accessible in the Academic Calendar.
     - **Action Buttons**: Reload View, Academic Calendar, and Return to Overview.

---

## 7. Receipts Page Theme Leak Elimination

### Problem
`Feepayments/studentreceipts.aspx` loads Microsoft AjaxControlToolkit TabContainers that inject inline stylesheets and hardcoded background gradients (`#70b4e6`, `#5dade2`) and blue borders on every postback, leaking bright cyan colors into dark themes.

### Solution
- Injected high-specificity stylesheet `<style id="reecap-receipts-aggressive-override">` into the document head.
- Implemented `sanitizeReceiptsTheme()` in [extension/decorators.js](file:///p:/Magnanimity/Projects/ReEcap/extension/decorators.js):
  - Traverses `.ajax__tab_container`, `.ajax__tab_xp`, `.ajax__tab_header`, `.ajax__tab_tab`, `.ajax__tab_active`, and `.ajax__tab_body`.
  - Strips inline cyan/blue background and border styles, replacing them with semantic tokens (`var(--surface-elevated)`, `var(--border-subtle)`, `var(--text-primary)`).
  - Attached a MutationObserver to re-sanitize dynamically following asynchronous tab changes or partial postbacks.

---

## 8. Timetable Tooltip Boundary Protection & Legend Removal

### Problem
Hovering or focusing subjects in the top two rows of the timetable (Monday and Tuesday) caused tooltips to render upward, clipping against the top boundary of the timetable container (`.tt-grid-wrap`).

### Solution
- Added `.tt-class.tt-tooltip-below` CSS rules with inverted pointer arrows to orient upper row tooltips downward.
- Implemented dynamic collision detection in [extension/decorators.js](file:///p:/Magnanimity/Projects/ReEcap/extension/decorators.js): on `mouseenter` and `focusin`, computes `rect.top` against the `.tt-grid-wrap` boundary. If clearance is less than 90px, automatically applies `tt-tooltip-below`.
- Removed the redundant "Color Guide / Know Your Subjects" legend section from the timetable view per user preference.

---

## 9. Accurate Content Height & Empty Scroll Elimination

### Problem
Short child pages generated blank trailing space due to reading `document.documentElement.scrollHeight` inside iframes styled with `height: 100%`, causing height ratcheting.

### Solution
- Re-architected `getTrueContentHeight()` in [extension/decorators.js](file:///p:/Magnanimity/Projects/ReEcap/extension/decorators.js):
  - Scans visible content elements (`.reecap-timetable`, `#reecap-profile-dashboard`, `.card`, `table`, `.reecap-receipt-clean-table`, `form`).
  - Computes true physical bottom boundary using `rect.bottom + window.scrollY`.
  - Ignores legacy ASP.NET 1000px/2000px spacer elements.
  - Sends exact content heights via `REECAP_RESIZE` postMessage, eliminating trailing blank scroll space across all pages.

---

## 10. Aria AI Academic Assistant Integration

- **Dossier Extraction**: Silently scans and compiles student attendance rates, internal marks, backlogs, and term timelines into an in-memory academic dossier.
- **Sidecar Panel**: Accessible via the masthead pill or theme toolbar, opening a dedicated side-panel assistant with conversational chat.
- **Header Actions Restructuring**:
  - Eliminated the redundant "Refresh Telemetry" button.
  - Header houses strictly two crystal-clear controls:
    1. `#aria-clear-chat`: Clear conversation (Trash icon) with tooltip `Clear conversation`.
    2. `.aria-close-btn`: Close Aria (X icon) with tooltip `Close Aria`.
  - Fixed icon clipping and borders: all header buttons have transparent backgrounds, no borders, and visible SVG strokes.
- **Streamlined Minimalist Composer**:
  - Eliminated UI clutter: removed "Aura Super" model badge, "ERP Live" context pill, and keyboard shortcut footer hints.
  - Composer is structured as a single clean row container (`.prompt-bar-container`) housing exclusively the auto-resizing prompt textarea and a unified Send/Stop button.
- **Adaptive Send / Stop Button State Machine**:
  - **Idle State**: Circular 32px pill displaying white SVG send arrow (`.icon-send`). Disabled when empty; active with `--accent` when text is input.
  - **Generating State**: Morphs into a Stop button (`.prompt-send-pill.is-stop`) with error accent (`var(--error, #ef4444)`), displaying a solid white SVG stop square (`.icon-stop`).
  - **Instant Cancellation**: Clicking Stop triggers `stopAriaGeneration()`, passing an abort signal to `AbortController`, cancelling the reader stream, settling active thinking traces, and keeping any partial text intact.
  - **CSS Specificity Lock**: Button is explicitly exempted from greedy global nightTab button styles (`button:not(...)`), ensuring a perfect 32px circular pill without orange borders or squashed SVGs.
- **Helper Card Auto-Dismissal Lifecycle**:
  - The "Academic Co-Pilot Ready" hero card displays initial student metrics (CGPA, attendance, backlogs) on an empty conversation.
  - Upon submitting the first prompt, all welcome card DOM nodes (`.aria-welcome-hero`, `.aria-welcome-card`) and suggestions are immediately dismissed from the chat thread.
  - Clearing the chat via `#aria-clear-chat` restores the initial welcome card and suggestion shelf.
- **Action Routing & Safe Terminology**:
  - Action chip for attendance margin is `data-action="skip_sim"` (`<span class="chip-label">Skipping Classes Margin</span>`).
  - Both `skip_sim` and `bunk_sim` triggers are supported internally and submit `"How is my attendance in each subject, and how many classes can I safely skip?"`.
  - Fee ledger routing (`data-action="nav:fees"`) invokes `navigateToFeeDetails()` and activates `#divProfile_Fees` with `&view=fee`.
- **Markdown & Math Rendering**: Full streaming markdown parser in [extension/shared/aria.js](file:///p:/Magnanimity/Projects/ReEcap/extension/shared/aria.js) supporting headings, nested lists, task lists, tables, fenced code blocks with copy actions, LaTeX KaTeX formulas, and interactive action chips.

---

## 11. Rich Floating Theme Toolbar (`reecap-theme-toolbar`)

Ported the complete rich theme customizer from the extension popup directly into the floating theme toolbar icon on every portal page:

### Capabilities
- **2-Column Swatch Grid (`.toolbar-presets-grid`)**:
  - Structured strictly as a 2-column grid (`grid-template-columns: repeat(2, 1fr) !important;`) matching the 380px extension popup for optimal card width and typography preview readability.
  - Renders all 45 nightTab presets with live typography swatches (`Aa`) and accent indicator dots.
  - Cards implemented as accessible `div` elements (`role="button"`, `tabindex="0"`) with keyboard `Enter`/`Space` activation and `e.stopPropagation()` handlers.
  - Highlights the currently active preset with an accent ring.
- **Brand Header & Controls (`.toolbar-header`)**:
  - Displays brand icon, brand title `𝚁𝚎𝙴𝚌𝚊𝚙"/`, subtitle `nightTab Design System`, and a dedicated close button (`.toolbar-close-btn`).
- **Appearance Filter Segment (`.toolbar-mode-segment`)**:
  - Three filter options: `[All]`, `[Dark]`, and `[Light]`.
  - Real-time preset counter displaying visible count (e.g., `45 / 45`, `35 / 45`, `10 / 45`).
- **Live Preset Search (`.toolbar-theme-search`)**:
  - Real-time instant search across preset names and IDs with immediate grid filtering.
- **Geometry & Elevation Sliders (`.toolbar-tuning-box`)**:
  - **Corner Radius**: `0px` to `100px` range slider with real-time value readout.
  - **Elevation Shadows**: `0%` to `200%` range slider with real-time percentage readout.
  - Sliders immediately invoke `themeEngine.applyTheme()` and persist values to `chrome.storage.sync` (`nightTabRadius`, `nightTabShadow`), broadcasting changes to active child iframes.
- **Default Preset**: Defaults to `point` (Point — Dark).

---

## 12. Dynamic Google Fonts Pipeline for 45 nightTab Presets

To ensure the fonts specified in all 45 nightTab presets (e.g. `Klee One`, `Titillium Web`, `Fjalla One`, `Oswald`, `Fredericka the Great`, `Bungee Hairline`, `Monoton`, `Megrim`, etc.) render correctly instead of falling back to system generic sans-serif:
- **Automatic Head Injection**:
  - `loadPresetFonts(presetOrId)` in [extension/shared/theme.js](file:///p:/Magnanimity/Projects/ReEcap/extension/shared/theme.js) extracts the display and UI fonts for any preset.
  - Injects preconnect links to `https://fonts.googleapis.com` and `https://fonts.gstatic.com` alongside `<link id="reecap-google-fonts" rel="stylesheet" href="...">` formatted with Google Fonts CSS2 API.
  - Automatically called inside `applyTheme()`, ensuring font files are downloaded and rendered in both top-level documents and child iframes.
- **Batch Catalog Font Loading**:
  - `loadCatalogFonts()` dynamically requests all 59 unique font families across all 45 nightTab presets in a single 12.9 KB compressed batch query.
  - Triggered automatically whenever the user opens the extension popup or the floating theme toolbar, ensuring font preview cards display true typographic styles.
- **Permissions**:
  - `extension/manifest.json` grants host permissions to `"https://fonts.googleapis.com/*"` and `"https://fonts.gstatic.com/*"`.

---

## 13. Main-World Alert & CSP Architecture

To completely eliminate Chrome Content Security Policy (CSP) violations (`Executing inline script violates directive 'script-src ...'`):
- **Native MV3 Main-World Content Script**:
  - [extension/shared/interceptor.js](file:///p:/Magnanimity/Projects/ReEcap/extension/shared/interceptor.js) is registered directly in [extension/manifest.json](file:///p:/Magnanimity/Projects/ReEcap/extension/manifest.json) with `"world": "MAIN"`, `"matches": ["*://info.aec.edu.in/*"]`, `"run_at": "document_start"`, `"all_frames": true`.
  - Chrome itself executes the interceptor in the main world without creating any inline `<script>` tags in the DOM, guaranteeing zero CSP warnings or blocks.
- **Interception Scope**:
  - Suppresses unhandled ASP.NET AJAX raw HTML modal errors and 401 Unauthorized dumps.
  - Hooks `Sys.WebForms.PageRequestManager` `endRequest` errors and dispatches `REECAP_SUPPRESSED_ALERT` to render in-UI recovery cards.

---

## 14. Core Files & Responsibilities

| File | Primary Responsibilities |
| :--- | :--- |
| [extension/manifest.json](file:///p:/Magnanimity/Projects/ReEcap/extension/manifest.json) | Manifest V3 specification; matches `info.aec.edu.in`; declares permissions (`storage`, `activeTab`, Google Fonts hosts), brand title `𝚁𝚎𝙴𝚌𝚊𝚙"/`, and MV3 main-world interceptor. |
| [extension/shared/interceptor.js](file:///p:/Magnanimity/Projects/ReEcap/extension/shared/interceptor.js) | Main World alert and AJAX interceptor executed by Chrome MV3 with zero DOM inline scripts or CSP violations. |
| [extension/decorators.js](file:///p:/Magnanimity/Projects/ReEcap/extension/decorators.js) | Core UI enhancement engine: sidebar categorization, dual-pane layout, flush dock layout, timetable tooltips, receipts sanitization, fee standalone view, error cards, rich theme toolbar, Aria composer & stop button. |
| [extension/style.css](file:///p:/Magnanimity/Projects/ReEcap/extension/style.css) | nightTab CSS architecture: flush sidebar and masthead docking, zero-gap layout grid, independent scrollbars, cards, timetable, receipts override, error state components, streamlined composer, stop button specificity lock, rich floating theme toolbar styles. |
| [extension/content.js](file:///p:/Magnanimity/Projects/ReEcap/extension/content.js) | Stylesheet and token injector; theme migration and active preset application (`point` default). |
| [extension/shared/theme.js](file:///p:/Magnanimity/Projects/ReEcap/extension/shared/theme.js) | 45 nightTab presets, mathematical color spaces, appearance filters (35 dark, 10 light), semantic CSS token mappings, dynamic Google Fonts loader (`loadPresetFonts`, `loadCatalogFonts`), `point` fallback. |
| [extension/shared/aria.js](file:///p:/Magnanimity/Projects/ReEcap/extension/shared/aria.js) | Aria AI copilot client: streaming markdown parser, dossier compilation, quick action chips, message history, stream abortion support, clean academic terminology. |
| [extension/popup.html](file:///p:/Magnanimity/Projects/ReEcap/extension/popup.html) | Extension popup interface featuring brand title `𝚁𝚎𝙴𝚌𝚊𝚙"/`, appearance filters, 2-column presets grid with font previews, and geometry sliders. |
| [extension/popup.js](file:///p:/Magnanimity/Projects/ReEcap/extension/popup.js) | Popup interaction logic, sync storage management, Google Fonts catalog loader, and real-time preset switching (`point` default). |
| [tests/alert-interceptor.test.js](file:///p:/Magnanimity/Projects/ReEcap/tests/alert-interceptor.test.js) | Regression test suite verifying 401 XHTML detection, alert suppression, exam route differentiation, and recovery card rendering. |
| [tests/aria-composer.test.js](file:///p:/Magnanimity/Projects/ReEcap/tests/aria-composer.test.js) | Test suite validating streamlined composer layout, stop button state machine, helper card dismissal, and fee ledger navigation. |
| [tests/aria-markdown.test.js](file:///p:/Magnanimity/Projects/ReEcap/tests/aria-markdown.test.js) | 45-point test suite validating Aria markdown formatting, XSS sanitization, and streaming buffers. |
| [tests/theme-architecture.test.js](file:///p:/Magnanimity/Projects/ReEcap/tests/theme-architecture.test.js) | Test suite verifying 45 presets, token filters, Google Fonts loading API, and theme migration logic with `point` default. |
| [PROGRESS.md](file:///p:/Magnanimity/Projects/ReEcap/PROGRESS.md) | Ongoing development log, architectural decisions, and current implementation status. |
| [handoff.md](file:///p:/Magnanimity/Projects/ReEcap/handoff.md) | Authoritative reference document for developer handoff and documentation authoring. |

---

## 13. Verification & Validation Commands

All test suites and syntax validations execute clean with zero errors:

```bash
# 1. Syntax Validation
node --check extension/decorators.js
node --check extension/shared/aria.js

# 2. Alert Interception & Error Recovery Suite
node tests/alert-interceptor.test.js

# 3. Aria Composer & Stop Button Lifecycle Suite
node tests/aria-composer.test.js

# 4. Aria Markdown Parser Suite (45 checks)
node tests/aria-markdown.test.js

# 5. Theme & Token Architecture Suite (45 Presets & Point Default)
node tests/theme-architecture.test.js

# 6. Iframe Navigation Test
# Open tests/iframe-navigation.html in browser to verify 12/12 DOM checks
```
