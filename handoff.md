# ReEcap — Comprehensive Developer Handoff

> **Last Updated:** 2026-11-18  
> **Active Branch:** `main`  
> **Remote Repository:** `https://github.com/lupixele/ReEcap.git`  
> **Latest Commit:** `74fe123` (`origin/main`)

---

## 1. Executive Summary & Invariants

ReEcap is a Manifest V3 Chrome extension that redesigns and modernizes the Aditya University ECAP ERP student portal (`https://info.aec.edu.in/aus/`) using the nightTab design system aesthetic.

### Core Engineering Invariants
- **Strictly Client-Side Enhancement**: All modifications run in the browser without modifying backend ASP.NET WebForms architecture.
- **Native Postback & State Integrity**: Never break or bypass ASP.NET `__VIEWSTATE`, `__EVENTVALIDATION`, form actions, or AJAX UpdatePanels.
- **Data Integrity & Non-Fabrication**: Never invent, guess, mock, or fabricate financial ledgers, grades, attendance figures, or academic records. If a native module is unavailable, present clear in-UI status cards while keeping native fallback paths operable.
- **nightTab Design System Fidelity**: Use the official nightTab presets, mathematical color spaces, and semantic design tokens (`--surface-elevated`, `--surface-card`, `--surface-sunken`, `--text-primary`, `--text-secondary`, `--border-subtle`, `--accent`, `--radius-*`, `--shadow-*`). Do not invent synthetic light/dark variations.
- **Zero Hardcoded Personal Identifiers**: Extract student names and roll numbers dynamically at runtime; scrub all personal data from version-controlled files, commit histories, fixtures, and tests.
- **Icon Assets & Typography**: Use clean inline SVG icons rather than Unicode emojis across the UI, code comments, and documentation. Use monospace typography for technical data and the brand identity.

---

## 2. Shell & Viewport Architecture

### Independent Dual-Pane Desktop Layout
- Applied via `data-reecap-master="true"` on `StudentMaster.aspx` and `main.aspx`.
- The desktop viewport locks `html` and `body` to `100vh` with `overflow: hidden`, pinning the masthead to the top (`flex-shrink: 0`).
- **Independent Scroll Containers**:
  - **Sidebar Column** (`.reecap-sidebar-col` / `ul.menu`): Features its own isolated vertical scrollbar with custom nightTab styling.
  - **Content Column** (`.reecap-content-col`): Dedicated content scroll container fitted with `overscroll-behavior: contain`.
  - Hovering and scrolling inside either container moves that container exclusively without window jitter or viewport displacement.
- **Child Iframe Wheel Forwarding**:
  - When the cursor hovers over child iframes (`#capIframeId`), child documents capture wheel events and forward them via `window.parent.postMessage({ type: 'REECAP_CONTENT_WHEEL', deltaY, deltaMode }, '*')`.
  - The parent content column applies the forwarded delta, ensuring seamless scrolling across embedded iframe pages.
- **Mobile Responsiveness**: Viewports `<= 900px` revert smoothly to document-level touch scrolling with an off-canvas drawer navigation.

---

## 3. Brand Identity & Masthead Design

