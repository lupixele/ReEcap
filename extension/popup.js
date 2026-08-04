// ReEcap — popup.js
// Handles toggle and two-tier theme settings (color family + mode) via chrome.storage.sync.
// Theme resolution + migration come from shared/theme.js (single source of truth).

const reecap = window.__reecap_theme || {};
const resolveTheme        = reecap.resolveTheme        || ((f, m) => (f === 'amoled' ? 'amoled' : (f === 'original' ? (m || 'light') : `${f}-${m || 'light'}`)));
const migrateThemeStorage = reecap.migrateThemeStorage || ((d) => ({ family: (d && d.themeFamily) || 'original', mode: (d && d.themeMode) || 'light' }));
const FAMILY_META         = reecap.FAMILY_META         || {};

document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const statusText   = document.getElementById('statusText');
  const familyButtons = document.querySelectorAll('#familySwitcher .theme-btn');
  const modeButtons  = document.querySelectorAll('#modeSwitcher .mode-btn');
  const modeTrack    = document.getElementById('modeTrack');
  const modeRow      = document.getElementById('modeRow');
  const body         = document.body;

  // Decorate each family button with a 6px color dot + aria-label.
  familyButtons.forEach(btn => {
    const meta = FAMILY_META[btn.dataset.family];
    if (!meta) return;
    btn.setAttribute('aria-label', `${meta.label} — ${meta.description}`);
    const dot = document.createElement('span');
    dot.className = 'theme-btn-dot';
    dot.style.background = meta.preview;
    btn.insertBefore(dot, btn.firstChild);
  });

  let currentFamily = 'original';
  let currentMode   = 'light';

  chrome.storage.sync.get({ enabled: true, themeFamily: null, themeMode: null, theme: null }, (data) => {
    toggleSwitch.checked = data.enabled;
    updateStatusLabel(data.enabled);

    const mapped = migrateThemeStorage(data);
    if (!data.themeFamily) {
      // Persist migration so content.js won't have to re-derive.
      chrome.storage.sync.set({ themeFamily: mapped.family, themeMode: mapped.mode, theme: null }, () => {
        void chrome.runtime && chrome.runtime.lastError;
      });
    }
    currentFamily = mapped.family;
    currentMode   = mapped.mode;
    updateThemeUI(currentFamily, currentMode);
  });

  function updateStatusLabel(enabled) {
    if (enabled) {
      statusText.textContent = 'Active';
      statusText.className   = 'label-status status-enabled';
      body.classList.remove('disabled');
    } else {
      statusText.textContent = 'Disabled';
      statusText.className   = 'label-status status-disabled';
      body.classList.add('disabled');
    }
  }

  function updateThemeUI(family, mode) {
    familyButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.family === family);
    });

    modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    if (modeTrack) modeTrack.classList.toggle('right', mode === 'dark');

    if (modeRow) modeRow.classList.toggle('is-disabled', family === 'amoled');

    document.documentElement.setAttribute('data-theme', resolveTheme(family, mode));
  }

  function applyThemeChange(family, mode) {
    currentFamily = family;
    currentMode   = mode;
    updateThemeUI(family, mode);

    const resolved = resolveTheme(family, mode);
    chrome.storage.sync.set({ themeFamily: family, themeMode: mode }, () => {
      // Surface a storage write failure so the UI never claims a save that didn't happen.
      const err = chrome.runtime && chrome.runtime.lastError;
      if (err) {
        console.warn('ReEcap: theme save failed —', err.message);
        return;
      }
      if (toggleSwitch.checked) {
        sendMessageToTabs({ type: 'REECAP_THEME', theme: resolved });
      }
    });
  }

  function sendMessageToTabs(messagePayload) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('info.aec.edu.in')) {
        chrome.tabs.sendMessage(tabs[0].id, messagePayload).catch(() => {});
      }
    });
  }

  toggleSwitch.addEventListener('change', () => {
    const isEnabled = toggleSwitch.checked;
    updateStatusLabel(isEnabled);
    chrome.storage.sync.set({ enabled: isEnabled }, () => {
      const err = chrome.runtime && chrome.runtime.lastError;
      if (err) { console.warn('ReEcap: toggle save failed —', err.message); return; }
      sendMessageToTabs({ type: 'REECAP_TOGGLE', enabled: isEnabled });
    });
  });

  familyButtons.forEach(btn => {
    btn.addEventListener('click', () => applyThemeChange(btn.dataset.family, currentMode));
  });

  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentFamily === 'amoled') return;
      applyThemeChange(currentFamily, btn.dataset.mode);
    });
  });
});
