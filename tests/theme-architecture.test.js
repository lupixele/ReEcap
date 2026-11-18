const assert = require('node:assert/strict');
const engine = require('../extension/shared/theme.js');

function createDocument() {
  const attributes = new Map();
  const classes = new Set();
  const properties = new Map();
  const style = {
    colorScheme: '',
    setProperty(name, value) {
      properties.set(name, String(value));
    },
    removeProperty(name) {
      properties.delete(name);
    },
    getPropertyValue(name) {
      return properties.get(name) || '';
    }
  };

  global.document = {
    documentElement: {
      style,
      setAttribute(name, value) {
        attributes.set(name, String(value));
      },
      removeAttribute(name) {
        attributes.delete(name);
      },
      classList: {
        add(name) {
          classes.add(name);
        },
        remove(...names) {
          names.forEach(name => classes.delete(name));
        },
        contains(name) {
          return classes.has(name);
        }
      }
    }
  };

  return { attributes, classes, properties, style };
}

const presets = Object.values(engine.PRESETS);
assert.equal(presets.length, 45);
assert.equal(new Set(presets.map(preset => preset.id)).size, 45);
assert.deepEqual(engine.CATEGORIES, { all: 45, dark: 35, light: 10 });

for (const preset of presets) {
  const derivedAppearance = engine.getPresetAppearance(preset);
  assert.equal(derivedAppearance, preset.style, `${preset.id}: appearance must match its original rendered style`);

  const background = engine.getPresetBackground(preset);
  const shades = engine.calculateShades(preset);
  const expectedBackground = shades[preset.style === 'light' ? 13 : 0];
  assert.deepEqual(background, expectedBackground, `${preset.id}: wrong original background token`);

  const swatch = engine.getPresetSwatch(preset);
  assert.equal(swatch.background, `hsl(${background.hslString})`);
  assert.equal(swatch.accent, `hsl(${preset.accent.hsl.h}, ${preset.accent.hsl.s}%, ${preset.accent.hsl.l}%)`);

  const dom = createDocument();
  const semanticOverrides = [
    '--surface-page', '--surface-page-glow', '--surface-card', '--surface-sunken',
    '--text-primary', '--text-secondary', '--text-faint', '--border-light'
  ];
  semanticOverrides.forEach(property => dom.style.setProperty(property, 'invalid-legacy-value'));

  const oppositeMode = preset.style === 'dark' ? 'light' : 'dark';
  const result = engine.applyTheme(preset.id, oppositeMode, { radius: 37, shadow: 61 });

  assert.equal(result.preset.id, preset.id);
  assert.equal(result.mode, preset.style, `${preset.id}: legacy mode override changed original scale direction`);
  assert.equal(result.appearance, derivedAppearance);
  assert.equal(result.radius, 37);
  assert.equal(result.shadow, 61);
  assert.equal(dom.attributes.get('data-theme-preset'), preset.id);
  assert.equal(dom.attributes.get('data-theme-style'), preset.style);
  assert.equal(dom.attributes.get('data-theme-appearance'), derivedAppearance);
  assert.equal(dom.style.colorScheme, derivedAppearance);
  assert.equal(dom.style.getPropertyValue('--theme-primary-010'), background.hslString);
  assert.equal(dom.style.getPropertyValue('--theme-primary-1'), shades[0].hslString);
  assert.equal(dom.style.getPropertyValue('--theme-primary-14'), shades[13].hslString);
  assert.equal(dom.style.getPropertyValue('--theme-radius'), '37');
  assert.equal(dom.style.getPropertyValue('--theme-shadow'), '61');
  semanticOverrides.forEach(property => {
    assert.equal(dom.style.getPropertyValue(property), '', `${preset.id}: stale semantic override ${property}`);
  });
}

assert.deepEqual(
  engine.migrateThemeStorage({ nightTabPreset: 'app', nightTabStyle: 'light', themeMode: 'light' }),
  { preset: 'app', style: 'dark', appearance: 'dark', radius: undefined, shadow: undefined }
);
assert.deepEqual(
  engine.migrateThemeStorage({ themeFamily: 'cappuccino-light', themeMode: 'dark' }),
  { preset: 'terra', style: 'light', appearance: 'light', radius: undefined, shadow: undefined }
);
assert.deepEqual(
  engine.migrateThemeStorage({ theme: 'amoled', nightTabRadius: 40, nightTabShadow: 80 }),
  { preset: 'black', style: 'dark', appearance: 'dark', radius: 40, shadow: 80 }
);
assert.equal(engine.migrateThemeStorage({ nightTabPreset: 'not-real', nightTabStyle: 'light' }).preset, 'app');

console.log('PASS: 45 original presets; 35 dark and 10 light token-derived filters; opposite-mode overrides rejected; scale, swatch, semantic-token, option, and migration checks passed.');
