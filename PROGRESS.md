## Current State
- Active working branch switched to `main` with `nighttab` changes fully merged and pushed to `origin/main` at `239648a`.
- Independent Dual-Pane Scrolling: Locked master viewport on desktop (`StudentMaster.aspx`) with pinned masthead, independent vertical scrolling for both the sidebar (`ul.menu`) and content pane (`.reecap-content-col`), matching nightTab custom scrollbars, and seamless wheel forwarding from child iframes.
- Masthead Polish: Pinned top navigation, removed orange accent line (`.masthead::after`), formatted student full name properly, and removed the "Hi," prefix from greetings.
- Keyboard Shortcuts Cleaned: Removed `Ctrl+K` and `Ctrl+,` shortcuts from both UI (`<kbd>` badges) and backend event listeners.
- Receipts Theming Fixed: Complete nightTab token styling for AjaxControlToolkit TabContainer (`.ajax__tab_*`), panels, grids, and action buttons, eliminating all vanilla cyan/blue gradient leaks and borders.
- Unified Fee Details Navigation: Replaced broken legacy sidebar Fee Details routing with direct integration into the student profile fee ledger (`#fees`), providing instant access to hero meter, semester cards, and ledger details.
- Timetable Color Guide Removed: Eradicated the "Color Guide / Know Your Subjects" section from the interactive timetable per user preference.
- Comprehensive `Readme.md` documentation updated with current architectural specifications.

## Recent Decisions
- Master shell layout on `data-reecap-master="true"` locks `html` and `body` to `100vh` on desktop with `overflow: hidden`, giving `.reecap-sidebar-col` and `.reecap-content-col` independent scroll containers with `overscroll-behavior: contain`.
- Child iframes relay mouse wheel delta to parent `.reecap-content-col` via `REECAP_CONTENT_WHEEL` for smooth, uninterrupted content scrolling.
- Override AjaxControlToolkit classes (`.ajax__tab_xp`, `.ajax__tab_header`, `.ajax__tab_tab`, `.ajax__tab_body`, etc.) with `--surface-card`, `--card-border`, `--surface-sunken`, and `--accent` to neutralize legacy theme leakage on `studentreceipts.aspx`.
- Route sidebar "FEE DETAILS" and overview quicklinks to `StudentProfile.aspx?scrid=17#fees`, switching directly to `divProfile_Fees` via postMessage if already loaded.
- Removed `renderTimetableLegend` output from the interactive timetable dashboard.

## Verification
- `node --check extension/decorators.js`: PASS
- `node --check extension/shared/aria.js`: PASS
- `node tests/aria-markdown.test.js`: PASS (45 checks)
- `node tests/theme-architecture.test.js`: PASS
- `tests/iframe-navigation.html`: PASS (100% checks)
- `git grep -i "RATAN"` / `git grep -i "25B11DS190"` / `git grep -i "lupel"` across `extension/` and `tests/`: 0 occurrences.
