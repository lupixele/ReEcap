## Current State
- Active working branch on `main` with latest commits pushed to `origin/main`.
- ReEcap Brand Identity: Replaced masthead and extension popup brand title text and styling with exact mathematical monospace `"𝚁𝚎𝙴𝚌𝚊𝚙"/"` glyph string.
- Universal Alert Interceptor & In-UI Error Cards: Overrode `window.alert` in both Main World and isolated content script contexts and hooked ASP.NET AJAX `PageRequestManager.endRequest` to suppress raw HTML error popups (such as IIS 401 Unauthorized pages on Exam Details). Renders an elegant in-UI nightTab error hero card with clear status badges, context explanations, and one-click actions (Reload View, Academic Calendar, Return to Overview).
- Universal Portal Server Error Recovery: Extended `observeAndRecoverServerError()` to detect 401 Unauthorized, 403 Forbidden, and 500 Internal Server Error pages directly loaded in child iframes or top-level windows, replacing raw server error traces with responsive nightTab error recovery cards.
- Sidebar Profile Section: Restructured Profile into a dedicated sidebar section (`Profile` group) containing unique sub-items (Bio-Data, Performance - Present, Performance - Past, Outings, Counseling, Disciplinary Action). Non-duplicate policy strictly enforced (no duplicate Backlogs or Fee Details under Profile).
- In-Content Profile Tabs Removed: The horizontal tab bar `#reecap-profile-dashboard` is completely hidden when embedded in the shell, keeping the content area clean and focused.
- Dedicated Fee Details View: Opens directly into `#divProfile_Fees` with `data-fee-only-view="true"`, cleanly suppressing student bio data and tabs.
- Timetable Tooltip Border Cutoff: Solved upward popover cutoff on top rows (Monday/Tuesday) with downward orientation (`.tt-class.tt-tooltip-below`) and dynamic mouseenter/focusin collision detection against `.tt-grid-wrap`.
- Receipts Page Theming Sanitized: Injected runtime `<style id="reecap-receipts-aggressive-override">` and runtime sanitizer `sanitizeReceiptsTheme()` stripping cyan/blue gradient leaks (`#70b4e6`, `#5dade2`) and borders from AjaxControlToolkit TabContainer.
- Empty Scroll Elimination: Repaired `getTrueContentHeight()` and child auto-resizers to measure exact physical bounding boxes of visible content elements instead of `docEl.scrollHeight`, eliminating hundreds of pixels of blank/empty scroll on timetable, bio-data, receipts, etc.
- Master shell layout on `data-reecap-master="true"` locks `html` and `body` to `100vh` on desktop with `overflow: hidden`, giving `.reecap-sidebar-col` and `.reecap-content-col` independent scroll containers with `overscroll-behavior: contain`.

## Recent Decisions
- Intercept browser `window.alert` modal dialogs in the Main World before ASP.NET Ajax and jQuery error handlers execute, suppressing raw IIS XHTML error dumps and routing them to ReEcap in-UI state cards.
- Restructured sidebar navigation into distinct sections: `Academics`, `Finance`, `Profile`, and `Account`. Profile now contains unique profile views (Bio-Data, Performance, Past Performance, Outings, Counseling, Disciplinary Action) without duplicating Backlogs (in Academics) or Fee Details (in Finance).
- Sub-item navigation in Profile and Finance utilizes `REECAP_SWITCH_TAB` postMessage for instant view switching without iframe reloads when `StudentProfile.aspx` is active.
- Universal iframe content height reporting calculates the maximum physical bottom boundary of visible content elements (`rect.bottom + window.scrollY`), bypassing inflated `docEl.scrollHeight` values that previously created massive trailing blank space.
- Timetable tooltip popovers in top rows orient downward with flipped arrows, reinforced by dynamic geometry checks during hover and focus.
- Receipts page employs aggressive injected CSS and mutation observer sanitation to neutralize persistent ASP.NET WebResource cyan/blue gradient backgrounds.

## Verification
- `node --check extension/decorators.js`: PASS
- `node --check extension/shared/aria.js`: PASS
- `node tests/aria-markdown.test.js`: PASS (45 checks)
- `node tests/theme-architecture.test.js`: PASS
- `node tests/alert-interceptor.test.js`: PASS
- `tests/iframe-navigation.html`: PASS (100% checks)
- Privacy audit: 0 personal records in `extension/` and `tests/`.
