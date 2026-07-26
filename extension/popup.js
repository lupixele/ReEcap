// ReEcap — popup.js
// Handles toggle and two-tier theme settings (color family + mode) via chrome.storage.sync

function resolveTheme(family, mode) {
  if (family === "amoled") return "amoled";
  if (family === "original") return mode; // returns "light" or "dark" (legacy selectors untouched)
  return `${family}-${mode}`;             // returns "cappuccino-light", "cappuccino-dark", etc.
}

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

document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const statusText = document.getElementById('statusText');
  const familyButtons = document.querySelectorAll('#familySwitcher .theme-btn');
  const modeButtons = document.querySelectorAll('#modeSwitcher .mode-btn');
  const modeRow = document.getElementById('modeRow');
  const body = document.body;

  let currentFamily = 'original';
  let currentMode = 'light';

  // Initialize UI based on storage
  chrome.storage.sync.get({ enabled: true, themeFamily: null, themeMode: null, theme: null }, (data) => {
    // 1. Set toggle
    toggleSwitch.checked = data.enabled;
    updateStatusLabel(data.enabled);

    // 2. Set theme UI after migration check
    migrateThemeStorage(data, (mapped) => {
      currentFamily = mapped.family;
      currentMode = mapped.mode;
      updateThemeUI(currentFamily, currentMode);
    });
  });

  function updateStatusLabel(enabled) {
    if (enabled) {
      statusText.textContent = 'Active';
      statusText.className = 'label-status status-enabled';
      body.classList.remove('disabled');
    } else {
      statusText.textContent = 'Disabled';
      statusText.className = 'label-status status-disabled';
      body.classList.add('disabled');
    }
  }

  function updateThemeUI(family, mode) {
    familyButtons.forEach(btn => {
      if (btn.dataset.family === family) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    modeButtons.forEach(btn => {
      if (btn.dataset.mode === mode) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    if (family === 'amoled') {
      if (modeRow) modeRow.classList.add('is-disabled');
    } else {
      if (modeRow) modeRow.classList.remove('is-disabled');
    }

    const resolved = resolveTheme(family, mode);
    document.documentElement.setAttribute('data-theme', resolved);
  }

  function applyThemeChange(family, mode) {
    currentFamily = family;
    currentMode = mode;
    updateThemeUI(family, mode);

    const resolved = resolveTheme(family, mode);
    chrome.storage.sync.set({ themeFamily: family, themeMode: mode }, () => {
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

  // Listen for Toggle Change
  toggleSwitch.addEventListener('change', () => {
    const isEnabled = toggleSwitch.checked;
    updateStatusLabel(isEnabled);

    chrome.storage.sync.set({ enabled: isEnabled }, () => {
      sendMessageToTabs({ type: 'REECAP_TOGGLE', enabled: isEnabled });
    });
  });

  // Listen for Family Change
  familyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      applyThemeChange(btn.dataset.family, currentMode);
    });
  });

  // Listen for Mode Change
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentFamily === 'amoled') return;
      applyThemeChange(currentFamily, btn.dataset.mode);
    });
  });
});
