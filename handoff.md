# ReEcap — Developer Handoff

> **Last updated:** 2026-11-18
> **Active branch:** `nighttab`
> **Remote:** `https://github.com/lupixele/ReEcap.git`
> **Last pushed commit:** `e834651` (`origin/nighttab` and `origin/main`)
> **Working tree:** contains uncommitted payment and Aria changes; see status below.

## Project and invariants

ReEcap is a Manifest V3 Chrome extension that modernizes the Aditya University ASP.NET WebForms student portal. Enhancements are client-side. Preserve native postbacks, `__VIEWSTATE`, authentication, and form behavior; never invent or replace official financial records. Use the original nightTab presets and their tokens (no synthetic light/dark variants). Keep all themes token-driven, preserve privacy/no telemetry, and use SVG/icon assets rather than emoji.

## Current verified state

### Pushed baseline (`e834651`)

- Theme appearance filters derive from each original nightTab preset's rendered background token: 45 original presets, 35 dark and 10 light.
- Legacy theme mode overrides are discarded during migration.
- Bio-data values wrap without overflow at tested narrow widths; leaked guardian section label is removed.
- Fee receipts remain native; no fabricated receipt ledger or alert-only payment fallback.
- Payment iframe height restoration after Overview was covered by regression tests.

### Uncommitted payment changes

**Root cause of the payment selection alert:** the redesigned table moved native checkbox and amount inputs out of their original WebForms row. The portal's positional handlers traverse that original row, so selection caused `alert(undefined)` and stopped updating totals.

**Fix:** the original inputs remain in their native row; visible proxy controls forward changes to them and mirror calculated state. Payment now reports its content height to the parent iframe with `REECAP_RESIZE`, avoiding a viewport-sized blank gap beneath the fixed totals bar. Browser regression harness reports 30/30 checks passing, zero alerts, and zero console errors; it verifies selection/deselection, amount edits, totals, and native Proceed/Cancel/gateway actions. A screenshot showed selected payment and updated total.

### Uncommitted Aria changes

- Replaced the regex-based markdown parser with a block parser supporting heading levels 1–6, nested and ordered lists, task lists, pipe tables, fenced code, inline code, links (only `http`, `https`, `mailto`), emphasis, strikethrough, blockquotes, and existing action/tool chips. HTML input is escaped.
- Streaming mode suppresses incomplete trailing action/link tokens and renders open code constructs without exposing stray delimiters. Stream handler passes `{ streaming: true }` and final rendering uses normal mode.
- Removed the CGPA, Attendance, Backlogs, and Term Fees cards and their update function/styles. Student dossier remains available to welcome text, suggestions, and AI context.
- Composer uses one visual container instead of a separately bordered textarea; it auto-grows and now starts disabled when empty, disables on clear, and enables when non-empty. Markdown block styles use theme variables.
- Tests: `tests/aria-markdown.test.js` passes 45 Node checks. `tests/aria-view.html` passes 18/18 browser checks (stat card removal, markdown blocks, composer behavior, tokens across light/dark presets). A polished screenshot of the live Aria shell has **not** been captured; the harness rendered but the shell stayed closed in the browser pane.

## Not completed

These were requested but had not been implemented when work paused:

1. Make Aria sidebar sections accordion-style (only one open section at a time).
2. Give the sidebar independent vertical scrolling with a styled scrollbar.
3. Extract and inspect `Raw/Interactive College Timetable.zip`, then port its design into the existing timetable component using theme tokens. Do not hardcode the archive palette.
4. Run the full final regression set after those remaining tasks and inspect the actual extension in the portal.

## Files changed in the current work

- `extension/decorators.js` — payment proxy controls/iframe resize and Aria parser/cards/composer behavior.
- `extension/style.css` — payment and Aria markdown/composer styles; stat-card styles removed.
- `tests/fee-services.html` — payment regression checks (30).
- `tests/aria-markdown.test.js` — parser regression suite (45).
- `tests/aria-view.html` — Aria integration/style harness (18).
- `tests/biodata-overlap.html`, `tests/iframe-navigation.html` — cache-busting test script URLs.
- `PROGRESS.md` — concise checkpoint of current state and next steps.
- `graphify-out/` has regenerated graph outputs from Graphify 0.9.112; cache files and machine-local interpreter sidecar are tool-generated and should not be committed as product changes unless intentionally reviewed.

## Verification commands/results

```bash
node --check extension/decorators.js
node tests/aria-markdown.test.js
node tests/theme-architecture.test.js
```

Latest reported results: parser 45 checks pass; Aria view 18/18; fee services 30/30; iframe navigation 12/12; bio-data 9/9; theme architecture PASS. No final full-suite run has occurred since all Aria and payment edits were combined.

## Graphify

Graphify CLI `0.9.112` was installed with pip for the current Windows Python 3.12 environment. `graphify update .` completed and reported 2,393 nodes, 3,436 edges, 162 communities. It warned that 104 of 257 scanned files were unsupported and one existing node was retained fail-closed. Generated graph outputs may be machine/version-dependent. `graphify label` was not run.

## Git and next actions

- Branch convention: commit to `nighttab`; `main` was fast-forwarded to `e834651` and pushed earlier.
- Do not claim the uncommitted changes are on GitHub until a push occurs.
- Next: implement the sidebar accordion/scroll behavior; inspect and port the timetable ZIP; run full tests and live portal verification; then commit/push the completed work.
- Any commit message must end with the active Claude co-author trailer required by the session attribution instruction.
