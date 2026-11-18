// ReEcap — shared/theme.js
// nightTab Design System Theme Engine
// Single source of truth for the 45 original nightTab presets, mathematical
// 14-shade HSL scales, token-derived appearance filters, auto-contrast text,
// independent radius/shadow controls, and portal navigation matching.
//
// Exposes:
//   window.__reecap_theme.PRESETS
//   window.__reecap_theme.CATEGORIES ({ all, dark, light })
//   window.__reecap_theme.applyTheme(presetId, customOptions)
//   window.__reecap_theme.migrateThemeStorage(data)
//   window.__reecap_theme.getPresetAppearance(preset)
//   window.__reecap_theme.getPresetSwatch(preset)
//   window.__reecap_theme.hslToRgb(h, s, l)
//   window.__reecap_theme.calculateShades(preset)
//   window.__reecap_theme.PATH_MATCH_TABLE
//   window.__reecap_theme.matchActivePage(iframePath)

(function (global) {
  'use strict';

  // ─── Color Conversion Utilities ──────────────────────────────────────────

  function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4))
    };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  // ─── 45 Original nightTab Presets ────────────────────────────────────────

  // Each preset retains its upstream HSL range, contrast endpoints, accent,
  // font, radius, shadow, and initial style. The initial style controls the
  // direction of the original CSS scale mapping; it is not a user override.
  // Appearance filters are derived later from the rendered background token.

  const PRESETS = {
  "acrid": {
    "id": "acrid",
    "name": "Acrid",
    "color": {
      "range": {
        "primary": {
          "h": 301,
          "s": 32
        }
      },
      "contrast": {
        "start": 11,
        "end": 65
      }
    },
    "accent": {
      "hsl": {
        "h": 112,
        "s": 100,
        "l": 42
      },
      "rgb": {
        "r": 29,
        "g": 213,
        "b": 0
      }
    },
    "font": {
      "display": {
        "name": "Titillium Web",
        "weight": 400,
        "style": "italic"
      },
      "ui": {
        "name": "Inconsolata",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 30,
    "shadow": 75,
    "style": "dark"
  },
  "aerial": {
    "id": "aerial",
    "name": "Aerial",
    "color": {
      "range": {
        "primary": {
          "h": 200,
          "s": 27
        }
      },
      "contrast": {
        "start": 11,
        "end": 77
      }
    },
    "accent": {
      "hsl": {
        "h": 180,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 0,
        "g": 255,
        "b": 255
      }
    },
    "font": {
      "display": {
        "name": "Unica One",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Inria Sans",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 25,
    "shadow": 50,
    "style": "dark"
  },
  "app": {
    "id": "app",
    "name": "nightTab (default)",
    "color": {
      "range": {
        "primary": {
          "h": 222,
          "s": 14
        }
      },
      "contrast": {
        "start": 17,
        "end": 83
      },
      "shades": 14
    },
    "accent": {
      "hsl": {
        "h": 221,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 0,
        "g": 80,
        "b": 255
      }
    },
    "font": {
      "display": {
        "name": "Fjalla One",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Open Sans",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 25,
    "shadow": 75,
    "style": "dark"
  },
  "azure": {
    "id": "azure",
    "name": "Azure",
    "color": {
      "range": {
        "primary": {
          "h": 215,
          "s": 35
        }
      },
      "contrast": {
        "start": 13,
        "end": 40
      }
    },
    "accent": {
      "hsl": {
        "h": 180,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 0,
        "g": 255,
        "b": 255
      }
    },
    "font": {
      "display": {
        "name": "Unica One",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Inria Sans",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 25,
    "shadow": 50,
    "style": "dark"
  },
  "bean": {
    "id": "bean",
    "name": "Bean",
    "color": {
      "range": {
        "primary": {
          "h": 191,
          "s": 80
        }
      },
      "contrast": {
        "start": 7,
        "end": 65
      }
    },
    "accent": {
      "hsl": {
        "h": 38,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 255,
        "g": 160,
        "b": 0
      }
    },
    "font": {
      "display": {
        "name": "Life Savers",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Oswald",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 50,
    "shadow": 175,
    "style": "dark"
  },
  "black": {
    "id": "black",
    "name": "Black",
    "color": {
      "range": {
        "primary": {
          "h": 0,
          "s": 0
        }
      },
      "contrast": {
        "start": 0,
        "end": 100
      }
    },
    "accent": {
      "hsl": {
        "h": 0,
        "s": 0,
        "l": 80
      },
      "rgb": {
        "r": 204,
        "g": 204,
        "b": 204
      }
    },
    "font": {
      "display": {
        "name": "Fjalla One",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Open Sans",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 25,
    "shadow": 75,
    "style": "dark"
  },
  "comet": {
    "id": "comet",
    "name": "Comet",
    "color": {
      "range": {
        "primary": {
          "h": 207,
          "s": 87
        }
      },
      "contrast": {
        "start": 30,
        "end": 90
      }
    },
    "accent": {
      "hsl": {
        "h": 0,
        "s": 0,
        "l": 100
      },
      "rgb": {
        "r": 255,
        "g": 255,
        "b": 255
      }
    },
    "font": {
      "display": {
        "name": "Bungee Hairline",
        "weight": 700,
        "style": "normal"
      },
      "ui": {
        "name": "Quicksand",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 35,
    "shadow": 80,
    "style": "dark"
  },
  "corsair": {
    "id": "corsair",
    "name": "Corsair",
    "color": {
      "range": {
        "primary": {
          "h": 217,
          "s": 46
        }
      },
      "contrast": {
        "start": 18,
        "end": 74
      }
    },
    "accent": {
      "hsl": {
        "h": 59,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 255,
        "g": 251,
        "b": 0
      }
    },
    "font": {
      "display": {
        "name": "Alatsi",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Source Sans Pro",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 20,
    "shadow": 150,
    "style": "dark"
  },
  "dash": {
    "id": "dash",
    "name": "Dash",
    "color": {
      "range": {
        "primary": {
          "h": 211,
          "s": 10
        }
      },
      "contrast": {
        "start": 50,
        "end": 100
      }
    },
    "accent": {
      "hsl": {
        "h": 342,
        "s": 83,
        "l": 40
      },
      "rgb": {
        "r": 187,
        "g": 17,
        "b": 68
      }
    },
    "font": {
      "display": {
        "name": "Fredericka the Great",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Oswald",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 0,
    "shadow": 0,
    "style": "light"
  },
  "deco": {
    "id": "deco",
    "name": "Deco",
    "color": {
      "range": {
        "primary": {
          "h": 184,
          "s": 38
        }
      },
      "contrast": {
        "start": 22,
        "end": 75
      }
    },
    "accent": {
      "hsl": {
        "h": 0,
        "s": 100,
        "l": 82
      },
      "rgb": {
        "r": 255,
        "g": 161,
        "b": 161
      }
    },
    "font": {
      "display": {
        "name": "Poiret One",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Lato",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 200,
    "shadow": 50,
    "style": "dark"
  },
  "earthquake": {
    "id": "earthquake",
    "name": "Earthquake",
    "color": {
      "range": {
        "primary": {
          "h": 0,
          "s": 13
        }
      },
      "contrast": {
        "start": 15,
        "end": 40
      }
    },
    "accent": {
      "hsl": {
        "h": 48,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 255,
        "g": 204,
        "b": 0
      }
    },
    "font": {
      "display": {
        "name": "Tulpen One",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Barlow Condensed",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 80,
    "shadow": 100,
    "style": "dark"
  },
  "funkadelic": {
    "id": "funkadelic",
    "name": "Funkadelic",
    "color": {
      "range": {
        "primary": {
          "h": 307,
          "s": 100
        }
      },
      "contrast": {
        "start": 20,
        "end": 70
      }
    },
    "accent": {
      "hsl": {
        "h": 60,
        "s": 86,
        "l": 53
      },
      "rgb": {
        "r": 238,
        "g": 238,
        "b": 34
      }
    },
    "font": {
      "display": {
        "name": "Monoton",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Lato",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 120,
    "shadow": 0,
    "style": "dark"
  },
  "grimm": {
    "id": "grimm",
    "name": "Grimm",
    "color": {
      "range": {
        "primary": {
          "h": 283,
          "s": 7
        }
      },
      "contrast": {
        "start": 18,
        "end": 45
      }
    },
    "accent": {
      "hsl": {
        "h": 144,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 0,
        "g": 255,
        "b": 102
      }
    },
    "font": {
      "display": {
        "name": "Griffy",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Roboto Slab",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 100,
    "shadow": 150,
    "style": "dark"
  },
  "hive": {
    "id": "hive",
    "name": "Hive",
    "color": {
      "range": {
        "primary": {
          "h": 37,
          "s": 88
        }
      },
      "contrast": {
        "start": 33,
        "end": 100
      }
    },
    "accent": {
      "hsl": {
        "h": 210,
        "s": 60,
        "l": 23
      },
      "rgb": {
        "r": 23,
        "g": 59,
        "b": 94
      }
    },
    "font": {
      "display": {
        "name": "Kufam",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Inconsolata",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 25,
    "shadow": 0,
    "style": "dark"
  },
  "hypnos": {
    "id": "hypnos",
    "name": "Hypnos",
    "color": {
      "range": {
        "primary": {
          "h": 243,
          "s": 26
        }
      },
      "contrast": {
        "start": 15,
        "end": 50
      }
    },
    "accent": {
      "hsl": {
        "h": 30,
        "s": 100,
        "l": 80
      },
      "rgb": {
        "r": 255,
        "g": 204,
        "b": 153
      }
    },
    "font": {
      "display": {
        "name": "Shadows Into Light",
        "weight": 100,
        "style": "normal"
      },
      "ui": {
        "name": "Fira Code",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 60,
    "shadow": 25,
    "style": "dark"
  },
  "infrared": {
    "id": "infrared",
    "name": "Infrared",
    "color": {
      "range": {
        "primary": {
          "h": 359,
          "s": 100
        }
      },
      "contrast": {
        "start": 12,
        "end": 85
      }
    },
    "accent": {
      "hsl": {
        "h": 0,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 255,
        "g": 0,
        "b": 0
      }
    },
    "font": {
      "display": {
        "name": "Bellota",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Lexend",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 25,
    "shadow": 75,
    "style": "dark"
  },
  "kapow": {
    "id": "kapow",
    "name": "Kapow",
    "color": {
      "range": {
        "primary": {
          "h": 194,
          "s": 77
        }
      },
      "contrast": {
        "start": 24,
        "end": 54
      }
    },
    "accent": {
      "hsl": {
        "h": 115,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 21,
        "g": 255,
        "b": 0
      }
    },
    "font": {
      "display": {
        "name": "Bangers",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Sniglet",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 40,
    "shadow": 100,
    "style": "dark"
  },
  "koto": {
    "id": "koto",
    "name": "Koto",
    "color": {
      "range": {
        "primary": {
          "h": 231,
          "s": 56
        }
      },
      "contrast": {
        "start": 13,
        "end": 60
      }
    },
    "accent": {
      "hsl": {
        "h": 341,
        "s": 100,
        "l": 52
      },
      "rgb": {
        "r": 255,
        "g": 12,
        "b": 88
      }
    },
    "font": {
      "display": {
        "name": "Dosis",
        "weight": 200,
        "style": "normal"
      },
      "ui": {
        "name": "Montserrat",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 25,
    "shadow": 50,
    "style": "dark"
  },
  "lex": {
    "id": "lex",
    "name": "Lex",
    "color": {
      "range": {
        "primary": {
          "h": 278,
          "s": 73
        }
      },
      "contrast": {
        "start": 10,
        "end": 60
      }
    },
    "accent": {
      "hsl": {
        "h": 160,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 0,
        "g": 255,
        "b": 170
      }
    },
    "font": {
      "display": {
        "name": "Autour One",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Solway",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 10,
    "shadow": 100,
    "style": "dark"
  },
  "macaroon": {
    "id": "macaroon",
    "name": "Macaroon",
    "color": {
      "range": {
        "primary": {
          "h": 301,
          "s": 28
        }
      },
      "contrast": {
        "start": 55,
        "end": 80
      }
    },
    "accent": {
      "hsl": {
        "h": 241,
        "s": 51,
        "l": 62
      },
      "rgb": {
        "r": 110,
        "g": 109,
        "b": 208
      }
    },
    "font": {
      "display": {
        "name": "Calistoga",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Source Sans Pro",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 40,
    "shadow": 50,
    "style": "light"
  },
  "marker": {
    "id": "marker",
    "name": "Marker",
    "color": {
      "range": {
        "primary": {
          "h": 0,
          "s": 0
        }
      },
      "contrast": {
        "start": 56,
        "end": 96
      }
    },
    "accent": {
      "hsl": {
        "h": 210,
        "s": 33,
        "l": 20
      },
      "rgb": {
        "r": 34,
        "g": 51,
        "b": 68
      }
    },
    "font": {
      "display": {
        "name": "Permanent Marker",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Roboto Condensed",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 30,
    "shadow": 50,
    "style": "light"
  },
  "midnight": {
    "id": "midnight",
    "name": "Midnight",
    "color": {
      "range": {
        "primary": {
          "h": 221,
          "s": 40
        }
      },
      "contrast": {
        "start": 12,
        "end": 50
      }
    },
    "accent": {
      "hsl": {
        "h": 236,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 0,
        "g": 17,
        "b": 255
      }
    },
    "font": {
      "display": {
        "name": "Megrim",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Lato",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 50,
    "shadow": 75,
    "style": "dark"
  },
  "mint": {
    "id": "mint",
    "name": "Mint",
    "color": {
      "range": {
        "primary": {
          "h": 157,
          "s": 50
        }
      },
      "contrast": {
        "start": 12,
        "end": 50
      }
    },
    "accent": {
      "hsl": {
        "h": 169,
        "s": 100,
        "l": 68
      },
      "rgb": {
        "r": 94,
        "g": 255,
        "b": 226
      }
    },
    "font": {
      "display": {
        "name": "Unica One",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Montserrat",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 80,
    "shadow": 100,
    "style": "dark"
  },
  "neon": {
    "id": "neon",
    "name": "Neon",
    "color": {
      "range": {
        "primary": {
          "h": 219,
          "s": 45,
          "l": 22
        }
      },
      "contrast": {
        "start": 15,
        "end": 85
      }
    },
    "accent": {
      "hsl": {
        "h": 192,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 0,
        "g": 204,
        "b": 255
      }
    },
    "font": {
      "display": {
        "name": "Dosis",
        "weight": 300,
        "style": "normal"
      },
      "ui": {
        "name": "Inria Sans",
        "weight": 300,
        "style": "normal"
      }
    },
    "radius": 25,
    "shadow": 100,
    "style": "dark"
  },
  "nord": {
    "id": "nord",
    "name": "Nord",
    "color": {
      "range": {
        "primary": {
          "h": 220,
          "s": 16
        }
      },
      "contrast": {
        "start": 15,
        "end": 50
      }
    },
    "accent": {
      "hsl": {
        "h": 213,
        "s": 32,
        "l": 52
      },
      "rgb": {
        "r": 94,
        "g": 129,
        "b": 172
      }
    },
    "font": {
      "display": {
        "name": "Rubik",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Inter",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 75,
    "shadow": 100,
    "style": "dark"
  },
  "obsidian": {
    "id": "obsidian",
    "name": "Obsidian",
    "color": {
      "range": {
        "primary": {
          "h": 200,
          "s": 10
        }
      },
      "contrast": {
        "start": 5,
        "end": 50
      }
    },
    "accent": {
      "hsl": {
        "h": 180,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 0,
        "g": 255,
        "b": 255
      }
    },
    "font": {
      "display": {
        "name": "Zilla Slab",
        "weight": 700,
        "style": "normal"
      },
      "ui": {
        "name": "Montserrat",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 25,
    "shadow": 200,
    "style": "dark"
  },
  "origin": {
    "id": "origin",
    "name": "Origin",
    "color": {
      "range": {
        "primary": {
          "h": 222,
          "s": 14
        }
      },
      "contrast": {
        "start": 8,
        "end": 88
      }
    },
    "accent": {
      "hsl": {
        "h": 30,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 255,
        "g": 128,
        "b": 0
      }
    },
    "font": {
      "display": {
        "name": "Fira Sans",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Noto Sans",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 50,
    "shadow": 75,
    "style": "dark"
  },
  "outrun": {
    "id": "outrun",
    "name": "Outrun",
    "color": {
      "range": {
        "primary": {
          "h": 227,
          "s": 52
        }
      },
      "contrast": {
        "start": 20,
        "end": 80
      }
    },
    "accent": {
      "hsl": {
        "h": 316,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 255,
        "g": 0,
        "b": 187
      }
    },
    "font": {
      "display": {
        "name": "Major Mono Display",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Roboto Condensed",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 25,
    "shadow": 0,
    "style": "dark"
  },
  "pepper": {
    "id": "pepper",
    "name": "Pepper",
    "color": {
      "range": {
        "primary": {
          "h": 0,
          "s": 69
        }
      },
      "contrast": {
        "start": 15,
        "end": 80
      }
    },
    "accent": {
      "rgb": {
        "r": 255,
        "g": 150,
        "b": 0
      },
      "hsl": {
        "h": 35,
        "s": 100,
        "l": 50
      }
    },
    "font": {
      "display": {
        "name": "Big Shoulders Display",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Montserrat",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 60,
    "shadow": 100,
    "style": "dark"
  },
  "point": {
    "id": "point",
    "name": "Point",
    "color": {
      "range": {
        "primary": {
          "h": 146,
          "s": 20,
          "l": 24
        }
      },
      "contrast": {
        "start": 20,
        "end": 60
      }
    },
    "accent": {
      "hsl": {
        "h": 30,
        "s": 80,
        "l": 63
      },
      "rgb": {
        "r": 236,
        "g": 161,
        "b": 85
      }
    },
    "font": {
      "display": {
        "name": "Klee One",
        "weight": 600,
        "style": "normal"
      },
      "ui": {
        "name": "Klee One",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 25,
    "shadow": 125,
    "style": "dark"
  },
  "pumpkin": {
    "id": "pumpkin",
    "name": "Pumpkin",
    "color": {
      "range": {
        "primary": {
          "h": 198,
          "s": 0
        }
      },
      "contrast": {
        "start": 10,
        "end": 60
      }
    },
    "accent": {
      "hsl": {
        "h": 25,
        "s": 86,
        "l": 53
      },
      "rgb": {
        "r": 238,
        "g": 119,
        "b": 34
      }
    },
    "font": {
      "display": {
        "name": "Girassol",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Muli",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 20,
    "shadow": 100,
    "style": "dark"
  },
  "replica": {
    "id": "replica",
    "name": "Replica",
    "color": {
      "range": {
        "primary": {
          "h": 212,
          "s": 23
        }
      },
      "contrast": {
        "start": 54,
        "end": 100
      }
    },
    "accent": {
      "hsl": {
        "h": 210,
        "s": 40,
        "l": 30
      },
      "rgb": {
        "r": 51,
        "g": 85,
        "b": 119
      }
    },
    "font": {
      "display": {
        "name": "Abel",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Raleway",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 0,
    "shadow": 0,
    "style": "light"
  },
  "rumble": {
    "id": "rumble",
    "name": "Rumble",
    "color": {
      "range": {
        "primary": {
          "h": 267,
          "s": 10
        }
      },
      "contrast": {
        "start": 16,
        "end": 40
      }
    },
    "accent": {
      "hsl": {
        "h": 340,
        "s": 100,
        "l": 38
      },
      "rgb": {
        "r": 196,
        "g": 0,
        "b": 66
      }
    },
    "font": {
      "display": {
        "name": "Odibee Sans",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Roboto Condensed",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 75,
    "shadow": 175,
    "style": "dark"
  },
  "savage": {
    "id": "savage",
    "name": "Savage",
    "color": {
      "range": {
        "primary": {
          "h": 35,
          "s": 7
        }
      },
      "contrast": {
        "start": 5,
        "end": 30
      }
    },
    "accent": {
      "hsl": {
        "h": 0,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 255,
        "g": 0,
        "b": 0
      }
    },
    "font": {
      "display": {
        "name": "Metal Mania",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Lato",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 0,
    "shadow": 250,
    "style": "dark"
  },
  "scoria": {
    "id": "scoria",
    "name": "Scoria",
    "color": {
      "range": {
        "primary": {
          "h": 338,
          "s": 76
        }
      },
      "contrast": {
        "start": 20,
        "end": 65
      }
    },
    "accent": {
      "hsl": {
        "h": 210,
        "s": 80,
        "l": 63
      },
      "rgb": {
        "r": 85,
        "g": 161,
        "b": 236
      }
    },
    "font": {
      "display": {
        "name": "Zen Loop",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Montserrat",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 60,
    "shadow": 100,
    "style": "dark"
  },
  "snow": {
    "id": "snow",
    "name": "Snow",
    "color": {
      "range": {
        "primary": {
          "h": 217,
          "s": 46
        }
      },
      "contrast": {
        "start": 75,
        "end": 95
      }
    },
    "accent": {
      "hsl": {
        "h": 191,
        "s": 59,
        "l": 82
      },
      "rgb": {
        "r": 181,
        "g": 226,
        "b": 236
      }
    },
    "font": {
      "display": {
        "name": "Righteous",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Raleway",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 0,
    "shadow": 25,
    "style": "light"
  },
  "sol": {
    "id": "sol",
    "name": "Sol",
    "color": {
      "range": {
        "primary": {
          "h": 52,
          "s": 100
        }
      },
      "contrast": {
        "start": 0,
        "end": 90
      }
    },
    "accent": {
      "hsl": {
        "h": 44,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 255,
        "g": 185,
        "b": 0
      }
    },
    "font": {
      "display": {
        "name": "Fredoka One",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Muli",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 50,
    "shadow": 25,
    "style": "light"
  },
  "steel": {
    "id": "steel",
    "name": "Steel",
    "color": {
      "range": {
        "primary": {
          "h": 214,
          "s": 30
        }
      },
      "contrast": {
        "start": 20,
        "end": 80
      }
    },
    "accent": {
      "hsl": {
        "h": 203,
        "s": 33,
        "l": 35
      },
      "rgb": {
        "r": 59,
        "g": 95,
        "b": 118
      }
    },
    "font": {
      "display": {
        "name": "Abel",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Raleway",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 30,
    "shadow": 50,
    "style": "light"
  },
  "stria": {
    "id": "stria",
    "name": "Stria",
    "color": {
      "range": {
        "primary": {
          "h": 305,
          "s": 20
        }
      },
      "contrast": {
        "start": 20,
        "end": 48
      }
    },
    "accent": {
      "hsl": {
        "h": 30,
        "s": 80,
        "l": 63
      },
      "rgb": {
        "r": 236,
        "g": 161,
        "b": 85
      }
    },
    "font": {
      "display": {
        "name": "Gowun Batang",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 40,
    "shadow": 30,
    "style": "dark"
  },
  "terra": {
    "id": "terra",
    "name": "Terra",
    "color": {
      "range": {
        "primary": {
          "h": 29,
          "s": 28
        }
      },
      "contrast": {
        "start": 17,
        "end": 83
      }
    },
    "accent": {
      "hsl": {
        "h": 270,
        "s": 80,
        "l": 37
      },
      "rgb": {
        "r": 94,
        "g": 19,
        "b": 170
      }
    },
    "font": {
      "display": {
        "name": "Sansita Swashed",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 75,
    "shadow": 30,
    "style": "light"
  },
  "trine": {
    "id": "trine",
    "name": "Trine",
    "color": {
      "range": {
        "primary": {
          "h": 228,
          "s": 71
        }
      },
      "contrast": {
        "start": 10,
        "end": 60
      }
    },
    "accent": {
      "hsl": {
        "h": 180,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 0,
        "g": 255,
        "b": 255
      }
    },
    "font": {
      "display": {
        "name": "Josefin Sans",
        "weight": 300,
        "style": "normal"
      },
      "ui": {
        "name": "Roboto Slab",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 50,
    "shadow": 125,
    "style": "dark"
  },
  "umbra": {
    "id": "umbra",
    "name": "Umbra",
    "color": {
      "range": {
        "primary": {
          "h": 214,
          "s": 30
        }
      },
      "contrast": {
        "start": 20,
        "end": 80
      }
    },
    "accent": {
      "hsl": {
        "h": 151,
        "s": 63,
        "l": 55
      },
      "rgb": {
        "r": 68,
        "g": 213,
        "b": 143
      }
    },
    "font": {
      "display": {
        "name": "Abel",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Raleway",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 60,
    "shadow": 50,
    "style": "dark"
  },
  "vanadium": {
    "id": "vanadium",
    "name": "Vanadium",
    "color": {
      "range": {
        "primary": {
          "h": 218,
          "s": 33
        }
      },
      "contrast": {
        "start": 15,
        "end": 65
      }
    },
    "accent": {
      "hsl": {
        "h": 30,
        "s": 100,
        "l": 50
      },
      "rgb": {
        "r": 255,
        "g": 128,
        "b": 0
      }
    },
    "font": {
      "display": {
        "name": "Grenze Gotisch",
        "weight": 100,
        "style": "normal"
      },
      "ui": {
        "name": "Roboto",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 25,
    "shadow": 25,
    "style": "dark"
  },
  "viper": {
    "id": "viper",
    "name": "Viper",
    "color": {
      "range": {
        "primary": {
          "h": 111,
          "s": 34
        }
      },
      "contrast": {
        "start": 17,
        "end": 90
      }
    },
    "accent": {
      "hsl": {
        "h": 173,
        "s": 100,
        "l": 25
      },
      "rgb": {
        "r": 0,
        "g": 128,
        "b": 113
      }
    },
    "font": {
      "display": {
        "name": "Georama",
        "weight": 500,
        "style": "normal"
      },
      "ui": {
        "name": "Lora",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 25,
    "shadow": 75,
    "style": "light"
  },
  "white": {
    "id": "white",
    "name": "White",
    "color": {
      "range": {
        "primary": {
          "h": 0,
          "s": 0
        }
      },
      "contrast": {
        "start": 0,
        "end": 100
      }
    },
    "accent": {
      "hsl": {
        "h": 0,
        "s": 0,
        "l": 20
      },
      "rgb": {
        "r": 51,
        "g": 51,
        "b": 51
      }
    },
    "font": {
      "display": {
        "name": "Fjalla One",
        "weight": 400,
        "style": "normal"
      },
      "ui": {
        "name": "Open Sans",
        "weight": 400,
        "style": "normal"
      }
    },
    "radius": 25,
    "shadow": 75,
    "style": "light"
  }
};

  // ─── Original Scale and Appearance Derivation ────────────────────────────

  function srgbLuma(rgb) {
    return ((rgb.r * 0.2721) + (rgb.g * 0.7152) + (rgb.b * 0.1255)) / 255;
  }

  function getPresetStyle(preset) {
    return preset && preset.style === 'light' ? 'light' : 'dark';
  }

  function calculateShades(preset) {
    const shades = [];
    const contrast = preset.color.contrast;
    const range = preset.color.range.primary;
    const step = (contrast.end - contrast.start) / 13;

    for (let i = 0; i < 14; i++) {
      const l = Math.round(contrast.start + (step * i));
      const rgb = hslToRgb(range.h, range.s, l);
      shades.push({
        index: i + 1,
        hsl: { h: range.h, s: range.s, l },
        rgb,
        hslString: `${range.h}, ${range.s}%, ${l}%`
      });
    }
    return shades;
  }

  function getPresetBackground(preset) {
    const shades = calculateShades(preset);
    return shades[getPresetStyle(preset) === 'light' ? shades.length - 1 : 0];
  }

  function getPresetAppearance(preset) {
    return srgbLuma(getPresetBackground(preset).rgb) > 0.55 ? 'light' : 'dark';
  }

  function getPresetSwatch(preset) {
    const background = getPresetBackground(preset);
    const foreground = getPresetAppearance(preset) === 'light' ? 0 : 100;
    const accent = preset.accent.hsl;
    return {
      background: `hsl(${background.hslString})`,
      foreground: `hsl(0, 0%, ${foreground}%)`,
      accent: `hsl(${accent.h}, ${accent.s}%, ${accent.l}%)`
    };
  }

  const CATEGORIES = Object.values(PRESETS).reduce((counts, preset) => {
    counts.all += 1;
    counts[getPresetAppearance(preset)] += 1;
    return counts;
  }, { all: 0, dark: 0, light: 0 });

  // ─── Theme Application ───────────────────────────────────────────────────

  function applyTheme(presetId, customOptions, legacyOptions) {
    const preset = PRESETS[presetId] || PRESETS.app;
    // Legacy callers can still pass (preset, style, options), but the style
    // argument is deliberately ignored. Only the original preset style applies.
    const options = customOptions && typeof customOptions === 'object'
      ? customOptions
      : (legacyOptions && typeof legacyOptions === 'object' ? legacyOptions : {});
    const mode = getPresetStyle(preset);
    const appearance = getPresetAppearance(preset);
    const shades = calculateShades(preset);
    const root = document.documentElement;

    // 1. Inject 14 shades with HSL and RGB channels
    for (const s of shades) {
      root.style.setProperty(`--theme-primary-${s.index}`, s.hslString);
      root.style.setProperty(`--theme-primary-${s.index}-r`, s.rgb.r);
      root.style.setProperty(`--theme-primary-${s.index}-g`, s.rgb.g);
      root.style.setProperty(`--theme-primary-${s.index}-b`, s.rgb.b);
      root.style.setProperty(`--theme-primary-${s.index}-h`, s.hsl.h);
      root.style.setProperty(`--theme-primary-${s.index}-s`, s.hsl.s);
      root.style.setProperty(`--theme-primary-${s.index}-l`, s.hsl.l);
    }

    // 2. Map the scale exactly as the original preset's initial style requires.
    for (let i = 0; i < 14; i++) {
      const shadeIdx = mode === 'dark' ? i : (13 - i);
      const s = shades[shadeIdx];
      const keyNum = String((i + 1) * 10).padStart(3, '0');
      root.style.setProperty(`--theme-primary-${keyNum}`, s.hslString);
      root.style.setProperty(`--theme-primary-${keyNum}-r`, s.rgb.r);
      root.style.setProperty(`--theme-primary-${keyNum}-g`, s.rgb.g);
      root.style.setProperty(`--theme-primary-${keyNum}-b`, s.rgb.b);
      root.style.setProperty(`--theme-primary-${keyNum}-h`, s.hsl.h);
      root.style.setProperty(`--theme-primary-${keyNum}-s`, s.hsl.s);
      root.style.setProperty(`--theme-primary-${keyNum}-l`, s.hsl.l);
    }

    // 3. Inject the original accent and its sRGB auto-contrast color.
    const accentRgb = preset.accent.rgb;
    const accentLuma = srgbLuma(accentRgb);
    const isLightAccent = accentLuma > 0.55;
    const accentColor = `rgb(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b})`;
    const accentSoft = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.16)`;
    const onAccent = isLightAccent ? '#000000' : '#ffffff';

    root.style.setProperty('--theme-accent', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
    root.style.setProperty('--theme-accent-rgb-r', accentRgb.r);
    root.style.setProperty('--theme-accent-rgb-g', accentRgb.g);
    root.style.setProperty('--theme-accent-rgb-b', accentRgb.b);
    root.style.setProperty('--theme-accent-text', isLightAccent ? '0, 0%, 0%' : '0, 0%, 100%');
    root.style.setProperty('--accent', accentColor);
    root.style.setProperty('--accent-dark', accentColor);
    root.style.setProperty('--accent-soft', accentSoft);
    root.style.setProperty('--on-accent', onAccent);
    root.style.setProperty('--text-on-action', onAccent);
    root.style.setProperty('--action-primary', accentColor);
    root.style.setProperty('--action-primary-hover', accentColor);
    root.style.setProperty('--action-soft', accentSoft);

    // 4. Semantic surfaces and text belong to tokens.css and the original
    // auto-contrast scale. Remove inline values written by older versions.
    [
      '--surface-page', '--surface-page-glow', '--surface-bg', '--surface-card',
      '--surface-sunken', '--surface-hover', '--surface-elevated', '--surface-raised',
      '--surface-strip', '--surface-strip-text', '--surface-strip-text-muted',
      '--border', '--border-light', '--border-subtle', '--card-border',
      '--text-primary', '--text-secondary', '--text-faint'
    ].forEach(property => root.style.removeProperty(property));

    // 5. Preserve independent user radius and shadow options.
    const radius = typeof options.radius === 'number' ? options.radius : (preset.radius ?? 25);
    const shadow = typeof options.shadow === 'number' ? options.shadow : (preset.shadow ?? 75);
    root.style.setProperty('--theme-radius', radius);
    root.style.setProperty('--theme-shadow', shadow);
    root.style.setProperty('--radius', `calc(${radius} * 0.01em)`);
    root.style.setProperty('--radius-sm', `calc(${radius} * 0.5 * 0.01em)`);
    root.style.setProperty('--radius-xs', `calc(${radius} * 0.25 * 0.01em)`);
    root.style.setProperty('--radius-lg', `calc(${radius} * 1.5 * 0.01em)`);
    root.style.setProperty('--radius-pill', '9999px');
    root.style.setProperty('--ambient-glow', `0 0 24px rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.14)`);

    // 6. Inject Display & UI Fonts & Load Remote WebFonts
    if (preset.font && preset.font.display && preset.font.display.name) {
      root.style.setProperty('--theme-font-display-name', `"${preset.font.display.name}", "Fjalla One", "Rubik", system-ui, sans-serif`);
      root.style.setProperty('--theme-font-display-weight', preset.font.display.weight || 600);
      root.style.setProperty('--theme-font-display-style', preset.font.display.style || 'normal');
    } else {
      root.style.setProperty('--theme-font-display-name', `"Fjalla One", "Rubik", "Outfit", system-ui, sans-serif`);
    }

    if (preset.font && preset.font.ui && preset.font.ui.name) {
      root.style.setProperty('--theme-font-ui-name', `"${preset.font.ui.name}", "Open Sans", "Inter", system-ui, sans-serif`);
      root.style.setProperty('--theme-font-ui-weight', preset.font.ui.weight || 400);
      root.style.setProperty('--theme-font-ui-style', preset.font.ui.style || 'normal');
    } else {
      root.style.setProperty('--theme-font-ui-name', `"Open Sans", "Inter", system-ui, -apple-system, sans-serif`);
    }

    try {
      loadPresetFonts(preset);
    } catch (e) {}

    // 7. Expose both the original scale direction and derived appearance.
    root.classList.remove('is-theme-style-dark', 'is-theme-style-light');
    root.classList.add(`is-theme-style-${mode}`);
    root.setAttribute('data-theme-style', mode);
    root.setAttribute('data-theme-appearance', appearance);
    root.setAttribute('data-theme-preset', preset.id);
    root.setAttribute('data-theme', mode);
    root.style.colorScheme = appearance;

    return { preset, mode, appearance, radius, shadow };
  }

  // ─── Legacy Storage Migration ────────────────────────────────────────────

  // Old family/mode combinations migrate to one real preset. Their mode suffix
  // is intentionally discarded instead of becoming a synthetic light/dark variant.
  const LEGACY_PRESET_MAP = {
    'light': 'app',
    'dark': 'app',
    'amoled': 'black',
    'cappuccino-light': 'terra',
    'cappuccino-dark': 'terra',
    'cappuccino': 'terra',
    'evergreen-light': 'mint',
    'evergreen-dark': 'mint',
    'evergreen': 'mint',
    'midnight': 'midnight',
    'rosewood-light': 'koto',
    'rosewood-dark': 'koto',
    'rosewood': 'koto',
    'original': 'app'
  };

  function migrateThemeStorage(data) {
    const source = data || {};
    let presetId = PRESETS[source.nightTabPreset] ? source.nightTabPreset : null;

    if (!presetId) {
      const legacyKey = source.themeFamily || source.theme;
      const mappedPreset = LEGACY_PRESET_MAP[legacyKey];
      presetId = PRESETS[mappedPreset] ? mappedPreset : 'point';
    }

    const preset = PRESETS[presetId];
    return {
      preset: presetId,
      style: getPresetStyle(preset),
      appearance: getPresetAppearance(preset),
      radius: typeof source.nightTabRadius === 'number' ? source.nightTabRadius : undefined,
      shadow: typeof source.nightTabShadow === 'number' ? source.nightTabShadow : undefined
    };
  }

  // ─── Navigation Route Matching ───────────────────────────────────────────

  const ROUTE_TAILS = {
    // ─ Academics ─
    'academic-calendar.aspx':['/academics/academiccalenderreport.aspx', '/academiccalenderreport', '/academiccalendar'],
    'attendance.aspx':       ['/academics/studentattendance.aspx', '/academics/studentattendancereport.aspx', '/attendance'],
    'timetable.aspx':        ['/academics/timetablereport.aspx', '/timetablereport', '/academics/studenttimetableoption.aspx', '/studenttimetableoption'],
    'choose-timetable.aspx': ['/academics/studenttimetableoption.aspx', '/studenttimetableoption'],
    'course-registration.aspx':['/academics/studentcourseregistration.aspx', '/studentcourseregistration', '/courseregistration'],
    'marks.aspx':            ['/academics/studentmarksreport.aspx', '/studentmarksreport', '/marks'],
    'lesson-plan.aspx':      ['/academics/lpreport.aspx', '/lpreport', '/lessonplan'],
    'exams-details.aspx':    ['/examinations/studentexamtimetable.aspx', '/studentexamtimetable', '/examsdetails'],
    'hallticket.aspx':       ['/examinations/studenthallticket.aspx', '/studenthallticket', '/hallticket'],
    'view-answer-sheet.aspx':['/examinations/revalutionscriptviewer.aspx', '/revalutionscriptviewer', '/viewanswersheet'],
    'backlogs.aspx':         ['/academics/studentbacklogs.aspx', '/studentbacklogs', '/backlogs'],
    // ─ Finance ─
    'fee-details.aspx':      ['/feepayments/studentpayments.aspx', '/studentpayments'],
    'online-payment.aspx':   ['/feepayments/studentfeereceipt.aspx', '/studentfeereceipt'],
    'college-fee.aspx':      ['/feepayments/studentfeereceipt.aspx', '/feepayments/collegefee.aspx', '/collegefee', '/studentfeereceipt'],
    'exam-fee.aspx':         ['/studentexamfeeonline.aspx', '/studentexamfeeonline', '/examfee'],
    're-valuation.aspx':     ['/examinations/revaluationregistrationstudent.aspx', '/revaluationregistrationstudent', '/revaluation'],
    'online-transactions.aspx':['/feepayments/optransactions.aspx', '/optransactions', '/onlinetransactions'],
    'receipts.aspx':         ['/feepayments/studentreceipts.aspx', '/studentreceipts', '/receipts'],
    // ─ Account ─
    'profile.aspx':          ['/academics/studentprofile.aspx', '/studentprofile', '/profile'],
    'hostel-room-booking.aspx':['/hostel/hosteladmission.aspx', '/hostel/hostelbooking.aspx', '/hosteladmission', '/hostelbooking'],
    'library-books.aspx':    ['/library/studentsbooks.aspx', '/studentsbooks', '/librarybooks'],
    'book-search.aspx':      ['/library/booksearch1.aspx', '/booksearch1', '/booksearch']
  };

  const PATH_MATCH_TABLE = ROUTE_TAILS;

  function _basename(pathLower) {
    const i = pathLower.lastIndexOf('/');
    return i >= 0 ? pathLower.slice(i + 1) : pathLower;
  }

  function matchActivePage(iframePath) {
    if (!iframePath) return null;
    const lower = iframePath.toLowerCase();
    const base = _basename(lower);
    let bestKey = null;
    let bestLen = -1;

    for (const [key, tails] of Object.entries(ROUTE_TAILS)) {
      for (const tail of tails) {
        const t = tail.toLowerCase();
        const isLongTail = t.length >= 14;
        const candidateEndsWith = isLongTail && lower.endsWith(t);
        const candidateBasenameContains = !isLongTail && base.includes(t.replace(/^\//, ''));
        if (candidateEndsWith || candidateBasenameContains) {
          if (t.length > bestLen) {
            bestKey = key;
            bestLen = t.length;
          }
        }
      }
    }
    return bestKey;
  }

  function routeKeyForHref(href) {
    try {
      if (typeof href !== 'string' || !href) return null;
      const path = new URL(href, 'http://placeholder/').pathname;
      return matchActivePage(path);
    } catch (e) {
      return null;
    }
  }

  // ─── Google Fonts Dynamic Loader ────────────────────────────────────────

  /**
   * Dynamically loads Google Fonts for the active preset.
   * Injects preconnect hints and an asynchronous stylesheet into document.head.
   */
  function loadPresetFonts(presetOrId) {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    const preset = typeof presetOrId === 'string' ? PRESETS[presetOrId] : presetOrId;
    if (!preset || !preset.font) return;

    const fontNames = [];
    if (preset.font.display && preset.font.display.name) {
      const dName = preset.font.display.name.trim();
      if (dName && !fontNames.includes(dName)) fontNames.push(dName);
    }
    if (preset.font.ui && preset.font.ui.name) {
      const uName = preset.font.ui.name.trim();
      if (uName && !fontNames.includes(uName)) fontNames.push(uName);
    }

    if (fontNames.length === 0) return;

    const target = document.head || document.documentElement;
    if (!target) return;

    if (typeof document.getElementById === 'function' && !document.getElementById('reecap-font-preconnect-1')) {
      const pc1 = document.createElement('link');
      pc1.id = 'reecap-font-preconnect-1';
      pc1.rel = 'preconnect';
      pc1.href = 'https://fonts.googleapis.com';
      target.appendChild(pc1);
    }
    if (typeof document.getElementById === 'function' && !document.getElementById('reecap-font-preconnect-2')) {
      const pc2 = document.createElement('link');
      pc2.id = 'reecap-font-preconnect-2';
      pc2.rel = 'preconnect';
      pc2.href = 'https://fonts.gstatic.com';
      pc2.crossOrigin = 'anonymous';
      target.appendChild(pc2);
    }

    const query = fontNames.map(f => 'family=' + f.replace(/\s+/g, '+')).join('&') + '&display=swap';
    const href = `https://fonts.googleapis.com/css2?${query}`;

    let link = typeof document.getElementById === 'function' ? document.getElementById('reecap-google-fonts') : null;
    if (!link) {
      link = document.createElement('link');
      link.id = 'reecap-google-fonts';
      link.rel = 'stylesheet';
      target.appendChild(link);
    }
    if (link && link.getAttribute('href') !== href) {
      link.setAttribute('href', href);
    }
  }

  /**
   * Preloads all fonts in the nightTab catalog for live preview in theme selectors.
   */
  function loadCatalogFonts() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    const fontNames = new Set();
    for (const p of Object.values(PRESETS)) {
      if (p.font) {
        if (p.font.display && p.font.display.name) fontNames.add(p.font.display.name.trim());
        if (p.font.ui && p.font.ui.name) fontNames.add(p.font.ui.name.trim());
      }
    }
    const target = document.head || document.documentElement;
    if (!target) return;

    if (typeof document.getElementById === 'function' && !document.getElementById('reecap-font-preconnect-1')) {
      const pc1 = document.createElement('link');
      pc1.id = 'reecap-font-preconnect-1';
      pc1.rel = 'preconnect';
      pc1.href = 'https://fonts.googleapis.com';
      target.appendChild(pc1);
    }
    if (typeof document.getElementById === 'function' && !document.getElementById('reecap-font-preconnect-2')) {
      const pc2 = document.createElement('link');
      pc2.id = 'reecap-font-preconnect-2';
      pc2.rel = 'preconnect';
      pc2.href = 'https://fonts.gstatic.com';
      pc2.crossOrigin = 'anonymous';
      target.appendChild(pc2);
    }

    const query = Array.from(fontNames).map(f => 'family=' + f.replace(/\s+/g, '+')).join('&') + '&display=swap';
    const href = `https://fonts.googleapis.com/css2?${query}`;

    let link = typeof document.getElementById === 'function' ? document.getElementById('reecap-catalog-fonts') : null;
    if (!link) {
      link = document.createElement('link');
      link.id = 'reecap-catalog-fonts';
      link.rel = 'stylesheet';
      target.appendChild(link);
    }
    if (link && link.getAttribute('href') !== href) {
      link.setAttribute('href', href);
    }
  }

  // ─── Public API Exposure ─────────────────────────────────────────────────

  const themeAPI = {
    PRESETS,
    CATEGORIES,
    applyTheme,
    migrateThemeStorage,
    loadPresetFonts,
    loadCatalogFonts,
    getPresetStyle,
    getPresetBackground,
    getPresetAppearance,
    getPresetSwatch,
    hslToRgb,
    rgbToHsl,
    calculateShades,
    PATH_MATCH_TABLE,
    ROUTE_TAILS,
    matchActivePage,
    routeKeyForHref
  };

  global.__reecap_theme = themeAPI;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = themeAPI;
  }
})(typeof window !== 'undefined' ? window : globalThis);
