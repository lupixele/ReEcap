## Current State
Successfully engineered the core framework for the Student Directory and Multi-Role Access Control via decorators. Overhauled the Exam Script Viewer UI to support dark mode themes seamlessly with a responsive two-column grid, sticky marks scorecard, and unified question hierarchy. Integrated Exam Viewer PDF export feature and session timeout fixes. Packaged as `v1.5.0`.

## Recent Decisions
- Refactored Exam Script Viewer question breakdown table hierarchy: replaced arbitrary zebra striping with grouped question section headers (`1`, `2`, `3`, `4`) and clean sub-question row grouping (`a`, `b`).
- Resolved Exam Script Viewer layout overflow: converted `.de-container` into a responsive CSS grid (`minmax(0, 1fr) 300px`), preventing the scanned PDF canvas from crushing or burying the right-hand scorecard column.
- Overhauled `ExamScriptViewer.aspx` dark mode theme integration: neutralized legacy `td[bgcolor="#F7F7F7"]` tables, unified panel cards, styled course pill selectors, and refactored question & marks tables to use theme variables (`--surface-card`, `--surface-sunken`, `--border-light`, `--accent`).
- Added Exam Viewer PDF Export engine with bundled jsPDF library, enabling direct PDF generation of student examination timetables and schedules.
- Fixed 401 redirect loop bug during portal session resets.
- Refined the timetable into a restrained digital-material system without horizontal scrolling, and fixed directory search input padding/clipping.

## Next Steps
1. User verification of the redesigned Exam Script Viewer in live student portal sessions across Dark and Light themes.
2. Verify directory routing stability in production environments.

## Open Questions / Blockers
- None.

## Last Updated
2026-08-30
