// ReEcap popup.js — nightTab Design System Controller
// Provides live categorized switching across all 45 nightTab presets,
// dark/light style toggling, corner radius, and elevation shadow controls.

(function () {
  'use strict';

  const themeEngine = window.__reecap_theme || {};
  const PRESETS = themeEngine.PRESETS || {};

  let currentPresetId = 'app';
  let currentStyle = 'dark';
  let currentRadius = 25;
  let currentShadow = 75;
  let isEnabled = true;
  let activeCategory = 'all';

  // Elements
  const masterToggle = document.getElementById('masterToggle');
  const btnModeDark = document.getElementById('btnModeDark');
  const btnModeLight = document.getElementById('btnModeLight');
  const activeStyleLabel = document.getElementById('activeStyleLabel');
  const categoryShelf = document.getElementById('categoryShelf');
  const presetsGrid = document.getElementById('presetsGrid');
  const radiusSlider = document.getElementById('radiusSlider');
  const radiusVal = document.getElementById('radiusVal');
  const shadowSlider = document.getElementById('shadowSlider');
  const shadowVal = document.getElementById('shadowVal');
  const statusLabel = document.getElementById('statusLabel');

  function sendMessageToPortal(msg) {
    try {
      chrome.tabs.query({ url: '*://info.aec.edu.in/*' }, (tabs) => {
        if (!tabs || !tabs.length) {
          chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            if (tab && tab.id) chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
          });
          return;
        }
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
        });
      });
    } catch (e) {}
  }

  function applyAndBroadcast() {
    // Apply locally to popup
    if (themeEngine.applyTheme) {
      themeEngine.applyTheme(currentPresetId, currentStyle, {
        radius: currentRadius,
        shadow: currentShadow
      });
    }

    // Persist to storage
    chrome.storage.sync.set({
      enabled: isEnabled,
      nightTabPreset: currentPresetId,
      nightTabStyle: currentStyle,
      nightTabRadius: currentRadius,
      nightTabShadow: currentShadow,
      // Backward compatibility mappings
      themeFamily: currentPresetId,
      themeMode: currentStyle
    });

    // Broadcast to portal tab
    sendMessageToPortal({
      type: 'REECAP_NIGHTTAB_PRESET',
      preset: currentPresetId,
      style: currentStyle,
      options: { radius: currentRadius, shadow: currentShadow }
    });
  }

  function renderPresets() {
    presetsGrid.innerHTML = '';
    const presetEntries = Object.entries(PRESETS);

    const filtered = presetEntries.filter(([id, p]) => {
      if (activeCategory === 'all') return true;
      return p.category === activeCategory;
    });

    for (const [id, preset] of filtered) {
      const card = document.createElement('div');
      card.className = 'preset-card' + (id === currentPresetId ? ' is-selected' : '');
      card.dataset.id = id;

      const pRange = preset.color.range.primary;
      const bgLightness = currentStyle === 'dark' ? 20 : 85;
      const previewBg = `hsl(${pRange.h}, ${pRange.s}%, ${bgLightness}%)`;
      const dotColor = `rgb(${preset.accent.rgb.r}, ${preset.accent.rgb.g}, ${preset.accent.rgb.b})`;

      card.innerHTML = `
        <div class="preset-preview" style="background-color: ${previewBg};">
          <div class="preset-dot" style="background-color: ${dotColor};"></div>
        </div>
        <div class="preset-name" title="${preset.name}">${preset.name}</div>
      `;

      card.addEventListener('click', () => {
        currentPresetId = id;
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('is-selected'));
        card.classList.add('is-selected');
        applyAndBroadcast();
      });

      presetsGrid.appendChild(card);
    }
  }

  function updateModeUI() {
    btnModeDark.classList.toggle('is-selected', currentStyle === 'dark');
    btnModeLight.classList.toggle('is-selected', currentStyle === 'light');
    activeStyleLabel.textContent = currentStyle === 'dark' ? 'Dark Mode' : 'Light Mode';
    renderPresets();
  }

  // Event Listeners
  btnModeDark.addEventListener('click', () => {
    currentStyle = 'dark';
    updateModeUI();
    applyAndBroadcast();
  });

  btnModeLight.addEventListener('click', () => {
    currentStyle = 'light';
    updateModeUI();
    applyAndBroadcast();
  });

  categoryShelf.addEventListener('click', (e) => {
    const pill = e.target.closest('.category-pill');
    if (!pill) return;
    document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('is-active'));
    pill.classList.add('is-active');
    activeCategory = pill.dataset.cat || 'all';
    renderPresets();
  });

  radiusSlider.addEventListener('input', (e) => {
    currentRadius = parseInt(e.target.value, 10);
    radiusVal.textContent = currentRadius + 'px';
    applyAndBroadcast();
  });

  shadowSlider.addEventListener('input', (e) => {
    currentShadow = parseInt(e.target.value, 10);
    shadowVal.textContent = currentShadow + '%';
    applyAndBroadcast();
  });

  masterToggle.addEventListener('click', () => {
    isEnabled = !isEnabled;
    masterToggle.classList.toggle('is-active', isEnabled);
    chrome.storage.sync.set({ enabled: isEnabled });
    sendMessageToPortal({ type: 'REECAP_TOGGLE', enabled: isEnabled });
    statusLabel.textContent = isEnabled ? 'AEC Portal Synchronized' : 'ReEcap Disabled';
  });

  // Initialize
  chrome.storage.sync.get({
    enabled: true,
    nightTabPreset: 'app',
    nightTabStyle: 'dark',
    nightTabRadius: 25,
    nightTabShadow: 75,
    themeFamily: null,
    themeMode: null,
    theme: null
  }, (data) => {
    const migrated = themeEngine.migrateThemeStorage ? themeEngine.migrateThemeStorage(data) : { preset: 'app', style: 'dark' };
    isEnabled = data.enabled !== false;
    currentPresetId = data.nightTabPreset || migrated.preset || 'app';
    currentStyle = data.nightTabStyle || migrated.style || 'dark';
    currentRadius = typeof data.nightTabRadius === 'number' ? data.nightTabRadius : 25;
    currentShadow = typeof data.nightTabShadow === 'number' ? data.nightTabShadow : 75;

    masterToggle.classList.toggle('is-active', isEnabled);
    radiusSlider.value = currentRadius;
    radiusVal.textContent = currentRadius + 'px';
    shadowSlider.value = currentShadow;
    shadowVal.textContent = currentShadow + '%';

    updateModeUI();
    applyAndBroadcast();
  });
})();
