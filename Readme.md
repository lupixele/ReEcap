# ReEcap

A modern UI reskin for the AEC student portal — cleaner interface, same functionality.

ReEcap is a Chrome Extension that overlays a polished design system on top of the legacy ASP.NET student portal at `info.aec.edu.in`. It doesn't touch forms, postbacks, or server logic — it purely enhances the visual experience.

## Installation 

You can install ReEcap directly into Google Chrome, Microsoft Edge, Brave, or any Chromium-based browser right from the latest GitHub Release!

1. Go to the [ReEcap Releases section](https://github.com/lupixele/ReEcap/releases/).
2. Download the latest `.zip` file from the **Assets** section at the bottom of the release notes (e.g., `ReEcap-v1.3.3.zip`).
3. Extract (unzip) the file into a folder on your computer. 
4. Open Chrome and go to `chrome://extensions/` (or `edge://extensions/` if using Edge).
5. Turn on **Developer mode** using the toggle switch in the top right corner.
6. Click the **Load unpacked** button.
7. Select the folder where you extracted the `.zip` file.
8. That's it! Log into `info.aec.edu.in` and watch the redesign snap into place.

> *Note: Since this is an unpacked developer extension, Chrome might occasionally ask if you want to disable developer mode extensions upon boot. Just click "Cancel" or the "X" if prompted.*

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
| **Dark** | Comfortable charcoal with restrained coral ambience for extended sessions |
| **Cappuccino** | Coffee-toned warmth with a brown accent |
| **AMOLED** | True-black OLED aesthetic with minimally lifted cards and dramatic coral glow |
| **Evergreen** | Scholarly sage-and-forest palette with calm botanical character |
| **Midnight** | Deep navy late-night study mode with a crisp sapphire accent |
| **Rosewood** | Soft dusty rose and mauve palette with modern warm contrast |

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
