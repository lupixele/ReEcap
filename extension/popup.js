// ReEcap — popup.js
// Handles toggle and theme settings via chrome.storage.sync

document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const statusText = document.getElementById('statusText');
  const themeButtons = document.querySelectorAll('.theme-btn');
  const body = document.body;

  // Initialize UI based on storage
  chrome.storage.sync.get({ enabled: true, theme: 'light' }, (data) => {
    // 1. Set toggle
    toggleSwitch.checked = data.enabled;
    updateStatusLabel(data.enabled);
    
    // 2. Set theme UI
    setActiveThemeBtn(data.theme);
    
    // Apply theme to popup itself for consistency
    document.documentElement.setAttribute('data-theme', data.theme);
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

  function setActiveThemeBtn(themeName) {
    themeButtons.forEach(btn => {
      if (btn.dataset.themeBtn === themeName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function sendMessageToTabs(messagePayload) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('info.aec.edu.in')) {
        // Broadcast message to content scripts in the active tab (including iframes)
        chrome.tabs.sendMessage(tabs[0].id, messagePayload).catch(() => {
          // Ignore error if content script isn't injected
        });
      }
    });
  }

  // Listen for Toggle Change
  toggleSwitch.addEventListener('change', () => {
    const isEnabled = toggleSwitch.checked;
    updateStatusLabel(isEnabled);

    // Save toggle state
    chrome.storage.sync.set({ enabled: isEnabled }, () => {
      sendMessageToTabs({ type: 'REECAP_TOGGLE', enabled: isEnabled });
    });
  });

  // Listen for Theme Change
  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedTheme = btn.dataset.themeBtn;
      setActiveThemeBtn(selectedTheme);
      
      // Update popup itself
      document.documentElement.setAttribute('data-theme', selectedTheme);

      // Save theme state
      chrome.storage.sync.set({ theme: selectedTheme }, () => {
        // Send live update ONLY if extension is currently enabled
        if (toggleSwitch.checked) {
          sendMessageToTabs({ type: 'REECAP_THEME', theme: selectedTheme });
        }
      });
    });
  });
});
