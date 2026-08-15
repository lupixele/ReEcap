# ReEcap Theme System Restructure: Color Families with Light/Dark Pairs

## Context

We have completed the 7 flat theme build. Now we are performing an architectural restructure: organizing themes into **color families**, each with a **light** and **dark** variant (except **AMOLED**, which remains standalone and singular).

| Family | Light variant (`data-theme`) | Dark variant (`data-theme`) |
|---|---|---|
| **Original** | `light` *(existing)* | `dark` *(existing)* |
| **Cappuccino** | `cappuccino-light` *(was `cappuccino`)* | `cappuccino-dark` *(new)* |
| **Evergreen** | `evergreen-light` *(was `evergreen`)* | `evergreen-dark` *(new)* |
| **Midnight** | `midnight-light` *(new)* | `midnight-dark` *(was `midnight`)* |
| **Rosewood** | `rosewood-light` *(was `rosewood`)* | `rosewood-dark` *(new)* |
| **Standalone** | -- | `amoled` *(existing)* |

## Proposed Token Palettes for 4 New Variants

Every new variant defines all 25 production tokens. Why these exact values?
- **Light variants** (`midnight-light`) use `1px solid var(--border)`, zero ambient glow, and high-contrast text.
- **Dark variants** (`cappuccino-dark`, `evergreen-dark`, `rosewood-dark`) use `border: none`, elevated card surfaces, a 1px white-alpha rim in `--card-shadow`, and an accent-tinted `--ambient-glow` (~50px at `0.10–0.12` opacity) to maintain ReEcap's dark mode design rule.

### 1. Dark Cappuccino (`cappuccino-dark`)
*Deep roasted coffee, espresso, and warm cocoa.*
- Surrounding background flips from cream (`#EDE1D3`) to espresso (`#171311`); cards flip from white-cream (`#FBF5EC`) to cocoa (`#211C19`).
- Text flips to cream (`#F5EBDF`), achieving **13.2:1 AAA** contrast.
- `--accent` stays `#935729`, but `--accent-dark` brightens to `#C77E4A` for legibility against dark backgrounds.

```css
html[data-theme="cappuccino-dark"] {
  --surface-page: #171311;
  --surface-page-glow: radial-gradient(ellipse 900px 500px at 20% -10%, rgba(147, 87, 41, 0.12) 0%, transparent 60%), radial-gradient(ellipse 700px 500px at 90% 10%, rgba(107, 61, 27, 0.06) 0%, transparent 60%), #171311;
  --surface-card: #211C19;
  --surface-sunken: #2A2420;
  --surface-strip: #0E0C0A;
  --surface-strip-text: #F5EBDF;
  --surface-strip-text-muted: #A6907E;
  --text-primary: #F5EBDF;
  --text-secondary: #B8A596;
  --text-faint: #7A6A5D;
  --border: #3B322C;
  --border-light: rgba(245, 235, 223, 0.06);
  --accent: #935729;
  --accent-dark: #C77E4A;
  --accent-soft: #3A241A;
  --success: #6A9E58;
  --success-soft: #1A2814;
  --warning: #D4A959;
  --warning-soft: #302310;
  --danger: #C75A40;
  --error: #C75A40;
  --surface-hover: #2E2723;
  --card-shadow: 0 0 0 1px rgba(245, 235, 223, 0.04), 0 8px 24px rgba(0, 0, 0, 0.40);
  --card-border: none;
  --ambient-glow: 0 0 50px rgba(147, 87, 41, 0.12);
}
```

### 2. Dark Evergreen (`evergreen-dark`)
*Deep pine forest at twilight. Tranquil green-black atmosphere.*
- Background flips from pale sage (`#EDF2ED`) to pine-black (`#101713`); cards to spruce (`#18221C`), reaching **12.1:1 AAA** text contrast.
- Notice how `--accent` is botanical green (`#3A9963`), while `--success` is shifted toward teal/seafoam (`#4EAE9A`) so status badges never visually merge with primary brand buttons.

```css
html[data-theme="evergreen-dark"] {
  --surface-page: #101713;
  --surface-page-glow: radial-gradient(ellipse 900px 500px at 20% -10%, rgba(45, 122, 79, 0.10) 0%, transparent 60%), radial-gradient(ellipse 700px 500px at 90% 10%, rgba(58, 122, 106, 0.06) 0%, transparent 60%), #101713;
  --surface-card: #18221C;
  --surface-sunken: #202E26;
  --surface-strip: #090E0B;
  --surface-strip-text: #E8F0EA;
  --surface-strip-text-muted: #8EA696;
  --text-primary: #E8F0EA;
  --text-secondary: #9CB5A5;
  --text-faint: #6B8272;
  --border: #2F4236;
  --border-light: rgba(232, 240, 234, 0.05);
  --accent: #3A9963;
  --accent-dark: #60BE88;
  --accent-soft: #1C3626;
  --success: #4EAE9A;
  --success-soft: #142E28;
  --warning: #DEBB66;
  --warning-soft: #2C2512;
  --danger: #D46352;
  --error: #D46352;
  --surface-hover: #243329;
  --card-shadow: 0 0 0 1px rgba(232, 240, 234, 0.04), 0 8px 24px rgba(0, 0, 0, 0.45);
  --card-border: none;
  --ambient-glow: 0 0 50px rgba(58, 153, 99, 0.10);
}
```

