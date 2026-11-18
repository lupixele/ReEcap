# ReEcap — Developer Handoff

> **Last updated:** 2026-11-18
> **Active branch:** `main`
> **Remote:** `https://github.com/lupixele/ReEcap.git`
> **Last pushed commit:** `239648a` (`origin/main` and `origin/nighttab`)

## Project and Invariants

ReEcap is a Manifest V3 Chrome extension that modernizes the Aditya University ASP.NET WebForms student portal (`https://info.aec.edu.in/aus/`). Enhancements are strictly client-side. Preserve native postbacks, `__VIEWSTATE`, authentication, and form behavior; never invent or replace official financial or academic records. Use the original nightTab presets and their mathematical color tokens (no synthetic light/dark variants). Keep all components token-driven, preserve privacy with zero telemetry, and use SVG/icon assets rather than emoji.

## Completed Work & Current State

### 1. Independent Dual-Pane Scrolling Architecture
- Locked desktop master viewport (`StudentMaster.aspx`) with `data-reecap-master="true"`: pinned masthead, `overflow: hidden` on root window.
- Both sidebar (`ul.menu`) and content column (`.reecap-content-col`) feature dedicated vertical scroll containers with custom nightTab styled scrollbars.
- Scrolling reacts strictly to where the cursor is hovered without moving the entire window or top bar.
- Child iframes relay wheel events to the parent `.reecap-content-col` via `REECAP_CONTENT_WHEEL` for smooth content scrolling when hovering over iframe content.
- Graceful fallback on mobile (`<= 900px`) preserving native touch scrolling.

### 2. Top Bar & Masthead Brand Polish
- Masthead is permanently locked at the top of the workstation shell (`flex-shrink: 0`).
- Replaced the ReEcap brand name with exact mathematical monospace `"𝚁𝚎𝙴𝚌𝚊𝚙"` glyphs and monospace typeface.
- Removed the orange accent underline (`.masthead::after`) below the ReEcap brand name.
- Dynamically extracts and formats the student's full name in proper Title Case without hardcoded personal information.
- Removed the "Hi," prefix from the masthead greeting.

### 3. Keyboard Shortcuts Cleanup
- Completely removed `Ctrl+K` and `Ctrl+,` shortcuts from both the UI (`<kbd>` badges in search item and bottom nav) and backend (`keydown` event listeners).
- Search modal remains readily accessible via direct click.

### 4. Receipts Theming & Theme Leak Elimination
- Overrode AjaxControlToolkit TabContainer classes (`.ajax__tab_container`, `.ajax__tab_xp`, `.ajax__tab_header`, `.ajax__tab_tab`, `.ajax__tab_active`, `.ajax__tab_body`, `.ajax__tab_panel`) using nightTab design tokens.
- Injected dedicated `<style id="reecap-receipts-aggressive-override">` tag and runtime `sanitizeReceiptsTheme()` method removing cyan/blue gradient leaks (`#70b4e6`, `#5dade2`) and blue borders on `studentreceipts.aspx`.
- Styled receipt data tables and print action buttons with tactile nightTab surfaces and hover states.
- Bound child resize events on tab clicks and mutations to keep the iframe smoothly fitted.

### 5. Dedicated Profile & Fee Details Architecture
- Made "Profile" into its own dedicated section in the sidebar with unique sub-views: Bio-Data, Performance (Present), Performance (Past), Outings, Counseling, Disciplinary Action.
- Enforced strict non-duplication: excluded duplicate Backlogs (kept in Academics) and Fee Details (kept in Finance) from the Profile section.
- Completely removed the horizontal tab navigation bar (`#reecap-profile-dashboard`) from the content area when embedded in the shell.
- When opening "Fee Details" from Finance, sets `data-fee-only-view="true"` to render only the fee ledger, hero meter, and payment actions without leaking student bio data or profile tabs.
- Supports instant view switching via `REECAP_SWITCH_TAB` postMessage when the profile iframe is already loaded.

### 6. Timetable Tooltip Boundary & Collision Protection
- Fixed tooltip cutoff when hovering or focusing subjects in the top rows of the timetable (Monday and Tuesday).
- Tooltips in upper rows orient downward (`.tt-class.tt-tooltip-below`) with flipped arrows, reinforced with a dynamic mouseenter/focusin collision check against the `.tt-grid-wrap` container.
- Removed the "Color Guide / Know Your Subjects" legend section per user preference.

### 7. Universal Elimination of Empty Scrolling
- Re-architected child iframe height measuring: replaced inflated `docEl.scrollHeight` calculation with physical bounding box scan of visible content elements (`rect.bottom + window.scrollY`).
- Repaired `getTrueContentHeight()` and universal child auto-resizers, ensuring short pages (timetable, bio-data, receipts, etc.) do not spawn hundreds of pixels of blank/empty scroll space.

## Verification Commands & Status

```bash
node --check extension/decorators.js
node --check extension/shared/aria.js
node tests/aria-markdown.test.js
node tests/theme-architecture.test.js
```

- Parser regression suite: 45/45 Node checks passing.
- Theme architecture: 45 presets, 35 dark and 10 light token-derived filters passing.
- Iframe navigation: 100% checks passing.
- Privacy check: 0 personal records in `extension/` and `tests/`.

## Files Changed

- `extension/decorators.js` — Full name greeting without "Hi,", removal of `Ctrl+K` listener and `Ctrl+,` badge, fee details tab routing, receipts page decoration, child wheel forwarding, and removal of timetable color guide.
- `extension/shared/aria.js` — Navigation action map update for fee details (`#fees`).
- `extension/style.css` — Pinned masthead shell, dual independent pane scrollbars, removal of `.masthead::after` accent bar, and complete AjaxControlToolkit tab/receipts theme styling.
- `Readme.md` — Updated feature descriptions, navigation architecture, and shortcuts table.
- `PROGRESS.md` — Current milestone and decision tracking.
- `handoff.md` — Authoritative developer handoff.
