## Current State
- NightTab theme system is live (45 presets, 6 categories, token-derived filters; synced to GitHub on `nighttab` and `main` at `50f650d`).
- Identity generalization and privacy scrubbing implemented: zero personal data hardcoded in `extension/decorators.js` or `extension/shared/aria.js`; client-side sanitizer scrubs roll numbers and university emails before transmitting queries to cloud edge LLM.
- Sidebar collapse button bug resolved: eliminated duplicate simultaneous `icon-collapse` and `icon-expand` rendering caused by `display: block !important` override.
- Sidebar subbadge chip removed from Academic Calendar menu link per design request.
- Sidebar single-open accordion behavior active across student categories and employee submenus.
- Desktop sidebar equipped with bounded height and independent vertical scrolling using nightTab styled scrollbars.
- Interactive College Timetable ported from `Raw/Interactive College Timetable.zip` into the token-based component system with tactile subject cards, hover/focus details popovers, mobile day tabs, and Know Your Subjects color guide grid.
- Comprehensive `Readme.md` documentation updated with full feature catalog and architectural specifications.

## Recent Decisions
- Generalize student display name dynamically from DOM portal greetings (Title Cased first name) with fallback to "Student", removing all hardcoded name overrides.
- In `aria.js`, scrub roll numbers (`\b2[0-9][A-Za-z0-9]{8}\b`) and institutional emails before sending system/user messages to `https://aria.lupixele.online/api/chat`.
- Removed `.reecap-sidebar-subbadge` from the Academic Calendar menu link to prevent text clipping in narrow navigation drawers.
- Enforced single-open accordion behavior across sidebar groups by automatically collapsing other open categories when one is expanded.
- Styled `ul.menu` with `max-height: calc(100vh - 40px)` and custom nightTab scrollbar rules for independent scrollability.
- Maintained the DJB2 12-shade hashing and token-derived palette (`--palette-hue`, `--palette-color`, `--palette-soft`, `--palette-border`) for the timetable grid, avoiding any hardcoded colors from the source archive.

## Verification
- `node --check extension/decorators.js`: PASS
- `node --check extension/shared/aria.js`: PASS
- `node tests/aria-markdown.test.js`: PASS (45 checks)
- `node tests/theme-architecture.test.js`: PASS
- `git grep -i "RATAN"` / `git grep -i "25B11DS190"` / `git grep -i "lupel"` across `extension/` and `tests/`: 0 occurrences.

## Next Steps
- Commit and push completed work to `nighttab` branch under Claude co-author trailer.
- Fast-forward merge `main` and push to `origin/main`.
