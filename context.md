# ReEcap — Project Context

> Snapshot captured after the **Login Page Redesign + Extension Identity Restyle** work (July 2026). Read this before touching any file in `extension/`, `Implementation/`, or `.claude/`.

---

## 1. What ReEcap Is

ReEcap is a Manifest V3 Chrome extension that visually reskins the AEC student portal at `https://info.aec.edu.in/aus/`. It is **CSS-only** with a thin JS layer for theme storage and message routing — it does not change functionality, form submission, or authentication in any way.

- **Manifest**: `extension/manifest.json` — name "ReEcap", version 1.0.0
- **Description**: "A modern reskin for the AEC student portal — cleaner UI, same functionality."
- **Matches**: `*://info.aec.edu.in/*` (matches all pages of the portal)
- **Permissions**: `storage`, `activeTab`

### Architecture

| File | Role |
|---|---|
| `extension/content.js` | Injects/removes the stylesheet, applies the active `data-theme` attribute, iframe background transparency, sidebar active-state sync. |
| `extension/decorators.js` | DOM-reading decorative enhancements (login page redesign, masthead injection, sidebar rebuild, status strip, profile dashboard, timetable grid). |
| `extension/style.css` | The full design system + 11 theme blocks + per-page overrides. |
| `extension/popup.html` / `popup.js` | The browser-action popup (290px wide) — toggle, family picker, mode picker. |
| `extension/icons/icon{16,48,128}.png` + `icon.svg` | Extension iconography. |

---

## 2. Token System

The design system is defined by **CSS custom properties** under `html[data-theme="..."]` selectors in `extension/style.css` and an identical subset inlined in `extension/popup.html`.

### Shared structural tokens (in `:root`)
- `--radius: 14px`
- `--radius-sm: 9px`

### Per-theme tokens (26 per variant)
**Surfaces:** `--surface-page`, `--surface-page-glow`, `--surface-card`, `--surface-sunken`, `--surface-strip`, `--surface-strip-text`, `--surface-strip-text-muted`, `--surface-hover`

**Text:** `--text-primary`, `--text-secondary`, `--text-faint`

**Borders:** `--border`, `--border-light`

**Accent/Semantic:** `--accent`, `--accent-dark`, `--accent-soft`, `--success`, `--success-soft`, `--warning`, `--warning-soft`, `--danger`, `--error`

**Elevation/Effects:** `--card-shadow`, `--card-border`, `--ambient-glow`

**Popup-only:** `--knob` (toggle switch knob color)

### Typography Stack
- **Display / Brand:** `'Space Grotesk'` — bold, tight tracking (`-0.04em`), for "ReEcap" wordmark
- **Eyebrow / Mono:** `'JetBrains Mono'` — 10–12px, bold, uppercase, `0.12em` tracking — for section labels ("Color Family", "Mode", "Student Portal", "AEC Portal Reskin")
- **Body / UI:** `'Inter'` — for primary text and form inputs

All three are loaded via Google Fonts (`@import` in `popup.html`, `<link>` in `content.js`).

---

## 3. The 11 Color-Family + Mode Variants

The popup now exposes **two-tier theme selection** — Family + Mode — stored as two keys in `chrome.storage.sync`:

```javascript
{
  enabled: true,            // boolean
  themeFamily: "original",  // one of 6 families
  themeMode: "light"        // "light" | "dark" (ignored when family === "amoled")
}
```

### Resolution

```javascript
function resolveTheme(family, mode) {
  if (family === "amoled") return "amoled";        // standalone, no mode
  if (family === "original") return mode;           // legacy "light"/"dark"
  return `${family}-${mode}`;                       // e.g. "cappuccino-light"
}
```

### Variant Matrix

| Family | `data-theme` selector | Accent character |
|---|---|---|
| Original | `light` / `dark` | `#C1432E` coral / `#E0654C` warmer coral |
| Cappuccino | `cappuccino-light` / `cappuccino-dark` | `#935729` warm coffee |
| Evergreen | `evergreen-light` / `evergreen-dark` | `#2D7A4F` / `#3A9963` botanical green |
| Midnight | `midnight-light` / `midnight-dark` | `#2B6CE0` royal / `#5B9CF5` electric |
| Rosewood | `rosewood-light` / `rosewood-dark` | `#9E4B5E` mauve / `#C76B80` soft pink |
| AMOLED | `amoled` (single, dark-only) | `#E8705A` |
| (Bootstrap-respecting) | `light` only (legacy) | `#0b5299` blue |

