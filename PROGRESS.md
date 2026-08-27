## Current State
Successfully engineered the core framework for the Student Directory and Multi-Role Access Control via decorators. Timetable parsing now reads each portal cell’s authoritative AM/PM time range and preserves merged-session end times. The timetable now combines restrained digital-material surfaces with a compact, no-horizontal-scroll weekly grid on desktop and a complete vertical day-by-day schedule on mobile; all source information remains visible on mobile. These verified changes are not yet packaged.

## Recent Decisions

- Implemented Dynamic Query card generation. If a user queries a valid 10-digit roll number that does not natively exist inside `students.json`, the extension automatically builds a matching fallback construct predicting the AEC server photo path parsing the department string, allowing live dynamic querying for missing students on the server directly.
- Scrapped `<select>` completely for directory filtering. Built a custom full-stack JS/CSS dropdown rendering engine out of `div` tags to enforce exact padding, hover animations, hover-backgrounds, shadow dropping, nested option groups, and chevron-flipping outside the rigid constraints of generic MacOS/Windows browser combobox dropdown styling.
- Softened dropdown UX. Applied `radius-pill` fully-rounded bounds to the trigger, `radius-xl` container bounds for the dropdown modal, added gap margins between items, and implemented distinct padding radiuses across inner `<option>` wrappers to eliminate "boxy" sharp edges.
- Integrated a real-time mathematics engine dynamically injecting structural `75% Target Status` indicators onto the Attendance page overview. Directly surfaces exactly how many future classes users can deliberately skip without failing the threshold, and warns explicitly how many consecutive future classes users must attend to regain compliance. Added bordered pill stylings matching the internal visual token guidelines to those generated labels. Fixed bug where critical (red) pill background was completely missing by switching `.bunkable-tag.critical` assignment to utilize valid global `var(--accent-soft)`.
- Aligned attendance color grading with indicator pill styling, automatically casting `yellow` (warning) pills when students hover dynamically between 65% and 75% attendance rather than casting bright red immediately after dropping below 75%.
- Implemented the Native DOM Theme Toolbar, injecting a floating configuration pill directly into the content container bypassing the necessity for the Chrome Extension UI popout on every theme state switch. Added sync listeners that bind the injected DOM directly back into the core extension's local caching pipeline.
- Re-routed all `chrome.storage.sync` calls powering the Theme switch bindings to wrap into silent `try/catch` and explicitly bail evaluation upon reading runtime `lastError` intercepting `Extension Context Invalidated` trace errors caused when chromium forces background script termination while the DOM listener is clicking. 

## Next Steps
1. Reload the unpacked extension and visually verify the redesigned timetable against a live student schedule.
2. Package a new release after client acceptance of the timetable update.
3. Client verification of final directory routing stability.

## Open Questions / Blockers
- None. 

## Last Updated
2026-08-27
