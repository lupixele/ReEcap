// ReEcap Main World Alert & AJAX Interceptor
// Executed directly in the main world context by Chrome MV3 to intercept window.alert and Sys.WebForms.PageRequestManager
// This completely avoids any DOM inline script injection, preventing Content Security Policy (CSP) violations.

(function installMainWorldAlertInterceptor() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__reecap_alert_intercepted) return;
  window.__reecap_alert_intercepted = true;

  function isRawHtmlOrServerError(msg) {
    if (!msg) return false;
    let text = '';
    if (typeof msg === 'string') {
      text = msg;
    } else if (msg instanceof Error) {
      text = (msg.message || '') + ' ' + (msg.stack || '');
    } else {
      try { text = String(msg); } catch (e) { return false; }
    }
    return text.includes('<!DOCTYPE') ||
           text.includes('<html') ||
           text.includes('<title>401') ||
           text.includes('401 - Unauthorized') ||
           text.includes('401 Unauthorized') ||
           text.includes('Access is denied due to invalid credentials') ||
           text.includes('You do not have permission to view this directory') ||
           text.includes('403 - Forbidden') ||
           text.includes('500 - Internal Server Error') ||
           text.includes('Server Error in') ||
           text.includes('Runtime Error') ||
           text.includes('Sys.WebForms.PageRequestManager') ||
           text.includes('Sorry, error while accessing page');
  }

  const _nativeAlert = window.alert;
  window.alert = function(msg) {
    if (isRawHtmlOrServerError(msg)) {
      console.warn('ReEcap suppressed raw HTML alert modal:', typeof msg === 'string' ? msg.slice(0, 160) : msg);
      window.dispatchEvent(new CustomEvent('REECAP_SUPPRESSED_ALERT', {
        detail: { message: typeof msg === 'string' ? msg : String(msg) }
      }));
      return;
    }
    return _nativeAlert.apply(this, arguments);
  };

  function hookPrm() {
    if (window.Sys && window.Sys.WebForms && window.Sys.WebForms.PageRequestManager) {
      try {
        const prm = window.Sys.WebForms.PageRequestManager.getInstance();
        if (prm && !prm.__reecap_hooked) {
          prm.__reecap_hooked = true;
          prm.add_endRequest(function(sender, args) {
            if (args && args.get_error()) {
              const err = args.get_error();
              const m = err.message || '';
              if (isRawHtmlOrServerError(m)) {
                args.set_errorHandled(true);
                console.warn('ReEcap handled PageRequestManager error:', m.slice(0, 160));
                window.dispatchEvent(new CustomEvent('REECAP_SUPPRESSED_ALERT', {
                  detail: { message: m }
                }));
              }
            }
          });
        }
      } catch (e) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hookPrm);
  } else {
    hookPrm();
  }

  let attempts = 0;
  const prmTimer = setInterval(function() {
    attempts++;
    hookPrm();
    if (attempts > 20 || (window.Sys && window.Sys.WebForms && window.Sys.WebForms.PageRequestManager)) {
      clearInterval(prmTimer);
    }
  }, 300);
})();
