// ReEcap — content.js
// Injects/removes the stylesheet and applies the active data-theme.
// Does NOT touch page logic, forms, or postbacks.

const STYLE_ID = 'reecap-stylesheet';
const FONTS_ID = 'reecap-fonts';
const FONTS_PRE1_ID = 'reecap-fonts-pre1';
const FONTS_PRE2_ID = 'reecap-fonts-pre2';

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
}

function removeStyle() {
  const el = document.getElementById(STYLE_ID);
  if (el) el.remove();
}

function resolveTheme(family, mode) {
  if (family === "amoled") return "amoled";
  if (family === "original") return mode; // returns "light" or "dark"
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

// Apply on load based on stored state
chrome.storage.sync.get({ enabled: true, themeFamily: null, themeMode: null, theme: null }, (data) => {
  if (data.enabled) {
    injectStyle();
    migrateThemeStorage(data, (mapped) => {
      const resolved = resolveTheme(mapped.family, mapped.mode);
      document.documentElement.setAttribute('data-theme', resolved);
    });
  }
});

// Listen for live messages from popup (no page reload needed)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'REECAP_TOGGLE') {
    if (msg.enabled) {
      injectStyle();
      chrome.storage.sync.get({ themeFamily: null, themeMode: null, theme: null }, (data) => {
        migrateThemeStorage(data, (mapped) => {
          const resolved = resolveTheme(mapped.family, mapped.mode);
          document.documentElement.setAttribute('data-theme', resolved);
        });
      });
    } else {
      removeStyle();
      document.documentElement.removeAttribute('data-theme');
    }
  } else if (msg.type === 'REECAP_THEME') {
    chrome.storage.sync.get({ enabled: true }, (data) => {
      if (data.enabled) {
        document.documentElement.setAttribute('data-theme', msg.theme);
      }
    });
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
  const links = document.querySelectorAll('a.reecap-sidebar-link:not(.reecap-sidebar-overview), a.menuLink');
  links.forEach(link => {
    try {
      const linkPath = new URL(link.href).pathname.toLowerCase();
      // If the iframe is currently showing this link's page
      if (iframePath.includes(linkPath) || linkPath.includes(iframePath)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    } catch (e) {}
  });
}
