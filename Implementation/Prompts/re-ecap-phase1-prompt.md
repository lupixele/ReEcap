# Re:Ecap — Phase 1 Build Prompt (for Antigravity)

## Project
**Re:Ecap** — a Chrome extension that visually restyles the AEC student portal
(`https://info.aec.edu.in/*`) with a cleaner, modern UI. Pure CSS/DOM cosmetic
layer only — no scraping, no automation, no network requests to any server,
no reading or transmitting page data anywhere. Everything runs locally in the
user's browser and only changes how the page *looks*.

## Scope for Phase 1
Build a Manifest V3 Chrome extension that:
1. Injects a stylesheet into all `info.aec.edu.in` pages.
2. Restyles shared layout chrome: top banner, left menu, user bar, content
   tables, buttons/inputs, popups/dialogs.
3. Has a popup with a single on/off toggle (state stored via
   `chrome.storage.sync`), so the user can disable it per-browser and see the
   original site if something looks broken.
4. Ships with placeholder icons (16/48/128px) — simple, clean, doesn't need
   to be final branding yet.

## Design direction
- Modern flat/card-based look: soft shadows, rounded corners (~8–10px),
  generous whitespace, a single primary accent color (blue/indigo range).
- Keep information density similar to the original — this is a re-skin, not
  a redesign. Don't hide or remove any functionality, links, or menu items.
- Must not break any `<iframe>`, postback (`__doPostBack`), or form
  submission behavior — CSS-only changes, no JS that touches page logic or
  intercepts form submits.
- Should gracefully do nothing (no console errors) on pages/elements that
  don't match known classes — treat every selector as optional.

## Known shared CSS classes/structure to target
(sourced from two real saved pages — `StudentMaster.aspx` shell and one
inner content page)

- Page shell: `body.bodyStyle`, `#imgHead` (banner image), `.newsBG`
- User bar: `.userData`, `#lblUser`, `a.welcomeLink`
- Left menu: `.linksBG`, `.LeftMenuHead`, `ul.menu`, `a.menuLink`, `.submenu`
- Content tables: `table.gvStyle`, `table.popupTable`, `.MainHead`,
  `.gvHeaderStyle`, `.evenRow`, row-shading classes like `.lightorange_1`,
  `.lightpurple_1`
- Buttons/inputs: standard ASP.NET `input[type=submit]`,
  `input[type=button]`, `input[type=text]`, `select`
- Popups: `#divGreetings`, similar dialog divs
- Content loads inside `<iframe name="capIframe">` on the shell page — make
  sure content-script `matches` covers iframe-loaded pages too, not just
  top-level navigation.

## Pages to gather HTML from before/during build (coverage sample)
Not exhaustive — just enough to catch classes/patterns not in the two
existing samples. Ask the user to save-as-HTML (after logging in normally)
for:
1. Attendance (`StudentAttendance.aspx`)
2. Marks (`StudentMarksReport.aspx`)
3. Exam details (`studentexamtimetable.aspx`)
4. Hall ticket (`studenthallticket.aspx`)
5. Fee details (`studentpayments.aspx`)
6. One popup/dialog if easily captured

If these aren't available yet, proceed with the two known samples and note
which pages are unverified — iterate live against the real site in DevTools
once the extension is loaded unpacked, since no login/credential access is
needed for a human simply browsing their own already-authenticated session.

## Explicit non-goals (do not build in Phase 1)
- No scraping, no data extraction, no timetable/attendance parsing.
- No automated login, no credential storage, no network calls out.
- No bypassing/interacting with any bot-detection or auth flow.
- No Firefox support yet (Chrome/Chromium only).

## Deliverable structure
```
re-ecap/
  manifest.json
  content.js        (injects/removes stylesheet based on toggle state)
  style.css          (all restyle rules)
  popup.html
  popup.js
  icons/
    icon16.png
    icon48.png
    icon128.png
```

## Acceptance check
- Load unpacked in Chrome, visit the real portal logged in normally.
- Menu, tables, banner, buttons all visibly restyled.
- Toggle off in popup → page reverts to original styling on refresh.
- No console errors on any visited page.
- All original links/buttons/postbacks still function identically.
