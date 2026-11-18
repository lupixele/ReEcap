// ReEcap — content.js
// Injects/removes the stylesheet and applies the active data-theme.
// Does NOT touch page logic, forms, or postbacks.

const STYLE_ID = 'reecap-stylesheet';
const TOKENS_ID = 'reecap-tokens';
const SKIP_LINK_ID = 'reecap-skip-link';
const THEME_STORAGE_DEFAULTS = {
  enabled: true,
  nightTabPreset: null,
  nightTabRadius: 25,
  nightTabShadow: 75,
  nightTabStyle: null,
  themeFamily: null,
  themeMode: null,
  theme: null
};
const LEGACY_THEME_KEYS = ['nightTabStyle', 'themeFamily', 'themeMode', 'theme'];

let reecapEnabled = false;

const reecap = window.__reecap_theme || {};
const migrateThemeStorage_ = reecap.migrateThemeStorage || (() => ({
  preset: 'app', style: 'dark', appearance: 'dark', radius: 25, shadow: 75
}));
const matchActivePage = reecap.matchActivePage || (() => null);

function ensureSkipLink() {
  if (document.getElementById(SKIP_LINK_ID)) return;
  const target = document.getElementById('reecap-content-col') || document.body;
  const a = document.createElement('a');
  a.id = SKIP_LINK_ID;
  a.href = '#reecap-content-col';
  a.className = 'reecap-skip-link';
  a.textContent = 'Skip to main content';
  document.documentElement.insertBefore(a, document.body || target);
}

function injectStylesheet(id, path) {
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = chrome.runtime.getURL(path);
  (document.head || document.documentElement).appendChild(link);
}

function injectStyle() {
  // Tokens must load before the portal component stylesheet.
  injectStylesheet(TOKENS_ID, 'shared/tokens.css');
  injectStylesheet(STYLE_ID, 'style.css');
  

  
  ensureSkipLink();
}

function removeStyle() {
  document.getElementById(STYLE_ID)?.remove();
  document.getElementById(TOKENS_ID)?.remove();
  document.getElementById(SKIP_LINK_ID)?.remove();
}

function migrateThemeStorage(data) {
  const mapped = migrateThemeStorage_(data || {});
  const hasLegacyStorage = LEGACY_THEME_KEYS.some(key => data && data[key] != null);

  // Persist one canonical preset and discard every legacy mode/family field.
  // Storage propagation reaches the parent and every authenticated iframe.
  if (data && window === window.top
      && (data.nightTabPreset !== mapped.preset || hasLegacyStorage)) {
    try {
      chrome.storage.sync.set({ nightTabPreset: mapped.preset }, () => {
        void chrome.runtime && chrome.runtime.lastError;
        chrome.storage.sync.remove(LEGACY_THEME_KEYS, () => {
          void chrome.runtime && chrome.runtime.lastError;
        });
      });
    } catch (e) { /* extension reloaded between read and write — ignore */ }
  }
  return mapped;
}

function clearThemeAttributes() {
  removeStyle();
  const root = document.documentElement;
  root.removeAttribute('data-theme');
  root.removeAttribute('data-theme-style');
  root.removeAttribute('data-theme-appearance');
  root.removeAttribute('data-theme-preset');
  root.classList.remove('is-theme-style-dark', 'is-theme-style-light');
  root.style.removeProperty('color-scheme');
}

function applyStoredTheme(data) {
  const mapped = migrateThemeStorage(data);
  reecapEnabled = data.enabled !== false;
  if (!reecapEnabled) {
    clearThemeAttributes();
    return;
  }

  injectStyle();
  const options = { radius: mapped.radius, shadow: mapped.shadow };
  if (reecap.applyTheme) {
    reecap.applyTheme(mapped.preset, options);
  } else {
    const root = document.documentElement;
    root.setAttribute('data-theme', mapped.style);
    root.setAttribute('data-theme-style', mapped.style);
    root.setAttribute('data-theme-appearance', mapped.appearance);
    root.setAttribute('data-theme-preset', mapped.preset);
  }

  // Relay only canonical preset data to the authenticated child iframe.
  if (window === window.top) {
    try {
      const iframe = document.getElementById('capIframeId');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'REECAP_NIGHTTAB_PRESET',
          preset: mapped.preset,
          options
        }, '*');
      }
    } catch (e) {}
  }
}

// Apply once on every parent + iframe document. A later storage update will
// re-run applyStoredTheme in all frames, keeping theme switching consistent.
chrome.storage.sync.get(THEME_STORAGE_DEFAULTS, applyStoredTheme);

