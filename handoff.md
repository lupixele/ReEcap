# ReEcap — Developer Handoff

> **Last updated:** 2026-11-18
> **Active branch:** `nighttab`
> **Remote:** `https://github.com/lupixele/ReEcap.git`
> **Last pushed commit:** `50f650d` (`origin/nighttab` and `origin/main`)

## Project and Invariants

ReEcap is a Manifest V3 Chrome extension that modernizes the Aditya University ASP.NET WebForms student portal (`https://info.aec.edu.in/aus/`). Enhancements are strictly client-side. Preserve native postbacks, `__VIEWSTATE`, authentication, and form behavior; never invent or replace official financial or academic records. Use the original nightTab presets and their mathematical color tokens (no synthetic light/dark variants). Keep all components token-driven, preserve privacy with zero telemetry, and use SVG/icon assets rather than emoji.

## Completed Work & Current State

### 1. Identity Generalization & Privacy Scrubbing
- Scrubbed all hardcoded personal student names and roll numbers from `extension/decorators.js`, `extension/shared/aria.js`, and `tests/biodata-overlap.html`.
- Student name display now dynamically parses from the logged-in portal greeting in Title Case, falling back gracefully to "Student".
- Client-side data scrubber `scrubPersonalDetails()` in `shared/aria.js` intercepts all system and user prompt payloads before dispatching to the cloud edge LLM endpoint (`https://aria.lupixele.online/api/chat`), removing student roll numbers and university email addresses.

### 2. Sidebar Navigation & Layout Fixes
- **Collapse Button Bug Fix**: Resolved the issue where both `.icon-collapse` and `.icon-expand` rendered simultaneously inside `#reecap-sidebar-toggle-btn` due to an overriding `display: block !important` on `.sidebar-collapse-btn svg`. Explicit rules now isolate visibility cleanly between expanded and collapsed states.
- **Academic Calendar Subbadge Removal**: Removed `.reecap-sidebar-subbadge` from the Academic Calendar menu link to eliminate text clipping.
- **Single-Open Accordion**: Clicking any sidebar section header now collapses all other open groups, guaranteeing only one category remains expanded at a time.
- **Independent Vertical Scrolling**: Added `max-height: calc(100vh - 40px)`, `overflow-y: auto`, and custom nightTab scrollbar rules to `ul.menu`.

### 3. Interactive College Timetable Port
- Ported the design from `Raw/Interactive College Timetable.zip` into ReEcap's token-based component system without hardcoding archive colors.
- Tactile subject cards featuring subject codes, status dots, two-line title clamps, and period timings.
- Hover and focus popovers displaying full course title, period breakdown, faculty name, and room/location with SVG iconography.
- Responsive mobile schedule with interactive day selector tabs (`Mon` through `Sat`) and single-day card panels.
- "Know Your Subjects" color guide grid documenting course codes, full names, and faculty.

### 4. Documentation & Verification
- Comprehensive `Readme.md` rewritten covering nightTab design system architecture, Aria AI capabilities, Academic Calendar hub, timetable grid, and security/privacy guarantees.
- Zero Unicode emojis maintained across all source code, CSS, commit messages, and documentation.

## Verification Commands & Status

```bash
node --check extension/decorators.js
node --check extension/shared/aria.js
node tests/aria-markdown.test.js
node tests/theme-architecture.test.js
```

- Parser regression suite: 45/45 Node checks passing.
- Theme architecture: 45 presets, 35 dark and 10 light token-derived filters passing.
- Privacy check: 0 personal records in `extension/` and `tests/`.

## Files Changed

- `extension/decorators.js` — Generalization of user name, sidebar accordion logic, timetable component port, subbadge removal.
- `extension/shared/aria.js` — Student name generalization, cloud privacy scrubber, generalized prompt roles.
- `extension/style.css` — Sidebar collapse icon fix, independent sidebar scroll, timetable tactile cards, popovers, mobile day tabs, and legend grid.
- `tests/biodata-overlap.html` — Synthetic test data replacing real student details.
- `Readme.md` — Updated project documentation with full feature suite.
- `PROGRESS.md` — Checkpoint and status notes.
- `handoff.md` — Authoritative developer handoff.
