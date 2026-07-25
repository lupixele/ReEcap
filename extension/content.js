// Re:Ecap — content.js
// Injects/removes the stylesheet based on the enabled toggle state.
// Does NOT touch page logic, forms, or postbacks.

const STYLE_ID = 'reecap-stylesheet';

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const link = document.createElement('link');
  link.id = STYLE_ID;
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = chrome.runtime.getURL('style.css');
  (document.head || document.documentElement).appendChild(link);
}

function removeStyle() {
  const el = document.getElementById(STYLE_ID);
  if (el) el.remove();
}

// Apply on load based on stored state (default: enabled)
chrome.storage.sync.get({ enabled: true }, (data) => {
  if (data.enabled) injectStyle();
});

// Listen for live toggle from popup (no page reload needed)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'REECAP_TOGGLE') {
    if (msg.enabled) injectStyle();
    else removeStyle();
  }
});
