// ReEcap — content.js
// Injects/removes the stylesheet and applies the active data-theme.
// Does NOT touch page logic, forms, or postbacks.

const STYLE_ID = 'reecap-stylesheet';
const FONTS_ID = 'reecap-fonts';
const FONTS_PRE1_ID = 'reecap-fonts-pre1';
const FONTS_PRE2_ID = 'reecap-fonts-pre2';
const SKIP_LINK_ID = 'reecap-skip-link';
const THEME_STORAGE_DEFAULTS = { enabled: true, themeFamily: null, themeMode: null, theme: null };

let reecapEnabled = false;

const reecap = window.__reecap_theme || {};
const resolveTheme        = reecap.resolveTheme        || ((f, m) => (f === 'amoled' ? 'amoled' : (f === 'original' ? (m || 'light') : `${f}-${m || 'light'}`)));
const migrateThemeStorage_ = reecap.migrateThemeStorage || ((d) => ({ family: (d && d.themeFamily) || 'original', mode: (d && d.themeMode) || 'light' }));
const matchActivePage     = reecap.matchActivePage     || (() => null);

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

function injectStyle() {
  const head = document.head || document.documentElement;

  // Inject Google Fonts directly into <head> to bypass CSS @import CSP issues
  if (!document.getElementById(FONTS_PRE1_ID)) {
    const pre1 = document.createElement('link');
    pre1.id = FONTS_PRE1_ID; pre1.rel = 'preconnect'; pre1.href = 'https://fonts.googleapis.com';
    const pre2 = document.createElement('link');
    pre2.id = FONTS_PRE2_ID; pre2.rel = 'preconnect'; pre2.href = 'https://fonts.gstatic.com'; pre2.crossOrigin = 'anonymous';
    const fontLink = document.createElement('link');
    fontLink.id = FONTS_ID; fontLink.rel = 'stylesheet'; fontLink.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap';

    head.appendChild(pre1);
    head.appendChild(pre2);
    head.appendChild(fontLink);
  }

  if (!document.getElementById(STYLE_ID)) {
    const link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('style.css');
    head.appendChild(link);
  }

  ensureSkipLink();
}

function removeStyle() {
  const el = document.getElementById(STYLE_ID);
  if (el) el.remove();
}

function migrateThemeStorage(data) {
  const mapped = migrateThemeStorage_(data);
  // Migrate only once. The storage-level onChanged listener below ensures the
  // successful write reaches every iframe — messages alone reach only the
  // top-level document in many MV3 situations.
  if (data && !data.themeFamily && window === window.top) {
    try {
      chrome.storage.sync.set({ themeFamily: mapped.family, themeMode: mapped.mode, theme: null }, () => {
        void chrome.runtime && chrome.runtime.lastError;
      });
    } catch (e) { /* extension reloaded between read and write — ignore */ }
  }
  return mapped;
}

function applyStoredTheme(data) {
  const mapped = migrateThemeStorage(data);
  reecapEnabled = data.enabled !== false;
  if (!reecapEnabled) {
    removeStyle();
    document.documentElement.removeAttribute('data-theme');
    return;
  }
  injectStyle();
  document.documentElement.setAttribute('data-theme', resolveTheme(mapped.family, mapped.mode));
}

// Apply once on every parent + iframe document. A later storage update will
// re-run applyStoredTheme in all frames, keeping theme switching consistent.
chrome.storage.sync.get(THEME_STORAGE_DEFAULTS, applyStoredTheme);

// Storage is the source of truth and propagates across every content-script
// frame. This fixes the old behavior where the popup message styled the shell
// but left iframe pages on their previous theme.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return;
  if (!(changes.enabled || changes.themeFamily || changes.themeMode || changes.theme)) return;
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
      removeStyle();
      document.documentElement.removeAttribute('data-theme');
    }
  } else if (msg.type === 'REECAP_THEME' && reecapEnabled) {
    document.documentElement.setAttribute('data-theme', msg.theme);
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
