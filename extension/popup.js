// ReEcap popup settings. Theme resolution and migration are defined in shared/theme.js.

const reecap = window.__reecap_theme || {};
const resolveTheme = reecap.resolveTheme || ((family, mode) => (
  family === 'amoled' ? 'amoled' : (family === 'original' ? (mode || 'light') : `${family}-${mode || 'light'}`)
));
const migrateThemeStorage = reecap.migrateThemeStorage || ((data) => ({
  family: (data && data.themeFamily) || 'original',
  mode: (data && data.themeMode) || 'light',
}));
const FAMILY_META = reecap.FAMILY_META || {};
const STORAGE_DEFAULTS = { enabled: true, themeFamily: null, themeMode: null, theme: null };

function getActivePortalTab() {
  return chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (!tab || !tab.url || !/^https?:\/\/info\.aec\.edu\.in\//i.test(tab.url)) return null;
    return tab;
  });
}

function sendMessageToActivePortal(message) {
  return getActivePortalTab().then((tab) => {
    if (!tab) return false;
    return chrome.tabs.sendMessage(tab.id, message).then(() => true).catch(() => false);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const statusText = document.getElementById('statusText');
  const familyButtons = [...document.querySelectorAll('#familySwitcher [role="radio"]')];
  const modeButtons = [...document.querySelectorAll('#modeSwitcher [role="radio"]')];
  const modeRow = document.getElementById('modeRow');
  const modeNote = document.getElementById('modeNote');
  const cacheButton = document.getElementById('clearCacheButton');
  const controls = document.querySelector('.setting-controls');

  let currentFamily = 'original';
  let currentMode = 'light';

  familyButtons.forEach((button) => {
    const meta = FAMILY_META[button.dataset.family];
    if (!meta) return;
    button.setAttribute('aria-label', `${meta.label}: ${meta.description}`);
    const dot = button.querySelector('.choice-dot');
    if (dot) dot.style.backgroundColor = meta.preview;
  });

  function announce(message, state = 'active') {
    statusText.textContent = message;
    statusText.dataset.state = state;
  }

  function updateEnabledUI(enabled) {
    toggleSwitch.setAttribute('aria-checked', String(enabled));
    document.body.classList.toggle('is-disabled', !enabled);
    if (controls) controls.inert = !enabled;
    announce(enabled ? 'Active' : 'Disabled', enabled ? 'active' : 'disabled');
  }

  function updateThemeUI(family, mode) {
    familyButtons.forEach((button) => {
      const selected = button.dataset.family === family;
      button.setAttribute('aria-checked', String(selected));
    });

    modeButtons.forEach((button) => {
      const selected = button.dataset.mode === mode;
      button.setAttribute('aria-checked', String(selected));
    });

    const isAmoled = family === 'amoled';
    modeRow.disabled = isAmoled;
    modeNote.hidden = !isAmoled;
    document.documentElement.dataset.theme = resolveTheme(family, mode);
  }

  function persist(values, successMessage) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(values, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          announce('Could not save settings', 'error');
          resolve(false);
          return;
        }
        announce(successMessage, 'active');
        resolve(true);
      });
    });
  }

  async function applyTheme(family, mode) {
    currentFamily = family;
    currentMode = family === 'amoled' ? 'dark' : mode;
    updateThemeUI(currentFamily, currentMode);
    const saved = await persist({ themeFamily: currentFamily, themeMode: currentMode }, 'Appearance saved');
    if (saved && toggleSwitch.getAttribute('aria-checked') === 'true') {
      const delivered = await sendMessageToActivePortal({ type: 'REECAP_THEME', theme: resolveTheme(currentFamily, currentMode) });
      if (!delivered) announce('Saved — open the AEC portal to apply', 'unavailable');
    }
  }

  chrome.storage.sync.get(STORAGE_DEFAULTS, (data) => {
    const enabled = data.enabled !== false;
    const mapped = migrateThemeStorage(data);
    currentFamily = mapped.family;
    currentMode = mapped.mode;
    updateEnabledUI(enabled);
    updateThemeUI(currentFamily, currentMode);

    if (!data.themeFamily) {
      chrome.storage.sync.set({ themeFamily: currentFamily, themeMode: currentMode, theme: null });
    }
  });

  toggleSwitch.addEventListener('click', async () => {
    const enabled = toggleSwitch.getAttribute('aria-checked') !== 'true';
    updateEnabledUI(enabled);
    const saved = await persist({ enabled }, enabled ? 'Active' : 'Disabled');
    if (saved) {
      const delivered = await sendMessageToActivePortal({ type: 'REECAP_TOGGLE', enabled });
      if (!delivered && enabled) announce('Saved — open the AEC portal to apply', 'unavailable');
    }
  });

  familyButtons.forEach((button) => button.addEventListener('click', () => applyTheme(button.dataset.family, currentMode)));
  modeButtons.forEach((button) => button.addEventListener('click', () => {
    if (currentFamily !== 'amoled') applyTheme(currentFamily, button.dataset.mode);
  }));

  cacheButton.addEventListener('click', () => {
    chrome.storage.local.remove(['reecapTimetable', 'reecapIdentity', 'reecapProfileData'], () => {
      const error = chrome.runtime.lastError;
      announce(error ? 'Could not clear local cache' : 'Local cache cleared', error ? 'error' : 'active');
    });
  });
});
