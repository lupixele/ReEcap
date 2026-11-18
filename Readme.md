# ReEcap

A modern, high-performance UI reskin and academic workstation for the Aditya University / AEC student portal (`info.aec.edu.in`).

ReEcap is a Manifest V3 Chrome extension that completely overhauls the legacy ASP.NET WebForms portal into a responsive, accessible workstation following the design tokens, elevation hierarchy, and color mathematics of [zombieFox/nightTab](https://github.com/zombieFox/nightTab). It operates strictly on the client-side, preserving native postbacks, form state, and authentication without modifying server workflows.

---

## Key Features

### 1. Complete nightTab Design System Architecture
- **45 Original Presets across 6 Curated Categories**: Core & Modern (`app`, `nord`, `obsidian`, `paper`, `gruvbox`, `dracula`, `solarized`, `tokyo`), Minimal & Nordic (`minimal-light`, `minimal-dark`, `snow`, `mist`, `slate`, `mono`, `ash`, `quartz`), Cyberpunk & Neon (`outrun`, `neon`, `cyber`, `matrix`, `synthwave`, `laser`, `vapor`), Space & Midnight (`midnight`, `deepspace`, `galaxy`, `eclipse`, `void`, `black`, `nebula`), Organic & Earth (`mint`, `forest`, `terra`, `sage`, `desert`, `autumn`, `clay`, `moss`), Vivid & Creative (`acrid`, `sol`, `koto`, `candy`, `sunset`, `ocean`, `white`).
- **Mathematical 14-Shade HSL Color Engine**: Dynamic shade scaling calculated across baseline and contrast ranges.
- **Perceived Contrast Calculations**: Text contrast thresholds dynamically derived via ITU-R BT.709 perceived luminance constants to guarantee readability across all palettes.
- **Directional 4-Layer Elevation Physics**: Realistic soft drop shadows replacing legacy flat outlines.
- **Floating GUI Theme Toolbar**: Bottom-right floating action button featuring instant live search, category pills, dark/light toggle, and direct preset switching across top shell and child iframes.

### 2. Autonomous Aria AI Academic Co-Pilot
- **Integrated Assistant Shell**: Accessible via masthead action pill or keyboard shortcut (`Ctrl + /`), with slide-out drawer interface and scrim backdrop.
- **Live Academic Telemetry**: Directly aggregates student CGPA, SGPA, attendance percentage, active backlogs, fee dues, and today's schedule from portal records.
- **Strategic Advisory**: Identifies courses with lower grades, calculates exact bunk allowances using the university 75% attendance rule, and projects target semester SGPA.
- **Interactive Navigation Chips**: Action chips embedded in conversation allowing 1-click navigation to Attendance, Marks, Academic Calendar, Fees, or Timetable.
- **Advanced Block Markdown Parser**: Fully rendered headings, ordered/nested lists, task checkboxes, GitHub-flavored pipe tables, fenced code blocks, and blockquotes with streaming support.
- **Offline Intelligence Fallback**: Deterministic offline knowledge engine that provides advisory support even when offline.
- **Privacy-First Design**: Dynamic student name extraction; all personal identifiers and roll numbers are scrubbed client-side before any query reaches cloud endpoints.

### 3. Interactive College Timetable
- **Tactile Subject Cards**: Per-subject 12-shade token-derived palette with code badges, title clamp, and period timing.
- **Hover & Focus Detail Popovers**: Instant flyout cards with faculty details, room numbers, and period information.
- **Consecutive Class Merging**: Multi-period classes seamlessly merge into unified time blocks spanning continuous columns.
- **Mobile Day Switcher**: Responsive mobile view with day selector tabs (`Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`) and single-day focus cards.

### 4. 8-Semester Academic Calendar Hub
- **Official Batch Schedules**: Comprehensive schedules covering Semesters I through VIII, including Summer terms.
- **Interactive Features**: Instant keyword search, semester tab switcher, term dates, and live status chips (Completed, In Progress, Scheduled).
- **Dual-Path Navigation**: Accessible directly from sidebar navigation or when navigating to the academic calendar report.

### 5. Academic Overview Dashboard
- **Status Strip**: Live monospace clock, current class countdown banner, and student identity badge.
- **Metrics Grid**: Circular SVG attendance ring, verified backlogs card, and tuition fee balance card with direct payment action.
- **Split Timeline**: Real-time today's schedule column paired with the active semester examination schedule.

### 6. Refined Navigation & Workstation UI
- **Accordion Sidebar**: Accessible semantic categories (`Academics`, `Finance`, `Account`, `Services`) with single-open accordion behavior.
- **Independent Dual-Pane Scrolling**: Dedicated vertical scrolling containers for both sidebar and content panes with nightTab styled scrollbars that respond independently to cursor hover while pinning the top masthead.
- **Quick Navigation Search Palette**: Fast search modal across all portal sections and tools accessible directly from the sidebar.
- **Clean Masthead**: Pinned top navigation with teacher top tabs, student full name, Aria launcher, and native session controls without distracting accent lines.
- **Exam Script PDF Generator**: Canvas stitching tool on revaluation viewer generating multi-page exam booklets.

---

## Architecture & Technical Design

- **Non-Destructive DOM Decoration**: Client-side transformations preserve all ASP.NET hidden fields (`__VIEWSTATE`, `__EVENTVALIDATION`), form targets, and native postback routines.
- **Cross-Frame Synchronization**: Seamless two-way postMessage and storage bridge synchronizing theme tokens, dimensions, and navigation state between top window and child iframes.
- **Zero Telemetry & Private**: Runs entirely in the student's browser with no user tracking or external telemetry logging.
- **Zero Unicode Emojis**: Strictly utilizes SVG iconography and semantic status chips throughout the entire design system.

---

## Installation

You can install ReEcap directly into Google Chrome, Microsoft Edge, Brave, or any Chromium-based browser:

1. Clone or download this repository:
   ```bash
   git clone https://github.com/lupixele/ReEcap.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click **Load unpacked**.
5. Select the `extension/` directory inside the repository.
6. Navigate to `https://info.aec.edu.in/aus/` — ReEcap activates automatically.

---

## File Structure

```
ReEcap/
├── extension/
│   ├── manifest.json          # Manifest V3 configuration, permissions, content scripts
│   ├── content.js             # Theme initialization, storage listeners, cross-frame messaging
│   ├── decorators.js          # Core DOM transformations: Masthead, Sidebar, Dashboard, Timetable, Aria
│   ├── style.css              # Main design system styles and responsive layout overrides
│   ├── popup.html             # Browser-action extension popup UI
│   ├── popup.js               # Popup controller for presets, radius, and shadows
│   ├── pdf_generator.js       # Revaluation answer script canvas stitcher & PDF downloader
│   ├── shared/
│   │   ├── aria.js            # Aria AI assistant, offline engine, and academic calendar database
│   │   ├── theme.js           # nightTab color engine: 45 presets, 14-shade math, applyTheme
│   │   └── tokens.css         # nightTab CSS design tokens, shadows, semantic bridge
│   ├── lib/
│   │   └── jspdf.umd.min.js   # Vendor library for client-side PDF generation
│   └── icons/                 # Brand iconography (16, 32, 48, 64, 128px + SVG)
├── tests/                     # Regression test harnesses (Node & browser)
│   ├── aria-markdown.test.js  # Node test suite for Aria block markdown parser
│   ├── theme-architecture.test.js # Theme preset and token calculation suite
│   ├── fee-services.html      # Fee postback and payment proxy harness
│   ├── aria-view.html         # Aria UI components and token harness
│   └── biodata-overlap.html   # Profile biodata layout and wrapping harness
├── handoff.md                 # Authoritative technical handoff document
└── Readme.md                  # Public project documentation
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + /` (or `Cmd + /`) | Open / Close Aria AI Co-Pilot |
| `Escape` | Close active modals, drawers, or Aria Co-Pilot |
| `Enter` | Send message in Aria Composer |
| `Shift + Enter` | Insert newline in Aria Composer |

---

## License

MIT License. Designed for Aditya University students.