### 3. Light Midnight (`midnight-light`)
*Crisp morning sky and porcelain blue. Clean, airy day mode.*
- Flips navy `#040810` to ice blue `#EEF3FB` and white `#FFFFFF` cards (**16.1:1 AAA** text contrast).
- Accent shifts from dark mode's electric blue to rich royal sapphire (`#2B6CE0`), achieving **5.7:1 AA** against white cards.
- Restores `1px solid var(--border)` and zeros out glow.

```css
html[data-theme="midnight-light"] {
  --surface-page: #EEF3FB;
  --surface-page-glow: radial-gradient(circle at 12% 0%, #F5F8FF 0%, #EEF3FB 55%);
  --surface-card: #FFFFFF;
  --surface-sunken: #E4ECF8;
  --surface-strip: #0A1428;
  --surface-strip-text: #FFFFFF;
  --surface-strip-text-muted: #8A9ABF;
  --text-primary: #0F192D;
  --text-secondary: #4B5C80;
  --text-faint: #8A9ABF;
  --border: #D0DFFA;
  --border-light: rgba(15, 25, 45, 0.06);
  --accent: #2B6CE0;
  --accent-dark: #1C4CB0;
  --accent-soft: #DCEEDD;
  --success: #2A8C5A;
  --success-soft: #D6F5E6;
  --warning: #A87B1C;
  --warning-soft: #F7ECCB;
  --danger: #D43F35;
  --error: #D43F35;
  --surface-hover: #E2ECFA;
  --card-shadow: 0 1px 2px rgba(15, 25, 45, 0.05), 0 6px 18px rgba(15, 25, 45, 0.07);
  --card-border: 1px solid var(--border);
  --ambient-glow: 0 0 0 transparent;
}
```

### 4. Dark Rosewood (`rosewood-dark`)
*Dusky burgundy, aged wine, and velvety plum.*
- Flips pale blush (`#F4EDEE`) to plum-black (`#171214`) and burgundy-grey cards (`#20191C`), giving **13.5:1 AAA** contrast.
- Colour-vision safe: cool mauve accent (`#C76B80`) vs pure chromatic warm red error (`#E25B5B`) vs emerald success (`#5FBE85`).

```css
html[data-theme="rosewood-dark"] {
  --surface-page: #171214;
  --surface-page-glow: radial-gradient(ellipse 900px 500px at 20% -10%, rgba(158, 75, 94, 0.12) 0%, transparent 60%), radial-gradient(ellipse 700px 500px at 90% 10%, rgba(122, 53, 72, 0.06) 0%, transparent 60%), #171214;
  --surface-card: #20191C;
  --surface-sunken: #2A2125;
  --surface-strip: #0D0B0C;
  --surface-strip-text: #FAF2F4;
  --surface-strip-text-muted: #B8A0A8;
  --text-primary: #FAF2F4;
  --text-secondary: #B8A0A8;
  --text-faint: #78646C;
  --border: #3B2F34;
  --border-light: rgba(250, 242, 244, 0.06);
  --accent: #C76B80;
  --accent-dark: #E096A8;
  --accent-soft: #3A242B;
  --success: #5FBE85;
  --success-soft: #162E21;
  --warning: #D4A959;
  --warning-soft: #302511;
  --danger: #E25B5B;
  --error: #E25B5B;
  --surface-hover: #2B2226;
  --card-shadow: 0 0 0 1px rgba(250, 242, 244, 0.04), 0 8px 24px rgba(0, 0, 0, 0.42);
  --card-border: none;
  --ambient-glow: 0 0 50px rgba(199, 107, 128, 0.12);
}
```

---

## Storage & Data Architecture

We store two keys in `chrome.storage.sync`:
```javascript
{
  enabled: true,            // boolean, unchanged
  themeFamily: "original",  // "original" | "cappuccino" | "evergreen" | "midnight" | "rosewood" | "amoled"
  themeMode: "light"        // "light" | "dark"  (ignored when themeFamily === "amoled")
}
```