### Design Rules
- **Light variants** use `border: 1px solid var(--border)`, no ambient glow, high-contrast text.
- **Dark variants** use `border: none`, elevated card surfaces, 1px white-alpha rim in `--card-shadow`, and an accent-tinted `--ambient-glow` (~50px at 0.10 opacity).
- **AMOLED** is the most extreme (`--surface-page: #000000`) with an accent halo at 0.12 opacity.

### Migration
`migrateThemeStorage()` runs transparently on every extension load, mapping the legacy single `theme` key (e.g. `"cappuccino"`) to the new (`"cappuccino"` family, `"light"` mode) split, then clearing the legacy key.

---

## 4. Pages and How They're Decorated

### Page Detection (in `content_scripts` → both `content.js` and `decorators.js`)
The extension uses **JavaScript URL-path detection**, not CSS-only selectors. `initDecorators()` checks `window.location.pathname`:

| URL contains | What runs |
|---|---|
| `studentmaster.aspx` | `buildSidebar()`, `rebuildMainLayout()`, `initStatusStrip()`, iframe resize listener, masthead injection |
| `studentprofile.aspx` | `observeProfileDashboard()` → `buildProfileDashboard()` (metric cards + redesign tabs) |
| `studenttimetableoption.aspx` | `observeTimetable()` → `buildTimetableDashboard()` (CSS-grid timetable with tooltips) |
| `default.aspx` | `redesignLoginPage()` (the Ambient Glow Stage redesign) |

When running inside an iframe (any other path under `*.aspx`), the extension sends the page's `.MainHead` title to the parent window and hides the legacy title bar.

### Per-Page Architectural Notes
- **Masthead** — `.masthead` injected above the original layout table, hiding the legacy `.userData` row. Carries the avatar, user name, change-password link, and logout, branded as "Student Portal → ReEcap".
- **Sidebar** — `buildSidebar()` rebuilds the `ul.menu` list into a sectioned sidebar: Academics, Finance, Account. Each link gets `.reecap-sidebar-link` with an inline SVG icon and a separate text label.
- **Status Strip** — `initStatusStrip()` pulls attendance % and next class data from the timetable (saved to `chrome.storage.local`) to display a dark ribbon above the iframe.
- **Profile Dashboard** — Bio-data, Profile tabs (BioData, Present Sem, Past Sem, Fees, Backlogs, Outings, Counseling, Disciplinary), and metric rings (SVG-generated stroke-dasharray circles for attendance/credits/credits-earned).
- **Timetable** — Replaces `#tbldetails` with a CSS Grid timetable; each class cell has a tooltip with full subject name, faculty, room.
- **Overview** — Lives inside the sidebar — clicking an "OVERVIEW" entry calls `showOverview()` which builds an in-place overview page (welcome card, metrics row, schedule row, quicklinks grid).
- **Login Page** — Now ambient glow stage (see Section 5).

---

## 5. The Login Page (Ambient Glow Stage)

The login page at `default.aspx` is fully redesigned — not a reskin of the legacy "Campus Connect" layout, but a wholesale replacement using ReEcap's tokens.

### Functional Elements (preserved, untouched)
- Radio group: `rbtParent` (default checked), `rbtStudent`, `rbtEmployee` — posts `userType=...`
- `txtUserId` text input
- `txtPassword` password input with client-side AES handlers (`encryptJSText`, `setValue`, `_onEmpKeyPress`)
- `hdnpwd` hidden encrypted password field
- `cf-turnstile` Cloudflare challenge widget (with sitekey `0x4AAAAAADWaG-6M0glAe8fI`)
- `btnLogin` submit button
- Footer links: "Terms and Conditions" → `terms.html`, "Online payment without login" → `olpayment.aspx`
- Hidden ASP.NET fields: `__VIEWSTATE`, `__VIEWSTATEGENERATOR`, `__EVENTVALIDATION`, `hdnDPToken`, `hdnonce`

### Removed/Replaced (DOM-presence, not form state)
- The original `<header>` containing the Aditya University logo
- The `CC_Logo.gif` Campus Connect animated GIF
- The `cctheme.png` illustration banner
- The `<canvas id="particles">` wave/ripple background and its drawing script
- The generic "LOGIN" title text