- **Mathematical Monospace Brand Title**:
  - The brand title in both the masthead ([extension/decorators.js](file:///p:/Magnanimity/Projects/ReEcap/extension/decorators.js)) and the extension popup ([extension/popup.html](file:///p:/Magnanimity/Projects/ReEcap/extension/popup.html)) renders the exact mathematical monospace string:
    ```html
    <h1 class="brand-title">𝚁𝚎𝙴𝚌𝚊𝚙"/</h1>
    ```
  - Styled with `.brand-title { font-family: var(--font-mono), monospace, system-ui, sans-serif; font-size: 21px; font-weight: 700; letter-spacing: -0.02em; }`.
  - Removed decorative underline artifacts (`.masthead::after`) for a clean, distraction-free header.
- **Dynamic Full Name Greeting**:
  - Extracts student name dynamically from `#lblUser` or DOM nodes, normalizing uppercase strings into proper Title Case.
  - Removed the informal "Hi," greeting prefix per user preference.
- **Quick Controls**:
  - Mobile hamburger toggle, desktop sidebar collapse toggle (`#reecap-sidebar-toggle-btn`), Aria AI launcher pill, theme customizer trigger, and native sign-out link.
  - Removed `Ctrl+K` and `Ctrl+,` keyboard shortcut badges and global keydown listeners. Search remains accessible via direct click on the command bar.

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
│   ├── Bio-Data (`#divProfile_BioData`)
│   ├── Performance (`#divProfile_Present`)
│   ├── Past Performance (`#divProfile_Past`)
│   ├── Outings (`#divProfile_Outings`)
│   ├── Counseling (`#divProfile_Counseling`)
│   └── Disciplinary Action (`#divProfile_DisciplinaryAction`)
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
- Navigating to Fee Details from the sidebar or Overview opens `Academics/StudentProfile.aspx?scrid=17&view=fee#divProfile_Fees`.
- The child document activates `data-fee-only-view="true"`, completely suppressing student bio data, personal information tables, and profile tab headers.
- Displays exclusively the student fee ledger, active term hero meter, semester fee breakdown cards, and official online payment gateway triggers.

### Standalone Backlogs View
- Navigating to Backlogs loads `Academics/studentbacklogs.aspx`.
- If the student has zero backlogs or the portal renders an empty table/error state, ReEcap renders the "Clean Academic Record" dashboard displaying passing statistics and zero arrears.

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
     - **Action Buttons**:
       - **Reload View**: Triggers frame reload.
       - **Academic Calendar**: Direct one-click switch to the Academic Calendar.
       - **Return to Overview**: Instant return to the student dashboard.
5. **Universal Server Error Observer** (`observeAndRecoverServerError`):
   - Expanded to detect 401 Unauthorized, 403 Forbidden, and 500 Internal Server Error pages loaded directly inside child frames or the shell, automatically rendering the in-UI recovery card.

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
Short child pages (compact bio-data, receipts, timetable) generated hundreds of pixels of blank trailing space.
Root cause: Child height resizers previously read `document.documentElement.scrollHeight`. Inside Chrome iframes, reading `scrollHeight` on a document styled with `height: 100%` returns the iframe's outer height, preventing the iframe from ever shrinking and causing height ratcheting.

### Solution
- Re-architected `getTrueContentHeight()` in [extension/decorators.js](file:///p:/Magnanimity/Projects/ReEcap/extension/decorators.js):
  - Scans visible content elements (`.reecap-timetable`, `#reecap-profile-dashboard`, `.card`, `table`, `.reecap-receipt-clean-table`, `form`).
  - Computes the true physical bottom boundary using `rect.bottom + window.scrollY`.
  - Ignores legacy ASP.NET 1000px/2000px spacer elements (`td[style*="1000px"]`, `td[height="1000"]`).
  - Sends exact content heights via `REECAP_RESIZE` postMessage, eliminating trailing blank scroll space across all pages.

---

## 10. Aria AI Academic Assistant Integration

- **Dossier Extraction**: Silently scans and compiles student attendance rates, internal marks, backlogs, and term timelines into an in-memory academic dossier.
- **Sidecar Panel**: Accessible via the masthead pill or theme toolbar, opening a dedicated side-panel assistant with conversational chat.
- **Markdown & Math Rendering**: Full streaming markdown parser in [extension/shared/aria.js](file:///p:/Magnanimity/Projects/ReEcap/extension/shared/aria.js) supporting headings, nested lists, task lists, tables, fenced code blocks with copy actions, LaTeX KaTeX formulas, and interactive action chips.

---

## 11. Core Files & Responsibilities

| File | Primary Responsibilities |
| :--- | :--- |
| [extension/manifest.json](file:///p:/Magnanimity/Projects/ReEcap/extension/manifest.json) | Manifest V3 specification; matches `info.aec.edu.in`; declares permissions (`storage`, `activeTab`) and web accessible resources. |
| [extension/decorators.js](file:///p:/Magnanimity/Projects/ReEcap/extension/decorators.js) | Core UI enhancement engine: Main World alert interceptor, sidebar categorization, dual-pane layout, height auto-resizers, timetable tooltips, receipts sanitization, fee standalone view, error cards. |
| [extension/style.css](file:///p:/Magnanimity/Projects/ReEcap/extension/style.css) | nightTab CSS architecture: layout grid, independent scrollbars, masthead, cards, timetable, receipts override, error state components, responsive breakpoints. |
| [extension/content.js](file:///p:/Magnanimity/Projects/ReEcap/extension/content.js) | Stylesheet and token injector; theme migration and active preset application. |
| [extension/shared/theme.js](file:///p:/Magnanimity/Projects/ReEcap/extension/shared/theme.js) | 45 nightTab presets, mathematical color spaces, appearance filters (35 dark, 10 light), semantic CSS token mappings. |
| [extension/shared/aria.js](file:///p:/Magnanimity/Projects/ReEcap/extension/shared/aria.js) | Aria AI copilot client: streaming markdown parser, dossier compilation, quick action chips, message history. |
| [extension/popup.html](file:///p:/Magnanimity/Projects/ReEcap/extension/popup.html) | Extension popup interface featuring brand title `"𝚁𝚎𝙴𝚌𝚊𝚙"/"`, appearance filters, and theme preset picker. |
| [tests/alert-interceptor.test.js](file:///p:/Magnanimity/Projects/ReEcap/tests/alert-interceptor.test.js) | Regression test suite verifying 401 XHTML detection, alert suppression, exam route differentiation, and recovery card rendering. |
| [tests/aria-markdown.test.js](file:///p:/Magnanimity/Projects/ReEcap/tests/aria-markdown.test.js) | 45-point test suite validating Aria markdown formatting, XSS sanitization, and streaming buffers. |
| [tests/theme-architecture.test.js](file:///p:/Magnanimity/Projects/ReEcap/tests/theme-architecture.test.js) | Test suite verifying 45 presets, token filters, and theme migration logic. |
| [PROGRESS.md](file:///p:/Magnanimity/Projects/ReEcap/PROGRESS.md) | Ongoing development log, architectural decisions, and current implementation status. |
| [handoff.md](file:///p:/Magnanimity/Projects/ReEcap/handoff.md) | Authoritative reference document for developer handoff and documentation authoring. |

---

## 12. Verification & Validation Commands

All test suites and syntax validations execute clean with zero errors:

```bash
# 1. Syntax Validation
node --check extension/decorators.js
node --check extension/shared/aria.js

# 2. Alert Interception & Error Recovery Suite
node tests/alert-interceptor.test.js

# 3. Aria Markdown Parser Suite (45 checks)
node tests/aria-markdown.test.js

# 4. Theme & Token Architecture Suite
node tests/theme-architecture.test.js

# 5. Iframe Navigation Test
# Open tests/iframe-navigation.html in browser to verify 12/12 DOM checks
```
