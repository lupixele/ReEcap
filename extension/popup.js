// ReEcap popup.js — Original nightTab Preset Controller
// Dark/Light controls filter the original catalog by rendered background
// tokens. Selecting a preset never generates or applies an opposite variant.

(function () {
  'use strict';

  const themeEngine = window.__reecap_theme;
  const PRESETS = themeEngine.PRESETS;
  const LEGACY_STORAGE_KEYS = ['nightTabStyle', 'themeFamily', 'themeMode', 'theme'];

  let currentPresetId = 'app';
  let currentRadius = 25;
  let currentShadow = 75;
  let isEnabled = true;
  let activeAppearance = 'all';

  const masterToggle = document.getElementById('masterToggle');
  const appearanceButtons = Array.from(document.querySelectorAll('[data-appearance]'));
  const activeAppearanceLabel = document.getElementById('activeAppearanceLabel');
  const activePresetCount = document.getElementById('activePresetCount');
  const presetsGrid = document.getElementById('presetsGrid');
  const radiusSlider = document.getElementById('radiusSlider');
  const radiusVal = document.getElementById('radiusVal');
  const shadowSlider = document.getElementById('shadowSlider');
  const shadowVal = document.getElementById('shadowVal');
  const statusLabel = document.getElementById('statusLabel');

  function sendMessageToPortal(message) {
    try {
      chrome.tabs.query({ url: '*://info.aec.edu.in/*' }, (tabs) => {
        if (!tabs || !tabs.length) {
          chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            if (tab && tab.id) chrome.tabs.sendMessage(tab.id, message).catch(() => {});
          });
          return;
        }
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {});
        });
      });
    } catch (e) {}
  }

  function applyAndBroadcast() {
    const options = { radius: currentRadius, shadow: currentShadow };
    themeEngine.applyTheme(currentPresetId, options);

    chrome.storage.sync.set({
      enabled: isEnabled,
      nightTabPreset: currentPresetId,
      nightTabRadius: currentRadius,
      nightTabShadow: currentShadow
    });

    sendMessageToPortal({
      type: 'REECAP_NIGHTTAB_PRESET',
      preset: currentPresetId,
      options
    });
  }

  function renderPresetGrid() {
    presetsGrid.innerHTML = '';
    const query = (document.getElementById('presetSearch').value || '').trim().toLowerCase();
    const presets = Object.values(PRESETS).filter(preset => {
      const appearanceMatches = activeAppearance === 'all'
        || themeEngine.getPresetAppearance(preset) === activeAppearance;
      const searchMatches = !query || preset.name.toLowerCase().includes(query);
      return appearanceMatches && searchMatches;
    });

    presets.forEach(preset => {
      const appearance = themeEngine.getPresetAppearance(preset);
      const swatch = themeEngine.getPresetSwatch(preset);
      const card = document.createElement('div');
      card.className = 'preset-card' + (preset.id === currentPresetId ? ' is-selected' : '');
      card.dataset.preset = preset.id;
      card.dataset.appearance = appearance;
      card.style.setProperty('--swatch-bg', swatch.background);
      card.style.setProperty('--swatch-fg', swatch.foreground);
      card.style.setProperty('--swatch-accent', swatch.accent);

      const swatchElement = document.createElement('div');
      swatchElement.className = 'preset-swatch';
      swatchElement.textContent = 'Aa';
      const dispFont = preset.font?.display?.name || '';
      const uiFont = preset.font?.ui?.name || '';
      if (dispFont) {
        swatchElement.style.fontFamily = `"${dispFont}", "${uiFont}", sans-serif`;
      }

      const accentDot = document.createElement('div');
      accentDot.className = 'preset-accent-dot';
      swatchElement.appendChild(accentDot);

      const name = document.createElement('span');
      name.className = 'preset-name';
      name.textContent = preset.name;

      const fontBadge = document.createElement('span');
      fontBadge.className = 'preset-font-name';
      const fontLabel = dispFont === uiFont ? dispFont : `${dispFont} / ${uiFont}`;
      fontBadge.textContent = fontLabel;
      fontBadge.title = `Display Font: ${dispFont} • UI Font: ${uiFont}`;

      const badge = document.createElement('span');
      badge.className = 'preset-style-badge';
      badge.textContent = appearance === 'light' ? 'Light' : 'Dark';

      card.append(swatchElement, name, fontBadge, badge);
      card.addEventListener('click', () => {
        currentPresetId = preset.id;
        applyAndBroadcast();
        renderPresetGrid();
      });
      presetsGrid.appendChild(card);
    });

    activePresetCount.textContent = `${presets.length} / ${themeEngine.CATEGORIES.all}`;
  }

  function updateAppearanceFilter() {
    appearanceButtons.forEach(button => {
      button.classList.toggle('is-selected', button.dataset.appearance === activeAppearance);
    });
    activeAppearanceLabel.textContent = activeAppearance === 'all'
      ? 'All original presets'
      : `${activeAppearance === 'light' ? 'Light' : 'Dark'} original presets`;
    renderPresetGrid();
  }

  appearanceButtons.forEach(button => {
    button.addEventListener('click', () => {
      activeAppearance = button.dataset.appearance || 'all';
      updateAppearanceFilter();
    });
  });

  document.getElementById('presetSearch').addEventListener('input', renderPresetGrid);

  radiusSlider.addEventListener('input', () => {
    currentRadius = Number(radiusSlider.value);
    radiusVal.textContent = `${currentRadius}%`;
    applyAndBroadcast();
  });

  shadowSlider.addEventListener('input', () => {
    currentShadow = Number(shadowSlider.value);
    shadowVal.textContent = `${currentShadow}%`;
    applyAndBroadcast();
  });

  masterToggle.addEventListener('click', () => {
    isEnabled = !isEnabled;
    masterToggle.classList.toggle('is-active', isEnabled);
    statusLabel.textContent = isEnabled ? 'Active' : 'Disabled';
    document.body.classList.toggle('is-enabled', isEnabled);
    applyAndBroadcast();
    sendMessageToPortal({ type: 'REECAP_TOGGLE', enabled: isEnabled });
  });

  function updateControls() {
    masterToggle.classList.toggle('is-active', isEnabled);
    statusLabel.textContent = isEnabled ? 'Active' : 'Disabled';
    document.body.classList.toggle('is-enabled', isEnabled);
    radiusSlider.value = currentRadius;
    radiusVal.textContent = `${currentRadius}%`;
    shadowSlider.value = currentShadow;
    shadowVal.textContent = `${currentShadow}%`;
    updateAppearanceFilter();
  }

  function loadInitialState() {
    try {
      if (themeEngine.loadCatalogFonts) themeEngine.loadCatalogFonts();
    } catch (e) {}

    chrome.storage.sync.get({
      enabled: true,
      nightTabPreset: null,
      nightTabRadius: 25,
      nightTabShadow: 75,
      nightTabStyle: null,
      themeFamily: null,
      themeMode: null,
      theme: null
    }, data => {
      const migrated = themeEngine.migrateThemeStorage(data);
      currentPresetId = migrated.preset;
      currentRadius = migrated.radius;
      currentShadow = migrated.shadow;
      isEnabled = data.enabled !== false;

      themeEngine.applyTheme(currentPresetId, {
        radius: currentRadius,
        shadow: currentShadow
      });
      updateControls();

      const hasLegacyStorage = LEGACY_STORAGE_KEYS.some(key => data[key] != null);
      if (data.nightTabPreset !== currentPresetId || hasLegacyStorage) {
        chrome.storage.sync.set({ nightTabPreset: currentPresetId }, () => {
          chrome.storage.sync.remove(LEGACY_STORAGE_KEYS);
        });
      }
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const watchedKeys = ['enabled', 'nightTabPreset', 'nightTabRadius', 'nightTabShadow'];
    if (!watchedKeys.some(key => key in changes)) return;

    chrome.storage.sync.get({
      enabled: true,
      nightTabPreset: 'point',
      nightTabRadius: 25,
      nightTabShadow: 75
    }, data => {
      currentPresetId = PRESETS[data.nightTabPreset] ? data.nightTabPreset : 'point';
      currentRadius = data.nightTabRadius;
      currentShadow = data.nightTabShadow;
      isEnabled = data.enabled !== false;
      themeEngine.applyTheme(currentPresetId, {
        radius: currentRadius,
        shadow: currentShadow
      });
      updateControls();
    });
  });

  loadInitialState();
})();