### What the redesign does
**Implemented by `redesignLoginPage()` in `decorators.js`:**
1. Sets `body.reecap-login-page` class
2. Tags `.col-*` wrappers around the hidden assets with `.reecap-login-original-art`
3. Tags `<main>` as `.reecap-login-stage`, container as `.reecap-login-container`, row as `.reecap-login-row`, the login-card column as `.reecap-login-card-column`
4. Replaces the "LOGIN" title with a brand block: SVG mark + "Student Portal" eyebrow + "ReEcap" wordmark + the subtitle "A cleaner way back into your academic workspace."
5. Inserts a "Continue as" eyebrow label above the role selector
6. Tags `<footer>` as `.reecap-login-footer`

**Implemented by CSS in `style.css` under `body.reecap-login-page`:**
- Full-bleed `var(--surface-page-glow)` background
- Two ambient-glow pseudo-elements (`:before` top-center blur 90px at 0.08 opacity, `:after` bottom-right blur 80px at 0.6 opacity in `--accent-soft`)
- Centered card layout: `display: grid; grid-template-rows: 1fr auto; min-height: 100vh;` on `#form1`
- Card: max-width 420px, padding 28px, `border-radius: calc(var(--radius) + 8px)`, dual shadow `--card-shadow + --ambient-glow`, glass `backdrop-filter: blur(14px)`, optional inner gradient overlay
- Role selector becomes a **segmented pill**: 3-column grid with `--surface-sunken` track and `--accent` fill on the checked segment (uses `:has(input[type="radio"]:checked)`)
- Inputs become pill-shaped sunken-background groups with `--accent` focus ring + 3px halo
- Submit becomes a full-width accent button with `text-transform: uppercase`, `letter-spacing: 0.12em`, and a 12 28 shadow
- Footer links restyled as a centered JetBrains Mono pill row
- Mobile (`<520px`): role selector collapses to 1 column, brand left-aligns, footer stacks

### Critical Constraints
- `color-mix(in srgb, var(--x) NN%, transparent)` is used extensively for tinted values — Chrome 111+ only
- `backdrop-filter` requires Chrome 76+
- All overrides use `!important` because the legacy Bootstrap CSS wins otherwise
- The form posts to `https://info.aec.edu.in/aus/default.aspx` — no JS interferes with that

---

## 6. Popup Design

### Width: 290px

### Layout
1. **Header** — 38×38 SVG logo mark (uses `fill="currentColor"` bound to `--accent`, white "R" mark inside) + title group ("ReEcap" Space Grotesk + "AEC Portal Reskin" JetBrains Mono eyebrow)
2. **Card container** with toggle row, divider, family selector, divider, mode selector
3. **Footer** — single line "Changes apply instantly." (JetBrains Mono, 10px)

### Toggle Row
- Label "Modern Theme" + Active/Disabled status (success/faint colored)
- Custom switch (48×26) → stores `enabled` in `chrome.storage.sync`

### Family Selector
- Section label: "Color Family" (JetBrains Mono eyebrow)
- 2-column grid of 6 buttons: Original, Cappuccino, Evergreen, Midnight, Rosewood, AMOLED
- Active = `--accent` background, white text
- Dispatches `chrome.storage.sync.set({ themeFamily, themeMode })` and `REECAP_THEME` message

### Mode Selector (Segmented Pill)
- Section label: "Mode" (JetBrains Mono eyebrow)
- A pill track with two `.mode-btn`s ("Light", "Dark")
- `.mode-pill-track` slides left/right via `transform: translateX(100%)` on `.right` class
- Active segment: `--accent` fill, white text, accent-tinted shadow on track
- Disabled when family === `amoled` (greyscale + `pointer-events: none`)

### JS Plumbing (`popup.js`)
- Resolves family+mode → data-theme string via `resolveTheme()`
- Migrates legacy `theme` storage key on load
- Listens for toggle, family, and mode click → `chrome.storage.sync.set` + `chrome.tabs.sendMessage`

---

## 7. Extension Icon

**File:** `extension/icons/icon.svg` is the design source of truth. PNGs at 16/48/128 must be generated from it.

### Design
- 128×128 viewBox
- Coral-red `#C1432E` rounded square, `rx=28` (≈22% — proportional radius)
- White "R" in Arial Bold, `font-size=76`, text-anchored at x=64, y=88
- Pure flat — no gradients, no inner borders, no double outlines

