// Re:Ecap — popup.js
// Reads and toggles the extension state via chrome.storage.sync

document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const statusText = document.getElementById('statusText');

  function updateStatusLabel(enabled) {
    if (enabled) {
      statusText.textContent = 'Active';
      statusText.className = 'label-status status-enabled';
    } else {
      statusText.textContent = 'Disabled';
      statusText.className = 'label-status status-disabled';
    }
  }

  // Read initial state from storage (default to true)
  chrome.storage.sync.get({ enabled: true }, (data) => {
    toggleSwitch.checked = data.enabled;
    updateStatusLabel(data.enabled);
  });

  // Listen for toggle change
  toggleSwitch.addEventListener('change', () => {
    const isEnabled = toggleSwitch.checked;
    updateStatusLabel(isEnabled);

    // Save to storage
    chrome.storage.sync.set({ enabled: isEnabled }, () => {
      // Send message to active tab to dynamically apply/remove styling
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes('info.aec.edu.in')) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'REECAP_TOGGLE',
            enabled: isEnabled
          }).catch(() => {
            // Ignore error if content script isn't injected on this specific page yet
          });
        }
      });
    });
  });
});