// Storage is the source of truth and propagates across every content-script
// frame. Legacy mode writes no longer trigger a separate appearance mutation.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return;
  const watchedKeys = ['enabled', 'nightTabPreset', 'nightTabRadius', 'nightTabShadow'];
  if (!watchedKeys.some(key => key in changes)) return;
  chrome.storage.sync.get(THEME_STORAGE_DEFAULTS, applyStoredTheme);
});

// Popup messages make the top-level page respond immediately. The storage
// listener above carries the same change to every iframe shortly afterward.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'REECAP_TOGGLE') {
    if (msg.enabled) {
      chrome.storage.sync.get(THEME_STORAGE_DEFAULTS, applyStoredTheme);
    } else {
      reecapEnabled = false;
      clearThemeAttributes();
    }
  } else if (msg.type === 'REECAP_NIGHTTAB_PRESET' && reecapEnabled) {
    if (reecap.applyTheme) {
      reecap.applyTheme(msg.preset, msg.options);
    }
    if (window === window.top) {
      try {
        const iframe = document.getElementById('capIframeId');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'REECAP_NIGHTTAB_PRESET',
            preset: msg.preset,
            options: msg.options
          }, '*');
        }
      } catch (e) {}
    }
  }
});

// Only a parent portal frame may relay an instant preset update to this frame.
window.addEventListener('message', (event) => {
  if (window === window.top || event.source !== window.parent || !reecapEnabled) return;
  if (event.data && event.data.type === 'REECAP_NIGHTTAB_PRESET' && reecap.applyTheme) {
    reecap.applyTheme(event.data.preset, event.data.options);
  }
});

// ---- VISUAL POLISH: Iframe transparency & Sidebar Sync ----

// 1. If we are inside an iframe, make the background purely transparent 
//    so the parent shell's ambient glow shines through the card gaps.
if (window !== window.top) {
  document.documentElement.style.background = 'transparent';
  document.documentElement.style.setProperty('background', 'transparent', 'important');
  
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body) {
      document.body.style.background = 'transparent';
      document.body.style.setProperty('background', 'transparent', 'important');
    }
  });
}

// 2. If we are in the parent shell, monitor the iframe URL and apply
//    the .active class to the corresponding sidebar menu link.
if (window === window.top) {
  let lastIframeUrl = '';

  function checkIframeUrl() {
    const iframe = document.getElementById('capIframeId');
    if (!iframe) return;

    try {
      const currentUrl = iframe.contentWindow.location.pathname.toLowerCase();
      if (currentUrl !== lastIframeUrl) {
        lastIframeUrl = currentUrl;
        syncSidebarActiveState(currentUrl);
      }
    } catch (e) {
      // Cross-origin restriction before iframe fully loads/redirects, safely ignore
    }
  }

  // Observe iframe src attribute changes
  const waitForIframe = new MutationObserver(() => {
    const iframe = document.getElementById('capIframeId');
    if (!iframe) return;
    waitForIframe.disconnect();

    // Watch for src attribute changes
    const srcObserver = new MutationObserver(() => checkIframeUrl());
    srcObserver.observe(iframe, { attributes: true, attributeFilter: ['src'] });

    // Also listen for iframe navigation events (covers same-origin navigations)
    iframe.addEventListener('load', checkIframeUrl);

    // Initial check
    checkIframeUrl();
  });

  if (document.getElementById('capIframeId')) {
    // Iframe already exists; set up observers directly
    const iframe = document.getElementById('capIframeId');
    const srcObserver = new MutationObserver(() => checkIframeUrl());
    srcObserver.observe(iframe, { attributes: true, attributeFilter: ['src'] });
    iframe.addEventListener('load', checkIframeUrl);
    checkIframeUrl();
  } else {
    // Wait for the iframe to appear in the DOM
    waitForIframe.observe(document.documentElement, { childList: true, subtree: true });
  }
}

function syncSidebarActiveState(iframePath) {
  if (document.documentElement.getAttribute('data-overview-active') === 'true') {
    return;
  }
  const activeKey = matchActivePage(iframePath);
  const links = document.querySelectorAll('a.reecap-sidebar-link:not(.reecap-sidebar-overview), a.menuLink');
  links.forEach(link => {
    // The link was stamped with data-route-key at sidebar-build time. A
    // single equality check fires here — no per-link path math, no
    // substring .includes() that can light up multiple links at once.
    const linkKey = link.getAttribute('data-route-key') || null;
    link.classList.toggle('active', !!activeKey && linkKey === activeKey);
  });
}
