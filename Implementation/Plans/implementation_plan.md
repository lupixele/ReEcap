# Re:Ecap — Phase 1 Implementation Plan

A Manifest V3 Chrome extension that cosmetically reskins the AEC student portal (`info.aec.edu.in`) with a modern, flat/card-based UI. Pure CSS/DOM cosmetic layer only — no data access, no network requests, no automation.

---

## Proposed Changes

### Extension Root — `P:\Projects\ReEcap\re-ecap\`

#### [NEW] `manifest.json`
- MV3 manifest declaring:
  - `content_scripts` matching `*://info.aec.edu.in/*` (covers both top-level and iframe-loaded pages)
  - `web_accessible_resources` for `style.css`
  - `storage` permission (for toggle state via `chrome.storage.sync`)
  - `action` for the popup
  - Icon declarations (16/48/128)

#### [NEW] `content.js`
- On load: reads `chrome.storage.sync` for `enabled` flag (default `true`)
- If enabled: injects a `<link rel="stylesheet">` pointing to `chrome.runtime.getURL('style.css')`
- Listens for messages from the popup to toggle on/off in real-time (removes/re-injects the link tag)
- No interaction with page logic, forms, or postbacks — purely stylesheet injection/removal

#### [NEW] `style.css`
Full restyle targeting all known shared classes from the prompt. Design: **flat card-based**, rounded corners (8–10px), soft shadows, blue/indigo accent (`#4F6AF5` range), generous whitespace. Sections:

| Section | Selectors |
|---|---|
| Global reset/base | `body.bodyStyle`, fonts (`Inter` via Google Fonts @import) |
| Banner | `#imgHead`, `.newsBG` |
| User bar | `.userData`, `#lblUser`, `a.welcomeLink` |
| Left menu | `.linksBG`, `.LeftMenuHead`, `ul.menu`, `a.menuLink`, `.submenu` |
| Content tables | `table.gvStyle`, `table.popupTable`, `.MainHead`, `.gvHeaderStyle`, `.evenRow`, row-shading (`.lightorange_1`, `.lightpurple_1`, etc.) |
| Inputs/buttons | `input[type=submit]`, `input[type=button]`, `input[type=text]`, `select` |
| Popups/dialogs | `#divGreetings`, generic dialog divs |
| Scrollbars | Custom thin scrollbar for a polished feel |

All selectors are defensive — no `!important` overuse, no layout-breaking changes.

#### [NEW] `popup.html`
- Small, polished popup (320×auto) with:
  - Re:Ecap logo/name header
  - Single toggle switch (styled, accessible)
  - Status label ("Restyling active" / "Disabled")
  - Subtle footer note ("Refresh page to apply changes")
- Google Fonts loaded inline for consistent typography

#### [NEW] `popup.js`
- Reads `chrome.storage.sync` for `enabled` state, reflects it in the toggle
- On toggle change: writes new state to `chrome.storage.sync`, sends message to active tab's content script for live toggle (no refresh needed when possible)

#### [NEW] `icons/icon16.png`, `icon48.png`, `icon128.png`
- Clean, minimal icons — "Re" monogram on a blue/indigo gradient background, generated via `generate_image`

---

## Key Technical Decisions

1. **Iframe coverage**: `content_scripts` `matches` will use `"all_frames": true` so the CSS also applies inside `<iframe name="capIframe">` loaded inner pages.
2. **Toggle without full refresh**: content.js listens for `chrome.runtime.onMessage` to dynamically add/remove the stylesheet link — avoids requiring the user to manually refresh.
3. **Google Fonts**: Imported in `style.css` with `@import url(...)` — works fine in injected stylesheets within Chrome extensions.
4. **No `!important` abuse**: Use specificity carefully; only use `!important` where the original site's inline styles or high-specificity rules would otherwise win.
5. **Row shading normalization**: Original site uses many color classes (`.lightorange_1`, `.lightpurple_1`, etc.). These will be remapped to alternating neutral light shades to maintain readability without removing the class-based differentiation.
6. **Output location**: Extension files will be written to `P:\Projects\ReEcap\re-ecap\` (sibling to `Implementation\`).

---

## Open Questions

> [!IMPORTANT]
> **HTML samples**: The prompt mentions 6 pages to gather HTML from (Attendance, Marks, Exam, Hall Ticket, Fee, Popup). Do you have any of these saved already, or should I proceed with just the two known class lists from the prompt? I can always note unverified pages and iterate.

> [!NOTE]
> **Accent color**: The prompt says "blue/indigo range". I'll default to a rich indigo (`#4F6AF5`) as the primary accent. Let me know if you prefer a different shade or want to see a couple of options.

> [!NOTE]
> **Extension output path**: I'll place the extension at `P:\Projects\ReEcap\re-ecap\`. Confirm if you'd prefer a different location (e.g., directly inside `Implementation\`).

---

## Verification Plan

### Manual Verification
1. Load the extension unpacked in Chrome (`chrome://extensions` → Load unpacked → select `re-ecap/`)
2. Visit `https://info.aec.edu.in/` while logged in — confirm menu, tables, banner, buttons are visibly restyled
3. Open popup → toggle off → refresh → confirm original styling is restored
4. Toggle on → confirm restyle returns
5. Navigate to inner pages (Attendance, Marks, etc.) — confirm no console errors
6. Click menu links, submit forms — confirm all postbacks work identically
