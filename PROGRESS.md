## Current State
NightTab theme system is live (45 presets, Dark/Light as token-derived filters, not invented variants; pushed as e834651 to origin/nighttab + main). Uncommitted in-tree: payment fixes (proxy native controls + iframe content-height resize, 30/30 checks) and Aria work (block-based markdown parser with 45 Node checks, stat cards removed, composer rework, 18/18 harness checks).

## Recent Decisions
- Payment UI PROXIES native controls: the portal's onFeeCheckBoxClick/calculateAmounts traverse the original row positionally, so native checkboxes/amount inputs must never be relocated (caused alert(undefined) + frozen totals). Visible controls forward clicks and re-sync — tests/fee-services.html 30/30.
- Payment page emits REECAP_RESIZE with getPaymentContentHeight() so the parent iframe shrinks to content; fixes the empty gap under the payment box (iframe sat at viewport height).
- Aria markdown parser rewritten as a block parser (headings/nested+ordered+task lists/tables/fenced code/links/emphasis/blockquotes), sentinel-protected code spans and chips, streaming mode auto-closes partial tokens so output never flickers — tests/aria-markdown.test.js 45 checks.
- Stat cards (CGPA/Attendance/Backlogs/Term Fees) removed entirely — markup, updateAriaStrip function/call, and all card CSS; dossier data still feeds welcome, suggestions, and AI context.
- Composer: late `#aria-input` background/border override neutralized (the container owns the single visual box), send-button disabled states wired, markdown block CSS (pre/blockquote/task/table/link) added on theme tokens.

## Next Steps
1. Sidebar accordion behavior (one open section at a time) + independent scroll with styled scrollbar.
2. Port timetable design from Raw/Interactive College Timetable.zip into the token-based component system.
3. Re-run all regression suites (theme, fee, iframe, bio-data, Aria markdown) after tasks 1-2.
4. Commit + push payment/Aria work with the Claude co-author trailer when approved.
5. Optional: `graphify label` to refresh 162 community names with the LLM.

## Open Questions / Blockers
- Browser-pane computed-style quirk (hidden pane freezes background transitions): themes verified via screenshots + resolved custom-property values instead of computed colors.
- Aria shell live screenshot pending (shell only opens via toggle; render verified in harness only).
- Item 3 of the user's fee issue list was blank/undefined — never specified.

## Last Updated
2026-11-18
