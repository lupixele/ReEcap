## Current State
Successfully engineered the core framework for the Student Directory, Multi-Role Access Control via decorators, and Teacher (Employee) portal layout support. Overhauled the Exam Script Viewer UI to support dark mode themes (and all theme variations) seamlessly with a responsive two-column grid, sticky marks scorecard, and unified question hierarchy.

## Recent Decisions
- Refactored Exam Script Viewer question breakdown table hierarchy: replaced arbitrary zebra striping with grouped question section headers (`1`, `2`, `3`, `4`) and clean sub-question row grouping (`a`, `b`).
- Resolved Exam Script Viewer layout overflow: converted `.de-container` into a responsive CSS grid (`minmax(0, 1fr) 300px`), preventing the scanned PDF canvas from crushing or burying the right-hand scorecard column.
- Overhauled `ExamScriptViewer.aspx` dark mode theme integration: neutralized legacy `td[bgcolor="#F7F7F7"]` tables, unified panel cards, styled course pill selectors, and refactored question & marks tables to use theme variables (`--surface-card`, `--surface-sunken`, `--border-light`, `--accent`).
- Added Exam Viewer PDF Export engine with bundled jsPDF library, enabling direct PDF generation of student examination timetables and schedules.
- Fixed 401 redirect loop bug during portal session resets.
- Restructured `isStudentRole()` and integrated `isEmployeeRole()` checks in `decorators.js` to identify role via DOM endpoints (`studentmaster.aspx` vs `main.aspx`).
- Built an Accordion-style Submenu generator mapping the Teacher side's nested DOM into smooth CSS Grid-animated submenu items inside the unified Sidebar.
- Retained the legacy Teacher asynchronous Top Navigation (`#tblModules`), relocating it to a horizontally-centered pill-style navigation block embedded seamlessly inside the unified Masthead.
- Wired a dynamic `MutationObserver` to `#divLeftMenu` allowing the Accordion Sidebar to re-render in place effortlessly when legacy server AJAX dumps new DOM payloads on Top Nav category swaps.
- Extended the ReEcap unified layout pipeline (`rebuildMainLayout`) to support the teacher DOM target IDs dynamically.

## Next Steps
1. User verification of the redesigned Exam Script Viewer in live student portal sessions across Dark and Light themes.
2. Package and publish subsequent release upon user review.

## Open Questions / Blockers
- None.

## Last Updated
2026-08-30