### Sizing Rule
- At 128px: full detailed R (76px text)
- At 48px: smaller proportional R
- At 16px: just the letter, maximized to 12px

### Theme Note
The mark in the popup and login page is rendered as an inline SVG with `fill="currentColor"` on the rect — it picks up `--accent` so each theme variant tints its mark accordingly. The toolbar icon PNG stays as the canonical coral-red mark.

---

## 8. Visual Reference Files

`Implementation/HTML reference/` contains reference snapshots saved from the live portal:

- `Default.html` — initial login page (old Campus Connect layout)
- `AUS _ Campus Connect.html` — same login page re-saved with our extension active (shows `data-theme="cappuccino-dark"` on `<html>` and the `reecap-stylesheet` link injected)
- `Default_files/` and `AUS _ Campus Connect_files/` — the assets referenced by those pages
- `StudentPayments_files/reporthead.png`, `TimeTableReport_files/reporthead.png` — used by the report tables
- `TimeTableReport.html`, `StudentPayments.html`, `StudentProfile.html`, `StudentTimetableOption.html`, `StudentMaster.aspx.html`, etc. — the other portal pages

These exist purely as ground-truth references for selectors and class names — do not ship them to the extension.

---

## 9. Conventions for Future Work

### When touching the design system
1. All theme-dependent CSS must use `var(--token)` — never hardcode colors
2. New theme variants should match the 26-token schema above + cover all original selectors
3. Run `node -c` on JS changes before committing
4. Verify the popup still renders correctly across all 11 themes (the popup inlines its own simplified token subset)

### When touching pages
1. **Never touch authentication logic** — login page must keep `name=`, `id=`, and `type=` attributes intact
2. **Never touch the Cloudflare Turnstile widget** — it's real security infrastructure
3. Page detection lives in `initDecorators()` — add a new path check before the existing four
4. Use `!important` liberally to override Bootstrap + legacy styles

### When touching JS
1. The extension's domain is `chrome.storage.sync` for prefs, `chrome.storage.local` for derived data (e.g. `reecapTimetable`)
2. Use the existing messaging protocol: `REECAP_TOGGLE` (enabled flag), `REECAP_THEME` (data-theme string), `REECAP_RESIZE` (iframe height up), `REECAP_SET_TITLE` (iframe title to parent)
3. The `run_at: document_start` directive means scripts run before page JS — guard against missing DOM with `document.readyState` checks
4. `all_frames: true` means scripts run in the parent shell AND every iframe — gate per-frame behavior with the path check

### When touching icons
1. `icon.svg` is the source — always update it first, then regenerate PNGs
2. The popup and login page use **inline SVG** (theme-aware) — never link to the PNG for those contexts

---

## 10. Recent Decisions

- **No Co-Authored-By line in commits.** User requested that Claude not appear as a co-author on any GitHub commit. From now on, commit author is the user alone — no `Co-Authored-By: Claude <noreply@anthropic.com>` trailer.

---

## 11. Toggling the Extension Off

The popup's "Modern Theme" toggle (top of card) sets `chrome.storage.sync.enabled = false`. Both `content.js` and `decorators.js` early-return if `data.enabled` is false. Toggling off:
- Removes the `<link rel="stylesheet" id="reecap-stylesheet">` tag from the page
- Stops reapplying the `data-theme` attribute (the page falls back to its original Bootstrap-styled appearance)
- Prevents any DOM decoration from running

The popup also dims the family/mode pickers when disabled (`.disabled` class on body → opacity 0.5 + pointer-events: none).

---

## 12. Open Work / Known Gaps

- **PNG icon regeneration** — the `icon{16,48,128}.png` files still hold the legacy gradient + double-border design from before this session. They need to be regenerated from the new `icon.svg`. Run any SVG-to-PNG converter on `extension/icons/icon.svg` to overwrite them.
- **No live preview verified yet** — the new login page, popup, and icon were built from CSS/HTML analysis. They'll need to be loaded into Chrome (chrome://extensions → load unpacked → select `extension/`) to visually verify against the live portal.
- **Side-by-side test across all 11 themes** — the `body.reecap-login-page` rules should be tested against `cappuccino-dark`, `evergreen-dark`, `midnight-dark`, `rosewood-dark`, `amoled`, and all four light variants to ensure `color-mix()` produces sensible tints in each context.