### Why two separate keys (`themeFamily` + `themeMode`) instead of one (`theme: "cappuccino-dark"`)?
1. **Clean Popup UI Binding**: Two separate switcher controls (Color Family and Mode) map 1:1 to two storage properties. When a user clicks "Dark" in the Mode switcher, we only update `themeMode: "dark"` without needing to parse or split strings.
2. **Preference Persistence Across Family Switches**: If a user prefers Dark mode and switches family from `Original` to `Evergreen`, their mode preference (`dark`) stays intact automatically—they immediately see Dark Evergreen without having to toggle mode again!

### The Resolution Function
To keep `content.js` and message passing 100% generic and string-agnostic, we resolve the two storage values into a single CSS string:

```javascript
function resolveTheme(family, mode) {
  if (family === "amoled") return "amoled";
  if (family === "original") return mode; // returns "light" or "dark" (legacy names untouched)
  return `${family}-${mode}`;             // returns "cappuccino-light", "cappuccino-dark", etc.
}
```
*Note: In `style.css` and `popup.html`, we will rename the selector `html[data-theme="cappuccino"]` to `html[data-theme="cappuccino-light"]`, `evergreen` to `evergreen-light`, `rosewood` to `rosewood-light`, and `midnight` to `midnight-dark`. Notice how `original` (`light`/`dark`) and `amoled` keep their exact existing CSS selector names.*

### Transparent Migration for Existing Users
When `popup.js` or `content.js` reads from storage, we run an inline migration before setting attributes:

```javascript
function migrateThemeStorage(data, callback) {
  if (data.themeFamily) {
    callback({ family: data.themeFamily, mode: data.themeMode || "light" });
    return;
  }
  const LEGACY_MAP = {
    "light":      { family: "original",    mode: "light" },
    "dark":       { family: "original",    mode: "dark"  },
    "cappuccino": { family: "cappuccino",  mode: "light" },
    "amoled":     { family: "amoled",      mode: "dark"  },
    "evergreen":  { family: "evergreen",   mode: "light" },
    "midnight":   { family: "midnight",    mode: "dark"  },
    "rosewood":   { family: "rosewood",    mode: "light" },
  };
  const mapped = LEGACY_MAP[data.theme || "light"] || { family: "original", mode: "light" };
  chrome.storage.sync.set({ themeFamily: mapped.family, themeMode: mapped.mode, theme: null });
  callback(mapped);
}
```

---

## Popup UI: Two-Tier Structure

In `popup.html`, we replace the single `.theme-switcher` with two distinct sections that fit cleanly inside our 290px fixed body:

```html
<div class="theme-row">
  <span class="theme-row-label">Color Family</span>
  <div class="theme-switcher id="familySwitcher">
    <button class="theme-btn" data-family="original">Original</button>
    <button class="theme-btn" data-family="cappuccino">Cappuccino</button>
    <button class="theme-btn" data-family="evergreen">Evergreen</button>
    <button class="theme-btn" data-family="midnight">Midnight</button>
    <button class="theme-btn" data-family="rosewood">Rosewood</button>
    <button class="theme-btn" data-family="amoled">AMOLED</button>
  </div>
</div>

<div class="divider"></div>

<div class="theme-row" id="modeRow">
  <span class="theme-row-label">Mode</span>
  <div class="mode-switcher" id="modeSwitcher">
    <button class="mode-btn" data-mode="light">Light</button>
    <button class="mode-btn" data-mode="dark">Dark</button>
  </div>
</div>
```

### Layout & Animations
- **Family Switcher**: A 2-column grid (`grid-template-columns: repeat(2, minmax(0, 1fr))`). 6 even options = 3 neat rows, no odd-button centering needed.
- **Mode Toggle**: A 2-column grid (`.mode-switcher`) for Light and Dark.
- **AMOLED Handling**: When `themeFamily === "amoled"`, `#modeRow` gets class `is-disabled` (opacity 0.4, pointer-events none, grayscale) or is cleanly greyed out since AMOLED has no light mode.
- **Reduced Motion**: All `.theme-btn` and `.mode-btn` hover/active transitions respect `@media (prefers-reduced-motion: reduce)`.

---

## Verification Plan

1. **Static Validation**:
   - `node -c extension/content.js` and `node -c extension/popup.js`.
   - `git diff --check`.
2. **Token Completeness Check**:
   - Run Python audit script over `style.css` and `popup.html` to guarantee all 11 themes (2 original + 2 cappuccino + 2 evergreen + 2 midnight + 2 rosewood + 1 amoled) define 100% of required tokens.
3. **Live Portal Visual Validation**:
   - Verify selecting each Family + Mode combo updates the live page without reload.
   - Verify AMOLED disables the Mode toggle cleanly.
