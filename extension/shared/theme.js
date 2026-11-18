// ReEcap — shared/theme.js
// nightTab Design System Theme Engine
// Single source of truth for all 45 nightTab color presets, mathematical 14-shade HSL scales,
// sRGB Luma auto-contrast text, radius/shadow controls, and portal navigation matching.
//
// Exposes:
//   window.__reecap_theme.PRESETS
//   window.__reecap_theme.CATEGORIES
//   window.__reecap_theme.applyTheme(presetId, styleMode, customOptions)
//   window.__reecap_theme.migrateThemeStorage(data)
//   window.__reecap_theme.resolveTheme(family, mode)
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

  // ─── 45 nightTab Presets Catalog ─────────────────────────────────────────

  const CATEGORIES = [
    { id: 'core', name: 'Core & Modern' },
    { id: 'minimal', name: 'Minimal & Nordic' },
    { id: 'cyber', name: 'Cyberpunk & Neon' },
    { id: 'space', name: 'Space & Midnight' },
    { id: 'earth', name: 'Organic & Earth' },
    { id: 'vivid', name: 'Vivid & Creative' }
  ];

  const PRESETS = {
  "acrid": {
    "id": "acrid",
    "name": "Acrid",
    "category": "vivid",
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
    "category": "vivid",
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
    "category": "core",
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
    "category": "vivid",
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
    "category": "earth",
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
    "category": "core",
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
    "category": "minimal",
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
    "category": "space",
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
    "category": "minimal",
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
    "category": "minimal",
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
    "category": "vivid",
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
    "category": "cyber",
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
    "category": "space",
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
    "category": "space",
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
    "category": "space",
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
    "category": "cyber",
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
    "category": "cyber",
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
    "category": "cyber",
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
    "category": "cyber",
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
    "category": "vivid",
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
    "category": "core",
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
    "category": "space",
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
    "category": "earth",
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
    "category": "cyber",
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
    "category": "minimal",
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
    "category": "minimal",
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
    "category": "minimal",
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
    "category": "cyber",
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
    "category": "earth",
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
    "category": "core",
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
    "category": "earth",
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
    "category": "minimal",
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
    "category": "space",
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
    "category": "earth",
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
    "category": "vivid",
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
    "category": "core",
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
    "category": "earth",
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
    "category": "core",
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
    "category": "minimal",
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
    "category": "earth",
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
    "category": "vivid",
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
    "category": "space",
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
    "category": "core",
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
    "category": "earth",
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
    "category": "core",
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

  // ─── 14-Shade Math Engine ────────────────────────────────────────────────

  function calculateShades(preset) {
    const shades = [];
    const contrast = preset.color.contrast || { start: 17, end: 83 };
    const range = preset.color.range.primary || { h: 222, s: 14 };
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

  // ─── Theme Application ───────────────────────────────────────────────────

  function applyTheme(presetId, styleMode, customOptions) {
    const preset = PRESETS[presetId] || PRESETS.app;
    const mode = styleMode || preset.style || 'dark';
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

    // 2. Inject Accent Colors (RGB and channels)
    const accentRgb = (customOptions && customOptions.accentRgb) || preset.accent.rgb || { r: 0, g: 80, b: 255 };
    root.style.setProperty('--theme-accent', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
    root.style.setProperty('--theme-accent-rgb-r', accentRgb.r);
    root.style.setProperty('--theme-accent-rgb-g', accentRgb.g);
    root.style.setProperty('--theme-accent-rgb-b', accentRgb.b);

    // 3. Inject Radius and Shadow Constants
    const radius = (customOptions && typeof customOptions.radius === 'number') ? customOptions.radius : (preset.radius ?? 25);
    const shadow = (customOptions && typeof customOptions.shadow === 'number') ? customOptions.shadow : (preset.shadow ?? 75);
    root.style.setProperty('--theme-radius', radius);
    root.style.setProperty('--theme-shadow', shadow);

    // 4. Inject Display & UI Fonts
    if (preset.font && preset.font.display && preset.font.display.name) {
      root.style.setProperty('--theme-font-display-name', `"${preset.font.display.name}", "Fjalla One", "Rubik", system-ui, sans-serif`);
    } else {
      root.style.setProperty('--theme-font-display-name', `"Fjalla One", "Rubik", "Outfit", system-ui, sans-serif`);
    }

    if (preset.font && preset.font.ui && preset.font.ui.name) {
      root.style.setProperty('--theme-font-ui-name', `"${preset.font.ui.name}", "Open Sans", "Inter", system-ui, sans-serif`);
    } else {
      root.style.setProperty('--theme-font-ui-name', `"Open Sans", "Inter", system-ui, -apple-system, sans-serif`);
    }

    // 5. Update Style Class and Attributes
    root.classList.remove('is-theme-style-dark', 'is-theme-style-light');
    root.classList.add(`is-theme-style-${mode}`);
    root.setAttribute('data-theme-style', mode);
    root.setAttribute('data-theme-preset', preset.id);

    // Backward compatibility attribute for legacy styles
    root.setAttribute('data-theme', mode === 'dark' ? (preset.id === 'black' ? 'amoled' : 'dark') : 'light');

    return { preset, mode, radius, shadow };
  }

  // ─── Legacy Storage Migration ────────────────────────────────────────────

  const LEGACY_PRESET_MAP = {
    'light':            { preset: 'app',      style: 'light' },
    'dark':             { preset: 'app',      style: 'dark'  },
    'amoled':           { preset: 'black',    style: 'dark'  },
    'cappuccino-light': { preset: 'terra',    style: 'light' },
    'cappuccino-dark':  { preset: 'terra',    style: 'dark'  },
    'cappuccino':       { preset: 'terra',    style: 'dark'  },
    'evergreen-light':  { preset: 'mint',     style: 'light' },
    'evergreen-dark':   { preset: 'mint',     style: 'dark'  },
    'evergreen':        { preset: 'mint',     style: 'dark'  },
    'midnight':         { preset: 'midnight', style: 'dark'  },
    'rosewood-light':   { preset: 'koto',     style: 'light' },
    'rosewood-dark':    { preset: 'koto',     style: 'dark'  },
    'rosewood':         { preset: 'koto',     style: 'dark'  },
    'original':         { preset: 'app',      style: 'dark'  }
  };

  function migrateThemeStorage(data) {
    if (data && data.nightTabPreset && PRESETS[data.nightTabPreset]) {
      return {
        preset: data.nightTabPreset,
        style: data.nightTabStyle || PRESETS[data.nightTabPreset].style || 'dark',
        radius: typeof data.nightTabRadius === 'number' ? data.nightTabRadius : undefined,
        shadow: typeof data.nightTabShadow === 'number' ? data.nightTabShadow : undefined
      };
    }

    const legacyKey = (data && data.themeFamily) || (data && data.theme) || 'app';
    const mapped = LEGACY_PRESET_MAP[legacyKey] || { preset: 'app', style: data?.themeMode || 'dark' };
    return {
      preset: PRESETS[mapped.preset] ? mapped.preset : 'app',
      style: data?.themeMode || mapped.style || 'dark'
    };
  }

  function resolveTheme(family, mode) {
    if (PRESETS[family]) return family;
    const mapped = LEGACY_PRESET_MAP[family];
    return mapped ? mapped.preset : 'app';
  }

  // ─── Navigation Route Matching ───────────────────────────────────────────

  const PATH_MATCH_TABLE = {
    'student-profile': ['studentprofile.aspx', 'studentprofile'],
    'attendance':      ['studentattendance.aspx', 'attendance', 'attendancedetails'],
    'class-schedule':  ['studenttimetable.aspx', 'timetable', 'schedule'],
    'internal-marks':  ['studentmarks.aspx', 'studentinternalmarks', 'internalmarks'],
    'semester-results':['studentresults.aspx', 'studentsemesterresults', 'results'],
    'fee-details':     ['studentfeedetails.aspx', 'fee', 'studentfees'],
    'hall-ticket':     ['studenthallticket.aspx', 'hallticket', 'downloadhallticket'],
    'exam-viewer':     ['examresults.aspx', 'examviewer', 'examreport']
  };

  function matchActivePage(iframePath) {
    if (!iframePath) return null;
    const lower = iframePath.toLowerCase();
    for (const [key, paths] of Object.entries(PATH_MATCH_TABLE)) {
      if (paths.some(p => lower.includes(p))) {
        return key;
      }
    }
    return null;
  }

  // ─── Public API Exposure ─────────────────────────────────────────────────

  const themeAPI = {
    PRESETS,
    CATEGORIES,
    applyTheme,
    migrateThemeStorage,
    resolveTheme,
    hslToRgb,
    rgbToHsl,
    calculateShades,
    PATH_MATCH_TABLE,
    matchActivePage
  };

  global.__reecap_theme = themeAPI;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = themeAPI;
  }
})(typeof window !== 'undefined' ? window : globalThis);
