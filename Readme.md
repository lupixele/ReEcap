# ReEcap

A modern UI reskin for the AEC student portal — cleaner interface, same functionality.

ReEcap is a Chrome Extension that overlays a polished design system on top of the legacy ASP.NET student portal at `info.aec.edu.in`. It doesn't touch forms, postbacks, or server logic — it purely enhances the visual experience.

## Features

- **Overview Page (Default Landing)** — Standalone modern landing page summarizing the student's day at a glance: Status Strip, Attendance Ring, Active Backlogs, Fee Balance, Today's Schedule timeline, and 1-click Quick Links.
- **Unified Masthead** — Branded header with student avatar, name, and quick-action pills (Change Password, Logout).
- **Redesigned Sidebar** — Standalone Overview link plus categorized navigation (Academics / Finance / Account) with SVG icons and collapsible groups.
- **Clean Profile Separation** — Dashboard cards live exclusively on Overview, leaving the Profile page clean with only its categorized data tabs.
- **Bio-Data Redesign** — Clean grid layout for personal, academic, and contact details.
- **Timetable Grid** — CSS Grid timetable with hover tooltips showing subject, faculty, and room.
- **Status Strip** — Live clock, student identity badge, and current/next class banner located at the top of the Overview page.
- **Profile Tabs** — Modern pill-style tabs replacing the legacy jQuery UI accordion.
- **Iframe Management** — Auto-resize, transparent backgrounds, title sync, and sidebar active-state tracking.
- **Instant Toggle & Caching** — Enable/disable the reskin without reloading the page, with local caching for instant repeat display.

## Themes

| Theme | Description |
|---|---|
| **Light** | Warm cream tones with a muted red accent |
| **Dark** | Near-black with ambient coral glow gradients |
| **Cappuccino** | Coffee-toned warmth with a brown accent |

Switch themes instantly from the extension popup. Changes apply without a page reload.

## Installation

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the `extension/` folder.
5. Navigate to `info.aec.edu.in` — the reskin activates automatically.

## File Structure

```
extension/
├── manifest.json      # Chrome Extension config (Manifest V3)
├── content.js         # Stylesheet injector, theme manager, iframe sync
├── decorators.js      # DOM decorators — masthead, sidebar, dashboard, timetable, status strip
├── style.css          # Complete design system (~1200 lines, 3 themes)
├── popup.html         # Settings popup UI
├── popup.js           # Popup toggle & theme logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Architecture

- **Non-destructive** — All changes are CSS overrides + injected DOM. Legacy elements are hidden, not removed. No ASP.NET postbacks or form data are touched.
- **Inter-frame messaging** — The portal uses iframes. Data flows via `window.postMessage` (title, profile data, resize events) and `chrome.storage.local` (timetable cache, identity cache).
- **Live updates** — The popup sends `REECAP_TOGGLE` and `REECAP_THEME` messages to content scripts for instant feedback.
- **Runs at `document_start`** in `all_frames: true` to catch both the parent shell and child iframes.

## Typography

| Font | Usage |
|---|---|
| **Space Grotesk** | Headings, brand title, section titles |
| **Inter** | Body text, data values, buttons |
| **JetBrains Mono** | Labels, metadata, monospace elements |

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Persist toggle state, theme preference, sidebar collapse state, and cached timetable data |
| `activeTab` | Send live toggle/theme messages to the active tab |
