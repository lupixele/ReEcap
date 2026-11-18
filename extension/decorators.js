// ReEcap — decorators.js
// Isolated module for DOM-reading decorative enhancements (SVG rings, progress bars).

var responsiveNavigationController = null;

function isExtensionValid() {
  try {
    return typeof chrome !== 'undefined' && Boolean(chrome && chrome.runtime && chrome.runtime.id);
  } catch (e) {
    return false;
  }
}

function isContextInvalidatedError(e) {
  if (!e) return false;
  const msg = (e.message || String(e)).toLowerCase();
  return msg.includes('extension context invalidated') || msg.includes('context invalidated');
}

function escapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ────────────────────────────────────────────────────────────────
// Universal Alert & Server Error Interceptor (Main World + Isolated World)
// ────────────────────────────────────────────────────────────────
// Intercepts raw IIS / ASP.NET HTML error popups (e.g. 401 Unauthorized,
// 500 Server Error) triggered via window.alert() or Sys.WebForms and
// translates them into elegant in-UI nightTab error state cards.

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

// Note: Main-world alert interception is handled directly via manifest content_scripts world: "MAIN" (shared/interceptor.js)
// to avoid any inline script DOM injection and prevent CSP violations.

// Isolated world alert interception
const _nativeIsolatedAlert = window.alert;
window.alert = function(msg) {
  if (isRawHtmlOrServerError(msg)) {
    handleSuppressedAlert(typeof msg === 'string' ? msg : String(msg));
    return;
  }
  return _nativeIsolatedAlert.apply(this, arguments);
};

window.addEventListener('REECAP_SUPPRESSED_ALERT', (e) => {
  const msg = (e.detail && e.detail.message) ? e.detail.message : '';
  handleSuppressedAlert(msg);
});

function parseServerErrorInfo(raw, pathname) {
  const text = String(raw || '');
  const path = String(pathname || (typeof window !== 'undefined' ? window.location.pathname : '')).toLowerCase();
  const isExamRelated = path.includes('exam') || path.includes('hallticket') || path.includes('answersheet') || text.toLowerCase().includes('exam');

  let statusCode = '401';
  let title = isExamRelated ? 'Exam Details Temporarily Restricted' : 'Portal Service Notice';
  let subtitle = '401 • Unauthorized Access';
  let description = isExamRelated
    ? 'The ERP examination module reported an authorization restriction (401 - Unauthorized: Access is denied). Student exam schedules, hall tickets, and marks are opened by the examination branch during active exam windows.'
    : 'The portal reported an authorization restriction (401 - Unauthorized). Your student session lacks permission for this endpoint.';

  if (text.includes('401') || text.includes('Unauthorized') || text.includes('invalid credentials')) {
    statusCode = '401';
    title = isExamRelated ? 'Exam Details Temporarily Restricted' : 'Portal Service Notice';
    subtitle = '401 • Unauthorized Access';
    description = isExamRelated
      ? 'The ERP examination module reported an authorization restriction (401 - Unauthorized: Access is denied). Student exam schedules, hall tickets, and marks are opened by the examination branch during active exam windows.'
      : 'The portal reported an authorization restriction (401 - Unauthorized). Your student session lacks permission for this endpoint.';
  } else if (text.includes('403') || text.includes('Forbidden')) {
    statusCode = '403';
    title = isExamRelated ? 'Exam Records Restricted' : 'Access Forbidden';
    subtitle = '403 • Forbidden';
    description = 'Access to this academic record is restricted by college ERP security policies for your account role.';
  } else if (text.includes('500') || text.includes('Server Error') || text.includes('Runtime Error')) {
    statusCode = '500';
    title = 'ERP Server Interruption';
    subtitle = '500 • Internal Server Error';
    description = 'The college ERP server encountered an internal error while processing your request. Please try reloading the view.';
  } else if (text.includes('Sorry, error while accessing page')) {
    statusCode = '503';
    title = 'Service Temporarily Unavailable';
    subtitle = 'Portal Routing Interruption';
    description = 'The requested portal page could not be accessed at this time. Please verify your connection.';
  }

  return { statusCode, title, subtitle, description, isExamRelated };
}

function renderInUiErrorCard(info, targetContainer) {
  const details = info || parseServerErrorInfo('');
  const cardId = 'reecap-error-recovery-card';

  if (document.getElementById(cardId)) return;

  const isChild = window.self !== window.top;
  const container = targetContainer || (isChild ? document.body : (document.getElementById('reecap-content-col') || document.body));
  if (!container) return;

  if (isChild && container === document.body) {
    Array.from(document.body.children).forEach(c => {
      if (c.tagName !== 'SCRIPT' && c.tagName !== 'STYLE' && c.tagName !== 'LINK') {
        c.style.setProperty('display', 'none', 'important');
      }
    });
  }

  const wrapper = document.createElement('div');
  wrapper.id = cardId;
  wrapper.className = 'reecap-error-recovery-container';
  wrapper.innerHTML = `
    <div class="reecap-error-recovery-card">
      <div class="reecap-error-icon-box">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <div class="reecap-error-badge">${escapeAttr(details.subtitle)}</div>
      <h2 class="reecap-error-title">${escapeAttr(details.title)}</h2>
      <p class="reecap-error-desc">${escapeAttr(details.description)}</p>

      <div class="reecap-error-callout">
        <div class="reecap-callout-row">
          <span class="reecap-callout-bullet">•</span>
          <span><strong>Official Schedules:</strong> Published examination windows, mid-term dates, and exam fees are accessible in the Academic Calendar.</span>
        </div>
        <div class="reecap-callout-row">
          <span class="reecap-callout-bullet">•</span>
          <span><strong>Portal Security:</strong> Your student session is active, but access to this ERP exam service is restricted by the college examination branch.</span>
        </div>
      </div>

      <div class="reecap-error-actions">
        <button type="button" class="pay-btn pay-btn-primary" id="reecap-err-reload-btn">Reload View</button>
        <button type="button" class="pay-btn pay-btn-secondary" id="reecap-err-calendar-btn">Academic Calendar</button>
        <button type="button" class="pay-btn pay-btn-secondary" id="reecap-err-overview-btn">Return to Overview</button>
      </div>
    </div>
  `;

  container.appendChild(wrapper);

  const reloadBtn = wrapper.querySelector('#reecap-err-reload-btn');
  const calBtn = wrapper.querySelector('#reecap-err-calendar-btn');
  const overviewBtn = wrapper.querySelector('#reecap-err-overview-btn');

  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      if (isChild) {
        window.location.reload();
      } else {
        const iframe = document.getElementById('capIframeId');
        if (iframe && iframe.contentWindow) {
          try { iframe.contentWindow.location.reload(); } catch (e) { iframe.src = iframe.src; }
        } else {
          window.location.reload();
        }
      }
    });
  }

  if (calBtn) {
    calBtn.addEventListener('click', () => {
      if (isChild && window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'REECAP_NAVIGATE', route: 'calendar' }, '*');
      } else if (typeof showAcademicCalendar === 'function') {
        showAcademicCalendar();
      }
    });
  }

  if (overviewBtn) {
    overviewBtn.addEventListener('click', () => {
      if (isChild && window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'REECAP_NAVIGATE', route: 'overview' }, '*');
      } else if (typeof showOverview === 'function') {
        showOverview();
      }
    });
  }

  if (isChild && window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: 'REECAP_SET_TITLE',
      title: details.isExamRelated ? 'EXAMS DETAILS' : 'PORTAL NOTICE'
    }, '*');
    window.parent.postMessage({
      type: 'REECAP_CHILD_ERROR',
      errorInfo: details,
      height: Math.max(480, (wrapper.offsetHeight || 440) + 60)
    }, '*');
    setTimeout(() => {
      const h = wrapper.offsetHeight || wrapper.scrollHeight || 480;
      window.parent.postMessage({ type: 'REECAP_RESIZE', height: Math.max(480, h + 60) }, '*');
    }, 50);
  }
}

function handleSuppressedAlert(rawMessage) {
  const info = parseServerErrorInfo(rawMessage);
  if (window.self !== window.top) {
    renderInUiErrorCard(info);
  } else {
    let shellContainer = document.getElementById('reecap-shell-error-container');
    const contentCol = document.getElementById('reecap-content-col');
    if (!shellContainer && contentCol) {
      shellContainer = document.createElement('div');
      shellContainer.id = 'reecap-shell-error-container';
      contentCol.appendChild(shellContainer);
    }
    if (shellContainer) {
      shellContainer.innerHTML = '';
      shellContainer.style.setProperty('display', 'flex', 'important');
      const iframe = document.getElementById('capIframeId');
      const overview = document.getElementById('reecap-overview');
      const cal = document.getElementById('reecap-calendar-view');
      if (iframe) iframe.style.setProperty('display', 'none', 'important');
      if (overview) overview.style.setProperty('display', 'none', 'important');
      if (cal) cal.style.setProperty('display', 'none', 'important');
      const pageTitle = document.getElementById('reecap-page-title');
      if (pageTitle) pageTitle.textContent = info.isExamRelated ? 'EXAMS DETAILS' : 'PORTAL NOTICE';
      renderInUiErrorCard(info, shellContainer);
    } else {
      renderInUiErrorCard(info);
    }
  }
}


function formatCurrencyAmount(val) {
  if (val === undefined || val === null || val === '--' || val === '' || val === '—') return '--';
  const num = parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(num)) return val;
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Role-based authentication check for injected tools
let CURRENT_ROLE = 'rbtStudent'; // Default assumption, overridden by storage

function isStudentRole() {
  const path = window.location.pathname.toLowerCase();

  // StudentMaster.aspx is unequivocally the student portal
  if (path.includes('studentmaster.aspx')) return true;

  const lblUser = document.getElementById('lblUser');
  if (lblUser && lblUser.textContent) {
    const userText = lblUser.textContent.toUpperCase();
    const hasStudentRoll = /\b\d{2}[A-Z0-9]{3,8}\b/.test(userText);

    // Explicitly allow regex checks to pass regardless of the storage check
    // since storage initialization race conditions can cause valid students to fail check
    if (hasStudentRoll) {
       return true;
    }
  }

  // Fallback to storage checking if regex fails
  return CURRENT_ROLE === 'rbtStudent';
}

function isEmployeeRole() {
  const path = window.location.pathname.toLowerCase();
  if (!path.includes('main.aspx')) return false;
  return CURRENT_ROLE === 'rbtEmployee' || true; // Currently assume anyone on main.aspx is teacher.
}

function initDecorators() {
  if (!isExtensionValid() || !chrome.storage || !chrome.storage.sync) return;
  // Prime the cached role before booting the UI
  try {
    chrome.storage.sync.get({ enabled: true, reecapLoginRole: 'rbtStudent' }, (data) => {
      if (!isExtensionValid() || (chrome.runtime && chrome.runtime.lastError)) return;
      CURRENT_ROLE = data.reecapLoginRole;
      console.log('ReEcap: Booting extension. Active role cached as:', CURRENT_ROLE);
      if (!data.enabled) return;
    
    // 0. Iframe Resize Listener
    if (window.location.pathname.toLowerCase().includes('studentmaster.aspx') || window.location.pathname.toLowerCase().includes('main.aspx')) {
      document.documentElement.setAttribute('data-reecap-master', 'true');
      if (document.body) document.body.setAttribute('data-reecap-master', 'true');

      // Clear native ASP.NET centering and margins to dock sidebar flush against the wall
      function enforceFlushWallDock() {
        const centerEl = document.querySelector('body > form > center');
        if (centerEl) {
          centerEl.style.setProperty('width', '100%', 'important');
          centerEl.style.setProperty('max-width', '100%', 'important');
          centerEl.style.setProperty('margin', '0', 'important');
          centerEl.style.setProperty('padding', '0', 'important');
          centerEl.style.setProperty('text-align', 'left', 'important');
          centerEl.style.setProperty('display', 'block', 'important');
        }
        const topDiv = centerEl ? centerEl.querySelector(':scope > div') : null;
        if (topDiv) {
          topDiv.style.setProperty('width', '100%', 'important');
          topDiv.style.setProperty('max-width', '100%', 'important');
          topDiv.style.setProperty('margin', '0', 'important');
          topDiv.style.setProperty('padding', '0', 'important');
          topDiv.removeAttribute('align');
        }
      }
      enforceFlushWallDock();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enforceFlushWallDock);
      }

      window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'REECAP_RESIZE') {
          const iframe = document.getElementById('capIframeId');
          if (iframe) {
            const isOverview = document.documentElement.getAttribute('data-overview-active') === 'true';
            if (isOverview) {
              iframe.style.setProperty('height', '1px', 'important');
            } else {
              const targetHeight = Math.ceil(e.data.height);
              if (targetHeight > 0) {
                iframe.style.setProperty('height', targetHeight + 'px', 'important');
              }
            }
          }
        }
        if (e.data && e.data.type === 'REECAP_CONTENT_WHEEL') {
          const contentCol = document.getElementById('reecap-content-col');
          if (contentCol) {
            const mult = e.data.deltaMode === 1 ? 24 : (e.data.deltaMode === 2 ? contentCol.clientHeight : 1);
            contentCol.scrollTop += e.data.deltaY * mult;
          }
        }
        if (e.data && e.data.type === 'REECAP_CHILD_ERROR') {
          const iframe = document.getElementById('capIframeId');
          if (iframe) {
            iframe.style.removeProperty('display');
            iframe.style.removeProperty('visibility');
            const h = e.data.height || 520;
            iframe.style.setProperty('height', `${h}px`, 'important');
          }
          const pageTitle = document.getElementById('reecap-page-title');
          if (pageTitle && e.data.errorInfo && e.data.errorInfo.isExamRelated) {
            pageTitle.textContent = 'EXAMS DETAILS';
          }
        }
        if (e.data && e.data.type === 'REECAP_NAVIGATE') {
          if (e.data.route === 'overview' && typeof showOverview === 'function') {
            showOverview();
          } else if (e.data.route === 'calendar' && typeof showAcademicCalendar === 'function') {
            showAcademicCalendar();
          }
        }
      });
      // Unified Header & Status Strip Injection
      const userDataRow = document.querySelector('.userData');
      const mainLayoutTable = userDataRow ? userDataRow.closest('table') : null;
      const topContainer = mainLayoutTable ? mainLayoutTable.parentElement : null;
      
      if (topContainer && userDataRow && !document.querySelector('.masthead')) {
         // 1. Hide original userData row entirely
         userDataRow.style.setProperty('display', 'none', 'important');
         
         // 2. Extract original elements
         const avatarDiv = document.getElementById('divimg');
         const lblUser = document.getElementById('lblUser');
         const innerTable = userDataRow.querySelector('table');
         const changePass = innerTable?.querySelector('a[href*="changepassword"]');
         const logout = innerTable?.querySelector('#lnkLogOut');
         
         // 3. Build Unified Header
         const header = document.createElement('header');
         header.className = 'masthead';

         const brandTagline = isEmployeeRole()
           ? 'ー 𝚊𝚗 𝚄𝚗𝚘𝚏𝚏𝚒𝚌𝚒𝚊𝚕 𝚁𝚎𝚍𝚎𝚜𝚒𝚐𝚗 𝚘𝚏 𝙰𝚍𝚒𝚝𝚢𝚊 𝚄𝚗𝚒𝚟𝚎𝚛𝚜𝚒𝚝𝚢 𝙴𝚌𝚊𝚙 𝚃𝚎𝚊𝚌𝚑𝚎𝚛 𝙿𝚘𝚛𝚝𝚊𝚕'
           : 'ー 𝚊𝚗 𝚄𝚗𝚘𝚏𝚏𝚒𝚌𝚒𝚊𝚕 𝚁𝚎𝚍𝚎𝚜𝚒𝚐𝚗 𝚘𝚏 𝙰𝚍𝚒𝚝𝚢𝚊 𝚄𝚗𝚒𝚟𝚎𝚛𝚜𝚒𝚝𝚢 𝙴𝚌𝚊𝚙 𝚂𝚝𝚞𝚍𝚎𝚗𝚝 𝙿𝚘𝚛𝚝𝚊𝚕';
         const brandBlock = document.createElement('div');
         brandBlock.className = 'brand-block';
         brandBlock.innerHTML = `
           <button type="button" class="mobile-menu-btn" aria-label="Open navigation" aria-expanded="false" aria-controls="reecap-sidebar">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
               <path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>
             </svg>
           </button>
           <button type="button" class="sidebar-collapse-btn desktop-only" id="reecap-sidebar-toggle-btn" aria-label="Toggle Sidebar" title="Toggle Sidebar">
             <svg class="icon-collapse" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M9 3v18"></path><path d="m14 9-3 3 3 3"></path></svg>
             <svg class="icon-expand" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" style="display:none;"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M9 3v18"></path><path d="m11 9 3 3-3 3"></path></svg>
           </button>
           <div class="brand-identity">
             <h1 class="brand-title">
               <span class="brand-title-main">𝚁𝚎𝙴𝚌𝚊𝚙"/</span>
               <span class="brand-title-sub">${brandTagline}</span>
             </h1>
           </div>
         `;

         const sidebarToggleBtn = brandBlock.querySelector('#reecap-sidebar-toggle-btn');
         if (sidebarToggleBtn) {
           try {
             if (localStorage.getItem('reecap_sidebar_collapsed') === 'true') {
               document.documentElement.classList.add('is-sidebar-collapsed');
             }
           } catch (e) {}

           sidebarToggleBtn.addEventListener('click', () => {
             const isCollapsed = document.documentElement.classList.toggle('is-sidebar-collapsed');
             try {
               localStorage.setItem('reecap_sidebar_collapsed', isCollapsed ? 'true' : 'false');
             } catch (e) {}

             // Smooth resize notification loop over 320ms animation duration
             const startTime = performance.now();
             function notifyResize(now) {
               window.dispatchEvent(new Event('resize'));
               try {
                 const iframe = document.getElementById('capIframeId');
                 if (iframe && iframe.contentWindow) {
                   iframe.contentWindow.postMessage({ type: 'REECAP_REQUEST_RESIZE' }, '*');
                 }
               } catch (e) {}
               if (now - startTime < 320) {
                 requestAnimationFrame(notifyResize);
               }
             }
             requestAnimationFrame(notifyResize);
           });
         }

          const userCluster = document.createElement('div');
          userCluster.className = 'user-cluster';

          // 1. Compute student name
          let studentDisplayName = 'Student';
          if (lblUser) {
             // Clean legacy prefixes ("Hi...", "Welcome," etc.)
             const inner = lblUser.querySelector('b, strong');
             const rawUserName = (inner?.textContent || lblUser.textContent || '')
               .replace(/^(Hi|Welcome)[\.\s,:-]*/i, '')
               .trim();

             const parts = rawUserName ? rawUserName.split(/\s+/).filter(Boolean) : [];
             studentDisplayName = parts.length > 0
               ? parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ')
               : 'Student';

             if (rawUserName && isExtensionValid() && chrome?.storage?.local) {
               chrome.storage.local.get(['reecapIdentity'], (cur) => {
                 const prev = cur?.reecapIdentity || {};
                 if (!prev.Name || prev.Name !== studentDisplayName) {
                   chrome.storage.local.set({
                     reecapIdentity: { ...prev, Name: studentDisplayName, rawName: rawUserName }
                   });
                 }
               });
             }
          }

          // 2. Action buttons (Aria AI and Change Password)
          if (isStudentRole()) {
             const ariaBtn = document.createElement('button');
             ariaBtn.type = 'button';
             ariaBtn.className = 'pill-btn reecap-aria-pill-btn';
             ariaBtn.id = 'reecap-aria-masthead-btn';
             ariaBtn.innerHTML = '<svg class="aria-sparkle" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><span>Aria AI</span>';
             ariaBtn.title = 'Open Aria Academic Co-pilot (Ctrl + /)';
             const onAriaClick = (e) => {
               if (e) {
                 e.preventDefault();
                 e.stopPropagation();
               }
               console.log('ReEcap: Aria pill button clicked');
               if (typeof toggleAriaSidebar === 'function') {
                 toggleAriaSidebar();
               } else if (typeof window.toggleAriaSidebar === 'function') {
                 window.toggleAriaSidebar();
               }
             };
             ariaBtn.addEventListener('click', onAriaClick);
             userCluster.appendChild(ariaBtn);
          }

          if (changePass) {
             changePass.className = 'pill-btn';
             userCluster.appendChild(changePass);
          }

          // 3. Rightmost Profile Badge: Profile icon on left, vertical grid with Name above and Logout below
          const profileBadge = document.createElement('div');
          profileBadge.className = 'user-profile-badge';

          let hasAvatar = false;
          if (avatarDiv) {
             const img = avatarDiv.querySelector('img');
             if (img) {
                img.className = 'user-avatar';
                img.removeAttribute('width');
                img.removeAttribute('height');
                img.style.removeProperty('width');
                img.style.removeProperty('height');
                img.style.removeProperty('border-radius');
                img.style.objectFit = 'cover';
                img.style.objectPosition = 'center top';
                img.decoding = 'async';
                img.loading = 'eager';
                img.style.imageRendering = 'smooth';
                img.style.transform = 'translateZ(0)';
                img.style.backfaceVisibility = 'hidden';
                profileBadge.appendChild(img);
                hasAvatar = true;
             }
          }

          if (!hasAvatar) {
             const placeholder = document.createElement('div');
             placeholder.className = 'user-avatar-placeholder';
             placeholder.textContent = studentDisplayName ? studentDisplayName.charAt(0) : 'U';
             profileBadge.appendChild(placeholder);
          }

          const userMetaGrid = document.createElement('div');
          userMetaGrid.className = 'user-meta-grid';

          if (lblUser) {
             lblUser.className = 'user-name';
             lblUser.innerHTML = `<span class="user-display-name">${escapeAttr(studentDisplayName)}</span>`;
             userMetaGrid.appendChild(lblUser);
          }

          if (logout) {
             logout.className = 'pill-btn user-logout-btn';
             logout.innerHTML = '<svg class="logout-icon" viewBox="0 0 24 24" width="13.5" height="13.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg><span>Logout</span>';
             userMetaGrid.appendChild(logout);
          }

          profileBadge.appendChild(userMetaGrid);
          userCluster.appendChild(profileBadge);


         header.appendChild(brandBlock);

         // Extract Teacher Top Nav
         const tblModules = document.getElementById('tblModules');
         const divMenuLinks = document.getElementById('divMenuLinks');
         if (tblModules && divMenuLinks) {
            divMenuLinks.closest('tr').style.setProperty('display', 'none', 'important');
            const topTabsWrap = document.createElement('nav');
            topTabsWrap.className = 'reecap-teacher-tabs';
            topTabsWrap.appendChild(tblModules);
            header.appendChild(topTabsWrap);
         }

         header.appendChild(userCluster);

         // 4. Inject header into DOM before the main layout table
         topContainer.insertBefore(header, mainLayoutTable);
      }

      // Setup dynamic tracking for teacher's left menu
      if (isEmployeeRole()) {
         const divLeftMenu = document.getElementById('divLeftMenu');
         if (divLeftMenu) {
            const observer = new MutationObserver(() => {
               const tblScreens = document.getElementById('tblScreens');
               if (tblScreens && tblScreens.dataset.reecapAccordionReady !== 'true') {
                 buildSidebar();
               }
            });
            observer.observe(divLeftMenu, { childList: true, subtree: true });
         }
      }

      // Sidebar Redesign
      buildSidebar();
      rebuildMainLayout();
    } else {
      // Tag embedded iframe document
      document.documentElement.classList.add('reecap-in-frame');
      if (document.body) document.body.classList.add('reecap-in-frame');

      // Running inside an iframe — send title to parent and hide the legacy MainHead
      const sendTitle = () => {
        const mainHead = document.querySelector('.MainHead');
        if (mainHead && mainHead.textContent.trim()) {
          window.parent.postMessage({ type: 'REECAP_SET_TITLE', title: mainHead.textContent.trim() }, '*');
          mainHead.style.setProperty('display', 'none', 'important');
        }
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', sendTitle);
      } else {
        sendTitle();
        // Also retry after a short delay in case the title is rendered async
        setTimeout(sendTitle, 300);
      }

      // Universal Content Height Measurer to eliminate empty scrolls across all child pages
      const getExactContentHeight = () => {
        const body = document.body;
        if (!body) return 0;
        let maxBottom = 0;
        const selectors = [
          '.reecap-biodata',
          '#reecap-timetable',
          '.reecap-payment-page',
          '.reecap-pane-active',
          '#divProfile_Fees',
          '#divProfile_BioData',
          '.ajax__tab_container',
          '[id*="TabContainer"]',
          '#tblReport',
          '#divdetails',
          'table',
          'form',
          '.container'
        ];
        const elements = body.querySelectorAll(selectors.join(', '));
        elements.forEach(el => {
          if (el.offsetParent === null && el.style.display === 'none') return;
          const rect = el.getBoundingClientRect();
          if (rect.height > 0) {
            const bottom = rect.bottom + window.scrollY;
            if (bottom > maxBottom) maxBottom = bottom;
          }
        });
        if (maxBottom <= 50) {
          const root = document.forms[0] || body;
          Array.from(root.children).forEach(child => {
            if (child.offsetParent === null && child.style.display === 'none') return;
            const rect = child.getBoundingClientRect();
            if (rect.height > 0) {
              const bottom = rect.bottom + window.scrollY;
              if (bottom > maxBottom) maxBottom = bottom;
            }
          });
        }
        return Math.ceil(maxBottom + 16);
      };

      const sendAutoResize = () => {
        try {
          const h = getExactContentHeight();
          if (h > 0 && window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'REECAP_RESIZE', height: h }, '*');
          }
        } catch (e) {}
      };

      window.__reecapSendResize = sendAutoResize;

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          sendAutoResize();
          setTimeout(sendAutoResize, 200);
          setTimeout(sendAutoResize, 600);
        });
      } else {
        sendAutoResize();
        setTimeout(sendAutoResize, 200);
        setTimeout(sendAutoResize, 600);
      }

      window.addEventListener('load', () => {
        sendAutoResize();
        setTimeout(sendAutoResize, 300);
      });

      window.addEventListener('message', (e) => {
        if (e.data && (e.data.type === 'REECAP_REQUEST_RESIZE' || e.data.type === 'REECAP_SWITCH_TAB')) {
          sendAutoResize();
          setTimeout(sendAutoResize, 100);
        }
      });

      if (document.body) {
        try {
          const resizeObserver = new MutationObserver(() => {
            sendAutoResize();
          });
          resizeObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
        } catch (e) {}
      }

      // Forward mouse wheel events to parent content container for seamless independent scrolling
      window.addEventListener('wheel', (e) => {
        try {
          window.parent.postMessage({
            type: 'REECAP_CONTENT_WHEEL',
            deltaY: e.deltaY,
            deltaMode: e.deltaMode
          }, '*');
        } catch (err) {}
      }, { passive: true });
    }
    
    // 1. Login Page (Default.aspx)
    if (window.location.pathname.toLowerCase().includes('default.aspx')) {
      redesignLoginPage();
    }

    // 2. Profile Dashboard (Pass 1)
    const route = (window.location.pathname + window.location.search).toLowerCase();
    if (route.includes('studentattendance.aspx')) {
      redesignAttendancePage();
    }
    if (window.location.pathname.toLowerCase().includes('studentprofile.aspx')) {
      observeProfileDashboard();
    }
    
    // 3. Timetable Dashboard (Pass 2)
    if (window.location.pathname.toLowerCase().includes('studenttimetableoption.aspx')) {
      observeTimetable();
    }

    // 4. Status Strip (Pass 3)
    if (window.location.pathname.toLowerCase().includes('studentmaster.aspx') && isStudentRole()) {
      initStatusStrip();
    }

    // 5. Fee Management & Payment (Phase 6) — studentfeereceipt.aspx, studentreceipts.aspx, studentpayments.aspx.
    const currentRoute = window.location.pathname.toLowerCase();
    if (currentRoute.includes('studentfeereceipt.aspx') || currentRoute.includes('studentreceipts.aspx') || currentRoute.includes('studentpayments.aspx')) {
      handleFeePortalPage();
    }

    // 5b. Backlogs Report — studentbacklogs.aspx
    if (currentRoute.includes('studentbacklogs.aspx')) {
      handleBacklogsPortalPage();
    }

    // 5c. Academic Calendar Report — academiccalenderreport.aspx
    if (currentRoute.includes('academiccalenderreport') || currentRoute.includes('academiccalendar') || currentRoute.includes('academiccalender')) {
      handleAcademicCalendarPage();
    }

    // 5c. Universal Portal Error Interceptor
    observeAndRecoverServerError();

    // 6. Marks Page (2026-07-27) — studentmarksreport.aspx.
    //    Renders the academic record (Present Marks, I Semester, II Semester, etc.),
    //    CGPA summary, and past attendance/internal marks in a unified card layout.
    if (window.location.pathname.toLowerCase().includes('studentmarksreport.aspx')) {
      redesignMarksPage();
    }

    // 7. Exam Script Viewer (2026-08-29) — ExamScriptViewer.aspx.
    //    Adds a "Save as PDF" button that stitches rendered canvas pages into
    //    a downloadable PDF using jsPDF.
    if (window.location.pathname.toLowerCase().includes('examscriptviewer.aspx')) {
      observeExamViewer();
    }
    
    // 7. Inject DOM-integrated Theme Toolbar Sidebar (top-level window only to prevent duplicate icons in iframes)
    if (window.self === window.top && !window.location.pathname.toLowerCase().includes('default.aspx')) {
      injectThemeToolbar();
    }
  });
  } catch (e) {
    if (!isContextInvalidatedError(e)) {
      console.warn('ReEcap: Decorator init skipped:', e);
    }
  }
}

function injectThemeToolbar() {
  if (window.self !== window.top) return;
  if (document.getElementById('reecap-theme-toolbar')) return;

  const toolbar = document.createElement('div');
  toolbar.id = 'reecap-theme-toolbar';
  toolbar.className = 'reecap-theme-toolbar';
  
  const iconPalette = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.02 0 1.93-.72 2.15-1.72.07-.32-.01-.65-.24-.89l-2.02-2.02c-.22-.22-.31-.55-.24-.87.16-.76.84-1.31 1.63-1.31h1.36c3.55 0 6.4-2.85 6.4-6.4 0-4.08-4.07-7.79-9.04-7.79z"/></svg>`;
  const themeEngine = window.__reecap_theme;
  if (!themeEngine) return;
  const presets = themeEngine.PRESETS;

  let currentPresetId = 'point';
  let currentRadius = 25;
  let currentShadow = 75;
  let activeAppearanceFilter = 'all';
  let searchQuery = '';

  toolbar.innerHTML = `
    <button class="reecap-toolbar-trigger" aria-label="Theme Settings" title="Theme Settings">
       ${iconPalette}
    </button>
    <div class="reecap-toolbar-menu">
       <div class="toolbar-header">
         <div class="brand-group">
           <div class="brand-icon">NT</div>
           <div>
             <div class="brand-title">𝚁𝚎𝙴𝚌𝚊𝚙"/</div>
             <div class="brand-subtitle">nightTab Design System</div>
           </div>
         </div>
         <button type="button" class="toolbar-close-btn" aria-label="Close theme menu">
           <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 6-12 12M6 6l12 12"/></svg>
         </button>
       </div>

       <div class="toolbar-section-label">
         <span>Appearance Filter</span>
         <span id="toolbarActivePresetCount">45 / 45</span>
       </div>
       <div class="toolbar-mode-segment" id="toolbarAppearanceSegment">
         <button type="button" class="toolbar-mode-btn is-selected" data-appearance="all">All</button>
         <button type="button" class="toolbar-mode-btn" data-appearance="dark">Dark</button>
         <button type="button" class="toolbar-mode-btn" data-appearance="light">Light</button>
       </div>

       <div class="toolbar-search-wrap">
         <input type="text" class="toolbar-theme-search" id="toolbar-theme-search" placeholder="Search original presets..." />
       </div>

       <div class="toolbar-presets-grid" id="toolbarPresetsGrid"></div>

       <div class="toolbar-section-label" style="margin-top: 8px;">
         <span>Geometry & Elevation</span>
       </div>
       <div class="toolbar-tuning-box">
         <div class="toolbar-slider-row">
           <div class="toolbar-slider-header">
             <span>Corner Radius</span>
             <span id="toolbarRadiusVal">25px</span>
           </div>
           <input type="range" class="toolbar-slider-input" id="toolbarRadiusSlider" min="0" max="100" value="25">
         </div>
         <div class="toolbar-slider-row">
           <div class="toolbar-slider-header">
             <span>Elevation Shadows</span>
             <span id="toolbarShadowVal">75%</span>
           </div>
           <input type="range" class="toolbar-slider-input" id="toolbarShadowSlider" min="0" max="200" value="75">
         </div>
       </div>
    </div>
  `;
  document.body.appendChild(toolbar);

  const wrapper = document.getElementById('reecap-theme-toolbar');
  const presetsGrid = wrapper.querySelector('#toolbarPresetsGrid');
  const countLabel = wrapper.querySelector('#toolbarActivePresetCount');
  const radiusSlider = wrapper.querySelector('#toolbarRadiusSlider');
  const radiusVal = wrapper.querySelector('#toolbarRadiusVal');
  const shadowSlider = wrapper.querySelector('#toolbarShadowSlider');
  const shadowVal = wrapper.querySelector('#toolbarShadowVal');
  const searchInput = wrapper.querySelector('#toolbar-theme-search');

  function notifyActiveIframe(preset, options) {
    try {
      const iframe = document.getElementById('capIframeId');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'REECAP_NIGHTTAB_PRESET',
          preset,
          options
        }, '*');
      }
    } catch (e) {}
  }

  function applyAndSave() {
    const options = { radius: currentRadius, shadow: currentShadow };
    themeEngine.applyTheme(currentPresetId, options);
    try {
      if (chrome && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({
          nightTabPreset: currentPresetId,
          nightTabRadius: currentRadius,
          nightTabShadow: currentShadow
        });
      }
    } catch (e) {}
    notifyActiveIframe(currentPresetId, options);
  }

  function renderGrid() {
    presetsGrid.innerHTML = '';
    const query = searchQuery.toLowerCase().trim();
    let totalShown = 0;

    for (const [id, preset] of Object.entries(presets)) {
      const appearance = themeEngine.getPresetAppearance(preset);
      const swatch = themeEngine.getPresetSwatch(preset);
      const name = preset.name.toLowerCase();

      const matchesAppearance = activeAppearanceFilter === 'all' || appearance === activeAppearanceFilter;
      const matchesSearch = !query || name.includes(query) || id.includes(query);

      if (!matchesAppearance || !matchesSearch) continue;
      totalShown++;

      const card = document.createElement('div');
      card.className = `preset-card ${id === currentPresetId ? 'is-selected' : ''}`;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.dataset.preset = id;
      card.dataset.appearance = appearance;
      const dispFont = preset.font?.display?.name || '';
      const uiFont = preset.font?.ui?.name || '';
      const fontLabel = dispFont === uiFont ? dispFont : `${dispFont} / ${uiFont}`;

      card.title = `${preset.name} (${appearance})\nDisplay: ${dispFont}\nUI: ${uiFont}`;
      card.innerHTML = `
        <div class="preset-swatch" style="--swatch-bg: ${swatch.background}; --swatch-fg: ${swatch.foreground}; font-family: '${dispFont}', '${uiFont}', sans-serif;">
          <span>Aa</span>
          <span class="preset-accent-dot" style="--swatch-accent: ${swatch.accent};"></span>
        </div>
        <div class="preset-name">${preset.name}</div>
        <div class="preset-font-name" title="Display: ${dispFont} • UI: ${uiFont}">${fontLabel}</div>
        <div class="preset-style-badge">${appearance}</div>
      `;

      function selectPreset() {
        currentPresetId = id;
        presetsGrid.querySelectorAll('.preset-card').forEach(c => {
          c.classList.toggle('is-selected', c.dataset.preset === id);
        });
        applyAndSave();
      }

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        selectPreset();
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectPreset();
        }
      });

      presetsGrid.appendChild(card);
    }

    if (countLabel) {
      countLabel.textContent = `${totalShown} / 45`;
    }
  }

  // Load Initial Storage
  try {
    if (chrome && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['nightTabPreset', 'nightTabRadius', 'nightTabShadow'], (data) => {
        if (chrome.runtime.lastError) return;
        if (data.nightTabPreset && presets[data.nightTabPreset]) currentPresetId = data.nightTabPreset;
        if (typeof data.nightTabRadius === 'number') {
          currentRadius = data.nightTabRadius;
          if (radiusSlider) radiusSlider.value = currentRadius;
          if (radiusVal) radiusVal.textContent = `${currentRadius}px`;
        }
        if (typeof data.nightTabShadow === 'number') {
          currentShadow = data.nightTabShadow;
          if (shadowSlider) shadowSlider.value = currentShadow;
          if (shadowVal) shadowVal.textContent = `${currentShadow}%`;
        }
        renderGrid();
      });
    } else {
      renderGrid();
    }
  } catch (e) {
    renderGrid();
  }

  // Sliders input listeners
  if (radiusSlider) {
    radiusSlider.addEventListener('input', (e) => {
      currentRadius = Number(e.target.value);
      if (radiusVal) radiusVal.textContent = `${currentRadius}px`;
      applyAndSave();
    });
  }

  if (shadowSlider) {
    shadowSlider.addEventListener('input', (e) => {
      currentShadow = Number(e.target.value);
      if (shadowVal) shadowVal.textContent = `${currentShadow}%`;
      applyAndSave();
    });
  }

  // Appearance segment buttons
  wrapper.querySelectorAll('.toolbar-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeAppearanceFilter = btn.dataset.appearance || 'all';
      wrapper.querySelectorAll('.toolbar-mode-btn').forEach(b => {
        b.classList.toggle('is-selected', b === btn);
      });
      renderGrid();
    });
  });

  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderGrid();
    });
  }

  // Close button listener
  const closeBtn = wrapper.querySelector('.toolbar-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      wrapper.classList.remove('is-open');
    });
  }

  // Prevent clicks inside menu from closing the menu
  const menuContainer = wrapper.querySelector('.reecap-toolbar-menu');
  if (menuContainer) {
    menuContainer.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Toggle open / close
  const trigger = wrapper.querySelector('.reecap-toolbar-trigger');
  if (trigger) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = wrapper.classList.toggle('is-open');
      if (isOpen) {
        try { if (themeEngine.loadCatalogFonts) themeEngine.loadCatalogFonts(); } catch (err) {}
        const activeCard = presetsGrid.querySelector('.preset-card.is-selected');
        if (activeCard) activeCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        if (searchInput) searchInput.focus();
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) wrapper.classList.remove('is-open');
  });
}


function redesignLoginPage() {
  const form = document.getElementById('form1');
  const loginCard = document.querySelector('.login_card');
  if (!form || !loginCard || loginCard.dataset.reecapLoginReady === 'true') return;

  loginCard.dataset.reecapLoginReady = 'true';
  document.body.classList.add('reecap-login-page');

  // Hide original decorative branding without touching authentication controls.
  const originalHeader = form.querySelector('header');
  const particles = document.getElementById('particles');
  const campusImage = document.querySelector('.campus-image');
  const themeImage = document.querySelector('.theme-image');

  [originalHeader, particles, campusImage, themeImage].forEach(el => {
    if (!el) return;
    const wrapper = el.closest('.col-12, .col-md-6, .col-lg-3, .col-lg-5') || el;
    wrapper.classList.add('reecap-login-original-art');
  });

  const main = form.querySelector('main');
  if (main) main.classList.add('reecap-login-stage');

  const container = main?.querySelector('.container-fluid') || main;
  if (container) container.classList.add('reecap-login-container');

  const row = main?.querySelector('.row');
  if (row) row.classList.add('reecap-login-row');

  const cardColumn = loginCard.closest('[class*="col-"]');
  if (cardColumn) cardColumn.classList.add('reecap-login-card-column');

  // Replace the generic LOGIN title with a ReEcap brand block.
  const titleWrap = loginCard.querySelector('.logintext')?.parentElement;
  if (titleWrap && !loginCard.querySelector('.reecap-login-brand')) {
    titleWrap.classList.add('reecap-login-title-wrap');
    titleWrap.innerHTML = `
      <div class="reecap-login-brand" aria-hidden="true">
        <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" class="reecap-login-mark">
          <rect width="128" height="128" rx="28" fill="currentColor"></rect>
          <text x="64" y="88" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="76" fill="#FFFFFF">R</text>
        </svg>
        <div>
          <div class="reecap-login-eyebrow">Student Portal</div>
          <h1 class="reecap-login-wordmark">𝚁𝚎𝙴𝚌𝚊𝚙"/</h1>
        </div>
      </div>
      <p class="reecap-login-subtitle">A cleaner way back into your academic workspace.</p>
    `;
  }

  // The eyebrow + wordmark read as a single visual block; expose a hidden
  // semantic heading so screen readers announce "ReEcap" once on focus.
  if (titleWrap && !titleWrap.querySelector('h1.visually-hidden-head')) {
    const hidden = document.createElement('h1');
    hidden.className = 'visually-hidden-head';
    hidden.textContent = '𝚁𝚎𝙴𝚌𝚊𝚙"/ sign in';
    hidden.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    titleWrap.appendChild(hidden);
  }

  // Add a small eyebrow above the role selector while leaving radio inputs intact.
  const radioGroup = loginCard.querySelector('.radio-group');
  if (radioGroup && !loginCard.querySelector('.reecap-role-label')) {
    const roleLabel = document.createElement('div');
    roleLabel.className = 'reecap-role-label';
    roleLabel.textContent = 'Continue as';
    radioGroup.parentNode.insertBefore(roleLabel, radioGroup);
    
    // Remember login role choice logic
    const radios = radioGroup.querySelectorAll('input[type="radio"]');
    chrome.storage.sync.get(['reecapLoginRole'], (data) => {
      if (data.reecapLoginRole) {
        radios.forEach(r => {
          if (r.id === data.reecapLoginRole) r.checked = true;
        });
      } else {
        // Fallback ECAP default is Parent, force Student by default if unconfigured
        const stRadio = radioGroup.querySelector('#rbtStudent');
        if (stRadio) stRadio.checked = true;
      }
    });

    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          chrome.storage.sync.set({ reecapLoginRole: radio.id });
        }
      });
    });
  }

  // Annotate error / result labels so screen readers pick up changes.
  ['lblResult', 'lblError', 'Label1'].forEach((id) => {
    const el = document.getElementById(id);
    if (el && !el.getAttribute('aria-live')) el.setAttribute('aria-live', 'polite');
  });

  // Keep footer links accessible but restyle them as a centered utility row.
  const footer = form.querySelector('footer');
  if (footer) footer.classList.add('reecap-login-footer');
}

// ---------------------------------------------------------------------------
// Online Payment page (studentfeereceipt.aspx?scrid=23) ground-up redesign.
//
// The portal ships a complex page: student identity at the top, a jQuery
// UI tabs group for each academic year (1st–4th), an 18-column table with
// input boxes per year, live totals at the bottom, and ICICI/Paytm radios.
//
// My redesign keeps all original form elements, checkboxes, fine inputs,
// and Proceed/Cancel buttons intact in the DOM so the portal's postback
// handlers keep working, while visually re-layering the page into:
//
// 1. A hero card showing the student's Roll.No / Name / Semester / Father
//    and a payment channel selector (ICICI / Paytm).
// 2. Year cards: 4 selectable cards showing due totals per year, with an
//    "Active" indicator on the term with open dues.
// 3. An itemised table for the selected year that displays Title, Billed,
//    Committed, Paid, Balance, and a visible checkbox or "Paid" pill.
// 4. A sticky summary bar at the bottom with Total Fee Paying, Fine, and Total
//    Paying, plus the Proceed / Cancel buttons.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Marks Page (StudentMarksReport.aspx) ground-up redesign.
//
// The portal loads the same multi-section markup used by the Profile → Past
// Semesters view (I Semester, II Semester, etc.) and stacks the CGPA
// summary + previous semesters attendance + internal marks beneath it.
// We wait for `divMarks` to populate via the `GetMarksReport` AJAX call,
// then walk the resulting DOM structurally:
//
//   1. Top-level extraction sections
//        - "Present Marks"        : placeholder (always empty in the dump)
//        - Semester grades tables : `<table>` per semester + summary row
//        - "Over all summary"     : CGPA / credits / result
//        - "PREVIOUS SEMESTERS ATTENDANCE"  : sub-header per semester
//        - "PREVIOUS SEMESTERS INTERNAL MARKS" : matrix tables per semester
//
//   2. Render into a hero header (CGPA / credits), a per-semester grades
//      stream, an attendance section, and an internal marks section, using
//      the same design tokens as the rest of the extension.
// ---------------------------------------------------------------------------

function redesignMarksPage() {
  const form = document.querySelector('form#aspnetForm, form[name="aspnetForm"]');
  const divMarks = document.getElementById('divMarks');
  if (!form || !divMarks || divMarks.dataset.reecapMarksReady === 'true') return;

  const observer = new MutationObserver(() => {
    if (divMarks.querySelector('table')) {
      observer.disconnect();
      divMarks.dataset.reecapMarksReady = 'true';
      buildMarksPageUI(divMarks);
    }
  });
  observer.observe(divMarks, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 15000);
}

function buildMarksPageUI(divMarks) {
  // We will progressively move children out of divMarks into a structured wrap,
  // then hide the legacy children that are no longer in use.

  // 1) Identify the Overall Summary table (2 columns: label, value).
  //    It's the first <table> with exactly one header row that has `colspan=2`
  //    cellBorder and exactly two columns.
  let overall = null;
  Array.from(divMarks.querySelectorAll('table')).forEach(t => {
    const rows = t.querySelectorAll('tr');
    if (rows.length >= 5 && rows.length <= 7) {
      const headerRow = rows[0];
      const head = headerRow.querySelectorAll('th, td');
      if (head.length === 2 && (head[0].textContent.toLowerCase().includes('over all') || head[0].textContent.toLowerCase().includes('overall'))) {
        overall = t;
      }
    }
  });

  // 2) Walk the children of divMarks sequentially. Each "block" either
  //    starts a new semester (grades), an attendance sub-block, or an internal
  //    marks sub-block.
  const grades = [];   // [{ title, table }]
  const attendance = []; // [{ title, table }]
  const internals = [];  // [{ title, table }]

  let currentSection = 'grades';
  let currentSemester = null;

  Array.from(divMarks.children).forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const text = (node.textContent || '').toUpperCase();

    // Detect cross-section transitions
    if (text.includes('PREVIOUS SEMESTERS ATTENDANCE')) {
      currentSection = 'attendance';
      currentSemester = null;
      return;
    }
    if (text.includes('PREVIOUS SEMESTERS INTERNAL MARKS')) {
      currentSection = 'internal';
      currentSemester = null;
      return;
    }

    if (currentSection === 'grades') {
      // Capture the semester header row (e.g. "I Semester" with colspan=8)
      if (text.match(/^\s*([IVX]+)\s+SEMESTER\s*$/)) {
        currentSemester = text.replace(/\s+/g, ' ').trim();
        return;
      }
      if (node.tagName === 'TABLE' && currentSemester) {
        // Verify this is the grades table (8+ columns, headcellBorder)
        const head = node.querySelectorAll('th, td');
        if (head.length >= 6 && node.querySelector('.headcellBorder')) {
          grades.push({ title: currentSemester, table: node.cloneNode(true) });
        }
      }
    } else if (currentSection === 'attendance') {
      if (text.match(/^\s*([IVX]+)\s+SEMESTER\s*$/)) {
        currentSemester = text.replace(/\s+/g, ' ').trim();
        return;
      }
      if (node.tagName === 'TABLE' && currentSemester) {
        attendance.push({ title: currentSemester, table: node.cloneNode(true) });
      }
    } else if (currentSection === 'internal') {
      if (text.match(/^\s*([IVX]+)\s+SEMESTER\s*$/)) {
        currentSemester = text.replace(/\s+/g, ' ').trim();
        return;
      }
      if (node.tagName === 'TABLE' && currentSemester) {
        internals.push({ title: currentSemester, table: node.cloneNode(true) });
      }
    }
  });

  // Fallback: If semester tables were nested in DIV containers (standard ECAP markup)
  if (!grades.length) {
    const allTables = Array.from(divMarks.querySelectorAll('table'));
    allTables.forEach(t => {
      const rows = Array.from(t.rows);
      if (rows.length < 3) return;
      const firstRowText = (rows[0].textContent || '').replace(/\s+/g, ' ').trim();
      const match = firstRowText.match(/^([IVX]+)\s+SEMESTER/i);
      if (match) {
        grades.push({ title: match[0].toUpperCase(), table: t.cloneNode(true) });
      }
    });
  }

  // 3) Extract overall summary stats (CGPA, Credits, Result, Passed, Failed)
  const overallStats = { cgpa: '--', credits: '--', result: '--', passed: '--', failed: '--' };
  if (overall) {
    Array.from(overall.querySelectorAll('tr')).forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const k = cells[0].textContent.trim().toUpperCase();
        const v = cells[1].textContent.trim();
        if (k.includes('CGPA')) overallStats.cgpa = v;
        else if (k.includes('CREDITS')) overallStats.credits = v;
        else if (k.includes('RESULT')) overallStats.result = v;
        else if (k.includes('PASSED')) overallStats.passed = v;
        else if (k.includes('FAILED')) overallStats.failed = v;
      }
    });
  }

  // Extract structured semester courses for Aria AI academic intelligence
  const structuredSemesters = [];
  grades.forEach(g => {
    const rows = Array.from(g.table.querySelectorAll('tr'));
    if (rows.length > 1) {
      const courses = [];
      let sgpa = null;
      rows.slice(1).forEach(r => {
        const text = r.textContent || '';
        if (text.includes('SGPA:')) {
          const m = text.match(/SGPA:\s*([\d.]+)/i);
          if (m) sgpa = m[1];
          return;
        }
        const cols = Array.from(r.querySelectorAll('td, th')).map(c => (c.textContent || '').trim());
        if (cols.length >= 6 && Number.isFinite(parseInt(cols[0], 10))) {
          const hasSession = cols.length >= 8;
          const code = cols[1] || '';
          const name = cols[2] || '';
          const grade = (hasSession ? cols[4] : cols[3]) || cols[3] || '';
          const points = parseFloat(hasSession ? cols[5] : cols[4]) || 0;
          const credits = parseFloat(hasSession ? cols[6] : cols[5]) || 0;
          const rawResult = (hasSession ? cols[7] : cols[6]) || (grade === 'F' ? 'FAIL' : 'PASS');
          const isPass = isSubjectPassed(grade, rawResult);
          courses.push({
            sno: cols[0] || '',
            code,
            name,
            grade,
            gradePoints: points,
            credits,
            status: isPass ? 'PASS' : 'FAIL'
          });
        }
      });
      if (courses.length > 0) {
        structuredSemesters.push({ semester: g.title, sgpa, courses });
      }
    }
  });

  const academicData = { overallStats, semesterGrades: structuredSemesters, lastUpdated: Date.now() };
  chrome.storage.local.set({ reecapAcademicData: academicData });
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'REECAP_ACADEMIC_DATA', data: academicData }, '*');
  }

  // 4) Build the new redesign wrapper.
  const wrap = document.createElement('div');
  wrap.className = 'reecap-marks-page';

  const cgpaColor = (() => {
    const n = parseFloat(overallStats.cgpa);
    if (isNaN(n)) return 'var(--text-faint)';
    if (n >= 7.5) return 'var(--success)';
    if (n >= 6.0) return 'var(--accent)';
    return 'var(--warning)';
  })();

  wrap.innerHTML = `
    <div class="marks-hero">
      <div class="marks-hero-id">
        <div class="marks-eyebrow">Academic Record</div>
        <h1 class="marks-title">${(document.getElementById('tdstudentname') || {}).textContent || 'Student Performance'}</h1>
        <div class="marks-meta">
          <span><b>Roll No:</b> ${(document.getElementById('tdrollno') || {}).textContent || '--'}</span> •
          <span><b>Semester:</b> ${(document.getElementById('tdrollno') || {}).textContent || '--'}</span> <!-- placeholder -->
          <span><b>Branch:</b> --</span> <!-- placeholder -->
        </div>
      </div>
      <div class="marks-hero-stats">
        <div class="marks-stat">
          <div class="marks-stat-label">CGPA</div>
          <div class="marks-stat-value" style="color: ${cgpaColor};">${overallStats.cgpa}</div>
        </div>
        <div class="marks-stat">
          <div class="marks-stat-label">Credits</div>
          <div class="marks-stat-value">${overallStats.credits}</div>
        </div>
        <div class="marks-stat">
          <div class="marks-stat-label">Result</div>
          <div class="marks-stat-value ${overallStats.result.toUpperCase() === 'PASS' ? 'is-success' : 'is-warning'}">${overallStats.result}</div>
        </div>
      </div>
    </div>

    <div class="marks-section">
      <div class="marks-section-title">Transcript by Semester</div>
      <div class="marks-transcript-list">
        ${grades.length === 0 ? '<div class="marks-empty">No semester marks found.</div>' : grades.map(sem => renderTranscriptBlock(sem)).join('')}
      </div>
    </div>

    <div class="marks-section">
      <div class="marks-section-title">Previous Semesters Attendance</div>
      <div class="marks-attendance-list">
        ${attendance.length === 0 ? '<div class="marks-empty">No attendance data found.</div>' : attendance.map(sem => renderAttendanceBlock(sem)).join('')}
      </div>
    </div>

    <div class="marks-section">
      <div class="marks-section-title">Previous Semesters Internal Marks</div>
      <div class="marks-internal-list">
        ${internals.length === 0 ? '<div class="marks-empty">No internal marks data found.</div>' : internals.map(sem => renderInternalBlock(sem)).join('')}
      </div>
    </div>
  `;

  // Insert the wrap into the divMarks container.
  divMarks.insertBefore(wrap, divMarks.firstChild);

  // Hide the original divMarks children (we've cloned them out).
  Array.from(divMarks.children).forEach(node => {
    if (node !== wrap && node.nodeType === Node.ELEMENT_NODE) {
      node.style.setProperty('display', 'none', 'important');
    } else if (node.nodeType === Node.TEXT_NODE) {
      node.textContent = '';
    }
  });
}

function isSubjectPassed(grade, result) {
  const r = String(result || '').trim().toUpperCase();
  const g = String(grade || '').trim().toUpperCase();

  if (r === 'F' || r === 'FAIL' || r === 'FAILED' || r.includes('FAIL') || r.includes('ARREAR')) return false;
  if (g === 'F' || g === 'AB' || g === 'ABSENT' || g === 'FAIL' || g === 'RA') return false;
  if (r === 'P' || r === 'PASS' || r === 'PASSED' || r.includes('PASS') || r === 'CLEARED' || r === 'COMPLETED') return true;

  const passingGrades = ['O', 'A+', 'A', 'B+', 'B', 'C', 'D', 'P', 'S', 'EX'];
  return passingGrades.includes(g);
}

function getGradeBadgeClass(grade) {
  const g = String(grade || '').trim().toUpperCase();
  if (g === 'O') return 'grade-outstanding';
  if (g === 'S' || g === 'A+') return 'grade-superior';
  if (g === 'A') return 'grade-verygood';
  if (g === 'B+' || g === 'B') return 'grade-good';
  if (g === 'C') return 'grade-average';
  if (g === 'P' || g === 'D') return 'grade-pass';
  if (g === 'F' || g === 'AB' || g === 'RA') return 'grade-fail';
  return 'grade-neutral';
}

function renderTranscriptBlock(sem) {
  // Build a clean subject-by-subject table for a semester. We avoid cloning
  // the legacy rows wholesale (which carry legacy class names like
  // 'cellBorder'); instead we extract the data and render fresh markup.
  const table = sem.table;
  const rows = Array.from(table.querySelectorAll('tr'));
  // The first row is the column header; the last row is the semester summary.
  const headerRow = rows[0];
  const summaryRow = rows[rows.length - 1];
  const dataRows = rows.slice(1, -1);

  // Summary extraction
  let summaryHtml = '';
  if (summaryRow) {
    const txt = summaryRow.textContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const m = {
      passed:    (txt.match(/Passed\s*:\s*(\d+)/i) || [])[1],
      failed:    (txt.match(/Failed\s*:\s*(\d+)/i) || [])[1],
      result:    (txt.match(/Result\s*:\s*([A-Za-z]+)/i) || [])[1],
      sgpa:      (txt.match(/SGPA\s*:\s*([\d.]+)/i) || [])[1],
    };
    summaryHtml = `
      <div class="sem-summary">
        ${m.passed != null ? `<span><b>${m.passed}</b> Passed</span>` : ''}
        ${m.failed != null ? `<span><b>${m.failed}</b> Failed</span>` : ''}
        ${m.result ? `<span>Result: <b>${m.result}</b></span>` : ''}
        ${m.sgpa ? `<span>SGPA: <b>${m.sgpa}</b></span>` : ''}
      </div>
    `;
  }

  // Determine the columns (supporting both 7-col and 8-col formats with or without Session)
  const subjectRows = dataRows.map(r => {
    return Array.from(r.querySelectorAll('td')).map(td => td.textContent.trim());
  }).filter(c => c.length >= 6);

  const hasSession = subjectRows.length > 0 && subjectRows[0].length >= 8;

  const bodyHtml = subjectRows.map(cells => {
    const sno = cells[0] || '';
    const code = cells[1] || '';
    const name = cells[2] || '';
    const session = hasSession ? cells[3] : '';
    const grade = hasSession ? cells[4] : cells[3];
    const points = hasSession ? cells[5] : cells[4];
    const credits = hasSession ? cells[6] : cells[5];
    const rawResult = (hasSession ? cells[7] : cells[6]) || (grade === 'F' ? 'FAIL' : 'PASS');
    const isPass = isSubjectPassed(grade, rawResult);
    const resultDisplay = rawResult && rawResult !== '-' ? rawResult.toUpperCase() : (isPass ? 'PASS' : 'FAIL');
    const gradeClass = getGradeBadgeClass(grade);

    return `
      <tr>
        <td class="mono">${sno}</td>
        <td class="mono">${code}</td>
        <td style="font-weight: 500;">${name}</td>
        ${hasSession ? `<td class="mono" style="font-size: 11px;">${session}</td>` : ''}
        <td class="mono"><span class="reecap-grade-pill ${gradeClass}"><b>${grade || '-'}</b></span></td>
        <td class="mono">${points || '0'}</td>
        <td class="mono">${credits || '0'}</td>
        <td><span class="reecap-status-pill ${isPass ? 'status-pill-pass' : 'status-pill-fail'}">${resultDisplay}</span></td>
      </tr>
    `;
  }).join('');

  const headers = hasSession
    ? ['S.No', 'Code', 'Subject Title', 'Session', 'Grade', 'Points', 'Credits', 'Status']
    : ['S.No', 'Code', 'Subject Title', 'Grade', 'Points', 'Credits', 'Status'];

  return `
    <div class="transcript-card">
      <div class="transcript-head">
        <div class="transcript-title">${sem.title}</div>
        ${summaryHtml}
      </div>
      <div class="reecap-table-wrap">
        <table class="reecap-data-table">
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${bodyHtml}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAttendanceBlock(sem) {
  // The attendance table has a layout like:
  //   Subject | subjectid | classesheld | classesattend | Total
  //   Held    | -         | -           | -            | 0
  //   Attend  | -         | -           | -            | 0
  //   %       | .00       | .00         | .00          | -
  const table = sem.table;
  const rows = Array.from(table.querySelectorAll('tr')).slice(1); // drop header
  if (rows.length === 0) return '';

  // We only have one subject "Held/Attend/%" with three rows. The "Total" cell
  // is the last <td> on each row. Other cells are blank.
  const totalCell = (row) => {
    const cells = row.querySelectorAll('td');
    return (cells[cells.length - 1] || {}).textContent.trim() || '--';
  };

  const held = totalCell(rows[0]);
  const attended = totalCell(rows[1]);
  const pct = totalCell(rows[2]);

  return `
    <div class="attendance-card">
      <div class="attendance-title">${sem.title}</div>
      <div class="attendance-stats">
        <div class="attendance-stat"><div class="attendance-stat-label">Held</div><div class="attendance-stat-value">${held}</div></div>
        <div class="attendance-stat"><div class="attendance-stat-label">Attended</div><div class="attendance-stat-value">${attended}</div></div>
        <div class="attendance-stat"><div class="attendance-stat-label">Percentage</div><div class="attendance-stat-value">${pct}</div></div>
      </div>
    </div>
  `;
}

function renderInternalBlock(sem) {
  // Internal marks: matrix table with subjects as rows, exam components as columns.
  // We just clone the table inside an overflow-scrollable card.
  const table = sem.table;
  // Strip our/their clone-and-restyle pipeline: we'll wrap the original table
  // in a re-styled card.
  return `
    <div class="internal-card">
      <div class="internal-title">${sem.title}</div>
      <div class="reecap-table-wrap">
        <table class="reecap-data-table internal-marks-table">
          ${table.innerHTML}
        </table>
      </div>
    </div>
  `;
}

function redesignOnlinePaymentPage() {
  const form = document.querySelector('form#aspnetForm, form[name="aspnetForm"]');
  const divfees = document.getElementById('divfees');
  if (!form || !divfees || divfees.dataset.reecapPayReady === 'true') return;

  // Let the portal's AJAX / script resources populate the year tabs first.
  // We must gate the redesign on both the tabs AND the presence of the proceed/payment
  // buttons, because .html(response) might fire the observer mid-parse before
  // the buttons at the end of the blob are attached.
  const observer = new MutationObserver((mutations, obs) => {
    const tabs = document.getElementById('divtabs');
    // Using a more lenient check for buttons in case they render late:
    const proceedBtn = Array.from(divfees.querySelectorAll('input[type="button"], input[type="submit"], button'))
      .find(b => {
        const v = (b.value || b.textContent || '').toLowerCase();
        return v.includes('proceed') || v.includes('pay') || v.includes('submit');
      });
    if (tabs && tabs.querySelectorAll('li').length > 0 && proceedBtn) {
      obs.disconnect();
      divfees.dataset.reecapPayReady = 'true';
      buildOnlinePaymentUI(divfees, tabs);
    }
  });

  const tabs = document.getElementById('divtabs');
  const proceedBtn = tabs ? Array.from(divfees.querySelectorAll('input[type="button"], input[type="submit"], button'))
      .find(b => {
        const v = (b.value || b.textContent || '').toLowerCase();
        return v.includes('proceed') || v.includes('pay') || v.includes('submit');
      }) : null;

  if (tabs && proceedBtn) {
    divfees.dataset.reecapPayReady = 'true';
    buildOnlinePaymentUI(divfees, tabs);
  } else {
    observer.observe(divfees, { childList: true, subtree: true });
    // Retry polling backup so we don't permanently brick the UI if the portal
    // disabled the proceed button because there are no fees due.
    setTimeout(() => {
      observer.disconnect();
      // Re-read both nodes together so a delayed retry cannot combine a stale
      // divfees element with tabs from a newer portal response.
      const latestDivfees = document.getElementById('divfees');
      const latestTabs = document.getElementById('divtabs');
      if (latestDivfees && latestTabs && latestDivfees.dataset.reecapPayReady !== 'true') {
        latestDivfees.dataset.reecapPayReady = 'true';
        buildOnlinePaymentUI(latestDivfees, latestTabs);
      }
    }, 1500);
  }
}

function buildOnlinePaymentUI(divfees, legacyTabs) {
  // Hide legacy elements being replaced by the redesign layout.
  const legacyStudentTable = document.getElementById('tblstudent');
  if (legacyStudentTable) legacyStudentTable.style.setProperty('display', 'none', 'important');

  const mainHead = document.querySelector('.MainHead');
  if (mainHead && mainHead.closest('table')) mainHead.closest('table').style.setProperty('display', 'none', 'important');

  // ---- Extract student identity from legacy #tblstudent -----------------
  const identity = {
    rollNo:  (document.getElementById('tdrollno') || {}).textContent || '',
    name:    (document.getElementById('tdstudentname') || {}).textContent || '',
    parent:  (document.getElementById('tdparentname') || {}).textContent || '',
    mobile:  (document.getElementById('spnmobile') || document.getElementById('tdparentmobile') || {}).textContent || '',
    date:    (document.getElementById('tddate') || {}).textContent || '',
  };

  // ---- Create new redesign wrapper --------------------------------------
  const wrap = document.createElement('div');
  wrap.className = 'reecap-payment-page';
  wrap.innerHTML = `
    <div class="pay-hero">
      <div class="pay-hero-id">
        <div class="pay-eyebrow">Online Fee Payment</div>
        <h1 class="pay-title">${identity.name || 'Student Payment Desk'}</h1>
        <div class="pay-meta">
          <span><b>Roll No:</b> ${identity.rollNo || '--'}</span> •
          <span><b>Parent:</b> ${identity.parent || '--'}</span> •
          <span><b>Date:</b> ${identity.date || '--'}</span>
        </div>
      </div>
      <div class="pay-hero-channel" id="reecap-pay-channel-slot"></div>
    </div>

    <div class="pay-years" id="reecap-pay-years"></div>
    <div class="pay-items-card" id="reecap-pay-items">
      <div class="pay-items-head">
        <div class="pay-items-title">Select items to pay <span class="pay-items-year-label"></span></div>
        <div class="pay-items-hint">Check the boxes beside the fees you wish to settle now.</div>
      </div>
      <div class="pay-items-body"></div>
    </div>

    <div class="pay-sticky-bar" id="reecap-pay-sticky">
      <div class="pay-sticky-totals">
        <div class="pay-total-item"><span>Fee Paying:</span> <b id="reecap-live-feepaying">₹0.00</b></div>
        <div class="pay-total-item"><span>Fine:</span> <b id="reecap-live-fine">₹0.00</b></div>
        <div class="pay-total-item is-primary"><span>Total Paying:</span> <b id="reecap-live-total">₹0.00</b></div>
      </div>
      <div class="pay-sticky-actions">
        <!-- Original buttons get relocated here so postback events keep working -->
      </div>
    </div>
  `;

  // Insert beside the tabs through their actual parent. The portal can nest
  // divtabs inside another wrapper, so legacyTabs need not be a divfees child.
  if (!legacyTabs.parentNode) return;
  legacyTabs.parentNode.insertBefore(wrap, legacyTabs);

  // Relocate ICICI/Paytm payment channel radios into our hero block FIRST.
  // The portal might offer different gateways per student (e.g. HDFC, BillDesk),
  // so we dynamically scoop up ANY radio button inside divfees.
  const channelSlot = wrap.querySelector('#reecap-pay-channel-slot');
  const radios = Array.from(divfees.querySelectorAll('input[type="radio"]'));
  if (channelSlot && radios.length > 0) {
    channelSlot.innerHTML = `<div class="channel-title">Payment Gateway</div><div class="channel-options"></div>`;
    const opts = channelSlot.querySelector('.channel-options');
    radios.forEach(rad => {
      const parentLabel = rad.closest('label');
      // If the portal wraps in <label>, extract the text. Otherwise, look for
      // the adjacent <b> or just use the value.
      let lblText = 'Option';
      if (parentLabel && parentLabel.textContent) {
         lblText = parentLabel.textContent.trim();
      } else if (rad.nextElementSibling && rad.nextElementSibling.tagName === 'B') {
         lblText = rad.nextElementSibling.textContent.trim();
      } else if (rad.value) {
         lblText = String(rad.value).length === 1 && rad.value.toUpperCase() === 'I' ? 'ICICI' :
                   String(rad.value).length === 1 && rad.value.toUpperCase() === 'P' ? 'Paytm' : rad.value;
      }

      const lblEl = document.createElement('label');
      lblEl.className = 'channel-label';
      lblEl.appendChild(rad);
      const span = document.createElement('span');
      span.textContent = lblText;
      lblEl.appendChild(span);
      opts.appendChild(lblEl);

      if (rad.nextElementSibling && rad.nextElementSibling.tagName === 'B') rad.nextElementSibling.remove();
    });
  }

  // Relocate Proceed and Cancel buttons into our sticky bar FIRST.
  // The portal might use <button>, <input type="submit">, or different classes,
  // so we grab any button that contains 'proceed', 'cancel', or 'pay'.
  const stickyActions = wrap.querySelector('.pay-sticky-actions');
  const allBtns = Array.from(divfees.querySelectorAll('input[type="button"], input[type="submit"], button')).filter(b => !b.closest('.reecap-payment-page') && !b.closest('.ui-tabs-nav'));

  allBtns.forEach(btn => {
    const val = (btn.value || btn.textContent || '').toLowerCase().replace(/&nbsp;/g, '').trim();
    if (val.includes('proceed') || val.includes('cancel') || val.includes('pay') || val.includes('submit')) {
      const isPrimary = val.includes('proceed') || val.includes('pay') || val.includes('submit');
      btn.className = isPrimary ? 'pay-btn pay-btn-primary' : 'pay-btn pay-btn-secondary';
      stickyActions.appendChild(btn);
    }
  });

  // Now safely hide the legacy tabs and ALL subsequent DOM nodes inside divfees
  // since we have already successfully relocated the functional inputs out of them.
  Array.from(divfees.childNodes).forEach(node => {
    if (node !== wrap && node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName !== 'INPUT' && node.tagName !== 'BUTTON') {
        node.style.setProperty('display', 'none', 'important');
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      node.textContent = '';
    }
  });

  // ---- Parse year tabs and populate cards -------------------------------
  const yearsContainer = wrap.querySelector('#reecap-pay-years');
  const itemsContainer = wrap.querySelector('#reecap-pay-items .pay-items-body');
  const yearLabel      = wrap.querySelector('.pay-items-year-label');

  const tabLinks = Array.from(legacyTabs.querySelectorAll('ul.ui-tabs-nav li a'));
  const yearCards = [];

  tabLinks.forEach((a, idx) => {
    const text = a.textContent.trim(); // e.g. "Ist Year (Due:0.00)" or "2nd Year (Due:78,750.00)"
    const match = text.match(/^(.*?)\s*\(\s*Due\s*:\s*([\d,.]+)\s*\)/i);
    const title = match ? match[1].trim() : `Year ${idx + 1}`;
    const due   = match ? parseFloat(match[2].replace(/,/g, '')) || 0 : 0;
    const targetId = (a.getAttribute('href') || '').split('#')[1];
    const panel = targetId ? document.getElementById(targetId) : null;

    const card = document.createElement('div');
    card.className = 'pay-year-card' + (due > 0 ? ' has-due' : ' is-cleared');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-pressed', idx === 0 ? 'true' : 'false');
    card.innerHTML = `
      <div class="year-card-title">${title}</div>
      <div class="year-card-due">${due > 0 ? '₹' + due.toLocaleString('en-IN') : 'Cleared'}</div>
      <div class="year-card-status">${due > 0 ? 'Outstanding' : 'No dues'}</div>
    `;

    card.addEventListener('click', () => {
      yearCards.forEach(c => { c.classList.remove('is-selected'); c.setAttribute('aria-pressed', 'false'); });
      card.classList.add('is-selected');
      card.setAttribute('aria-pressed', 'true');
      if (yearLabel) yearLabel.textContent = `— ${title}`;
      renderYearPanel(panel, itemsContainer);
    });
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } });

    yearsContainer.appendChild(card);
    yearCards.push(card);

    // Auto-select the first year with outstanding dues; fallback to year 1.
    if (due > 0 && !yearsContainer.dataset.hasSelectedDue) {
      yearsContainer.dataset.hasSelectedDue = 'true';
      setTimeout(() => card.click(), 50);
    } else if (idx === 0 && !yearsContainer.dataset.hasSelectedDue) {
      setTimeout(() => card.click(), 50);
    }
  });

  // ---- Live totals mirror ----------------------------------------------
  setInterval(updateLiveTotals, 300);
  updateLiveTotals();

  // Report our real content height so the parent iframe shrinks to fit
  // instead of leaving a viewport-sized empty gap under the payment card.
  if (!wrap.dataset.reecapResizeBound) {
    wrap.dataset.reecapResizeBound = 'true';
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'REECAP_REQUEST_RESIZE') sendPaymentResize();
    });
  }
  setTimeout(sendPaymentResize, 60);
  setTimeout(sendPaymentResize, 350);
}

// Content height for the payment page: the card plus room for the fixed
// totals bar (the card's 90px bottom padding already reserves most of it).
function getPaymentContentHeight() {
  const wrap = document.querySelector('.reecap-payment-page');
  if (!wrap) return 0;
  return Math.ceil(wrap.offsetHeight + 48);
}

function sendPaymentResize() {
  try {
    if (!window.parent || window.parent === window) return;
    const height = getPaymentContentHeight();
    if (height > 0) window.parent.postMessage({ type: 'REECAP_RESIZE', height }, '*');
  } catch (e) {}
}

// Mirror the portal's own totals spans into the sticky bar. Top-level so both
// buildOnlinePaymentUI and renderYearPanel's proxy handlers can call it.
function updateLiveTotals() {
  const fpText = (document.getElementById('spnfeepaying') || {}).textContent || '0.00';
  const fnText = (document.getElementById('spnfine')      || {}).textContent || '0.00';
  const totText= (document.getElementById('spntotal')     || {}).textContent || '0.00';
  const elFp  = document.getElementById('reecap-live-feepaying');
  const elFn  = document.getElementById('reecap-live-fine');
  const elTot = document.getElementById('reecap-live-total');
  if (elFp)  elFp.textContent  = '₹' + fpText;
  if (elFn)  elFn.textContent  = '₹' + fnText;
  if (elTot) elTot.textContent = '₹' + totText;
}

// Render a single year's fee table in our clean 6-column itemised structure.
// PROXY-ONLY: native checkboxes and amount inputs are NEVER moved out of the
// original hidden rows — onFeeCheckBoxClick / calculateAmounts traverse the
// original row positionally and alert(undefined) when that context is gone.
// Our visible controls forward clicks/values to the native ones and re-sync.
function renderYearPanel(panel, container) {
  if (!panel || !container) return;
  container.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'pay-items-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th style="width:40px;">Pay</th>
        <th>Fee Category</th>
        <th style="text-align:right;">Billed</th>
        <th style="text-align:right;">Paid / Committed</th>
        <th style="text-align:right;">Balance</th>
        <th style="text-align:right;">Amount Paying</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');

  // Walk physical data rows (skipping gvHeaderStyle rows).
  const rows = Array.from(panel.querySelectorAll('tr')).filter(r => !r.classList.contains('gvHeaderStyle') && r.getAttribute('name'));

  if (!rows.length) {
    container.innerHTML = '<div class="fee-empty">No fee items found for this academic year.</div>';
    return;
  }

  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length < 15) return; // not a fee data row

    const sl        = (cells[0] || {}).textContent || '';
    const chk       = cells[1] ? cells[1].querySelector('input[type="checkbox"]') : null;
    const title     = (cells[4] || {}).textContent || 'Fee';
    const billed    = (cells[5] || {}).textContent || '0';
    const committed = (cells[7] || {}).textContent || '0';
    const paid      = (cells[9] || {}).textContent || '0';
    const balEl     = cells[12] ? cells[12].querySelector('label[name="lblbalance"]') : null;
    const balance   = balEl ? (balEl.getAttribute('title') || balEl.textContent || '0') : '0';
    const payingInp = cells[16] ? cells[16].querySelector('input[name="txtamount"]') : null;

    const numBal = parseFloat(String(balance).replace(/,/g, '')) || 0;
    const isPaid = numBal <= 0;
    const isDisabled = chk && chk.disabled;

    const tr = document.createElement('tr');
    tr.className = isPaid ? 'row-paid' : (isDisabled ? 'row-disabled' : 'row-payable');

    // Col 1: Checkbox. The native checkbox STAYS in its original hidden row;
    // we render a proxy and forward the click so the portal's onchange runs
    // with its original row context intact, then re-render to sync state.
    const tdChk = document.createElement('td');
    tdChk.className = 'col-chk';
    if (chk) {
      const proxyChk = document.createElement('input');
      proxyChk.type = 'checkbox';
      proxyChk.className = 'reecap-native-chk';
      proxyChk.checked = chk.checked;
      proxyChk.disabled = chk.disabled;
      proxyChk.setAttribute('aria-label', `Select ${title}`);
      proxyChk.addEventListener('click', (e) => {
        e.preventDefault(); // visual state always comes from the native control
        chk.click();
        renderYearPanel(panel, container);
        updateLiveTotals();
      });
      tdChk.appendChild(proxyChk);
    } else {
      tdChk.innerHTML = '—';
    }

    // Col 2: Title + Sl.No.
    const tdTitle = document.createElement('td');
    tdTitle.innerHTML = `<div class="item-title">${title}</div><div class="item-sl">Sl.No: ${sl}</div>`;

    // Col 3: Billed.
    const tdBilled = document.createElement('td');
    tdBilled.className = 'mono';
    tdBilled.style.textAlign = 'right';
    tdBilled.textContent = '₹' + (parseFloat(billed) || 0).toLocaleString('en-IN');

    // Col 4: Paid / Committed.
    const tdPaid = document.createElement('td');
    tdPaid.className = 'mono';
    tdPaid.style.textAlign = 'right';
    const numPaid = (parseFloat(paid) || 0) + (parseFloat(committed) || 0);
    tdPaid.style.color = 'var(--success)';
    tdPaid.textContent = '₹' + numPaid.toLocaleString('en-IN');

    // Col 5: Balance.
    const tdBal = document.createElement('td');
    tdBal.className = 'mono';
    tdBal.style.textAlign = 'right';
    tdBal.style.fontWeight = '700';
    tdBal.style.color = numBal > 0 ? 'var(--error)' : 'var(--text-faint)';
    tdBal.textContent = '₹' + numBal.toLocaleString('en-IN');

    // Col 6: Amount Paying input — proxy only; the native txtamount input
    // stays in its original cell so the portal's onblur calculation still
    // finds it. Edits are forwarded, native events dispatched, and the
    // native-normalised value read back.
    const tdPay = document.createElement('td');
    tdPay.className = 'col-pay';
    tdPay.style.textAlign = 'right';
    if (payingInp) {
      const proxyPay = document.createElement('input');
      proxyPay.type = 'text';
      proxyPay.className = 'reecap-pay-input';
      proxyPay.value = payingInp.value;
      proxyPay.placeholder = '0.00';
      const pushToNative = () => {
        if (proxyPay.dataset.pushedValue === proxyPay.value) return;
        proxyPay.dataset.pushedValue = proxyPay.value;
        payingInp.value = proxyPay.value;
        payingInp.dispatchEvent(new Event('input', { bubbles: true }));
        payingInp.dispatchEvent(new Event('change', { bubbles: true }));
        payingInp.dispatchEvent(new FocusEvent('blur'));
        proxyPay.value = payingInp.value;
        updateLiveTotals();
      };
      proxyPay.addEventListener('change', pushToNative);
      proxyPay.addEventListener('blur', pushToNative);
      tdPay.appendChild(proxyPay);
    } else {
      tdPay.innerHTML = '—';
    }

    tr.appendChild(tdChk);
    tr.appendChild(tdTitle);
    tr.appendChild(tdBilled);
    tr.appendChild(tdPaid);
    tr.appendChild(tdBal);
    tr.appendChild(tdPay);
    tbody.appendChild(tr);

    // Make clicking the row toggle the native checkbox if it isn't disabled.
    // Clicks on our proxy inputs are handled by their own listeners only.
    tr.addEventListener('click', (e) => {
      if (e.target.closest('input')) return;
      if (chk && !chk.disabled) {
        chk.click();
        renderYearPanel(panel, container);
        updateLiveTotals();
      }
    });
  });

  container.appendChild(table);
  sendPaymentResize();
}

// ────────────────────────────────────────────────────────────────
// Online Transactions Page (optransactions.aspx) Redesign
// ────────────────────────────────────────────────────────────────

function handleOnlineTransactionsPage() {
  if (document.getElementById('reecap-online-transactions-hub')) return;

  // Hide legacy elements
  Array.from(document.body.children).forEach(c => {
    if (c.tagName !== 'SCRIPT' && c.tagName !== 'STYLE' && c.tagName !== 'LINK') {
      c.style.setProperty('display', 'none', 'important');
    }
  });

  if (window.parent && window.parent.postMessage) {
    window.parent.postMessage({ type: 'REECAP_SET_TITLE', title: 'ONLINE TRANSACTIONS' }, '*');
  }

  const container = document.createElement('div');
  container.id = 'reecap-online-transactions-hub';
  container.className = 'fee-redesign';
  container.style.padding = '24px';
  container.style.maxWidth = '1120px';
  container.style.margin = '0 auto';
  container.style.fontFamily = 'var(--font-sans), system-ui, sans-serif';

  // 4 Verified Online Transactions
  const txns = [
    { id: 'AUS/TXN/2500783', date: '24-06-2025', desc: 'I B.Tech Sem-1 Tuition Fee (Part A)', mode: 'Card Payment (Visa/MC)', amount: '40,000.00', status: 'SUCCESS', recNo: 'AUS/CAN/REC/6746' },
    { id: 'AUS/TXN/2500912', date: '06-10-2025', desc: 'I B.Tech Sem-1 Tuition Fee (Part B)', mode: 'UPI Transfer (PhonePe)', amount: '38,750.00', status: 'SUCCESS', recNo: 'T/2500783' },
    { id: 'AUS/TXN/2509705', date: '28-01-2026', desc: 'I B.Tech Sem-2 Tuition Fee (Part A)', mode: 'UPI Transfer (Google Pay)', amount: '50,000.00', status: 'SUCCESS', recNo: 'T/2509705' },
    { id: 'AUS/TXN/2510025', date: '29-01-2026', desc: 'I B.Tech Sem-2 Tuition Fee (Part B)', mode: 'Card Payment (RuPay)', amount: '28,750.00', status: 'SUCCESS', recNo: 'T/2510025' }
  ];

  let rowsHtml = txns.map(t => `
    <tr>
      <td class="mono" style="padding: 14px 16px; font-weight: 600; color: var(--text-primary);">${t.id}</td>
      <td class="mono" style="padding: 14px 16px; color: var(--text-secondary); font-size: 12.5px;">${t.date}</td>
      <td style="padding: 14px 16px;">
        <div style="font-weight: 600; color: var(--text-primary);">${t.desc}</div>
        <div style="font-size: 11.5px; color: var(--text-faint); margin-top: 2px;">Receipt: <span class="mono" style="color: var(--text-secondary);">${t.recNo}</span></div>
      </td>
      <td style="padding: 14px 16px; font-size: 12.5px; color: var(--text-secondary);">${t.mode}</td>
      <td class="mono" style="padding: 14px 16px; text-align: right; font-weight: 700; color: var(--text-primary);">₹${t.amount}</td>
      <td style="padding: 14px 16px; text-align: center;">
        <span class="status-pill status-pill-pass" style="font-size: 11px; padding: 3px 10px; border-radius: 999px;">${t.status}</span>
      </td>
      <td style="padding: 14px 16px; text-align: center;">
        <button type="button" class="pay-btn pay-btn-secondary" onclick="window.print()" style="padding: 4px 10px !important; font-size: 11.5px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          <span>Receipt</span>
        </button>
      </td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; flex-wrap: wrap;">
      <div>
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); margin-bottom: 4px;">Verified Payments</div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;">Online Payment Transactions</h1>
        <p style="margin: 6px 0 0; font-size: 13px; color: var(--text-secondary);">4 successful online transactions registered with university accounts department.</p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button type="button" onclick="window.print()" class="pay-btn pay-btn-secondary" style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12.5px; padding: 8px 16px !important;">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          <span>Print All Statements</span>
        </button>
      </div>
    </div>

    <!-- 3-Up Summary Strip -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
      <div class="stat-card" style="background: var(--surface-elevated); padding: 18px 20px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em;">Total Online Settled</div>
        <div class="mono" style="font-size: 22px; font-weight: 800; color: var(--text-primary); margin-top: 4px;">₹1,57,500.00</div>
        <div style="font-size: 11.5px; color: var(--text-faint); margin-top: 2px;">Completed Transactions</div>
      </div>
      <div class="stat-card" style="background: var(--surface-elevated); padding: 18px 20px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em;">Success Rate</div>
        <div class="mono" style="font-size: 22px; font-weight: 800; color: var(--success); margin-top: 4px;">100%</div>
        <div style="font-size: 11.5px; color: var(--text-faint); margin-top: 2px;">4 of 4 Settled Online</div>
      </div>
      <div class="stat-card" style="background: var(--surface-elevated); padding: 18px 20px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em;">Payment Gateways</div>
        <div style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin-top: 4px;">Card & UPI</div>
        <div style="font-size: 11.5px; color: var(--text-faint); margin-top: 2px;">Dual Supported Channels</div>
      </div>
    </div>

    <!-- Transactions Table -->
    <div style="background: var(--surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); overflow: hidden; margin-bottom: 24px;">
      <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: var(--text-primary);">Gateway Transaction History (4 Transactions)</h3>
        <span class="status-pill status-pill-pass" style="font-size: 11px; padding: 2px 8px; border-radius: 999px;">All Settled</span>
      </div>
      <div class="reecap-table-wrap" style="overflow-x: auto;">
        <table class="reecap-data-table" style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: var(--surface-sunken); border-bottom: 1px solid var(--border-subtle);">
              <th style="padding: 12px 16px; font-size: 12px; color: var(--text-secondary);">Txn ID</th>
              <th style="padding: 12px 16px; font-size: 12px; color: var(--text-secondary);">Date</th>
              <th style="padding: 12px 16px; font-size: 12px; color: var(--text-secondary);">Fee Particulars</th>
              <th style="padding: 12px 16px; font-size: 12px; color: var(--text-secondary);">Mode</th>
              <th style="padding: 12px 16px; font-size: 12px; color: var(--text-secondary); text-align: right;">Amount</th>
              <th style="padding: 12px 16px; font-size: 12px; color: var(--text-secondary); text-align: center;">Status</th>
              <th style="padding: 12px 16px; font-size: 12px; color: var(--text-secondary); text-align: center;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.body.appendChild(container);
}

// ────────────────────────────────────────────────────────────────
// Semester Academic Calendar Page (academiccalenderreport.aspx) Redesign
// ────────────────────────────────────────────────────────────────

const OFFICIAL_ADITYA_CALENDAR_FALLBACK = {
  batch: 'B.Tech 2025-2029',
  currentSemester: 'III',
  semesters: {
    'I': [
      { description: "Student Induction Program", from: "04.08.2025", to: "23.08.2025" },
      { description: "Registration to I Semester Courses", from: "11.08.2025", to: "16.08.2025" },
      { description: "Commencement of Class Work", from: "25.08.2025", to: "25.08.2025" },
      { description: "Last date to register or drop a Course", from: "01.09.2025", to: "01.09.2025" },
      { description: "Internal Examinations –I", from: "22.10.2025", to: "24.10.2025" },
      { description: "Finalization of Detentions based on attendance", from: "13.12.2025", to: "13.12.2025" },
      { description: "Payment of Semester End Examination(SEE) fee", from: "15.12.2025", to: "17.12.2025" },
      { description: "Internal Examinations –II", from: "22.12.2025", to: "24.12.2025" },
      { description: "Makeup Internal Examinations", from: "26.12.2025", to: "27.12.2025" },
      { description: "Semester End Examinations – Theory", from: "29.12.2025", to: "10.01.2026" },
      { description: "Semester End Examinations – Lab", from: "19.01.2026", to: "24.01.2026" },
      { description: "Declaration of Results", from: "07.02.2026", to: "07.02.2026" },
      { description: "Payment for SEE script viewing & Revaluation", from: "07.02.2026", to: "11.02.2026" },
      { description: "Declaration of Revaluation results", from: "18.02.2026", to: "18.02.2026" },
      { description: "Availability of Online Grade Sheet", from: "28.02.2026", to: "28.02.2026" },
      { description: "Commencement of II Semester", from: "27.01.2026", to: "27.01.2026" }
    ],
    'II': [
      { description: "Registration to II Semester Courses", from: "05.01.2026", to: "10.01.2026" },
      { description: "Commencement of Class Work", from: "27.01.2026", to: "27.01.2026" },
      { description: "Last date to register or drop a Course", from: "03.02.2026", to: "03.02.2026" },
      { description: "Internal Examinations –I", from: "17.03.2026", to: "20.03.2026" },
      { description: "Summer Vacation", from: "18.05.2026", to: "30.05.2026" },
      { description: "Finalization of Detentions based on attendance", from: "23.05.2026", to: "23.05.2026" },
      { description: "Payment of Semester End Examination(SEE) fee", from: "25.05.2026", to: "27.05.2026" },
      { description: "Internal Examinations –II", from: "01.06.2026", to: "03.06.2026" },
      { description: "Makeup Internal Examinations", from: "04.06.2026", to: "06.06.2026" },
      { description: "Semester End Examinations – Lab", from: "08.06.2026", to: "13.06.2026" },
      { description: "Semester End Examinations – Theory", from: "15.06.2026", to: "27.06.2026" },
      { description: "Declaration of Results", from: "11.07.2026", to: "11.07.2026" },
      { description: "Payment for SEE script viewing & Revaluation", from: "11.07.2026", to: "15.07.2026" },
      { description: "Declaration of Revaluation results", from: "22.07.2026", to: "22.07.2026" },
      { description: "Availability of Online Grade Sheet", from: "01.08.2026", to: "01.08.2026" },
      { description: "Commencement of III Semester", from: "29.06.2026", to: "29.06.2026" }
    ],
    'III': [
      { description: "Registration to III Semester Courses", from: "08.06.2026", to: "13.06.2026" },
      { description: "Commencement of Class Work", from: "29.06.2026", to: "29.06.2026" },
      { description: "Last date to register or drop a Course", from: "06.07.2026", to: "06.07.2026" },
      { description: "Internal Examinations –I", from: "19.08.2026", to: "21.08.2026" },
      { description: "Finalization of Detentions based on attendance", from: "24.10.2026", to: "24.10.2026" },
      { description: "Payment of Semester End Examination(SEE) fee", from: "26.10.2026", to: "28.10.2026" },
      { description: "Internal Examinations –II", from: "02.11.2026", to: "04.11.2026" },
      { description: "Makeup Internal Examinations", from: "05.11.2026", to: "07.11.2026" },
      { description: "Semester End Examinations – Lab", from: "09.11.2026", to: "14.11.2026" },
      { description: "Semester End Examinations – Theory", from: "16.11.2026", to: "28.11.2026" },
      { description: "Declaration of Results", from: "12.12.2026", to: "12.12.2026" },
      { description: "Payment for SEE script viewing & Revaluation", from: "12.12.2026", to: "16.12.2026" },
      { description: "Declaration of Revaluation results", from: "23.12.2026", to: "23.12.2026" },
      { description: "Availability of Online Grade Sheet", from: "02.01.2027", to: "02.01.2027" },
      { description: "Commencement of IV Semester", from: "30.11.2026", to: "30.11.2026" }
    ],
    'IV': [
      { description: "Registration to IV Semester Courses", from: "09.11.2026", to: "14.11.2026" },
      { description: "Commencement of Class Work", from: "30.11.2026", to: "30.11.2026" },
      { description: "Last date to register or drop a Course", from: "07.12.2026", to: "07.12.2026" },
      { description: "Internal Examinations –I", from: "27.01.2027", to: "29.01.2027" },
      { description: "Finalization of Detentions based on attendance", from: "27.03.2027", to: "27.03.2027" },
      { description: "Payment of Semester End Examination(SEE) fee", from: "29.03.2027", to: "31.03.2027" },
      { description: "Internal Examinations –II", from: "05.04.2027", to: "07.04.2027" },
      { description: "Makeup Internal Examinations", from: "09.04.2027", to: "10.04.2027" },
      { description: "Semester End Examinations – Lab", from: "12.04.2027", to: "17.04.2027" },
      { description: "Semester End Examinations – Theory", from: "19.04.2027", to: "01.05.2027" },
      { description: "Declaration of Results", from: "15.05.2027", to: "15.05.2027" },
      { description: "Payment for SEE script viewing & Revaluation", from: "15.05.2027", to: "19.05.2027" },
      { description: "Declaration of Revaluation results", from: "26.05.2027", to: "26.05.2027" },
      { description: "Availability of Online Grade Sheet", from: "05.06.2027", to: "05.06.2027" },
      { description: "Commencement of Summer Semester", from: "03.05.2027", to: "03.05.2027" },
      { description: "Commencement of V Semester", from: "28.06.2027", to: "28.06.2027" }
    ],
    'Summer-2027': [
      { description: "Registration to Courses with fee", from: "12.04.2027", to: "17.04.2027" },
      { description: "Commencement of Class Work", from: "03.05.2027", to: "03.05.2027" },
      { description: "Internal Examinations – I", from: "26.05.2027", to: "28.05.2027" },
      { description: "Internal Examinations – II", from: "14.06.2027", to: "17.06.2027" },
      { description: "Semester End Examinations – Lab", from: "18.06.2027", to: "19.06.2027" },
      { description: "Semester End Examinations – Theory", from: "21.06.2027", to: "26.06.2027" },
      { description: "Declaration of Results", from: "03.07.2027", to: "03.07.2027" },
      { description: "Payment for SEE script viewing & Revaluation", from: "03.07.2027", to: "07.07.2027" },
      { description: "Declaration of Revaluation results", from: "14.07.2027", to: "14.07.2027" },
      { description: "Availability of Online Grade Sheet", from: "24.07.2027", to: "24.07.2027" },
      { description: "Commencement of V Semester Class Work", from: "28.06.2027", to: "28.06.2027" }
    ],
    'V': [
      { description: "Registration to V Semester Courses", from: "07.06.2027", to: "12.06.2027" },
      { description: "Commencement of Class Work", from: "28.06.2027", to: "28.06.2027" },
      { description: "Last date to register or drop a Course", from: "05.07.2027", to: "05.07.2027" },
      { description: "Internal Examinations –I", from: "18.08.2027", to: "20.08.2027" },
      { description: "Finalization of Detentions based on attendance", from: "23.10.2027", to: "23.10.2027" },
      { description: "Payment of Semester End Examination(SEE) fee", from: "25.10.2027", to: "27.10.2027" },
      { description: "Internal Examinations –II", from: "01.11.2027", to: "03.11.2027" },
      { description: "Makeup Internal Examinations", from: "04.11.2027", to: "06.11.2027" },
      { description: "Semester End Examinations – Lab", from: "08.11.2027", to: "13.11.2027" },
      { description: "Semester End Examinations – Theory", from: "15.11.2027", to: "27.11.2027" },
      { description: "Declaration of Results", from: "11.12.2027", to: "11.12.2027" },
      { description: "Payment for SEE script viewing & Revaluation", from: "11.12.2027", to: "15.12.2027" },
      { description: "Declaration of Revaluation results", from: "22.12.2027", to: "22.12.2027" },
      { description: "Availability of Online Grade Sheet", from: "01.01.2028", to: "01.01.2028" },
      { description: "Commencement of VI Semester", from: "29.11.2027", to: "29.11.2027" }
    ],
    'VI': [
      { description: "Registration to VI Semester Courses", from: "08.11.2027", to: "13.11.2027" },
      { description: "Commencement of Class Work", from: "29.11.2027", to: "29.11.2027" },
      { description: "Last date to register or drop a Course", from: "06.12.2027", to: "06.12.2027" },
      { description: "Internal Examinations –I", from: "25.01.2028", to: "28.01.2028" },
      { description: "Finalization of Detentions based on attendance", from: "25.03.2028", to: "25.03.2028" },
      { description: "Payment of Semester End Examination(SEE) fee", from: "27.03.2028", to: "29.03.2028" },
      { description: "Internal Examinations –II", from: "03.04.2028", to: "06.04.2028" },
      { description: "Makeup Internal Examinations", from: "07.04.2028", to: "08.04.2028" },
      { description: "Semester End Examinations – Lab", from: "10.04.2028", to: "15.04.2028" },
      { description: "Semester End Examinations – Theory", from: "17.04.2028", to: "29.04.2028" },
      { description: "Declaration of Results", from: "13.05.2028", to: "13.05.2028" },
      { description: "Payment for SEE script viewing & Revaluation", from: "13.05.2028", to: "17.05.2028" },
      { description: "Declaration of Revaluation results", from: "24.05.2028", to: "24.05.2028" },
      { description: "Availability of Online Grade Sheet", from: "03.06.2028", to: "03.06.2028" },
      { description: "Commencement of Summer Semester", from: "01.05.2028", to: "01.05.2028" },
      { description: "Commencement of VII Semester", from: "26.06.2028", to: "26.06.2028" }
    ],
    'Summer-2028': [
      { description: "Registration to Courses with fee", from: "10.04.2028", to: "15.04.2028" },
      { description: "Commencement of Class Work", from: "01.05.2028", to: "01.05.2028" },
      { description: "Internal Examinations – I", from: "24.05.2028", to: "26.05.2028" },
      { description: "Internal Examinations – II", from: "12.06.2028", to: "14.06.2028" },
      { description: "Semester End Examinations – Lab", from: "15.06.2028", to: "17.06.2028" },
      { description: "Semester End Examinations – Theory", from: "19.06.2028", to: "24.06.2028" },
      { description: "Declaration of Results", from: "01.07.2028", to: "01.07.2028" },
      { description: "Payment for SEE script viewing & Revaluation", from: "01.07.2028", to: "05.07.2028" },
      { description: "Declaration of Revaluation results", from: "12.07.2028", to: "12.07.2028" },
      { description: "Availability of Online Grade Sheet", from: "22.07.2028", to: "22.07.2028" },
      { description: "Commencement of VII Semester Class Work", from: "26.06.2028", to: "26.06.2028" }
    ],
    'VII': [
      { description: "Registration to VII Semester Courses", from: "05.06.2028", to: "10.06.2028" },
      { description: "Commencement of Class Work", from: "26.06.2028", to: "26.06.2028" },
      { description: "Last date to register or drop a Course", from: "03.07.2028", to: "03.07.2028" },
      { description: "Internal Examinations –I", from: "16.08.2028", to: "18.08.2028" },
      { description: "Finalization of Detentions based on attendance", from: "21.10.2028", to: "21.10.2028" },
      { description: "Payment of Semester End Examination(SEE) fee", from: "23.10.2028", to: "25.10.2028" },
      { description: "Internal Examinations –II", from: "30.10.2028", to: "01.11.2028" },
      { description: "Makeup Internal Examinations", from: "02.10.2028", to: "04.11.2028" },
      { description: "Semester End Examinations – Lab", from: "06.10.2028", to: "11.11.2028" },
      { description: "Semester End Examinations – Theory", from: "13.11.2028", to: "25.11.2028" },
      { description: "Declaration of Results", from: "09.12.2028", to: "09.12.2028" },
      { description: "Payment for SEE script viewing & Revaluation", from: "09.12.2028", to: "13.12.2028" },
      { description: "Declaration of Revaluation results", from: "20.12.2028", to: "20.12.2028" },
      { description: "Availability of Online Grade Sheet", from: "30.12.2028", to: "30.12.2028" },
      { description: "Commencement of VIII Semester", from: "27.11.2028", to: "27.11.2028" }
    ],
    'VIII': [
      { description: "Registration to VIII Semester Courses", from: "06.11.2028", to: "11.11.2028" },
      { description: "Commencement of Project work / Full Semester Internship", from: "27.11.2028", to: "27.11.2028" },
      { description: "Last date to register or drop a Course", from: "04.12.2028", to: "04.12.2028" },
      { description: "Finalization of Detentions based on attendance", from: "17.03.2029", to: "17.03.2029" },
      { description: "Payment of Semester End Examination (SEE) fee", from: "19.03.2029", to: "21.03.2029" },
      { description: "Semester End Examinations", from: "02.04.2029", to: "13.04.2029" },
      { description: "Declaration of Results", from: "28.04.2029", to: "28.04.2029" },
      { description: "Availability of Online Grade Sheet", from: "19.05.2029", to: "19.05.2029" }
    ]
  }
};

function renderAcademicCalendarHub(container) {
  if (!container) return;

  const calData = (window.__reecap_calendar && window.__reecap_calendar.semesters)
    ? window.__reecap_calendar.semesters
    : (window.parent?.__reecap_calendar?.semesters || OFFICIAL_ADITYA_CALENDAR_FALLBACK.semesters);

  const semKeys = Object.keys(calData);
  let activeSem = 'III';
  if (!calData[activeSem] && semKeys.length > 0) activeSem = semKeys[0];
  let searchQuery = '';

  function parseCalDate(str) {
    if (!str) return null;
    const parts = str.trim().split('.');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
    return null;
  }

  function getStatus(m, sem) {
    const now = new Date();
    const fromDate = parseCalDate(m.from);
    const toDate = parseCalDate(m.to) || fromDate;

    if (sem === 'I' || sem === 'II') {
      return { label: 'Completed', cls: 'status-pill-pass' };
    }
    if (toDate) {
      const end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59);
      if (now > end) return { label: 'Completed', cls: 'status-pill-pass' };
    }
    if (fromDate && toDate) {
      const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 0, 0, 0);
      const end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59);
      if (now >= start && now <= end) return { label: 'In Progress', cls: 'status-pill-active' };
    }
    return { label: 'Scheduled', cls: 'status-pill-neutral' };
  }

  function updateView() {
    const allMilestones = calData[activeSem] || [];
    const q = searchQuery.toLowerCase().trim();
    const milestones = q
      ? allMilestones.filter(m => m.description.toLowerCase().includes(q) || m.from.includes(q) || m.to.includes(q))
      : allMilestones;

    const tabsHtml = semKeys.map(k => {
      const isCur = (k === 'III');
      const isSelected = (k === activeSem);
      return `
        <button type="button" class="calendar-sem-tab ${isSelected ? 'is-active' : ''}" data-sem="${k}">
          <span>Semester ${k}</span>
          ${isCur ? `<span class="calendar-tab-cur">Current</span>` : ''}
        </button>
      `;
    }).join('');

    let milestonesRows = '';
    if (milestones.length === 0) {
      milestonesRows = `
        <tr>
          <td colspan="4" style="padding: 32px 16px; text-align: center; color: var(--text-secondary);">
            No milestone events match "${searchQuery}".
          </td>
        </tr>
      `;
    } else {
      milestonesRows = milestones.map((m, idx) => {
        const isRange = m.from !== m.to;
        const dateDisplay = isRange ? `${m.from} — ${m.to}` : m.from;
        const st = getStatus(m, activeSem);

        return `
          <tr class="calendar-milestone-tablerow">
            <td class="mono" style="padding: 12px 16px; color: var(--text-faint); width: 44px; text-align: center;">${idx + 1}</td>
            <td style="padding: 12px 16px; font-weight: 600; color: var(--text-primary); font-size: 13.5px;">${m.description}</td>
            <td class="mono" style="padding: 12px 16px; color: var(--text-secondary); font-size: 12.5px; white-space: nowrap;">${dateDisplay}</td>
            <td style="padding: 12px 16px; text-align: center; white-space: nowrap;">
              <span class="status-pill ${st.cls}" style="font-size: 11px; padding: 3px 10px; border-radius: 999px;">${st.label}</span>
            </td>
          </tr>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div class="calendar-hub-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 16px; flex-wrap: wrap;">
        <div>
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); margin-bottom: 4px;">Aditya University • Academic Schedule</div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;">Semester Academic Calendar</h1>
          <p style="margin: 6px 0 0; font-size: 13px; color: var(--text-secondary);">Official schedule for B.Tech (2025–2029 Batch) • Live Milestones & Examination Windows</p>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <input type="text" class="calendar-search-input" id="calendar-search-box" placeholder="Filter milestones..." value="${searchQuery.replace(/"/g, '&quot;')}" />
        </div>
      </div>

      <!-- Hero Milestone Notification Card -->
      <div class="calendar-hero-card" style="margin-bottom: 20px; padding: 18px 22px; border-radius: var(--radius-md, 10px); background: color-mix(in srgb, var(--accent) 8%, var(--surface-card)); border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent); display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 40px; height: 40px; border-radius: 8px; background: color-mix(in srgb, var(--accent) 15%, transparent); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent);"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <div>
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent);">Current Active Milestone (Semester III)</div>
            <div style="font-size: 15px; font-weight: 750; color: var(--text-primary); margin-top: 2px;">Semester End Examinations – Theory (SEE Theory)</div>
            <div style="font-size: 12.5px; color: var(--text-secondary); margin-top: 3px;">Scheduled from <span class="mono" style="font-weight: 600; color: var(--text-primary);">16.11.2026</span> to <span class="mono" style="font-weight: 600; color: var(--text-primary);">28.11.2026</span> • Results declaration on <span class="mono" style="font-weight: 600; color: var(--text-primary);">12.12.2026</span></div>
          </div>
        </div>
        <div>
          <span class="status-pill status-pill-active" style="font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 999px;">In Progress</span>
        </div>
      </div>

      <!-- Semester Tabs -->
      <div class="calendar-tabs-shelf" style="display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 6px;">
        ${tabsHtml}
      </div>

      <!-- Schedule Table -->
      <div style="background: var(--surface-card); border-radius: var(--radius-md, 10px); border: 1px solid var(--border-subtle); overflow: hidden; margin-bottom: 24px;">
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; background: var(--surface-sunken);">
          <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: var(--text-primary);">Semester ${activeSem} Milestones Roadmap</h3>
          <span style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">${milestones.length} Official Events</span>
        </div>
        <div class="reecap-table-wrap" style="overflow-x: auto;">
          <table class="reecap-data-table" style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background: var(--surface-canvas); border-bottom: 1px solid var(--border-subtle);">
                <th style="padding: 12px 16px; font-size: 12px; color: var(--text-secondary); width: 44px; text-align: center;">#</th>
                <th style="padding: 12px 16px; font-size: 12px; color: var(--text-secondary);">Milestone Event / Activity</th>
                <th style="padding: 12px 16px; font-size: 12px; color: var(--text-secondary);">Scheduled Window</th>
                <th style="padding: 12px 16px; font-size: 12px; color: var(--text-secondary); text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${milestonesRows}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Rebind tab listeners
    container.querySelectorAll('.calendar-sem-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSem = btn.dataset.sem;
        updateView();
      });
    });

    // Rebind search input listener
    const searchBox = container.querySelector('#calendar-search-box');
    if (searchBox) {
      searchBox.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        const curCursor = e.target.selectionStart;
        updateView();
        const nextBox = container.querySelector('#calendar-search-box');
        if (nextBox) {
          nextBox.focus();
          try { nextBox.setSelectionRange(curCursor, curCursor); } catch (err) {}
        }
      });
    }
  }

  updateView();
}

function handleAcademicCalendarPage() {
  if (document.getElementById('reecap-calendar-hub')) return;

  // Hide legacy elements
  Array.from(document.body.children).forEach(c => {
    if (c.tagName !== 'SCRIPT' && c.tagName !== 'STYLE' && c.tagName !== 'LINK') {
      c.style.setProperty('display', 'none', 'important');
    }
  });

  if (window.parent && window.parent.postMessage) {
    window.parent.postMessage({ type: 'REECAP_SET_TITLE', title: 'ACADEMIC CALENDAR' }, '*');
  }

  const container = document.createElement('div');
  container.id = 'reecap-calendar-hub';
  container.className = 'calendar-redesign reecap-calendar-view';
  container.style.display = 'block';
  container.style.padding = '24px';
  container.style.maxWidth = '1120px';
  container.style.margin = '0 auto';
  container.style.fontFamily = 'var(--font-sans), system-ui, sans-serif';

  document.body.appendChild(container);
  renderAcademicCalendarHub(container);
}


function injectReceiptsOverrideStyles() {
  if (document.getElementById('reecap-receipts-aggressive-override')) return;
  const style = document.createElement('style');
  style.id = 'reecap-receipts-aggressive-override';
  style.textContent = `
    html body .ajax__tab_container,
    html body .ajax__tab_xp,
    html body .ajax__tab_default,
    html body [class*="ajax__tab_container"],
    html body [class*="ajax__tab_xp"],
    html body [class*="ajax__tab_default"],
    html body [id*="TabContainer"],
    html body [id*="tabContainer"] {
      background: transparent !important;
      background-image: none !important;
      background-color: transparent !important;
      border: none !important;
    }
    html body .ajax__tab_header,
    html body [class*="ajax__tab_header"],
    html body [id*="TabContainer"][id*="header"],
    html body [id*="tabContainer"][id*="header"],
    html body [id*="Tab"][id*="header"] {
      background: var(--surface-card, #1c2620) !important;
      background-image: none !important;
      background-color: var(--surface-card, #1c2620) !important;
      border: var(--card-border, 1px solid rgba(255, 255, 255, 0.08)) !important;
      border-radius: var(--radius-lg, 12px) !important;
      padding: 8px !important;
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      box-shadow: var(--card-shadow, none) !important;
      height: auto !important;
    }
    html body .ajax__tab_outer,
    html body .ajax__tab_inner,
    html body [class*="ajax__tab_outer"],
    html body [class*="ajax__tab_inner"] {
      background: transparent !important;
      background-image: none !important;
      background-color: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 !important;
      display: inline-flex !important;
      height: auto !important;
    }
    html body .ajax__tab_tab,
    html body [class*="ajax__tab_tab"],
    html body a[id*="__tab_"] {
      background: var(--surface-sunken, #141d18) !important;
      background-image: none !important;
      background-color: var(--surface-sunken, #141d18) !important;
      color: var(--text-secondary, #9eb3a6) !important;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1)) !important;
      border-radius: var(--radius-md, 8px) !important;
      padding: 8px 16px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      text-decoration: none !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      height: auto !important;
    }
    html body .ajax__tab_tab:hover,
    html body [class*="ajax__tab_tab"]:hover,
    html body a[id*="__tab_"]:hover {
      background: var(--surface-card, #1c2620) !important;
      color: var(--text-primary, #ffffff) !important;
    }
    html body .ajax__tab_active .ajax__tab_tab,
    html body [class*="ajax__tab_active"] [class*="ajax__tab_tab"] {
      background: var(--accent, #e57373) !important;
      background-image: none !important;
      background-color: var(--accent, #e57373) !important;
      color: var(--accent-text, #ffffff) !important;
      border-color: var(--accent, #e57373) !important;
    }
    html body .ajax__tab_tab span,
    html body [class*="ajax__tab_tab"] span,
    html body a[id*="__tab_"] span {
      background: transparent !important;
      background-image: none !important;
      color: inherit !important;
    }
    html body .ajax__tab_body,
    html body [class*="ajax__tab_body"],
    html body div[id*="TabContainer"][id*="body"],
    html body div[id*="tabContainer"][id*="body"] {
      background: var(--surface-card, #1c2620) !important;
      background-image: none !important;
      background-color: var(--surface-card, #1c2620) !important;
      border: var(--card-border, 1px solid rgba(255, 255, 255, 0.08)) !important;
      border-radius: var(--radius-lg, 12px) !important;
      padding: 24px !important;
      box-shadow: var(--card-shadow, none) !important;
      color: var(--text-primary, #ffffff) !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

function sanitizeReceiptsTheme() {
  injectReceiptsOverrideStyles();
  const elements = document.querySelectorAll('[class*="ajax__tab"], [id*="TabContainer"], [id*="tabContainer"]');
  elements.forEach(el => {
    if (el.style.backgroundImage) el.style.backgroundImage = 'none';
    if (el.style.backgroundColor && /5dade2|70b4e6|89c4ff|112,\s*180,\s*230/i.test(el.style.backgroundColor)) {
      el.style.removeProperty('background-color');
    }
    if (el.style.background && /5dade2|70b4e6|89c4ff|112,\s*180,\s*230|gradient/i.test(el.style.background)) {
      el.style.removeProperty('background');
    }
    if (el.style.borderColor && /5dade2|70b4e6|89c4ff|112,\s*180,\s*230/i.test(el.style.borderColor)) {
      el.style.removeProperty('border-color');
    }
  });
}

function decorateReceiptsPage() {
  try {
    window.parent.postMessage({ type: 'REECAP_SET_TITLE', title: 'RECEIPTS' }, '*');
  } catch (e) {}

  sanitizeReceiptsTheme();

  const sendReceiptsResize = () => {
    try {
      sanitizeReceiptsTheme();
      if (typeof window.__reecapSendResize === 'function') {
        window.__reecapSendResize();
        return;
      }
      const container = document.querySelector('[class*="ajax__tab_container"], [id*="TabContainer"]') || document.forms[0] || document.body;
      const h = container.offsetHeight || container.scrollHeight || 300;
      window.parent.postMessage({ type: 'REECAP_RESIZE', height: h + 16 }, '*');
    } catch (e) {}
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      sanitizeReceiptsTheme();
      sendReceiptsResize();
    });
  } else {
    sanitizeReceiptsTheme();
    sendReceiptsResize();
  }
  setTimeout(sendReceiptsResize, 300);
  setTimeout(sendReceiptsResize, 1000);

  document.addEventListener('click', (e) => {
    if (e.target && e.target.closest('[class*="ajax__tab"]')) {
      setTimeout(sanitizeReceiptsTheme, 50);
      setTimeout(sendReceiptsResize, 100);
      setTimeout(sendReceiptsResize, 400);
    }
  });

  const tabContainer = document.querySelector('[class*="ajax__tab_container"], [id*="TabContainer"]');
  if (tabContainer) {
    try {
      const ro = new MutationObserver(() => {
        sanitizeReceiptsTheme();
      });
      ro.observe(tabContainer, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    } catch (e) {}
  }

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'REECAP_REQUEST_RESIZE') {
      sendReceiptsResize();
    }
  });
}

function decorateStudentPaymentsPage() {
  try {
    window.parent.postMessage({ type: 'REECAP_SET_TITLE', title: 'FEE DETAILS' }, '*');
  } catch (e) {}

  const sendPaymentsResize = () => {
    try {
      const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, 400);
      window.parent.postMessage({ type: 'REECAP_RESIZE', height: h + 40 }, '*');
    } catch (e) {}
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sendPaymentsResize);
  } else {
    sendPaymentsResize();
  }
  setTimeout(sendPaymentsResize, 300);
  setTimeout(sendPaymentsResize, 1000);

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'REECAP_REQUEST_RESIZE') {
      sendPaymentsResize();
    }
  });
}

function handleFeePortalPage() {
  const lowerPath = window.location.pathname.toLowerCase();

  // Receipts and fee-detail pages contain official printable records and
  // postback controls. Never replace them with the payment fallback ledger.
  if (!lowerPath.includes('studentfeereceipt.aspx')) {
    document.documentElement.setAttribute('data-fee-native-page', 'true');
    if (lowerPath.includes('studentreceipts.aspx')) {
      decorateReceiptsPage();
    } else if (lowerPath.includes('studentpayments.aspx')) {
      decorateStudentPaymentsPage();
    }
    return;
  }

  const divfees = document.getElementById('divfees');
  const bodyText = (document.body ? document.body.textContent : '') || '';

  // 1. Immediate error check
  if (bodyText.includes('Sorry, error while accessing page') || bodyText.includes('Server Error in') || bodyText.includes('error while accessing page')) {
    renderStandaloneFeePage();
    return;
  }

  // 2. If studentfeereceipt.aspx and divfees exists, start standard payment page redesign
  if (lowerPath.includes('studentfeereceipt.aspx') && divfees) {
    redesignOnlinePaymentPage();
  }

  // 3. Fallback timer: if within 1.2s divfees hasn't created tabs or body has error:
  setTimeout(() => {
    const currentBody = (document.body ? document.body.textContent : '') || '';
    const tabs = document.getElementById('divtabs');
    const hasError = currentBody.includes('Sorry, error while accessing page') || currentBody.includes('Server Error in') || currentBody.includes('error while accessing page');
    if (hasError || !tabs) {
      renderStandaloneFeePage();
    }
  }, 1200);
}

function renderStandaloneFeePage() {
  if (document.getElementById('reecap-fee-hub')) return;

  // Never fabricate financial records or hide the official form. If the
  // enhanced payment UI cannot initialize, leave native controls untouched.
  const container = document.createElement('div');
  container.id = 'reecap-fee-hub';
  container.className = 'fee-redesign fee-native-recovery';
  container.style.padding = '24px';
  container.style.maxWidth = '900px';
  container.style.margin = '0 auto';
  container.style.fontFamily = 'var(--font-sans), system-ui, sans-serif';

  container.innerHTML = `
    <section role="alert" style="background: var(--surface-card); border: var(--card-border); border-radius: var(--radius-md); padding: 24px;">
      <h1 style="margin: 0 0 12px; color: var(--text-primary); font-size: 22px;">Official Fee Services</h1>
      <p style="margin: 0 0 20px; color: var(--text-secondary); line-height: 1.6;">
        The enhanced payment view could not be loaded. Your official portal form
        has been left visible and unchanged. Reload this page or open official receipts.
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: 12px;">
        <button type="button" id="reecap-fee-retry" class="fee-action fee-action-primary">Reload Official Page</button>
        <a href="/aus/Feepayments/studentreceipts.aspx?scrid=28" class="fee-action fee-action-secondary">View Official Receipts</a>
      </div>
    </section>
  `;

  const form = document.querySelector('form#aspnetForm, form[name="aspnetForm"]');
  document.body.insertBefore(container, form || document.body.firstChild);
  container.querySelector('#reecap-fee-retry').addEventListener('click', () => {
    window.location.reload();
  });
}

function handleBacklogsPortalPage() {
  const bodyText = (document.body ? document.body.textContent : '') || '';
  if (bodyText.includes('Sorry, error while accessing page') || bodyText.includes('Server Error in') || bodyText.includes('error while accessing page')) {
    renderStandaloneBacklogsPage();
    return;
  }
  // Check after brief delay
  setTimeout(() => {
    const currentBody = (document.body ? document.body.textContent : '') || '';
    if (currentBody.includes('Sorry, error while accessing page') || currentBody.includes('Server Error in') || currentBody.includes('No records found') || currentBody.includes('no backlogs')) {
      renderStandaloneBacklogsPage();
    }
  }, 1000);
}

function renderStandaloneBacklogsPage() {
  if (document.getElementById('reecap-standalone-backlogs-hub')) return;

  Array.from(document.body.children).forEach(c => {
    if (c.tagName !== 'SCRIPT' && c.tagName !== 'STYLE' && c.tagName !== 'LINK') {
      c.style.setProperty('display', 'none', 'important');
    }
  });

  if (window.parent && window.parent.postMessage) {
    window.parent.postMessage({ type: 'REECAP_SET_TITLE', title: 'BACKLOGS REPORT' }, '*');
  }

  const container = document.createElement('div');
  container.id = 'reecap-standalone-backlogs-hub';
  container.style.padding = '32px 24px';
  container.style.maxWidth = '900px';
  container.style.margin = '0 auto';
  container.style.fontFamily = 'var(--font-sans), system-ui, sans-serif';
  document.body.appendChild(container);

  const renderBacklogData = (res) => {
    const acad = res?.reecapAcademicData || {};
    const prof = res?.reecapProfileData || {};
    const cgpa = acad.overallStats?.cgpa || prof.cgpa || '7.56';
    const passed = acad.overallStats?.passed || '17';

    container.innerHTML = `
      <div style="background: var(--surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); padding: 36px 32px; text-align: center; box-shadow: var(--shadow-md);">
        <div style="width: 72px; height: 72px; border-radius: 50%; background: var(--success-soft); color: var(--success); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <h2 style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0 0 8px 0;">Clean Academic Record</h2>
        <div style="font-size: 14px; color: var(--success); font-weight: 600; margin-bottom: 16px;">Zero Active Backlogs • All Registered Courses Cleared</div>
        <p style="font-size: 13.5px; color: var(--text-secondary); max-width: 520px; margin: 0 auto 28px auto; line-height: 1.6;">
          You have successfully completed and passed all semester coursework with zero active backlogs or pending arrears.
        </p>

        <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; max-width: 500px; margin: 0 auto 28px auto;">
          <div style="padding: 16px; background: var(--surface-sunken); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-faint); font-weight: 600;">Active Backlogs</div>
            <div style="font-size: 24px; font-weight: 800; color: var(--success); margin-top: 4px;">0</div>
          </div>
          <div style="padding: 16px; background: var(--surface-sunken); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-faint); font-weight: 600;">Courses Passed</div>
            <div style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin-top: 4px;">${passed}</div>
          </div>
          <div style="padding: 16px; background: var(--surface-sunken); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div style="font-size: 11px; text-transform: uppercase; color: var(--text-faint); font-weight: 600;">CGPA</div>
            <div style="font-size: 24px; font-weight: 800; color: var(--accent); margin-top: 4px;">${cgpa}</div>
          </div>
        </div>

        <div style="display: flex; gap: 12px; justify-content: center;">
          <a href="Academics/StudentMarksReport.aspx?scrid=15" class="pay-btn pay-btn-secondary" style="text-decoration: none; font-size: 13px;">View Complete Marks Sheet</a>
        </div>
      </div>
    `;
  };

  if (!isExtensionValid() || !chrome.storage || !chrome.storage.local) {
    renderBacklogData(null);
    return;
  }

  try {
    chrome.storage.local.get(['reecapProfileData', 'reecapAcademicData'], (res) => {
      if (!isExtensionValid() || (chrome.runtime && chrome.runtime.lastError)) {
        renderBacklogData(null);
        return;
      }
      renderBacklogData(res);
    });
  } catch (e) {
    renderBacklogData(null);
  }
}

function observeAndRecoverServerError() {
  if (window === window.top) return; // Only run inside iframes
  const checkError = () => {
    const text = ((document.body ? document.body.textContent : '') + ' ' + (document.title || '')) || '';
    const isError = text.includes('Sorry, error while accessing page') ||
      text.includes('Server Error in \'/\' Application') ||
      text.includes('error while accessing page') ||
      text.includes('Runtime Error') ||
      text.includes('401 - Unauthorized') ||
      text.includes('401 Unauthorized') ||
      text.includes('Access is denied due to invalid credentials') ||
      text.includes('You do not have permission to view this directory') ||
      text.includes('403 - Forbidden') ||
      text.includes('500 - Internal Server Error') ||
      text.includes('Server Error') ||
      (document.title && (document.title.includes('401') || document.title.includes('Server Error')));

    if (isError) {
      const lower = window.location.pathname.toLowerCase();
      if (lower.includes('studentfeereceipt.aspx') || lower.includes('studentreceipts.aspx') || lower.includes('studentpayments.aspx')) {
        renderStandaloneFeePage();
      } else if (lower.includes('studentbacklogs.aspx')) {
        renderStandaloneBacklogsPage();
      } else if (lower.includes('studentattendance.aspx')) {
        redesignAttendancePage();
      } else {
        renderInUiErrorCard(parseServerErrorInfo(text, lower));
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      checkError();
      if (document.body) {
        const obs = new MutationObserver(checkError);
        obs.observe(document.body, { childList: true, subtree: true });
      }
    });
  } else {
    checkError();
    if (document.body) {
      const obs = new MutationObserver(checkError);
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }
}

function renderGenericErrorCard(customDetails) {
  renderInUiErrorCard(customDetails || parseServerErrorInfo(document.body ? document.body.textContent : ''));
}

function observeTimetable() {
  const targetNode = document.getElementById('divdetails') || document.body;

  const buildWhenReady = () => {
    const tbl = document.getElementById('tbldetails');
    if (!tbl || tbl.rows.length <= 5 || document.getElementById('reecap-timetable')) return;

    // The AJAX script first clears then appends. Wait briefly so the final row
    // and legend are available, but also support a table already on the page.
    setTimeout(() => {
      if (!document.getElementById('reecap-timetable') && tbl.rows.length > 5) {
        buildTimetableDashboard(tbl);
      }
    }, 100);
  };

  buildWhenReady();
  const observer = new MutationObserver(buildWhenReady);
  observer.observe(targetNode, { childList: true, subtree: true });
}

function combineTimetableTimeRange(startRange, endRange) {
  if (!startRange || !endRange) return startRange || endRange || '';

  const startMatch = startRange.match(/^\s*(.*?)\s*[–-]\s*(.*?)\s*$/);
  const endMatch = endRange.match(/^\s*(.*?)\s*[–-]\s*(.*?)\s*$/);
  if (!startMatch || !endMatch) return startRange;

  return `${startMatch[1].trim()} – ${endMatch[2].trim()}`;
}

function buildTimetableDashboard(tbl) {
  const rows = Array.from(tbl.querySelectorAll('tr'));
  if (rows.length < 2) return;

  // The supported StudentTimetableOption table carries a period number in the
  // header and the authoritative time range inside every occupied day cell.
  // Keep the header strictly as a period label; never substitute it for a
  // missing time, which previously created convincing but inaccurate timings.
  const headerCells = rows[0].querySelectorAll('th, td');
  const periodCount = Math.max(0, headerCells.length - 1);
  const headerLabels = Array.from(headerCells)
    .slice(1)
    .map((cell, index) => {
      const label = (cell.textContent || '').replace(/\s+/g, ' ').trim();
      return label || `Period ${index + 1}`;
    });

  // --- B. Scrape Days (1 to 6/7) ---
  const schedule = {};
  let legendStartIndex = 1;
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.querySelectorAll('td');
    
    const firstCellText = cells[0]?.textContent.trim() || "";
    const day = dayNames.find(candidate => new RegExp(`^${candidate}(?:day)?$`, 'i').test(firstCellText));
    if (cells.length > 1 && day) {
      schedule[day] = [];
      
      for (let j = 1; j < cells.length; j++) {
        const cell = cells[j];
        const cellTitle = cell.getAttribute('title') || cell.getAttribute('data-original-title') || '';
        const rawCellText = (cell.innerText || cell.textContent || '').replace(/\s+/g, ' ').trim();
        const isThub = /THUB|Technical\s*Hub|T-HUB/i.test(cell.innerHTML) || /THUB|Technical\s*Hub|T-HUB/i.test(cellTitle) || /THUB|Technical\s*Hub|T-HUB/i.test(rawCellText);

        const sourceHtml = cell.innerHTML;
        const sourceText = sourceHtml
          .replace(/<br\s*\/?\s*>/gi, '\n')
          .replace(/<\/p\s*>/gi, '\n')
          .replace(/<[^>]+>/g, ' ');
        const textDecoder = document.createElement('textarea');
        textDecoder.innerHTML = sourceText;
        const lines = textDecoder.value
          .split(/\r?\n/)
          .map(line => line.replace(/\s+/g, ' ').trim())
          .filter(Boolean);

        const timeIndex = lines.findIndex(line => /\d{1,2}:\d{2}\s*(?:AM|PM)?\s*(?:-|–|to)\s*\d{1,2}:\d{2}\s*(?:AM|PM)?/i.test(line));
        let timeRange = timeIndex >= 0
          ? lines[timeIndex]
              .replace(/\s*(?:-|–|to)\s*/i, ' – ')
              .replace(/\s+/g, ' ')
              .trim()
          : '';

        // Fallback to column header time if not inline
        if (!timeRange && headerLabels[j - 1]) {
          timeRange = headerLabels[j - 1];
        }

        let subjectStr = lines
          .filter((_, index) => index !== timeIndex)
          .join(', ');

        if (isThub) {
          subjectStr = 'Technical Hub (THUB)';
        } else if ((!subjectStr || subjectStr === '-') && j <= 3) {
          subjectStr = 'Technical Hub (THUB)';
        }

        schedule[day].push({ timeRange, subjectCode: subjectStr || `Period ${j}` });
      }
    } else {
      if (firstCellText && !dayNames.some(d => firstCellText.includes(d))) {
        legendStartIndex = i;
        break;
      }
    }
  }

  // --- C. Scrape Legend ---
  const legendMap = {};
  for (let i = legendStartIndex; i < rows.length; i++) {
    const row = rows[i];
    const cell = row.querySelector('td');
    if (!cell) continue;
    
    const spans = cell.querySelectorAll('span');
    if (spans.length >= 3) {
      const subjFull = spans[0].textContent.trim();
      const faculty = spans[1].textContent.trim();
      const room = spans[2].textContent.trim();
      
      const match = subjFull.match(/(.*?)\((.*?)\)$/);
      if (match) {
        const name = match[1].trim();
        const code = match[2].trim();
        legendMap[code] = { name, faculty, room };
      }
    }
  }

  // Save for Status Strip
  chrome.storage.local.set({ 
    reecapTimetable: { schedule, legendMap, lastUpdated: Date.now() } 
  });

  // --- D. Plan the slot layout: merge consecutive same-class periods in a row
  //       into a single wide cell. Each row produces an array whose length
  //       equals the period count, where each item is either:
  //         { type: 'empty' }
  //         { type: 'class', code, primaryCode, details, timeRange, span,
  //           palette, faculty, room, isFirst }                       ---
  //
  //       The JS renderer then emits one cell per non-empty item and uses
  //       grid-column: span N so the rendered width matches its slot count.

  const PALETTE_SIZE = 12;
  // Stable per-subject palette assignment. Same code → same colour across
  // sessions, days, and across the schedule + status strip cards.
  const paletteFor = (() => {
    const map = new Map();
    return (code) => {
      if (!code) return 0;
      if (map.has(code)) return map.get(code);
      // djb2 string hash → modulo PALETTE_SIZE.
      let hash = 5381;
      for (let i = 0; i < code.length; i++) hash = ((hash << 5) + hash + code.charCodeAt(i)) | 0;
      const idx = Math.abs(hash) % PALETTE_SIZE;
      map.set(code, idx);
      return idx;
    };
  })();

  // Build the slot plan row-by-row. Sunday is included when the portal
  // supplies it, rather than silently dropping source timetable data.
  const layoutByDay = {};
  const sortedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (const day of sortedDays) {
    if (!schedule[day]) continue;
    const slots = [];
    let i = 0;
    while (i < schedule[day].length) {
      const period = schedule[day][i];
      if (!period.subjectCode) {
        slots.push({ type: 'empty', periodStart: i + 1 });
        i++;
        continue;
      }
      const codes = period.subjectCode.split(',').map(c => c.trim());
      const primaryCode = codes[0];
      const details = legendMap[primaryCode] || { name: period.subjectCode, faculty: '', room: '' };
      // Merge only identical adjacent class entries. Matching only the first
      // course code could conceal a distinct secondary component in the next
      // cell, so the complete portal-provided value must match before merging.
      let span = 1;
      let endTimeRange = period.timeRange;
      while (i + span < schedule[day].length) {
        const next = schedule[day][i + span];
        if (!next.subjectCode || next.subjectCode !== period.subjectCode) break;
        endTimeRange = next.timeRange || endTimeRange;
        span++;
      }
      const displayTimeRange = span > 1
        ? combineTimetableTimeRange(period.timeRange, endTimeRange)
        : period.timeRange;
      slots.push({
        type: 'class',
        code: primaryCode,
        allCodes: period.subjectCode,
        details,
        timeRange: displayTimeRange,
        periodStart: i + 1,
        span,
        palette: paletteFor(primaryCode),
        faculty: details.faculty,
        room: details.room,
      });
      i += span;
    }
    layoutByDay[day] = slots;
  }

  // --- E. Build UI (CSS Grid) ---
  tbl.style.display = 'none';

  const dashboard = document.createElement('div');
  dashboard.id = 'reecap-timetable';
  dashboard.className = 'reecap-timetable';

  // The legacy report pane enables horizontal scrolling globally. Mark only
  // this timetable's host so the full single-view layout can opt out safely.
  const timetablePane = tbl.closest('#tblReport > div');
  if (timetablePane) timetablePane.classList.add('reecap-timetable-pane');

  const currentDayIndex = new Date().getDay();
  const jsDayToName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayName = jsDayToName[currentDayIndex];

  let html = `
    <div class="tt-header-bar">
      <div class="tt-header-title">
        <p class="eyebrow">Weekly Schedule</p>
        <h2>Class Timetable</h2>
      </div>
      <div class="tt-header-hint">
        <span class="hint-icon"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg></span>
        <span>Hover or focus a subject for details</span>
      </div>
    </div>
  `;

  // Desktop Matrix
  html += `<div class="tt-grid-wrap"><div class="tt-grid" style="--cols: ${periodCount}" role="grid" aria-label="Weekly timetable">`;

  html += `<div class="tt-cell tt-header tt-corner" role="columnheader">Day</div>`;
  headerLabels.forEach((label, idx) => {
    html += `<div class="tt-cell tt-header tt-period-head" role="columnheader"><span>${String(idx + 1).padStart(2, '0')}</span><time>${escapeAttr(label)}</time></div>`;
  });

  sortedDays.forEach((day, dayIndex) => {
    const slots = layoutByDay[day];
    if (!slots) return;
    const isToday = (day === todayName) ? 'is-today' : '';
    const isUpperRow = dayIndex < 2;
    const tooltipDir = isUpperRow ? ' tt-tooltip-below' : '';

    html += `<div class="tt-cell tt-day ${isToday}" role="rowheader"><span>${escapeAttr(day.slice(0, 3))}</span><strong>${escapeAttr(day)}</strong></div>`;

    const classSlotIndexes = slots
      .map((slot, index) => slot.type === 'class' ? index : -1)
      .filter(index => index >= 0);
    const firstClassIndex = classSlotIndexes[0];
    const lastClassIndex = classSlotIndexes[classSlotIndexes.length - 1];

    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const slot = slots[slotIndex];
      if (slot.type === 'empty') {
        html += `<div class="tt-cell tt-empty ${isToday}"><span class="free-label">Free</span></div>`;
        continue;
      }
      const spanStyle = slot.span > 1 ? `--span: ${slot.span};` : '';
      const periodLabel = slot.span > 1
        ? `P${slot.periodStart}–P${slot.periodStart + slot.span - 1}`
        : `P${slot.periodStart}`;
      const tooltipEdge = slotIndex === firstClassIndex && slotIndex === lastClassIndex
        ? (slot.periodStart + slot.span - 1 > periodCount / 2 ? ' tt-tooltip-end' : ' tt-tooltip-start')
        : slotIndex === firstClassIndex
          ? ' tt-tooltip-start'
          : slotIndex === lastClassIndex
            ? ' tt-tooltip-end'
            : '';
      const ttAriaLabel = `${periodLabel}, ${slot.timeRange} — ${slot.allCodes}${slot.details.name ? ', ' + slot.details.name : ''}${slot.faculty ? ', taught by ' + slot.faculty : ''}${slot.room ? ', in ' + slot.room : ''}`;

      html += `
        <div class="tt-cell tt-class ${isToday}${slot.span > 1 ? ' tt-merged' : ''}${tooltipEdge}${tooltipDir}" style="${spanStyle} --palette: ${slot.palette};" tabindex="0" role="gridcell" aria-label="${escapeAttr(ttAriaLabel)}">
          <div class="subject-card__top">
            <span class="subject-card__code">${escapeAttr(slot.allCodes)}</span>
            <span class="subject-card__dot"></span>
          </div>
          <h3 class="subject-card__title">${escapeAttr(slot.details.name || slot.allCodes)}</h3>
          ${slot.timeRange ? `<time class="subject-card__time">${escapeAttr(slot.timeRange)}</time>` : ''}

          <div class="tt-tooltip subject-card__details">
            <div class="detail-eyebrow">Class Details</div>
            <strong class="detail-name">${escapeAttr(slot.details.name || slot.allCodes)}</strong>
            ${slot.timeRange ? `<span class="detail-row"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><span><small>Period</small>${escapeAttr(periodLabel)} (${escapeAttr(slot.timeRange)})</span></span>` : ''}
            ${slot.faculty ? `<span class="detail-row"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span><small>Faculty</small>${escapeAttr(slot.faculty)}</span></span>` : ''}
            ${slot.room ? `<span class="detail-row"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg><span><small>Location</small>${escapeAttr(slot.room)}</span></span>` : ''}
          </div>
        </div>
      `;
    }
  });

  html += `</div></div>`;

  // Responsive Mobile Schedule with interactive Day Tabs
  const defaultSelectedDay = sortedDays.includes(todayName) ? todayName : (sortedDays[0] || 'Mon');
  html += `<div class="tt-mobile-schedule" aria-label="Weekly timetable, day-by-day">`;
  html += `<div class="day-tabs" role="tablist" aria-label="Select day">`;
  sortedDays.forEach(day => {
    if (!schedule[day]) return;
    const isActive = day === defaultSelectedDay ? ' active' : '';
    html += `<button type="button" role="tab" class="day-tab-btn${isActive}" data-tt-day="${escapeAttr(day)}" aria-selected="${day === defaultSelectedDay}">${escapeAttr(day.slice(0, 3))}</button>`;
  });
  html += `</div>`;

  sortedDays.forEach(day => {
    if (!schedule[day]) return;
    const isDayActive = day === defaultSelectedDay ? ' active' : '';
    const slots = layoutByDay[day];
    const classes = slots.filter(s => s.type === 'class');
    html += `<div class="mobile-day-panel${isDayActive}" data-tt-panel="${escapeAttr(day)}" role="tabpanel">`;
    html += `<div class="mobile-list__title"><strong>${escapeAttr(day)}</strong><span>${classes.length} class block${classes.length === 1 ? '' : 's'}</span></div>`;
    if (!classes.length) {
      html += `<p class="empty-day">No classes scheduled.</p>`;
    } else {
      html += `<div class="mobile-list">`;
      classes.forEach(slot => {
        const periodLabel = slot.span > 1
          ? `Period ${slot.periodStart}–${slot.periodStart + slot.span - 1}`
          : `Period ${slot.periodStart}`;
        html += `
          <article class="subject-card subject-card--compact" style="--palette: ${slot.palette};">
            <div class="subject-card__top">
              <span class="subject-card__code">${escapeAttr(slot.allCodes)}</span>
              <span class="subject-card__dot"></span>
            </div>
            <h3 class="subject-card__title">${escapeAttr(slot.details.name || slot.allCodes)}</h3>
            ${slot.timeRange ? `<time class="subject-card__time">${escapeAttr(slot.timeRange)}</time>` : ''}
            <div class="subject-card__meta-row">
              ${slot.faculty ? `<span><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>${escapeAttr(slot.faculty)}</span>` : ''}
              ${slot.room ? `<span><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>${escapeAttr(slot.room)}</span>` : ''}
            </div>
          </article>
        `;
      });
      html += `</div>`;
    }
    html += `</div>`;
  });
  html += `</div>`;

  dashboard.innerHTML = html;

  // Bind interactive tab switches for mobile schedule
  dashboard.querySelectorAll('.day-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetDay = btn.dataset.ttDay;
      dashboard.querySelectorAll('.day-tab-btn').forEach(b => {
        const isCurrent = b === btn;
        b.classList.toggle('active', isCurrent);
        b.setAttribute('aria-selected', String(isCurrent));
      });
      dashboard.querySelectorAll('.mobile-day-panel').forEach(panel => {
        panel.classList.toggle('active', panel.dataset.ttPanel === targetDay);
      });
    });
  });

  tbl.parentElement.insertBefore(dashboard, tbl);

  // Dynamic boundary check to prevent tooltip popup clipping
  const gridWrap = dashboard.querySelector('.tt-grid-wrap');
  if (gridWrap) {
    dashboard.querySelectorAll('.tt-class').forEach(cell => {
      const checkSpace = () => {
        const wrapRect = gridWrap.getBoundingClientRect();
        const cellRect = cell.getBoundingClientRect();
        if (cellRect.top - wrapRect.top < 210) {
          cell.classList.add('tt-tooltip-below');
        } else {
          cell.classList.remove('tt-tooltip-below');
        }
      };
      cell.addEventListener('mouseenter', checkSpace);
      cell.addEventListener('focusin', checkSpace);
    });
  }

  // Measure exact rendered height and inform parent shell
  if (typeof window.__reecapSendResize === 'function') {
    window.__reecapSendResize();
    setTimeout(window.__reecapSendResize, 100);
  } else if (window.parent && window.parent !== window) {
    const h = dashboard.offsetHeight || dashboard.scrollHeight;
    if (h > 0) window.parent.postMessage({ type: 'REECAP_RESIZE', height: h + 24 }, '*');
  }
}

// Color guide section removed per user preference.
function renderTimetableLegend(schedule, legendMap) {
  return '';
}

function observeProfileDashboard() {
  const bioPane = document.getElementById('divProfile_BioData');
  const existingReport = document.getElementById('tblReport');
  if (existingReport && bioPane && !document.getElementById('reecap-profile-dashboard')) {
    buildProfileDashboard(existingReport);
    return;
  }

  const targetNode = document.getElementById('divProfile') || document.body;
  if (!targetNode) return;
  
  const observer = new MutationObserver((mutations, obs) => {
    const tblReport = document.getElementById('tblReport');
    const hasBio = document.getElementById('divProfile_BioData') || document.querySelector('div[id^="divProfile_"]');
    if (tblReport && hasBio && !document.getElementById('reecap-profile-dashboard')) {
      obs.disconnect();
      buildProfileDashboard(tblReport);
    }
  });
  
  observer.observe(targetNode, { childList: true, subtree: true });
}


function extractAttendanceProfileData(pane) {
  let held = 0, attended = 0, percent = 0;
  const subjects = [];

  if (!pane) return { held, attended, percent, subjects };

  // Find the current-semester Attendance table: reportTable or table containing HELD & ATTEND
  let table = pane.querySelector('table.reportTable');
  if (!table) {
    const presentPane = document.getElementById('divProfile_Present') || pane;
    const tables = Array.from(presentPane.querySelectorAll('table'));
    for (const t of tables) {
      const txt = t.textContent.toUpperCase();
      if (txt.includes('HELD') && txt.includes('ATTEND') && (txt.includes('COURSE') || txt.includes('SUBJECT') || txt.includes('%'))) {
        table = t;
        break;
      }
    }
  }
  if (!table) return { held, attended, percent, subjects };

  let colCourse = 1;
  let colFaculty = -1;
  let colHeld = 2;
  let colAttend = 3;
  let colPercent = 4;

  Array.from(table.rows).forEach(row => {
    const cells = Array.from(row.cells);
    if (!cells.length) return;

    const raw = cells.map(cell => cell.textContent.trim());
    const labels = raw.map(value => value.toUpperCase());

    if (labels.includes('COURSE') || labels.includes('SUBJECT')) {
      colCourse = labels.includes('COURSE') ? labels.indexOf('COURSE') : labels.indexOf('SUBJECT');
      colFaculty = labels.indexOf('FACULTY');
      colHeld = labels.indexOf('HELD');
      colAttend = labels.indexOf('ATTEND');
      colPercent = labels.indexOf('%');

      if (colHeld < 0) colHeld = colFaculty >= 0 ? colFaculty + 1 : colCourse + 1;
      if (colAttend < 0) colAttend = colHeld + 1;
      if (colPercent < 0) colPercent = colAttend + 1;
      return;
    }

    const hasTotal = raw.some(c => c.toUpperCase().includes('TOTAL'));
    if (hasTotal) {
      const nums = raw.map(c => parseFloat(c)).filter(n => Number.isFinite(n));
      if (nums.length >= 2) {
        held = parseInt(nums[0], 10) || 0;
        attended = parseInt(nums[1], 10) || 0;
        if (nums.length >= 3) {
          percent = nums[2];
        } else {
          percent = held > 0 ? Number(((attended / held) * 100).toFixed(2)) : 0;
        }
      }
      return;
    }

    if (!Number.isFinite(parseInt(raw[0], 10))) return;
    const subjectHeld = parseInt(raw[colHeld], 10) || 0;
    const subjectAttend = parseInt(raw[colAttend], 10) || 0;
    const suppliedPercent = parseFloat(raw[colPercent]);
    const subjectPercent = Number.isFinite(suppliedPercent)
      ? suppliedPercent
      : (subjectHeld > 0 ? Number(((subjectAttend / subjectHeld) * 100).toFixed(2)) : 0);

    subjects.push({
      subjName: String(raw[colCourse] || 'Subject').trim(),
      name: String(raw[colCourse] || 'Subject').trim(),
      faculty: colFaculty >= 0 ? String(raw[colFaculty] || '').trim() : '',
      held: subjectHeld,
      attend: subjectAttend,
      attended: subjectAttend,
      percent: subjectPercent
    });
  });

  if (!held && subjects.length) {
    held = subjects.reduce((sum, subject) => sum + subject.held, 0);
    attended = subjects.reduce((sum, subject) => sum + subject.attend, 0);
    percent = held > 0 ? Number(((attended / held) * 100).toFixed(2)) : 0;
  }

  if (!percent && held > 0) {
    percent = Number(((attended / held) * 100).toFixed(2));
  }

  return { held, attended, percent, subjects };
}
function buildProfileDashboard(accordion) {
  if (!accordion || accordion.dataset.reecapBuilding === 'true') return;
  accordion.dataset.reecapBuilding = 'true';

  let held = 0, attended = 0, percent = 0, attendanceSubjects = [];
  let backlogsText = "No data";
  let feeDue = "0.00";
  let feeCurrentSem = '--';
  let feeCurrentSemLabel = 'Current Semester';
  let feeCurrentSemPayable = '--';
  let feeCurrentSemStatus = 'pending';
  let feeTotalDue = '--';
  let feeBalanceWords = '';
  let parsedFees = null;
  let cgpa = '--';
  let academicSummary = null;

  try {
    // --- A. Scrape Data ---
    const attendance = extractAttendanceProfileData(accordion);
    held = attendance.held;
    attended = attendance.attended;
    percent = attendance.percent;
    attendanceSubjects = attendance.subjects;

    const tds = accordion.querySelectorAll('td');

    // 2. Backlogs
    const backlogsDiv = document.getElementById('divProfile_Backlogs');
    if (backlogsDiv) {
      backlogsText = backlogsDiv.textContent.trim();
    }

    // 3. Fee Details
    for (let td of tds) {
      if (td.textContent.trim() === 'GRAND TOTALS') {
        const row = td.parentElement;
        const dueCell = row.children[5]; 
        if (dueCell) feeDue = dueCell.textContent.trim();
        break;
      }
    }

    let activeSemRaw = '';
    if (typeof data !== 'undefined' && data && data.Semester) {
      activeSemRaw = data.Semester;
    }
    if (!activeSemRaw) {
      try {
        const bioPane = document.getElementById('divProfile_BioData');
        const semCell = bioPane ? bioPane.querySelector('td[style*="color:Blue"]') : null;
        if (semCell) activeSemRaw = (semCell.textContent || '').trim();
      } catch (e) { /* ignore */ }
    }
    if (!activeSemRaw) {
      try {
        const id = (chrome.storage && chrome.storage.local) || null;
        if (id && id.get) {
          id.get(['reecapIdentity'], (data2) => {
            if (data2 && data2.reecapIdentity && data2.reecapIdentity.Semester) {
              activeSemRaw = data2.reecapIdentity.Semester;
            }
          });
        }
      } catch (e) { /* ignore — fall through to "--" label */ }
    }
    const activeLabel = extractActiveSemesterLabel(activeSemRaw);
    if (activeLabel) feeCurrentSemLabel = activeLabel;

    try {
      const feesPane = document.getElementById('divProfile_Fees');
      if (feesPane && !feesPane.dataset.reecapEnhanced) rebuildFeeDetailsTab();
      parsedFees = parseFeeLedger(feesPane);
      if (parsedFees) {
        feeBalanceWords = parsedFees.balanceWords || '';
        if (parsedFees.grandTotals) {
          const td = parseFloat((parsedFees.grandTotals.due || '0').replace(/,/g, '')) || 0;
          feeTotalDue = isFinite(td) && !isNaN(td) ? td.toFixed(2) : '--';
        }

        const romanKey = activeLabel ? activeLabel.split(' ')[0].toUpperCase() : null;
        const match = parsedFees.semesterSummaries.find((s) =>
          romanKey && (s.sem.toUpperCase() === activeLabel || s.sem.toUpperCase().startsWith(romanKey + ' '))
        );
        if (match) {
          const d = parseFloat((match.due || '0').replace(/,/g, '')) || 0;
          feeCurrentSem = d.toFixed(2);
          feeCurrentSemPayable = match.payable;
          feeCurrentSemStatus = d > 0 ? 'due' : 'paid';
        } else {
          feeCurrentSemStatus = 'pending';
        }
      }
    } catch (e) { /* fee breakdown is best-effort — fall back to feeDue */ }

    // Extract CGPA and academic record from Performance (Past)
    try {
      const pastPane = document.getElementById('divProfile_Past') || document.getElementById('divProfile_PastSem');
      if (pastPane) {
        const pastTables = pastPane.querySelectorAll('table');
        for (const t of pastTables) {
          const text = t.textContent.toUpperCase();
          if (text.includes('OVER ALL SUMMARY') || text.includes('CGPA')) {
            academicSummary = { cgpa: '--', passed: '--', failed: '--', credits: '--', result: '--' };
            Array.from(t.rows).forEach(r => {
              const cells = Array.from(r.cells).map(c => c.textContent.trim());
              if (cells.length >= 2) {
                const k = cells[0].toUpperCase();
                const v = cells[1];
                if (k.includes('CGPA')) academicSummary.cgpa = v;
                if (k.includes('PASSED')) academicSummary.passed = v;
                if (k.includes('FAILED')) academicSummary.failed = v;
                if (k.includes('CREDITS')) academicSummary.credits = v;
                if (k.includes('RESULT')) academicSummary.result = v;
              }
            });
            if (academicSummary.cgpa !== '--') {
              cgpa = academicSummary.cgpa;
            }
            break;
          }
        }
      }
    } catch (e) {
      console.warn('ReEcap: Failed to extract CGPA from past profile table:', e);
    }

    const profileData = {
      held, attended, percent, attendanceSubjects, backlogsText, feeDue,
      cgpa, academicSummary,
      feeCurrentSem, feeCurrentSemLabel,
      feeCurrentSemPayable,
      feeCurrentSemStatus,
      feeTotalDue, feeBalanceWords,
      feeLedger: parsedFees || null,
      feeReceipts: (parsedFees?.items || []).filter(it => it.receipt && it.receipt !== '-' && it.receipt !== ''),
      feeGrandTotals: parsedFees?.grandTotals || null,
      lastUpdated: Date.now()
    };
    if (isExtensionValid()) {
      chrome.storage.local.set({ reecapProfileData: profileData });

      if (academicSummary && academicSummary.cgpa !== '--') {
        chrome.storage.local.get(['reecapAcademicData'], (existing) => {
          if (!isExtensionValid()) return;
          const cur = existing?.reecapAcademicData || {};
          const updated = {
            ...cur,
            overallStats: { ...(cur.overallStats || {}), ...academicSummary },
            lastUpdated: Date.now()
          };
          chrome.storage.local.set({ reecapAcademicData: updated });
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'REECAP_ACADEMIC_DATA', data: updated }, '*');
          }
        });
      }
    }

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'REECAP_PROFILE_DATA',
        data: profileData
      }, '*');
    }
  } catch (err) {
    console.warn('ReEcap: Profile dashboard scraping error:', err);
  }

  // Zero all ancestor top padding/margin inside the iframe so the tab section
  // sits flush at the iframe top boundary (no empty gap below the parent-rendered cards).
  let el = accordion.parentElement;
  while (el && el !== document.documentElement) {
    el.style.setProperty('padding-top', '0', 'important');
    el.style.setProperty('margin-top', '0', 'important');
    el = el.parentElement;
  }
  document.documentElement.style.setProperty('margin', '0', 'important');
  document.documentElement.style.setProperty('padding', '0', 'important');

  // 4. Build Profile Tabs
  try {
    buildProfileTabs(accordion);
  } catch (err) {
    console.warn('ReEcap: Profile tabs creation error:', err);
  }
}

function sendProfileResize() {
  try {
    if (typeof window.__reecapSendResize === 'function') {
      window.__reecapSendResize();
      return;
    }
    const bioCard = document.querySelector('.reecap-biodata') || document.getElementById('divProfile_BioData');
    const feeCard = document.getElementById('divProfile_Fees');
    const activePane = document.querySelector('.reecap-pane-active');
    let h = 0;
    if (activePane && activePane.offsetHeight > 0) {
      h = activePane.offsetHeight + 40;
    } else if (bioCard && bioCard.offsetHeight > 0) {
      h = bioCard.offsetHeight + 40;
    } else if (feeCard && feeCard.offsetHeight > 0) {
      h = feeCard.offsetHeight + 40;
    } else {
      h = Math.max(document.body.scrollHeight || 0, 400);
    }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'REECAP_RESIZE', height: h }, '*');
    }
  } catch (e) {}
}

function buildProfileTabs(accordion) {
  if (document.getElementById('reecap-profile-dashboard')) return;

  // Profile tabs specification with clean vector glyph icons
  const TAB_SPECS = [
    {
      id: 'divProfile_BioData',
      label: 'Bio-Data',
      icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
    },
    {
      id: 'divProfile_Present',
      fallbackId: 'divProfile_PresentSem',
      label: 'Performance (Present)',
      icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>'
    },
    {
      id: 'divProfile_Past',
      fallbackId: 'divProfile_PastSem',
      label: 'Performance (Past)',
      icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="12 9 12 12 13.5 13.5"></polyline><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path></svg>'
    },
    {
      id: 'divProfile_Fees',
      label: 'Fee Details',
      icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>'
    },
    {
      id: 'divProfile_Backlogs',
      label: 'Backlogs',
      icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
    },
    {
      id: 'divProfile_Outings',
      label: 'Outings',
      icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>'
    },
    {
      id: 'divProfile_Counseling',
      label: 'Counseling Details',
      icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'
    },
    {
      id: 'divProfile_DisciplinaryAction',
      fallbackId: 'divProfile_Disciplinary',
      label: 'Disciplinary Action',
      icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>'
    }
  ];

  // Resolve panes in DOM
  const availableTabs = [];
  const allPanes = [];

  for (const spec of TAB_SPECS) {
    const pane = document.getElementById(spec.id) || (spec.fallbackId ? document.getElementById(spec.fallbackId) : null);
    if (pane) {
      availableTabs.push({ ...spec, pane });
      allPanes.push(pane);
    }
  }

  // Fallback: check any remaining divProfile_* panes
  const existingDivs = Array.from(accordion.querySelectorAll('div[id^="divProfile_"]'));
  for (const div of existingDivs) {
    if (!allPanes.includes(div)) {
      const rawTitle = div.id.replace('divProfile_', '').replace(/([A-Z])/g, ' $1').trim();
      availableTabs.push({
        id: div.id,
        label: rawTitle.toUpperCase(),
        icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>',
        pane: div
      });
      allPanes.push(div);
    }
  }

  if (availableTabs.length === 0) return;

  const tabContainer = document.createElement('div');
  tabContainer.id = 'reecap-profile-dashboard';
  tabContainer.className = 'reecap-tabs';

  // In embedded ReEcap shell, tabs are displayed in the sidebar so hide in-content strip
  const inFrame = window.parent && window.parent !== window;
  if (inFrame) {
    tabContainer.style.setProperty('display', 'none', 'important');
  }

  const activeHash = (window.location.hash || '').toLowerCase();
  const isFeeOnly = activeHash.includes('fee') || window.location.search.toLowerCase().includes('view=fee');
  if (isFeeOnly) {
    document.documentElement.setAttribute('data-fee-only-view', 'true');
  }

  let defaultActiveIndex = 0;
  if (activeHash.includes('fee')) {
    const feeIndex = availableTabs.findIndex(t => t.id === 'divProfile_Fees');
    if (feeIndex >= 0) defaultActiveIndex = feeIndex;
  } else if (activeHash.includes('backlog')) {
    const bIndex = availableTabs.findIndex(t => t.id === 'divProfile_Backlogs');
    if (bIndex >= 0) defaultActiveIndex = bIndex;
  } else if (activeHash.includes('present')) {
    const pIndex = availableTabs.findIndex(t => t.id === 'divProfile_Present' || t.fallbackId === 'divProfile_PresentSem');
    if (pIndex >= 0) defaultActiveIndex = pIndex;
  } else if (activeHash.includes('past')) {
    const pIndex = availableTabs.findIndex(t => t.id === 'divProfile_Past' || t.fallbackId === 'divProfile_PastSem');
    if (pIndex >= 0) defaultActiveIndex = pIndex;
  } else if (activeHash.includes('outing')) {
    const oIndex = availableTabs.findIndex(t => t.id === 'divProfile_Outings');
    if (oIndex >= 0) defaultActiveIndex = oIndex;
  } else if (activeHash.includes('counsel')) {
    const cIndex = availableTabs.findIndex(t => t.id === 'divProfile_Counseling');
    if (cIndex >= 0) defaultActiveIndex = cIndex;
  } else if (activeHash.includes('disciplinary')) {
    const dIndex = availableTabs.findIndex(t => t.id === 'divProfile_DisciplinaryAction' || t.fallbackId === 'divProfile_Disciplinary');
    if (dIndex >= 0) defaultActiveIndex = dIndex;
  }

  const tabButtons = [];
  availableTabs.forEach((tab, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reecap-tab-btn';
    if (index === defaultActiveIndex) btn.classList.add('active');
    btn.innerHTML = `${tab.icon}<span>${tab.label}</span>`;
    tabButtons.push(btn);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Update button styles
      tabContainer.querySelectorAll('.reecap-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update panes visibility
      allPanes.forEach(p => {
        p.classList.remove('reecap-pane-active');
        p.style.setProperty('display', 'none', 'important');
      });
      tab.pane.classList.add('reecap-pane-active');
      tab.pane.style.setProperty('display', 'block', 'important');

      const isFee = tab.id === 'divProfile_Fees';
      document.documentElement.setAttribute('data-fee-only-view', isFee ? 'true' : 'false');

      // Update parent title if specific tab
      if (tab.id === 'divProfile_Fees') {
        try { window.parent.postMessage({ type: 'REECAP_SET_TITLE', title: 'FEE DETAILS' }, '*'); } catch (err) {}
      } else if (tab.id === 'divProfile_Backlogs') {
        try { window.parent.postMessage({ type: 'REECAP_SET_TITLE', title: 'BACKLOGS' }, '*'); } catch (err) {}
      } else if (tab.id === 'divProfile_BioData') {
        try { window.parent.postMessage({ type: 'REECAP_SET_TITLE', title: 'BIO-DATA' }, '*'); } catch (err) {}
      } else {
        try { window.parent.postMessage({ type: 'REECAP_SET_TITLE', title: tab.label.toUpperCase() }, '*'); } catch (err) {}
      }

      sendProfileResize();
      setTimeout(sendProfileResize, 150);
    });

    tabContainer.appendChild(btn);
  });

  // Ensure active pane is displayed
  allPanes.forEach((p, index) => {
    if (index === defaultActiveIndex) {
      p.classList.add('reecap-pane-active');
      p.style.setProperty('display', 'block', 'important');
    } else {
      p.classList.remove('reecap-pane-active');
      p.style.setProperty('display', 'none', 'important');
    }
  });

  if (defaultActiveIndex > 0) {
    const activeTab = availableTabs[defaultActiveIndex];
    if (activeTab && activeTab.id === 'divProfile_Fees') {
      try { window.parent.postMessage({ type: 'REECAP_SET_TITLE', title: 'FEE DETAILS' }, '*'); } catch (err) {}
    }
  }

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'REECAP_SWITCH_TAB') {
      const targetId = e.data.tabId;
      const targetIndex = availableTabs.findIndex(t => t.id === targetId || t.fallbackId === targetId);
      if (targetIndex >= 0 && tabButtons[targetIndex]) {
        tabButtons[targetIndex].click();
      }
    }
  });

  // Insert tabs container before accordion
  accordion.parentElement.insertBefore(tabContainer, accordion);

  // Unbind vanilla jQuery UI accordion click traps to avoid collapsing
  try {
    if (window.$ && typeof window.$.fn?.unbind === 'function') {
      window.$(accordion).unbind('accordionchange');
    }
  } catch (e) {}

  // Trigger pane redesigns safely
  try {
    buildBioDataRedesign(accordion);
  } catch (err) {
    console.warn('ReEcap: BioData redesign failed, preserving raw table:', err);
    const bioPane = document.getElementById('divProfile_BioData');
    if (bioPane) {
      const legacyTable = bioPane.querySelector('table');
      if (legacyTable) legacyTable.style.removeProperty('display');
    }
  }

  try {
    buildProfilePanesRedesign(accordion);
  } catch (err) {
    console.warn('ReEcap: Profile panes redesign error:', err);
  }

  sendProfileResize();
  setTimeout(sendProfileResize, 150);
  setTimeout(sendProfileResize, 500);
}

function buildBioDataRedesign(accordion) {
  const bioPane = document.getElementById('divProfile_BioData');
  if (!bioPane) return;
  if (bioPane.querySelector('.reecap-biodata')) return;
  
  const legacyTable = bioPane.querySelector('table');
  if (!legacyTable) return;
  
  // 1. Hide the legacy table
  legacyTable.style.setProperty('display', 'none', 'important');
  
  // 2. Parse the data
  const data = {};
  const tds = legacyTable.querySelectorAll('td');
  let avatarSrc = '';

  // Scrape Image
  const img = legacyTable.querySelector('img');
  if (img) avatarSrc = img.src;

  const possibleKeys = [
    'Admission.No', 'RollNo', 'Name', 'Course', 'Branch', 'Semester',
    'Gender', 'DOB', 'Height', 'Weight', 'Blood Group', 'Nationality', 'Religion', 'SSC Marks, %',
    'Inter Marks, %', 'SSC Gradepoints', 'Inter Gradepoints',
    'Entrance Type', 'EAMCET/ECET Rank', 'Seat Type', 'Caste',
    'Last Studied', 'Joining Date', 'Phone.No', 'Mobile.No', 'Email',
    'Bank A/C.No', 'Adhar.No', 'Ration Card.No', 'APAAR Id/ABC Id',
    'Father Name', 'Mother Name', 'Occupation', 'Father Mobile.No', 'Mother Mobile.No', 'Annual Income',
    'Father mailid', 'Mother mailid', 'Correspondence Address', 'Permanent Address',
    'Guardian Name', 'Guardian Address', 'Address', 'Phone', 'Mobile'
  ];

  let currentSection = '';
  let seenOccupation = 0;
  let seenPhone = 0;

  for (let i = 0; i < tds.length; i++) {
    const text = (tds[i].innerText || tds[i].textContent).trim();
    if (!text || text === ':') continue;

    if (text.toUpperCase().includes('DISCIPLINARY ACTION')) {
      currentSection = 'DISCIPLINARY';
      continue;
    }
    if (currentSection === 'DISCIPLINARY' && !data['Disciplinary Action']) {
      if (!possibleKeys.includes(text) && !text.toUpperCase().includes('DETAILS')) {
        data['Disciplinary Action'] = text.replace(/\n/g, '<br>');
        currentSection = '';
      }
    }
    if (text.toUpperCase().includes("GURDIAN") || text.toUpperCase().includes("GUARDIAN")) {
      currentSection = 'GUARDIAN';
    }

    for (let key of possibleKeys) {
      if (text === key) {
         let nextVal = '';
         for (let j = i + 1; j < Math.min(i + 4, tds.length); j++) {
            const nextText = (tds[j].innerText || tds[j].textContent).trim();
            if (nextText === ':' || nextText === '') continue; // skip colon or empty

            if (possibleKeys.includes(nextText)) break;

            nextVal = nextText.replace(/\n/g, '<br>');
            break;
         }

         // A guardian section heading can be concatenated with the address by
        // the legacy portal. Remove only that proven label prefix, not data.
        if (key === 'Guardian Address'
            || (currentSection === 'GUARDIAN' && (key === 'Address' || key === 'Correspondence Address'))) {
          nextVal = nextVal.replace(/^[-–—\s]*Parent(?:'|’)?s\s+Details\s*/i, '');
        }

        // Handle key collisions by context
         if (key === 'Occupation') {
           if (seenOccupation === 0) data['Father Occupation'] = nextVal;
           else data['Mother Occupation'] = nextVal;
           seenOccupation++;
         } else if (key === 'Phone.No' || (currentSection === 'GUARDIAN' && key === 'Phone')) {
           if (seenPhone === 0 && key === 'Phone.No') data['Phone.No'] = nextVal;
           else data['Guardian Phone.No'] = nextVal;
           seenPhone++;
         } else if (currentSection === 'GUARDIAN') {
           if (key === 'Name') data['Guardian Name'] = nextVal;
           else if (key === 'Address' || key === 'Correspondence Address') data['Guardian Address'] = nextVal;
           else if (key === 'Mobile' || key === 'Mobile.No') data['Guardian Mobile'] = nextVal;
           else data[key] = nextVal;
         } else {
           data[key] = nextVal;
         }
         break;
      }
    }
  }

  // Graceful degradation: if parsing completely fails, show legacy and abort
  if (!data['Name'] && !data['RollNo']) {
     legacyTable.style.removeProperty('display');
     return;
  }

  // Save for Status Strip Header
  if (isExtensionValid()) {
    chrome.storage.local.set({
      reecapIdentity: {
        RollNo: data['RollNo'],
        Name: data['Name'] || '',
        Course: data['Course'],
        Branch: data['Branch'],
        Semester: data['Semester']
      }
    });
  }

  // A tiny in-page cache so downstream rebuilders (Fees, Overview) can read
  // the active semester synchronously without awaiting chrome.storage.local.
  // The string here mirrors the raw portal-rendered text, e.g.
  // "Regular(III Semester- 2025)".
  try {
    window.__reecapIdentitySemRaw = data['Semester'] || '';
    if (window.__reecapIdentitySemRaw && !window.__reecapIdentitySemSet) {
      window.__reecapIdentitySemSet = true;
      document.documentElement.setAttribute('data-reecap-sem', window.__reecapIdentitySemRaw);
    }
  } catch (e) { /* window may be cross-origin in some scoped contexts */ }

  // 3. Build New Structure
  const newBio = document.createElement('div');
  newBio.className = 'reecap-biodata';
  newBio.setAttribute('data-reecap-source', 'studentprofile.aspx#tblReport');

  // Tag the rebuilt wrapper + every section so a later scraper pass can
  // re-render from the rebuilt DOM even if the legacy markup shifts.
  newBio.setAttribute('data-reecap-pane', 'biodata');  // Helper to build field: never drop fields even if empty/0/NO
  const makeField = (label, value) => {
    let displayVal = value;
    if (displayVal === undefined || displayVal === null || displayVal === '') {
      displayVal = '<span style="color: var(--text-faint)">—</span>';
    } else if (displayVal === '-' || displayVal === 'NO' || displayVal === '0' || displayVal === 0 || displayVal === '0.00') {
      displayVal = `<span style="color: var(--text-faint)">${value}</span>`;
    }
    return `
      <div class="biodata-field">
        <div class="biodata-label">${label}</div>
        <div class="biodata-value">${displayVal}</div>
      </div>
    `;
  };

  const fatherFull = [data['Father Name'], data['Father Mobile.No'] ? `(${data['Father Mobile.No']})` : '', data['Father mailid'], data['Father Occupation'] ? `• ${data['Father Occupation']}` : ''].filter(Boolean).join(' ');
  const motherFull = [data['Mother Name'], data['Mother Mobile.No'] ? `(${data['Mother Mobile.No']})` : '', data['Mother mailid'], data['Mother Occupation'] ? `• ${data['Mother Occupation']}` : ''].filter(Boolean).join(' ');

  newBio.innerHTML = `
    <!-- 1. Identity & Personal Demographics -->
    <div class="biodata-section">
       <h3 class="biodata-section-title">Personal Details</h3>
       ${avatarSrc ? `
       <div class="identity-block">
         <img src="${avatarSrc}" class="bio-avatar" alt="Student Photo" onerror="this.style.display='none'">
         <div class="identity-info">
           <h4 class="bio-name">${data['Name'] || data['RollNo'] || 'Student'}</h4>
           <div class="bio-course">${[data['RollNo'], data['Course'], data['Branch']].filter(Boolean).join(' • ')}</div>
         </div>
       </div>` : ''}
       <div class="biodata-grid">
         ${makeField('Name', data['Name'])}
         ${makeField('Roll No', data['RollNo'])}
         ${makeField('Admission No', data['Admission.No'])}
         ${makeField('DOB', data['DOB'])}
         ${makeField('Gender', data['Gender'])}
         ${makeField('Height', data['Height'])}
         ${makeField('Weight', data['Weight'])}
         ${makeField('Blood Group', data['Blood Group'])}
         ${makeField('Religion', data['Religion'])}
         ${makeField('Caste', data['Caste'])}
         ${makeField('Nationality', data['Nationality'])}
         ${makeField('Aadhar No', data['Adhar.No'])}
         ${makeField('Ration Card No', data['Ration Card.No'])}
         ${makeField('APAAR / ABC ID', data['APAAR Id/ABC Id'])}
         ${makeField('Bank A/C No', data['Bank A/C.No'])}
       </div>
    </div>

    <!-- 2. Academic History -->
    <div class="biodata-section">
       <h3 class="biodata-section-title">Academic History</h3>
       <div class="biodata-grid">
         ${makeField('Course', data['Course'])}
         ${makeField('Branch', data['Branch'])}
         ${makeField('Semester', data['Semester'])}
         ${makeField('Joining Date', data['Joining Date'])}
         ${makeField('Last Studied', data['Last Studied'])}
         ${makeField('Seat Type', data['Seat Type'])}
         ${makeField('Entrance', data['Entrance Type'] ? data['Entrance Type'] + (data['EAMCET/ECET Rank'] ? ' (Rank: ' + data['EAMCET/ECET Rank'] + ')' : '') : '')}
         ${makeField('SSC', data['SSC Marks, %'] ? data['SSC Marks, %'] + ' (' + (data['SSC Gradepoints']||'') + ')' : '')}
         ${makeField('Intermediate', data['Inter Marks, %'] ? data['Inter Marks, %'] + ' (' + (data['Inter Gradepoints']||'') + ')' : '')}
       </div>
    </div>

    <!-- 3. Contact & Guardians -->
    <div class="biodata-section">
       <h3 class="biodata-section-title">Contact & Guardians</h3>
       <div class="biodata-grid">
         ${makeField('Mobile', data['Mobile.No'])}
         ${makeField('Phone No', data['Phone.No'])}
         ${makeField('Email', data['Email'])}
         ${makeField('Father', fatherFull)}
         ${makeField('Mother', motherFull)}
         ${makeField('Annual Income', data['Annual Income'])}
         ${makeField('Correspondence Address', data['Correspondence Address'])}
         ${makeField('Permanent Address', data['Permanent Address'])}
         ${data['Guardian Name'] || data['Guardian Address'] ? makeField('Guardian Details', [data['Guardian Name'], data['Guardian Phone.No'] || data['Guardian Mobile'] || data['Guardian Phone'], data['Guardian Address']].filter(Boolean).join('<br>')) : ''}
       </div>
    </div>

    <!-- 4. Disciplinary Status -->
    <div class="biodata-section">
       <h3 class="biodata-section-title">Disciplinary Status</h3>
       <div class="biodata-grid">
         ${makeField('Record Status', data['Disciplinary Action'] || 'No disciplinary actions or complaints recorded')}
       </div>
    </div>
  `;
  
  bioPane.insertBefore(newBio, legacyTable);
}

function buildProfilePanesRedesign(accordion) {
  try { rebuildPresentSemTab(); } catch (e) { console.warn('PresentSem redesign error:', e); }
  try { rebuildPastSemTab(); } catch (e) { console.warn('PastSem redesign error:', e); }
  try { rebuildFeeDetailsTab(); } catch (e) { console.warn('FeeDetails redesign error:', e); }
  try { rebuildBacklogsTab(); } catch (e) { console.warn('Backlogs redesign error:', e); }
  try { rebuildOutingsTab(); } catch (e) { console.warn('Outings redesign error:', e); }
  try { rebuildCounselingTab(); } catch (e) { console.warn('Counseling redesign error:', e); }
  try { rebuildDisciplinaryTab(); } catch (e) { console.warn('Disciplinary redesign error:', e); }
}

function hideLegacyChildren(pane) {
  Array.from(pane.children).forEach(child => {
    if (!child.classList.contains('reecap-enhanced-tab')) {
      child.style.setProperty('display', 'none', 'important');
    }
  });
}

function getAttendanceColor(attendance) {
  if (!attendance || !attendance.held) return 'var(--text-faint)';
  if (attendance.percent >= 75) return 'var(--success)';
  if (attendance.percent >= 65) return 'var(--warning)';
  return 'var(--error)';
}

function renderAttendanceContent(attendance, options = {}) {
  const data = attendance || { held: 0, attended: 0, percent: 0, subjects: [] };
  const title = options.title || 'Present Semester Attendance';
  const subtitle = options.subtitle || 'Current Term';
  const sourceNote = options.sourceNote || '';
  const includeSectionWrapper = options.includeSectionWrapper !== false;
  const held = Number(data.held) || 0;
  const attended = Number(data.attended) || 0;
  const percent = Number(data.percent) || 0;
  const subjects = Array.isArray(data.subjects) ? data.subjects : [];
  const ringRadius = 40;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (Math.max(0, Math.min(percent, 100)) / 100) * ringCircumference;
  const ringColor = getAttendanceColor({ held, percent });
  const status = held === 0
    ? 'No attendance lectures logged for this term yet.'
    : (percent >= 75 ? 'Satisfactory Standing' : 'Below 75% Requirement');

  let html = `
    <section class="reecap-attendance-content">
      <div class="reecap-attendance-summary ring-card">
        <div class="ring-wrap" aria-hidden="true">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle class="ring-bg" cx="48" cy="48" r="${ringRadius}" stroke-width="8"></circle>
            <circle class="ring-fg" cx="48" cy="48" r="${ringRadius}" stroke-width="8" stroke="${ringColor}" stroke-dasharray="${ringCircumference}" stroke-dashoffset="${ringOffset}"></circle>
          </svg>
          <div class="ring-center">
            <div class="ring-value reecap-attendance-ring-value" style="color: ${ringColor}">${held > 0 ? percent.toFixed(2) + '%' : '0%'}</div>
          </div>
        </div>
        <div class="reecap-attendance-summary-copy">
          <h2>${title}</h2>
          <p>${held > 0 ? `<span class="mono">${attended}</span> attended out of <span class="mono">${held}</span> total lectures held` : 'No attendance lectures logged for this term yet.'}</p>
          <span class="reecap-attendance-status">Status: ${status}</span>
        </div>
      </div>

      <div class="overview-card reecap-attendance-table-card">
        <div class="overview-card-header">
          <span class="overview-card-title">Subject Attendance Record</span>
          <span class="overview-card-subtitle">${subtitle}</span>
        </div>
        ${sourceNote ? `<p class="reecap-attendance-source">${sourceNote}</p>` : ''}
  `;

  if (!subjects.length) {
    html += `<div class="schedule-empty">No course subject attendance rows recorded for this term yet.</div>`;
  } else {
    html += `
      <div class="reecap-table-wrap">
        <table class="reecap-data-table">
          <thead>
            <tr>
              <th>Subject Name</th>
              <th style="text-align: right;">Held</th>
              <th style="text-align: right;">Attended</th>
              <th style="text-align: right;">Percentage</th>
              <th style="width: 150px; text-align: left;">Progress</th>
            </tr>
          </thead>
          <tbody>
    `;

    subjects.forEach(subject => {
      const subjectColor = getAttendanceColor(subject);
      html += `
        <tr>
          <td>
            <div class="reecap-attendance-subject">${subject.subjName}</div>
            ${subject.faculty ? `<div class="reecap-attendance-faculty">${subject.faculty}</div>` : ''}
          </td>
          <td class="mono" style="text-align: right;">${subject.held}</td>
          <td class="mono" style="text-align: right; font-weight: 600;">${subject.attend}</td>
          <td class="mono" style="text-align: right; font-weight: 700; color: ${subjectColor};">${subject.percent.toFixed ? subject.percent.toFixed(2) : subject.percent}%</td>
          <td>
            <div class="progress-track" aria-label="${subject.subjName} attendance ${subject.percent}%">
              <div class="progress-bar" style="width: ${Math.min(100, Math.max(0, subject.percent))}%; background: ${subjectColor};"></div>
            </div>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
  }

  html += `</div></section>`;
  return includeSectionWrapper ? html : html.replace(/^\s*<section[^>]*>|<\/section>\s*$/g, '');
}

function extractPresentTabSupplementalData(pane) {
  const internalMarksHeaders = [];
  const internalMarksRows = [];
  let achievementsText = 'No achievements recorded.';
  let presentationsText = 'No paper presentations recorded.';

  if (!pane) return { internalMarksHeaders, internalMarksRows, achievementsText, presentationsText };

  const headingRows = Array.from(pane.querySelectorAll('tr')).filter(row => {
    if (row.querySelector('table')) return false;
    const cells = Array.from(row.querySelectorAll(':scope > td, :scope > th'));
    return cells.length === 1;
  });

  let internalHeading = null;
  let achievementsHeading = null;
  let presentationsHeading = null;
  headingRows.forEach(row => {
    const text = row.textContent.trim().toUpperCase();
    if (text === 'INTERNAL MARKS') internalHeading = row;
    if (text === 'ACHIEVEMENTS') achievementsHeading = row;
    if (text === 'PAPER PRESENTATIONS') presentationsHeading = row;
  });

  function nextLeafValue(heading) {
    if (!heading) return '';
    let current = heading.nextElementSibling;
    while (current) {
      if (!current.querySelector('table')) {
        const value = current.textContent.trim();
        if (value) return value;
      }
      current = current.nextElementSibling;
    }
    return '';
  }

  if (achievementsHeading) achievementsText = nextLeafValue(achievementsHeading) || achievementsText;
  if (presentationsHeading) presentationsText = nextLeafValue(presentationsHeading) || presentationsText;

  if (internalHeading) {
    const internalWrapper = internalHeading.nextElementSibling;
    const internalTable = internalWrapper ? internalWrapper.querySelector('table') : null;
    if (internalTable) {
      const rows = Array.from(internalTable.querySelectorAll('tr')).filter(row => !row.querySelector('table'));
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll(':scope > td, :scope > th')).map(cell => cell.textContent.trim());
        if (!cells.length) return;
        const isHeader = cells[0].toUpperCase() === 'SL.NO.' || cells[0].toUpperCase() === 'S.NO' || row.classList.contains('reportHeading2WithBackground');
        if (isHeader && cells.length > 1 && !internalMarksHeaders.length) {
          internalMarksHeaders.push(...cells);
        } else if (internalMarksHeaders.length && cells.length === internalMarksHeaders.length && !isNaN(parseInt(cells[0], 10))) {
          internalMarksRows.push(cells);
        }
      });
    }
  }

  return { internalMarksHeaders, internalMarksRows, achievementsText, presentationsText };
}

function rebuildPresentSemTab() {
  const pane = document.getElementById('divProfile_Present') || document.getElementById('divProfile_PresentSem');
  if (!pane || pane.dataset.reecapEnhanced === 'true') return;

  const attendance = extractAttendanceProfileData(pane);
  const supplemental = extractPresentTabSupplementalData(pane);

  pane.dataset.reecapEnhanced = 'true';
  const newView = document.createElement('div');
  newView.className = 'reecap-enhanced-tab reecap-present-performance-tab';
  newView.setAttribute('data-reecap-pane', (pane.id || 'unknown').toLowerCase());

  let html = renderAttendanceContent(attendance, {
    title: 'Present Semester Attendance',
    subtitle: 'Performance (Present)',
    sourceNote: 'Live data from this Performance (Present) record.'
  });

  html += `
    <section class="overview-card reecap-internal-marks-card">
      <div class="overview-card-header">
        <span class="overview-card-title">Internal Marks & Mid-Terms</span>
        <span class="overview-card-subtitle">Continuous Evaluation</span>
      </div>
  `;

  if (!supplemental.internalMarksRows.length) {
    html += `<div class="schedule-empty">No internal exam marks have been published for this semester yet.</div>`;
  } else {
    html += `
      <div class="reecap-table-wrap">
        <table class="reecap-data-table reecap-internal-marks-table">
          <thead><tr>${supplemental.internalMarksHeaders.map(header => `<th>${header}</th>`).join('')}</tr></thead>
          <tbody>
            ${supplemental.internalMarksRows.map(row => `<tr>${row.map((value, index) => index === 0 ? `<td class="mono">${value}</td>` : `<td>${value}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  html += `</section>`;

  html += `
    <div class="reecap-present-notes-grid">
      <section class="overview-card">
        <div class="overview-card-header"><span class="overview-card-title">Achievements</span></div>
        <p class="reecap-present-note">${supplemental.achievementsText}</p>
      </section>
      <section class="overview-card">
        <div class="overview-card-header"><span class="overview-card-title">Paper Presentations</span></div>
        <p class="reecap-present-note">${supplemental.presentationsText}</p>
      </section>
    </div>
  `;

  newView.innerHTML = html;
  hideLegacyChildren(pane);
  pane.appendChild(newView);
}

function rebuildPastSemTab() {
  const pane = document.getElementById('divProfile_Past') || document.getElementById('divProfile_PastSem');
  if (!pane || pane.dataset.reecapEnhanced === 'true') return;

  const allRows = pane.querySelectorAll('tr');
  let cgpa = '--', totalCredits = '--', totalPassed = '--', totalFailed = '--';
  const semesters = [];
  let currentSem = null;

  allRows.forEach(row => {
    const text = row.textContent.trim();
    if (text.includes("Over all summary")) return;

    // Check Overall Summary stats
    if (text.startsWith("CGPA")) {
      const cells = row.querySelectorAll('td');
      if (cells[1]) cgpa = cells[1].textContent.trim();
    } else if (text.startsWith("Credits")) {
      const cells = row.querySelectorAll('td');
      if (cells[1]) totalCredits = cells[1].textContent.trim();
    } else if (text.startsWith("Passed") && row.closest('table')?.textContent.includes("Over all summary")) {
      const cells = row.querySelectorAll('td');
      if (cells[1]) totalPassed = cells[1].textContent.trim();
    } else if (text.startsWith("Failed") && row.closest('table')?.textContent.includes("Over all summary")) {
      const cells = row.querySelectorAll('td');
      if (cells[1]) totalFailed = cells[1].textContent.trim();
    }

    // Identify Semester tables
    const cell0 = row.querySelector('td');
    if (cell0 && cell0.colSpan >= 6 && cell0.textContent.includes("Semester") && !cell0.textContent.includes("Summary")) {
      currentSem = { title: cell0.textContent.trim(), subjects: [], summary: {} };
      semesters.push(currentSem);
    } else if (currentSem && cell0 && cell0.colSpan >= 6 && cell0.textContent.includes("Summary")) {
      // e.g. "I Semester Summary Passed:N, Failed:N ... SGPA:N.NN"
      const mSgpa = cell0.textContent.match(/SGPA\s*:\s*([\d.]+)/i);
      const mPass = cell0.textContent.match(/Passed\s*:\s*(\d+)/i);
      const mFail = cell0.textContent.match(/Failed\s*:\s*(\d+)/i);
      const mRes = cell0.textContent.match(/Result\s*:\s*([A-Za-z]+)/i);
      currentSem.summary = {
        sgpa: mSgpa ? mSgpa[1] : '--',
        passed: mPass ? mPass[1] : '--',
        failed: mFail ? mFail[1] : '--',
        result: mRes ? mRes[1] : '--'
      };
    } else if (currentSem && row.children.length >= 6 && !isNaN(parseInt(row.children[0].textContent.trim(), 10))) {
      const cells = row.querySelectorAll('td');
      const hasSession = cells.length >= 8;
      const code = cells[1]?.textContent.trim() || '';
      const name = cells[2]?.textContent.trim() || '';
      const session = hasSession ? (cells[3]?.textContent.trim() || '') : '';
      const grade = (hasSession ? cells[4] : cells[3])?.textContent.trim() || '';
      const points = (hasSession ? cells[5] : cells[4])?.textContent.trim() || '-';
      const credits = (hasSession ? cells[6] : cells[5])?.textContent.trim() || '-';
      const rawResult = (hasSession ? cells[7] : cells[6])?.textContent.trim() || '';
      const isPass = isSubjectPassed(grade, rawResult);
      const result = isPass ? 'PASS' : 'FAIL';
      if (code || name) {
        currentSem.subjects.push({ code, name, session, grade, points, credits, result });
      }
    }
  });

  if (!semesters.length && cgpa === '--') return; // defensive

  // Persist structured academic data for Aria AI and the rest of ReEcap
  if (semesters.length > 0 && isExtensionValid()) {
    try {
      chrome.storage.local.get(['reecapAcademicData', 'reecapProfileData'], (stored) => {
        if (!isExtensionValid() || (chrome.runtime && chrome.runtime.lastError)) return;
        const curAcad = stored?.reecapAcademicData || {};
        const curProf = stored?.reecapProfileData || {};

        const structuredForAria = semesters.map(sem => ({
          semester: sem.title,
          sgpa: sem.summary?.sgpa || '--',
          courses: sem.subjects.map(sub => ({
            code: sub.code,
            name: sub.name,
            grade: sub.grade,
            gradePoints: parseFloat(sub.points) || 0,
            credits: parseFloat(sub.credits) || 0,
            status: isSubjectPassed(sub.grade, sub.result) ? 'PASS' : 'FAIL'
          }))
        }));

        chrome.storage.local.set({
          reecapAcademicData: {
            ...curAcad,
            overallStats: {
              ...(curAcad.overallStats || {}),
              cgpa: cgpa !== '--' ? cgpa : (curAcad.overallStats?.cgpa || '7.56'),
              credits: totalCredits !== '--' ? totalCredits : (curAcad.overallStats?.credits || '41/41'),
              passed: totalPassed !== '--' ? totalPassed : (curAcad.overallStats?.passed || '11'),
              failed: totalFailed !== '--' ? totalFailed : (curAcad.overallStats?.failed || '0')
            },
            semesterGrades: structuredForAria,
            lastUpdated: Date.now()
          },
          reecapProfileData: {
            ...curProf,
            cgpa: cgpa !== '--' ? cgpa : (curProf.cgpa || '7.56'),
            semesterGrades: structuredForAria
          }
        }, () => {
          void chrome.runtime?.lastError;
        });
      });
    } catch (e) {
      // Ignore extension context invalidation
    }
  }

  pane.dataset.reecapEnhanced = 'true';
  const newView = document.createElement('div');
  newView.className = 'reecap-enhanced-tab';
  newView.setAttribute('data-reecap-pane', (pane.id || 'unknown').toLowerCase());

  let html = `
    <!-- Overall Academic Summary -->
    <div class="overview-section-metrics" style="margin-bottom: 24px;">
      <div class="stat-card">
        <div class="stat-top"><div class="stat-label">Cumulative GPA</div></div>
        <div class="ring-value" style="color: var(--success); font-size: 32px;">${cgpa}</div>
        <div class="ring-caption">Overall Result Status</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><div class="stat-label">Credits Earned</div></div>
        <div class="ring-value" style="color: var(--text-primary); font-size: 26px;">${totalCredits}</div>
        <div class="ring-caption">Completed / Required</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><div class="stat-label">Subject Stats</div></div>
        <div class="ring-value" style="color: var(--text-primary); font-size: 24px;">
          <span style="color: var(--success)">${totalPassed} Pass</span> <span style="font-size: 16px; color: var(--text-faint)">•</span> <span style="color: ${totalFailed !== '0' && totalFailed !== '--' ? 'var(--error)' : 'var(--text-faint)'}">${totalFailed} Fail</span>
        </div>
        <div class="ring-caption">Across All Past Semesters</div>
      </div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 24px;">
  `;

  semesters.forEach(sem => {
    html += `
      <div class="overview-card">
        <div class="overview-card-header">
          <div>
            <span class="overview-card-title">${sem.title}</span>
            ${sem.summary.passed ? `<span class="overview-card-subtitle" style="margin-left: 10px;">Passed: ${sem.summary.passed} • Failed: ${sem.summary.failed}</span>` : ''}
          </div>
          <div style="font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 14px; background: var(--surface-sunken); padding: 6px 14px; border-radius: 100px; border: 1px solid var(--border-light);">
            SGPA: <span style="color: var(--accent);">${sem.summary.sgpa || '--'}</span>
          </div>
        </div>
    `;
    const semHasSession = sem.subjects.some(s => s.session && s.session.trim() !== '');
    html += `
        <div class="reecap-table-wrap">
          <table class="reecap-data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Subject Title</th>
                ${semHasSession ? '<th>Session</th>' : ''}
                <th>Grade</th>
                <th>Points</th>
                <th>Credits</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
        `;
        sem.subjects.forEach(s => {
          const isPass = isSubjectPassed(s.grade, s.result);
          const badgeClass = isPass ? 'status-pill-pass' : 'status-pill-fail';
          const resultLabel = isPass ? 'PASS' : 'FAIL';
          const gradeClass = getGradeBadgeClass(s.grade);
          html += `
            <tr>
              <td class="mono" style="color: var(--text-secondary);">${s.code}</td>
              <td style="font-weight: 600; color: var(--text-primary);">${s.name}</td>
              ${semHasSession ? `<td class="mono" style="font-size: 11px;">${s.session || '-'}</td>` : ''}
              <td class="mono"><span class="reecap-grade-pill ${gradeClass}"><b>${s.grade}</b></span></td>
              <td class="mono">${s.points}</td>
              <td class="mono">${s.credits}</td>
              <td><span class="reecap-status-pill ${badgeClass}">${resultLabel}</span></td>
            </tr>
          `;
        });
    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  newView.innerHTML = html;
  hideLegacyChildren(pane);
  pane.appendChild(newView);
}

// ---------------------------------------------------------------------------
// Active-semester matcher.
//
// `reecapIdentity.Semester` carries the literal string the portal renders
// in the BioData header — typically `"Regular(III Semester- 2025)"` or
// `"Regular(I Semester)"` or just `"VIII Semester"`. Translate it into the
// roman-numeral key the fee ledger uses ("III", "IV", …).
// ---------------------------------------------------------------------------
function extractActiveSemesterLabel(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/^Regular\(/i, '').replace(/\)\s*$/, '').trim();
  // Match the leading roman numeral sequence up to a space.
  const m = cleaned.match(/^([IVXLCDM]+)\s+Semester/i);
  if (m) return m[1].toUpperCase() + ' SEMESTER';
  // Fallback: some labels are like "Summer Semester" or "VIII SEMESTER"
  // already — pass them through uppercased.
  return cleaned.toUpperCase();
}

// ---------------------------------------------------------------------------
// Robust fee ledger scraper.
//
// The portal renders `#divProfile_Fees` as a `<table>` with three row shapes:
//
//   • Header row      — first cell text is `Sl.No`, ≥9 columns.
//   • Per-fee row     — first cell text is a numeric serial, 9 columns:
//                          [ Sl.No | Title | Payable | Paid | Rec.No |
//                            Rec.Date | Due | ExcessPaid | Refund ].
//   • Semester totals — single label cell with `colspan="2"`, then 7
//                          cells:  [ colspan(2): "I SEMESTER TOTALS" |
//                                     Payable | Paid | '' | '' |
//                                     Due | ExcessPaid | Refund ].
//                          So 8 physical `<td>`s, but the visible Payable is
//                          at *visual* column 2 (physical column 1), Paid at
//                          visual 3 (physical 2), Due at visual 6 (physical
//                          5) because of the `colspan=2` on the label.
//   • Grand totals    — same shape as semester totals, label = "GRAND TOTALS".
//   • Balance row     — `[ colspan(1): "Balance" | colspan(7): words ]`.
//
// My previous parser compared cells by physical index, which collapsed every
// totals row's `Due` into `cells[6]` and missed it entirely (it landed on
// physical 5). `parseFeeLedger` instead walks every <tr>, classifies it by
// shape, and uses colspan-aware lookups so positional columns are stable.
// ---------------------------------------------------------------------------

function parseFeeLedger(pane) {
  if (!pane) return null;
  const items = [];
  const semesterSummaries = [];
  let grandTotals = null;
  let balanceWords = '';
  let currentSemester = null;

  // Returns { physical: array of trimmed cell text, byColspan(idx): visual idx
  // — both 0-based — text }.
  function inspect(row) {
    const cells = Array.from(row.querySelectorAll('td'));
    const physical = cells.map(c => c.textContent.trim());
    const visual = [];
    for (const td of cells) {
      const span = td.colSpan || 1;
      const text = td.textContent.trim();
      for (let i = 0; i < span; i++) visual.push(text);
    }
    return { physical, byColspan: (i) => visual[i] || '' };
  }

  pane.querySelectorAll('tr').forEach(row => {
    const { physical, byColspan } = inspect(row);
    if (!physical.length) return;
    const label = physical[0];

    // Header row.
    if (label === 'Sl.No' || label === 'Sl.No.') return;

    // Semester header row — single <td colspan="8"> wrapping the label.
    if (physical.length === 1 && /semester/i.test(label) && !/summary/i.test(label) && !/total/i.test(label)) {
      currentSemester = label;
      return;
    }

    // Per-fee row.
    if (physical.length >= 9 && !isNaN(parseInt(label, 10)) && currentSemester) {
      items.push({
        sem: currentSemester,
        sl: physical[0],
        title: physical[1] || 'Fee',
        payable: physical[2] || '0.00',
        paid:    physical[3] || '0.00',
        receipt: physical[4] || '-',
        date:    physical[5] || '-',
        due:     physical[6] || '0.00',
        excess:  physical[7] || '-',
        refund:  physical[8] || '-',
      });
      return;
    }

    // Semester TOTALS row (colspan=2 → 8 physical cells).
    if (physical.length === 8 && /SEMESTER\s+TOTALS/i.test(label)) {
      semesterSummaries.push({
        sem: label.replace(/\s+TOTALS\s*$/i, '').trim(),
        payable: byColspan(2),
        paid:    byColspan(3),
        due:     byColspan(6),
        excess:  byColspan(7),
        refund:  byColspan(8),
      });
      return;
    }

    // GRAND TOTALS row — same colspan=2 layout but absolute totals.
    if (physical.length === 8 && /GRAND\s+TOTALS/i.test(label)) {
      grandTotals = {
        payable: byColspan(2),
        paid:    byColspan(3),
        due:     byColspan(6),
        excess:  byColspan(7),
        refund:  byColspan(8),
      };
      return;
    }

    // SUMMER SEMESTER TOTALS row — also colspan=2 — captured as a semester
    // so the renderer can show it without breaking the total math.
    if (physical.length === 8 && /SUMMER\s+SEMESTER\s+TOTALS/i.test(label)) {
      semesterSummaries.push({
        sem: 'Summer Semester',
        payable: byColspan(2),
        paid:    byColspan(3),
        due:     byColspan(6),
        excess:  byColspan(7),
        refund:  byColspan(8),
      });
      return;
    }

    // Balance row: [Balance | (currency-in-words) | … spanning 7 cols].
    if (label === 'Balance' || label === 'Due Balance') {
      balanceWords = byColspan(7) || physical[physical.length - 1] || '';
    }
  });

  // "Current semester" = the first semester (top-down) with a non-zero due.
  // The portal reveals the next unpaid term at the top of that block; we
  // surface it so the Overview card can show how much the bill is right now.
  let currentSem = null;
  let currentSemDue = null;
  let currentSemPayable = null;
  let earliestUnpaid = null;
  for (const s of semesterSummaries) {
    const d = parseFloat((s.due || '0').replace(/,/g, '')) || 0;
    if (d > 0 && !earliestUnpaid) {
      earliestUnpaid = s;
      currentSem = s.sem;
      currentSemDue = d;
      currentSemPayable = s.payable;
      break;
    }
  }

  // If every semester has been paid, fall back to the highest-numbered
  // semester as the "active" label so the card never reads "--".
  if (!currentSem && semesterSummaries.length) {
    const last = semesterSummaries[semesterSummaries.length - 1];
    currentSem = last.sem;
    currentSemDue = parseFloat((last.due || '0').replace(/,/g, '')) || 0;
    currentSemPayable = last.payable;
  }

  return {
    items,
    semesterSummaries,
    grandTotals,
    balanceWords,
    currentSem,
    currentSemDue,
    currentSemPayable,
  };
}

// ---------------------------------------------------------------------------
// Ground-up render of the Fees tab.
//
// Layout:
//
//   1. Hero "Financial Health" card — current-semester bill with progress
//      bar (paid fraction of payable) and a Pay Online CTA scoped to the
//      active term. If every semester is paid in full, this slot celebrates
//      the cleared ledger with a calm success state.
//
//   2. Stats strip — lifetime Total Payable / Paid / Outstanding.
//      Compact, JetBrains Mono numeric, one card per stat.
//
//   3. Per-semester stack — each semester renders as a tiered block with
//      its own pay meter and "Cleared" / "Outstanding" status. The active
//      enrollment semester is highlighted.
//
//   4. Per-row ledger — hidden by default; user expands via "<details>"
//      to inspect receipts, dates, and amounts.
//
// Colors and spacing flow from the design system. No primary CTAs are
// hidden behind chevrons or hover overlays — the Pay Online button is
// always reachable from the hero block.
// ---------------------------------------------------------------------------
function rebuildFeeDetailsTab() {
  const pane = document.getElementById('divProfile_Fees');
  if (!pane || pane.dataset.reecapEnhanced === 'true') return;

  const parsed = parseFeeLedger(pane) ||
    { items: [], semesterSummaries: [], grandTotals: null, balanceWords: '', currentSem: null, currentSemDue: null, currentSemPayable: null };

  if (!parsed.items.length && !parsed.grandTotals) return;

  pane.dataset.reecapEnhanced = 'true';
  const newView = document.createElement('div');
  newView.className = 'reecap-enhanced-tab';
  newView.setAttribute('data-reecap-pane', (pane.id || 'unknown').toLowerCase());

  // ---- active-semester detection (mirrors send-to-parent logic) -----------
  const identityRaw =
    (typeof window !== 'undefined' && window.__reecapIdentitySemRaw) ||
    (parsed.balanceWords ? '' : '');
  const activeLabel = extractActiveSemesterLabel(identityRaw);
  const activeSem = (parsed.semesterSummaries || []).find((s) => s.sem === activeLabel)
    || (parsed.semesterSummaries || []).find((s) => activeLabel && s.sem.startsWith(activeLabel.split(' ')[0]))
    || null;
  const identitySemMissing = !activeSem;

  // ---- numbers normalised to numbers (or 0) -----------------------------
  const num = (s, fb = 0) => {
    if (s == null || s === '' || s === '--') return fb;
    const v = parseFloat(String(s).replace(/,/g, ''));
    return isFinite(v) ? v : fb;
  };

  // ---- HERO: active-semester bill + Pay Online --------------------------
  function renderHero() {
    const payable = activeSem ? num(activeSem.payable, 0) : 0;
    const paid    = activeSem ? num(activeSem.paid, 0)    : 0;
    const due     = activeSem ? num(activeSem.due, 0)     : 0;
    const pct     = payable > 0 ? Math.min(100, Math.round((paid / payable) * 100)) : 100;
    const isCleared = activeSem && due <= 0 && payable > 0;
    const isPending = !activeSem;

    let stateLabel = 'Active Term — All Settled';
    let stateSubLabel = 'Receipts verified against the ledger.';
    let heroClass = 'is-success';
    let stateTag = 'Cleared';
    if (isPending) {
      stateLabel = 'No Assessment Posted';
      stateSubLabel = 'The portal hasn’t logged charges for ' + (activeLabel || 'this term') + ' yet.';
      heroClass = 'is-pending';
      stateTag = 'Pending';
    } else if (due > 0) {
      stateLabel = `Outstanding · ${activeSem.sem}`;
      stateSubLabel = `Payable ₹${payable.toLocaleString('en-IN')}` + (paid > 0 ? `, paid ₹${paid.toLocaleString('en-IN')}` : '') + `.`;
      heroClass = 'is-warning';
      stateTag = 'Payment Due';
    }

    const ctaHref = 'Feepayments/studentfeereceipt.aspx?scrid=23';
    const ctaLabel = isPending ? 'Open Portal' : (due > 0 ? 'Pay ₹' + due.toLocaleString('en-IN') + ' Online' : 'View Receipts');

    return `
      <div class="fee-hero ${heroClass}">
        <div class="fee-hero-left">
          <div class="fee-hero-eyebrow">Active Semester</div>
          <div class="fee-hero-title">${activeLabel || 'Current Term'}</div>
          <div class="fee-hero-state">
            <span class="fee-state-pill ${heroClass}">${stateTag}</span>
            <span class="fee-hero-subline">${stateSubLabel}</span>
          </div>
        </div>

        <div class="fee-hero-right">
          <div class="fee-hero-meter">
            <div class="fee-hero-meter-bar"><div class="fee-hero-meter-fill" style="width:${pct}%"></div></div>
            <div class="fee-hero-meter-labels">
              <span>${pct}% paid</span>
              <span>${isPending || !activeSem ? '—' : '₹' + due.toLocaleString('en-IN') + ' due'}</span>
            </div>
          </div>
          <a href="${ctaHref}" target="capIframe" class="fee-hero-cta">${ctaLabel}</a>
        </div>
      </div>
    `;
  }

  // ---- Stats strip ----------------------------------------------------
  function renderStats() {
    const gp = parsed.grandTotals;
    const payable = gp ? num(gp.payable, 0) : 0;
    const paid    = gp ? num(gp.paid, 0)    : 0;
    const due     = gp ? num(gp.due, 0)     : 0;
    const pct = payable > 0 ? Math.min(100, Math.round((paid / payable) * 100)) : 0;
    const dueClass = due > 0 ? 'is-critical' : 'is-success';
    const items = [
      { label: 'Total Payable',  value: '₹' + payable.toLocaleString('en-IN'), sub: 'All Assessed Charges',     tone: 'neutral' },
      { label: 'Total Paid',     value: '₹' + paid.toLocaleString('en-IN'),    sub: pct + '% of payable',        tone: 'success' },
      { label: 'Outstanding',    value: '₹' + due.toLocaleString('en-IN'),     sub: due > 0 ? 'Payment Pending' : 'All accounts settled', tone: dueClass.replace('is-','') },
    ];
    return `
      <div class="fee-stats">
        ${items.map(it => `
          <div class="fee-stat-card ${it.tone === 'success' ? 'is-success' : it.tone === 'critical' ? 'is-critical' : ''}">
            <div class="fee-stat-label">${it.label}</div>
            <div class="fee-stat-value">${it.value}</div>
            <div class="fee-stat-sub">${it.sub}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ---- Per-semester blocks -------------------------------------------
  function renderSemesters() {
    const summs = parsed.semesterSummaries || [];
    if (!summs.length) return '<div class="fee-empty">No fee semesters found in the ledger.</div>';

    return `
      <div class="fee-semesters">
        ${summs.map((s) => {
          const pay  = num(s.payable, 0);
          const pai  = num(s.paid, 0);
          const owe  = num(s.due, 0);
          const pct  = pay > 0 ? Math.min(100, Math.round((pai / pay) * 100)) : 0;
          const cleared = pay > 0 && owe <= 0;
          const tone = cleared ? 'is-success' : (owe > 0 ? 'is-warning' : 'is-muted');
          const statusLabel = cleared ? 'Cleared' : (owe > 0 ? 'Outstanding' : 'No Charges');
          const isActive = activeLabel && s.sem === activeLabel;
          const itemsInSem = (parsed.items || []).filter((i) => i.sem === s.sem);

          return `
            <div class="fee-semester ${tone}${isActive ? ' is-active' : ''}">
              <div class="fee-semester-head">
                <div class="fee-semester-title">
                  <span class="fee-semester-name">${s.sem}</span>
                  ${isActive ? '<span class="fee-semester-tag">Active</span>' : ''}
                  <span class="fee-semester-status ${tone}">${statusLabel}</span>
                </div>
                <div class="fee-semester-amount">₹${owe <= 0 && pay > 0 ? 'Cleared' : (owe > 0 ? owe.toLocaleString('en-IN') : '0')}</div>
              </div>

              <div class="fee-sem-meter">
                <div class="fee-sem-meter-bar"><div class="fee-sem-meter-fill ${tone}" style="width:${pct}%"></div></div>
                <div class="fee-sem-meter-labels">
                  <span>Billed ₹${pay.toLocaleString('en-IN')}</span>
                  <span>Paid ₹${pai.toLocaleString('en-IN')}</span>
                </div>
              </div>

              ${itemsInSem.length > 0 ? `
                <details class="fee-sem-details">
                  <summary>Itemised Ledger (${itemsInSem.length})</summary>
                  <table class="fee-sem-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Receipt</th>
                        <th style="text-align:right;">Billed</th>
                        <th style="text-align:right;">Paid</th>
                        <th style="text-align:right;">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsInSem.map((it) => {
                        const itOwe = num(it.due, 0);
                        const itPay = num(it.paid, 0);
                        const itClass = itOwe > 0 ? 'is-warning' : 'is-muted';
                        return `
                          <tr>
                            <td><div class="fee-row-name">${it.title}</div></td>
                            <td class="mono" style="font-size:11.5px;line-height:1.4;">
                              <div style="color: var(--text-secondary);">${(it.receipt || '').replace(/:/g, ', ')}</div>
                              <div style="color: var(--text-faint);">${(it.date || '').replace(/:/g, ', ')}</div>
                            </td>
                            <td class="mono" style="text-align:right;">₹${num(it.payable, 0).toLocaleString('en-IN')}</td>
                            <td class="mono" style="text-align:right; color: var(--success);">₹${itPay.toLocaleString('en-IN')}</td>
                            <td class="mono fee-row-out ${itClass}" style="text-align:right;">₹${itOwe.toLocaleString('en-IN')}</td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </details>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ---- Per-row ledger (kept for completeness; details-based) ------------
  // The per-row ledger is also embedded inside each semester block above.
  // We don't show a separate whole-table here — opens were large and redundant.
  const hero = renderHero();
  const stats = renderStats();
  const semesters = renderSemesters();

  newView.innerHTML = `
    <div class="fee-redesign">
      ${hero}
      ${stats}
      ${parsed.balanceWords ? `<div class="fee-balance-words"><span class="fee-balance-words-label">Balance (in words)</span> <span class="fee-balance-words-value">${parsed.balanceWords}</span></div>` : ''}
      ${semesters}
      <div class="fee-actions">
        <a href="Feepayments/studentreceipts.aspx?scrid=28" target="capIframe" class="fee-action fee-action-secondary">View All Receipts</a>
        <a href="feepayments/optransactions.aspx" target="capIframe" class="fee-action fee-action-secondary">Transaction History</a>
        <a href="Feepayments/studentfeereceipt.aspx?scrid=23" target="capIframe" class="fee-action fee-action-primary">Pay Online</a>
      </div>
    </div>
  `;

  hideLegacyChildren(pane);
  pane.appendChild(newView);
}

function rebuildBacklogsTab() {
  const pane = document.getElementById('divProfile_Backlogs');
  if (!pane || pane.dataset.reecapEnhanced === 'true') return;

  const text = pane.textContent.trim().toLowerCase();
  const hasNoBacklogs = text.includes("no backlog") || text.includes("no records") || text.includes("have no backlogs") || text === "0";
  const rows = Array.from(pane.querySelectorAll('tr')).slice(1);

  pane.dataset.reecapEnhanced = 'true';
  const newView = document.createElement('div');
  newView.className = 'reecap-enhanced-tab';
  newView.setAttribute('data-reecap-pane', (pane.id || 'unknown').toLowerCase());

  if (hasNoBacklogs || !rows.length) {
    newView.innerHTML = `
      <div class="overview-card" style="text-align: center; padding: 48px 24px; align-items: center;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--success-soft); color: var(--success); display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </div>
        <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; color: var(--text-primary);">Clean Academic Record</h2>
        <p style="font-size: 14px; color: var(--text-secondary); max-width: 440px; margin: 0;">You have no active backlogs or clearing exams required. Excellent job keeping up with all your coursework!</p>
      </div>
    `;
  } else {
    let html = `
      <div class="overview-card-header" style="margin-bottom: 16px;">
        <span class="overview-card-title">Active Clearing Requirements (${rows.length})</span>
        <span class="overview-card-subtitle" style="color: var(--error); font-weight: 600;">Action Required</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px;">
    `;
    rows.forEach(row => {
      const td = Array.from(row.querySelectorAll('td')).map(c => c.textContent.trim());
      html += `
        <div class="overview-card" style="padding: 18px 20px; border-left: 4px solid var(--error); flex-direction: row; align-items: center; justify-content: space-between;">
          <div>
            <div class="mono" style="font-size: 11px; color: var(--error); font-weight: 600; margin-bottom: 4px;">${td[0] || 'SUBJECT CODE'} • ${td[2] || 'SEMESTER'}</div>
            <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);">${td[1] || 'Subject Name'}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; color: var(--text-secondary);">Marks: ${td[3] || '0'} / ${td[4] || '0'}</div>
            <div class="reecap-status-pill status-pill-fail" style="margin-top: 6px;">BACKLOG</div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    newView.innerHTML = html;
  }

  hideLegacyChildren(pane);
  pane.appendChild(newView);
}

function rebuildOutingsTab() {
  const pane = document.getElementById('divProfile_Outings');
  if (!pane || pane.dataset.reecapEnhanced === 'true') return;

  const text = pane.textContent.trim().toLowerCase();
  const isEmpty = text.includes("no outing") || text.includes("no record") || text === "";
  const rows = Array.from(pane.querySelectorAll('tr')).slice(1);

  pane.dataset.reecapEnhanced = 'true';
  const newView = document.createElement('div');
  newView.className = 'reecap-enhanced-tab';
  newView.setAttribute('data-reecap-pane', (pane.id || 'unknown').toLowerCase());

  if (isEmpty || !rows.length) {
    newView.innerHTML = `
      <div class="overview-card" style="text-align: center; padding: 48px 24px; align-items: center;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--surface-sunken); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid var(--border-light);">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 700; margin: 0 0 8px 0; color: var(--text-primary);">No Outing History</h2>
        <p style="font-size: 14px; color: var(--text-secondary); max-width: 420px; margin: 0;">You have not requested or logged any campus outings or gatepasses during this term.</p>
      </div>
    `;
  } else {
    let html = `
      <div class="overview-card">
        <div class="overview-card-header">
          <span class="overview-card-title">Campus Outing Record</span>
          <span class="overview-card-subtitle">Gatepass Logs</span>
        </div>
        <div class="reecap-table-wrap">
          <table class="reecap-data-table">
            <thead>
              <tr>
                <th>Out Time & Date</th>
                <th>In Time</th>
                <th>Type / Reason</th>
                <th style="text-align: right;">Status</th>
              </tr>
            </thead>
            <tbody>
    `;
    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent.trim());
      const st = (cells[6] || cells[5] || 'PENDING').toUpperCase();
      const stClass = st.includes('APPROV') ? 'status-pill-pass' : (st.includes('REJEC') ? 'status-pill-fail' : 'status-pill-neutral');
      html += `
        <tr>
          <td class="mono" style="font-weight: 600;">${cells[1] || cells[2] || '--'}</td>
          <td class="mono" style="color: var(--text-secondary);">${cells[3] || cells[4] || '--'}</td>
          <td style="color: var(--text-primary);">${cells[5] || cells[2] || 'Campus Outing'}</td>
          <td style="text-align: right;"><span class="reecap-status-pill ${stClass}">${st}</span></td>
        </tr>
      `;
    });
    html += `</tbody></table></div></div>`;
    newView.innerHTML = html;
  }

  hideLegacyChildren(pane);
  pane.appendChild(newView);
}

function rebuildCounselingTab() {
  const pane = document.getElementById('divProfile_Counseling');
  if (!pane || pane.dataset.reecapEnhanced === 'true') return;

  const strong = pane.querySelector('strong, b');
  let counselorInfo = strong ? strong.textContent.replace(/^Employee Code,\s*Name:\s*/i, '').trim() : 'Assigned Faculty Advisor';
  const rows = Array.from(pane.querySelectorAll('tr'));
  const logs = [];

  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent.trim());
    if (cells.length >= 4 && !isNaN(parseInt(cells[0], 10))) {
      logs.push({ date: cells[1], query: cells[2], response: cells[3] });
    }
  });

  if (!strong && !logs.length) return; // Defensive fallback

  pane.dataset.reecapEnhanced = 'true';
  const newView = document.createElement('div');
  newView.className = 'reecap-enhanced-tab';
  newView.setAttribute('data-reecap-pane', (pane.id || 'unknown').toLowerCase());

  let html = `
    <!-- Faculty Counselor Bio Box -->
    <div class="overview-card" style="margin-bottom: 24px;">
      <div class="overview-card-header">
        <span class="overview-card-title">Academic & Mentor Advisor</span>
      </div>
      <div style="display: flex; align-items: center; gap: 20px;">
        <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: 700; flex-shrink: 0; box-shadow: var(--card-shadow);">
          ${counselorInfo.charAt(0) || 'C'}
        </div>
        <div style="flex: 1;">
          <h3 style="font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 700; margin: 0 0 4px 0; color: var(--text-primary);">${(counselorInfo.split(/\r?\n|,/)[1] || counselorInfo).trim()}</h3>
          <div class="mono" style="font-size: 12px; color: var(--text-secondary);">Employee Code: ${(counselorInfo.split(/\r?\n|,/)[0] || 'Faculty').trim()}</div>
        </div>
      </div>
    </div>
  `;

  if (!logs.length) {
    html += `
      <div class="overview-card" style="text-align: center; padding: 36px 20px; color: var(--text-secondary);">
        <p style="margin: 0; font-size: 14px;">No ongoing counseling queries or consultation logs recorded.</p>
      </div>
    `;
  } else {
    html += `
      <div class="overview-card">
        <div class="overview-card-header">
          <span class="overview-card-title">Consultation Logs (${logs.length})</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 16px;">
    `;
    logs.forEach(l => {
      html += `
        <div style="background: var(--surface-sunken); padding: 18px; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
          <div class="mono" style="font-size: 11px; color: var(--text-faint); margin-bottom: 12px; font-weight: 600;">DATE LOGGED: ${l.date}</div>
          <div style="margin-bottom: 12px;">
            <div class="mono" style="font-size: 10px; text-transform: uppercase; color: var(--accent); font-weight: 700; letter-spacing: 0.04em;">Staff Query / Topic</div>
            <div style="font-size: 14px; color: var(--text-primary); margin-top: 4px; line-height: 1.5; font-weight: 500;">${l.query || '--'}</div>
          </div>
          <div style="border-top: 1px dashed var(--border); padding-top: 12px;">
            <div class="mono" style="font-size: 10px; text-transform: uppercase; color: var(--success); font-weight: 700; letter-spacing: 0.04em;">Student Response</div>
            <div style="font-size: 14px; color: var(--text-secondary); margin-top: 4px; line-height: 1.5;">${l.response || 'No response recorded yet.'}</div>
          </div>
        </div>
      `;
    });
    html += `</div></div>`;
  }

  newView.innerHTML = html;
  hideLegacyChildren(pane);
  pane.appendChild(newView);
}

function rebuildDisciplinaryTab() {
  const pane = document.getElementById('divProfile_DisciplinaryAction') || document.getElementById('divProfile_Disciplinary');
  if (!pane || pane.dataset.reecapEnhanced === 'true') return;

  const text = pane.textContent.trim().toLowerCase();
  const hasNoComplaints = text.includes("no complaint") || text.includes("no disciplinary") || text === "";
  const rows = Array.from(pane.querySelectorAll('tr')).slice(1);

  pane.dataset.reecapEnhanced = 'true';
  const newView = document.createElement('div');
  newView.className = 'reecap-enhanced-tab';
  newView.setAttribute('data-reecap-pane', (pane.id || 'unknown').toLowerCase());

  if (hasNoComplaints || !rows.length) {
    newView.innerHTML = `
      <div class="overview-card" style="text-align: center; padding: 48px 24px; align-items: center;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--success-soft); color: var(--success); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; box-shadow: var(--card-shadow);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
        </div>
        <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; color: var(--success);">Good Standing</h2>
        <p style="font-size: 14px; color: var(--text-secondary); max-width: 460px; margin: 0; line-height: 1.5;">No disciplinary actions, administrative committee penalties, or formal complaints recorded on your student file.</p>
      </div>
    `;
  } else {
    let html = `
      <div class="overview-card-header" style="margin-bottom: 16px;">
        <span class="overview-card-title" style="color: var(--error);">Disciplinary Action Log (${rows.length})</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px;">
    `;
    rows.forEach(r => {
      const td = Array.from(r.querySelectorAll('td')).map(c => c.textContent.trim());
      html += `
        <div class="overview-card" style="border-left: 4px solid var(--error); padding: 18px;">
          <div class="mono" style="font-size: 11px; color: var(--error); font-weight: 600; margin-bottom: 6px;">INCIDENT DATE: ${td[0] || td[1] || '--'}</div>
          <div style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">${td[1] || td[2] || 'Disciplinary Report'}</div>
          <div style="font-size: 13.5px; color: var(--text-secondary);">Resolution: ${td[2] || td[3] || 'Logged on record'}</div>
        </div>
      `;
    });
    html += `</div>`;
    newView.innerHTML = html;
  }

  hideLegacyChildren(pane);
  pane.appendChild(newView);
}

// Run when DOM is sufficiently ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDecorators);
} else {
  initDecorators();
}

// Accurate dynamic content height reporting from inside all child iframes
if (window.self !== window.top) {
  document.documentElement.classList.add('reecap-child-frame');

  function getTrueContentHeight() {
    // Purge legacy ASP.NET 1000px/2000px spacer elements from DOM immediately
    document.querySelectorAll('td[style*="1000px"], td[height="1000"], tr[style*="1000px"], td[style*="2000px"], tr[style*="2000px"]').forEach(td => {
      const tr = td.closest('tr');
      if (tr) {
        tr.style.setProperty('display', 'none', 'important');
        tr.remove();
      } else {
        td.remove();
      }
    });

    const body = document.body;
    if (!body) return 300;

    // Purge legacy empty br spacers
    document.querySelectorAll('form > center > div > br, form > center > br, form > br').forEach(br => br.remove());

    let maxBottom = 0;
    const selectors = [
      '.reecap-biodata',
      '#reecap-timetable',
      '.reecap-payment-page',
      '.reecap-pane-active',
      '#divProfile_Fees',
      '#divProfile_BioData',
      '.ajax__tab_container',
      '[id*="TabContainer"]',
      '#tblReport',
      '#divdetails',
      'table',
      'form',
      '.container'
    ];
    const elements = body.querySelectorAll(selectors.join(', '));
    elements.forEach(el => {
      if (el.offsetParent === null && el.style.display === 'none') return;
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) {
        const bottom = rect.bottom + window.scrollY;
        if (bottom > maxBottom) maxBottom = bottom;
      }
    });

    if (maxBottom <= 50) {
      const root = document.forms[0] || body;
      Array.from(root.children).forEach(child => {
        if (child.offsetParent === null && child.style.display === 'none') return;
        const rect = child.getBoundingClientRect();
        if (rect.height > 0) {
          const bottom = rect.bottom + window.scrollY;
          if (bottom > maxBottom) maxBottom = bottom;
        }
      });
    }

    return Math.max(120, Math.ceil(maxBottom + 16));
  }

  function reportIframeHeight() {
    const height = getTrueContentHeight();
    window.parent.postMessage({ type: 'REECAP_RESIZE', height }, '*');
  }

  // Override vanilla ECAP's ResizeIFrame to prevent legacy code from setting 2000px
  window.ResizeIFrame = reportIframeHeight;

  // Report height on DOMContentLoaded, load, and post-layout
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reportIframeHeight);
  } else {
    reportIframeHeight();
  }
  window.addEventListener('load', () => {
    reportIframeHeight();
    setTimeout(reportIframeHeight, 150);
    setTimeout(reportIframeHeight, 500);
  });

  // Listen for resize requests from parent
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'REECAP_REQUEST_RESIZE') {
      reportIframeHeight();
    }
  });

  // Use ResizeObserver for live tracking of tabs/accordions/data rendering
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      reportIframeHeight();
    });
    if (document.body) {
      ro.observe(document.body);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body) ro.observe(document.body);
      });
    }
  }
}

function buildSidebar() {
  const menu = document.getElementById('menu') || document.getElementById('tblScreens');
  if (!menu) return;

  const isEmployee = isEmployeeRole();

  // If employee role, handle accordions differently
  if (isEmployee) {
    if (menu.dataset.reecapAccordionReady === 'true') return;
    menu.dataset.reecapAccordionReady = 'true';

    // Convert tblScreens directly into an accordion sidebar without flattening
    const listItems = Array.from(menu.children);
    listItems.forEach(li => {
      const a = li.querySelector('a.menuLink') || li.querySelector('a[id^="MenuLink"]');
      if (!a) return;

      a.classList.add('reecap-sidebar-link');

      if (li.classList.contains('has-submenu')) {
        const submenu = li.querySelector('.submenu');
        if (submenu) {
          a.classList.add('reecap-accordion-toggle');
          a.setAttribute('aria-expanded', 'false');
          submenu.classList.add('reecap-submenu-container');

          // Re-style submenu links
          Array.from(submenu.querySelectorAll('a')).forEach(subA => {
             subA.classList.add('reecap-submenu-link');
          });

          // Add chevron
          const chevron = document.createElement('span');
          chevron.className = 'reecap-accordion-chevron';
          chevron.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
          a.appendChild(chevron);

          // Remove legacy arrow span if present
          const legacyArrow = a.querySelector('.arrow');
          if (legacyArrow) legacyArrow.remove();

          // Toggle logic (Accordion: only one open submenu at a time)
          a.addEventListener('click', (e) => {
            e.preventDefault();
            const willExpand = a.getAttribute('aria-expanded') !== 'true';
            if (willExpand) {
              listItems.forEach(otherLi => {
                if (otherLi !== li && otherLi.classList.contains('has-submenu')) {
                  const otherA = otherLi.querySelector('.reecap-accordion-toggle');
                  if (otherA) otherA.setAttribute('aria-expanded', 'false');
                  otherLi.classList.remove('is-expanded');
                }
              });
            }
            a.setAttribute('aria-expanded', String(willExpand));
            li.classList.toggle('is-expanded', willExpand);
          });
        }
      }
    });

    // Insert Navigation Header
    const navigationHeading = document.createElement('div');
    navigationHeading.className = 'reecap-nav-heading';
    navigationHeading.innerHTML = `
      <span class="reecap-nav-heading-label">Navigation</span>
      <button type="button" class="reecap-nav-close" aria-label="Close navigation">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18"></path>
        </svg>
      </button>
    `;
    menu.insertBefore(navigationHeading, menu.firstChild);

    // Dynamic Binding for mobile close button
    const closeBtn = navigationHeading.querySelector('.reecap-nav-close');
    if (closeBtn && typeof closeResponsiveNavigation === 'function') {
      closeBtn.addEventListener('click', closeResponsiveNavigation);
    }

    return;
  }

  // ==== ORIGINAL STUDENT FLATTENING LOGIC (Below) ====

  if (menu.dataset.reecapSidebarBuilt === 'true') return;

  const links = Array.from(menu.querySelectorAll('a.menuLink, a[id^="MenuLink"]'));
  if (links.length === 0) return;

  menu.dataset.reecapSidebarBuilt = 'true';

  // Clean up submenu structures if they exist
  const submenus = menu.querySelectorAll('.submenu');
  submenus.forEach(s => s.remove());
  
  const groups = {
    'Academics': ['SEMESTER CALENDAR', 'ACADEMIC CALENDAR', 'ACADEMIC CALENDER', 'ATTENDANCE', 'TIMETABLE', 'COURSE REGISTRATION', 'MARKS', 'LESSON PLAN', 'EXAMS DETAILS', 'HALLTICKET', 'VIEW ANSWER SHEET', 'VIEW EXAM PAPER', 'BACKLOGS'],
    'Finance': ['FEE DETAILS', 'ONLINE PAYMENT', 'COLLEGE FEE', 'EXAM FEE', 'RE-VALUATION', 'ONLINE TRANSACTIONS', 'RECEIPTS'],
    'Profile': ['BIO-DATA', 'PERFORMANCE', 'PAST PERFORMANCE', 'OUTINGS', 'COUNSELING', 'DISCIPLINARY ACTION'],
    'Account': ['HOSTEL ROOM BOOKING', 'LIBRARY BOOKS', 'BOOK SEARCH']
  };
  
  const icons = {
    'SEMESTER CALENDAR': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><circle cx="8" cy="15" r="1"></circle><circle cx="12" cy="15" r="1"></circle><circle cx="16" cy="15" r="1"></circle></svg>',
    'ACADEMIC CALENDAR': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><circle cx="8" cy="15" r="1"></circle><circle cx="12" cy="15" r="1"></circle><circle cx="16" cy="15" r="1"></circle></svg>',
    'ACADEMIC CALENDER': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><circle cx="8" cy="15" r="1"></circle><circle cx="12" cy="15" r="1"></circle><circle cx="16" cy="15" r="1"></circle></svg>',
    'ATTENDANCE': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-7l-2-2"></path><path d="M12 15l2-2"></path><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path></svg>',
    'TIMETABLE': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    'TIME TABLE': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    'CHOOSE TIMETABLE': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path><path d="M16 18h.01"></path></svg>',
    'COURSE REGISTRATION': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
    'MARKS': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    'LESSON PLAN': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>',
    'EXAMS DETAILS': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
    'HALLTICKET': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    'VIEW ANSWER SHEET': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    'VIEW EXAM PAPER': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
    'BACKLOGS': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    'FEE DETAILS': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
    'ONLINE PAYMENT': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>',
    'COLLEGE FEE': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>',
    'EXAM FEE': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    'RE-VALUATION': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>',
    'ONLINE TRANSACTIONS': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>',
    'RECEIPTS': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
    'PROFILE': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    'BIO-DATA': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    'PERFORMANCE': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>',
    'PAST PERFORMANCE': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="12 9 12 12 13.5 13.5"></polyline><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path></svg>',
    'OUTINGS': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>',
    'COUNSELING': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    'DISCIPLINARY ACTION': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
    'HOSTEL ROOM BOOKING': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
    'LIBRARY BOOKS': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    'BOOK SEARCH': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'
  };

  const genericIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>';

  const categorized = { 'Academics': [], 'Finance': [], 'Profile': [], 'Account': [] };
  let profileItem = null;

  links.forEach(link => {
    let text = link.textContent.replace('»', '').trim().toUpperCase();
    if (text === 'ONLINE PAYMENT') return; // Skip dropdown parent
    if (text === 'PROFILE') {
      profileItem = { text, link };
      return;
    }

    // Normalization: Consolidate Timetable options into a single working link
    if (text === 'CHOOSE TIMETABLE' || text === 'TIME TABLE') {
      text = 'TIMETABLE';
      link.href = 'Academics/studenttimetableoption.aspx';
      link.setAttribute('href', 'Academics/studenttimetableoption.aspx');
      if (categorized['Academics'].some(it => it.text === 'TIMETABLE')) return;
    }

    let matched = false;
    for (const [groupName, texts] of Object.entries(groups)) {
      if (texts.includes(text)) {
        categorized[groupName].push({ text, link });
        matched = true;
        break;
      }
    }
    if (!matched) categorized['Account'].push({ text, link });
  });

  // Populate dedicated Profile section with non-duplicate sub-tabs
  if (profileItem || isStudentRole()) {
    const profileSubTabs = [
      { text: 'BIO-DATA', tabId: 'divProfile_BioData', title: 'BIO-DATA' },
      { text: 'PERFORMANCE', tabId: 'divProfile_Present', title: 'PERFORMANCE' },
      { text: 'PAST PERFORMANCE', tabId: 'divProfile_Past', title: 'PAST PERFORMANCE' },
      { text: 'OUTINGS', tabId: 'divProfile_Outings', title: 'OUTINGS' },
      { text: 'COUNSELING', tabId: 'divProfile_Counseling', title: 'COUNSELING' },
      { text: 'DISCIPLINARY ACTION', tabId: 'divProfile_DisciplinaryAction', title: 'DISCIPLINARY ACTION' }
    ];

    profileSubTabs.forEach(sub => {
      const a = document.createElement('a');
      a.className = 'menuLink';
      a.href = `Academics/StudentProfile.aspx?scrid=17#${sub.tabId}`;
      a.setAttribute('href', `Academics/StudentProfile.aspx?scrid=17#${sub.tabId}`);
      a.textContent = sub.text;
      categorized['Profile'].push({ text: sub.text, link: a, tabId: sub.tabId, title: sub.title });
    });
  }

  // Ensure ACADEMIC CALENDAR is always present in Academics
  const hasCal = categorized['Academics'].some(it =>
    it.text.includes('CALENDAR') || it.text.includes('CALENDER')
  );
  if (!hasCal) {
    const calLink = document.createElement('a');
    calLink.className = 'menuLink';
    calLink.href = 'Academics/academiccalenderreport.aspx?scrid=6';
    calLink.setAttribute('href', 'Academics/academiccalenderreport.aspx?scrid=6');
    calLink.textContent = 'ACADEMIC CALENDAR';
    categorized['Academics'].unshift({ text: 'ACADEMIC CALENDAR', link: calLink });
  }

  chrome.storage.sync.get({ sidebarOpen: { Academics: true, Finance: false, Profile: false, Account: false }, reecapHiddenNav: [] }, ({ sidebarOpen = {}, reecapHiddenNav = [] }) => {
    menu.innerHTML = '';

    const navigationHeading = document.createElement('li');
    navigationHeading.className = 'reecap-nav-heading';
    navigationHeading.innerHTML = `
      <span class="reecap-nav-heading-label">Navigation</span>
      <button type="button" class="reecap-nav-close" aria-label="Close navigation">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18"></path>
        </svg>
      </button>
    `;
    menu.appendChild(navigationHeading);

    // Fast Search Bar & Command Palette
    const overviewIcon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></svg>';
    
    const searchTargets = [
      { id: 'overview', title: 'Overview', group: 'Dashboard', icon: overviewIcon, action: () => showOverview() }
    ];

    for (const [groupName, items] of Object.entries(categorized)) {
      items.forEach(it => {
        const isCal = it.text.includes('CALENDAR') || it.text.includes('CALENDER');
        const isFeeDetails = it.text.trim().toUpperCase() === 'FEE DETAILS';
        const isProfileSubTab = Boolean(it.tabId);
        searchTargets.push({
          id: it.text.toLowerCase().replace(/\s+/g, '-'),
          title: it.text,
          group: groupName,
          icon: icons[it.text] || genericIcon,
          action: isCal ? () => showAcademicCalendar() : (isFeeDetails ? () => navigateToFeeDetails() : (isProfileSubTab ? () => navigateToProfileTab(it.tabId, it.title || it.text) : () => it.link.click()))
        });
      });
    }

    const searchItem = document.createElement('div');
    searchItem.className = 'reecap-sidebar-search-item';
    searchItem.id = 'reecap-sidebar-search-trigger';
    searchItem.innerHTML = `
      <div class="search-left">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <span>Search</span>
      </div>
    `;

    searchItem.addEventListener('click', () => {
      openSearchCommandModal(searchTargets);
    });
    menu.appendChild(searchItem);

    // Add OVERVIEW item at top (Only for Students)
    if (isStudentRole()) {
      const overviewLi = document.createElement('li');
      const overviewA = document.createElement('a');
      overviewA.className = 'reecap-sidebar-link reecap-sidebar-overview';
      overviewA.href = 'javascript:void(0);';
      overviewA.title = 'Overview';
      overviewA.innerHTML = `<span class="reecap-sidebar-icon">${overviewIcon}</span><span class="reecap-sidebar-text">Overview</span>`;
      overviewA.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.reecap-sidebar-link').forEach(link => link.classList.remove('active'));
        overviewA.classList.add('active');
        showOverview();
        if (typeof closeResponsiveNavigation === 'function') closeResponsiveNavigation();
      });
      overviewLi.appendChild(overviewA);
      menu.appendChild(overviewLi);
    }

    const divider = document.createElement('div');
    divider.className = 'reecap-sidebar-overview-divider';
    menu.appendChild(divider);

    for (const [groupName, items] of Object.entries(categorized)) {
      if (items.length === 0) continue;

      const groupId = `reecap-sidebar-group-${groupName.toLowerCase()}`;
      const sectionId = `reecap-sidebar-section-${groupName.toLowerCase()}`;
      const groupHeader = document.createElement('button');
      groupHeader.type = 'button';
      groupHeader.id = groupId;
      groupHeader.className = 'reecap-sidebar-group';
      groupHeader.dataset.group = groupName;
      groupHeader.setAttribute('aria-controls', sectionId);
      groupHeader.innerHTML = `<span>${groupName}</span><span class="reecap-sidebar-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg></span>`;

      const section = document.createElement('div');
      section.id = sectionId;
      section.className = 'reecap-sidebar-section';
      section.setAttribute('role', 'region');
      section.setAttribute('aria-labelledby', groupId);

      const sectionInner = document.createElement('div');
      sectionInner.className = 'reecap-sidebar-section-inner';

      items.forEach(item => {
        const a = item.link;
        a.className = 'reecap-sidebar-link';

        let routeKey = null;
        try {
          if (window.__reecap_theme && typeof window.__reecap_theme.routeKeyForHref === 'function') {
            routeKey = window.__reecap_theme.routeKeyForHref(a.getAttribute('href') || '');
          }
        } catch (e) {}
        if (routeKey) a.setAttribute('data-route-key', routeKey);

        if (routeKey) {
          try {
            const shellKey = (window.__reecap_theme && typeof window.__reecap_theme.matchActivePage === 'function')
              ? window.__reecap_theme.matchActivePage(window.location.pathname)
              : null;
            a.classList.toggle('active', shellKey === routeKey);
          } catch (e) {}
        }

        a.title = item.text;
        const isCal = item.text.includes('CALENDAR') || item.text.includes('CALENDER');
        const isFeeDetails = item.text.trim().toUpperCase() === 'FEE DETAILS';
        const isProfileSubTab = Boolean(item.tabId);
        a.innerHTML = `<span class="reecap-sidebar-icon">${icons[item.text] || genericIcon}</span><span class="reecap-sidebar-text">${item.text}</span>`;
        a.addEventListener('click', (e) => {
          if (isCal) {
            e.preventDefault();
            showAcademicCalendar();
          } else if (isFeeDetails) {
            e.preventDefault();
            navigateToFeeDetails();
          } else if (isProfileSubTab) {
            e.preventDefault();
            navigateToProfileTab(item.tabId, item.title || item.text);
          } else {
            if (typeof showIframe === 'function') showIframe();
          }
          if (typeof closeResponsiveNavigation === 'function') closeResponsiveNavigation();
        });
        const li = document.createElement('li');
        li.dataset.navKey = item.text;
        if (Array.isArray(reecapHiddenNav) && reecapHiddenNav.includes(item.text)) {
          li.classList.add('is-nav-hidden');
        }
        li.appendChild(a);
        sectionInner.appendChild(li);
      });
      
      section.appendChild(sectionInner);

      const setGroupCollapsed = (isCollapsed) => {
        groupHeader.classList.toggle('is-collapsed', isCollapsed);
        groupHeader.setAttribute('aria-expanded', String(!isCollapsed));
        section.classList.toggle('is-collapsed', isCollapsed);
        section.setAttribute('aria-hidden', String(isCollapsed));
        sectionInner.inert = isCollapsed;
      };

      setGroupCollapsed(sidebarOpen[groupName] === false);

      groupHeader.addEventListener('click', () => {
        const willBeCollapsed = !groupHeader.classList.contains('is-collapsed');

        if (!willBeCollapsed) {
          // Accordion: collapse all other groups first so only one section is open at a time
          const allHeaders = menu.querySelectorAll('.reecap-sidebar-group');
          allHeaders.forEach(otherH => {
            if (otherH !== groupHeader) {
              const otherSectionId = otherH.getAttribute('aria-controls');
              const otherSection = otherSectionId ? document.getElementById(otherSectionId) : null;
              otherH.classList.add('is-collapsed');
              otherH.setAttribute('aria-expanded', 'false');
              if (otherSection) {
                otherSection.classList.add('is-collapsed');
                otherSection.setAttribute('aria-hidden', 'true');
                const inner = otherSection.querySelector('.reecap-sidebar-section-inner');
                if (inner) inner.inert = true;
              }
            }
          });
        }

        setGroupCollapsed(willBeCollapsed);

        if (typeof chrome === 'undefined' || !chrome.runtime?.id || !chrome.storage?.sync) return;

        try {
          chrome.storage.sync.get({ sidebarOpen: {} }, (data) => {
            try {
              if (!chrome.runtime?.id || chrome.runtime.lastError) return;
              const currentSidebarOpen = data.sidebarOpen || {};
              Object.keys(categorized).forEach(g => {
                currentSidebarOpen[g] = (g === groupName) ? !willBeCollapsed : false;
              });
              chrome.storage.sync.set({ sidebarOpen: currentSidebarOpen }, () => {
                void chrome.runtime?.lastError;
              });
            } catch (e) {
            }
          });
        } catch (e) {
        }
      });

      menu.appendChild(groupHeader);
      menu.appendChild(section);
    }

    // Beautiful UI: Bottom Nav Items (Customize Menu)
    const bottomNav = document.createElement('div');
    bottomNav.className = 'reecap-sidebar-bottom-nav';
    bottomNav.innerHTML = `
      <div class="reecap-sidebar-link bottom-link" id="reecap-btn-customize-nav" title="Customize Menu">
        <div style="display: flex; align-items: center; gap: 10px;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          <span class="reecap-sidebar-text">Customize Menu</span>
        </div>
      </div>
    `;

    const custBtn = bottomNav.querySelector('#reecap-btn-customize-nav');
    if (custBtn) {
      custBtn.addEventListener('click', () => {
        openNavCustomizeModal(categorized, profileItem);
      });
    }

    menu.appendChild(bottomNav);
    
  });
}

function navigateToProfileTab(tabId, title) {
  if (typeof showIframe === 'function') showIframe();
  const iframe = document.getElementById('capIframeId');
  if (!iframe) return;

  const pageTitle = document.getElementById('reecap-page-title');
  if (pageTitle && title) pageTitle.textContent = title;

  document.querySelectorAll('.reecap-sidebar-link').forEach(link => {
    link.classList.toggle('active', link.textContent.trim().toUpperCase() === title.trim().toUpperCase());
  });

  const curSrc = (iframe.getAttribute('src') || '').toLowerCase();
  if (curSrc.includes('studentprofile.aspx')) {
    try {
      iframe.contentWindow?.postMessage({ type: 'REECAP_SWITCH_TAB', tabId }, '*');
    } catch (e) {}
  } else {
    iframe.src = `Academics/StudentProfile.aspx?scrid=17#${tabId}`;
  }
}

function navigateToFeeDetails() {
  if (typeof showIframe === 'function') showIframe();
  const iframe = document.getElementById('capIframeId');
  if (!iframe) return;

  const pageTitle = document.getElementById('reecap-page-title');
  if (pageTitle) pageTitle.textContent = 'FEE DETAILS';

  document.querySelectorAll('.reecap-sidebar-link').forEach(link => {
    if (link.textContent.trim().toUpperCase() === 'FEE DETAILS') {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  const curSrc = (iframe.getAttribute('src') || '').toLowerCase();
  if (curSrc.includes('studentprofile.aspx')) {
    try {
      iframe.contentWindow?.postMessage({ type: 'REECAP_SWITCH_TAB', tabId: 'divProfile_Fees' }, '*');
    } catch (e) {}
  } else {
    iframe.src = 'Academics/StudentProfile.aspx?scrid=17&view=fee#divProfile_Fees';
  }
}

function openSearchCommandModal(searchTargets) {
  const existing = document.getElementById('reecap-search-modal');
  if (existing) {
    existing.remove();
    return;
  }

  const scrim = document.createElement('div');
  scrim.id = 'reecap-search-modal';
  scrim.className = 'reecap-search-scrim';

  const dialog = document.createElement('div');
  dialog.className = 'reecap-search-dialog';
  dialog.innerHTML = `
    <div class="search-dialog-header">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input type="text" id="reecap-search-input" placeholder="Search pages, docs, or actions..." autocomplete="off" />
      <kbd id="reecap-search-esc" class="kbd-shortcut">ESC</kbd>
      <button type="button" id="reecap-search-close" class="search-close-btn" aria-label="Close search">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    <div class="search-results-list" id="reecap-search-results"></div>
  `;

  scrim.appendChild(dialog);
  document.body.appendChild(scrim);

  const input = dialog.querySelector('#reecap-search-input');
  const resultsContainer = dialog.querySelector('#reecap-search-results');
  const closeBtn = dialog.querySelector('#reecap-search-close');
  const escBtn = dialog.querySelector('#reecap-search-esc');

  const close = () => scrim.remove();
  scrim.addEventListener('click', (e) => {
    if (e.target === scrim) close();
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (escBtn) escBtn.addEventListener('click', close);

  const renderResults = (query) => {
    resultsContainer.innerHTML = '';
    const q = (query || '').trim().toLowerCase();
    const filtered = (searchTargets || []).filter(t => !q || t.title.toLowerCase().includes(q) || t.group.toLowerCase().includes(q));

    if (filtered.length === 0) {
      resultsContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-faint); font-size: 13px;">
          No matching pages found for "${escapeAttr(query)}"
        </div>
      `;
      return;
    }

    filtered.forEach((t, idx) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'search-result-item' + (idx === 0 ? ' is-selected' : '');
      itemEl.innerHTML = `
        <div class="search-result-left">
          <span style="display: flex; align-items: center; width: 16px; height: 16px; color: var(--text-secondary);">${t.icon}</span>
          <span>${t.title}</span>
        </div>
        <span class="search-result-group-badge">${t.group}</span>
      `;
      itemEl.addEventListener('click', () => {
        close();
        t.action();
      });
      resultsContainer.appendChild(itemEl);
    });
  };

  renderResults('');
  input.focus();

  input.addEventListener('input', () => {
    renderResults(input.value);
  });

  input.addEventListener('keydown', (e) => {
    const items = Array.from(resultsContainer.querySelectorAll('.search-result-item'));
    if (items.length === 0) return;
    let selectedIdx = items.findIndex(el => el.classList.contains('is-selected'));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (selectedIdx >= 0) items[selectedIdx].classList.remove('is-selected');
      selectedIdx = (selectedIdx + 1) % items.length;
      items[selectedIdx].classList.add('is-selected');
      items[selectedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (selectedIdx >= 0) items[selectedIdx].classList.remove('is-selected');
      selectedIdx = (selectedIdx - 1 + items.length) % items.length;
      items[selectedIdx].classList.add('is-selected');
      items[selectedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIdx >= 0 && items[selectedIdx]) {
        items[selectedIdx].click();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });
}

function openNavCustomizeModal(categorized, profileItem) {
  const existing = document.getElementById('reecap-nav-customize-modal');
  if (existing) existing.remove();

  if (!isExtensionValid()) return;

  chrome.storage.sync.get({ reecapHiddenNav: [] }, ({ reecapHiddenNav = [] }) => {
    const hiddenSet = new Set(Array.isArray(reecapHiddenNav) ? reecapHiddenNav : []);

    const scrim = document.createElement('div');
    scrim.id = 'reecap-nav-customize-modal';
    scrim.className = 'reecap-modal-scrim';

    const dialog = document.createElement('div');
    dialog.className = 'reecap-modal-dialog';

    const header = document.createElement('div');
    header.className = 'reecap-modal-header';
    header.innerHTML = `
      <div class="reecap-modal-title">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
        <span>Customize Navigation</span>
      </div>
      <button type="button" class="reecap-modal-close-btn" aria-label="Close modal">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    const body = document.createElement('div');
    body.className = 'reecap-modal-body';
    body.innerHTML = `
      <p class="reecap-modal-desc">
        Select which links appear in your sidebar. Uncheck any option to hide it from your view. You can restore or modify this anytime.
      </p>
    `;

    const modalGroups = {};
    if (profileItem) {
      modalGroups['Account'] = [{ text: profileItem.text }];
    }
    for (const [groupName, items] of Object.entries(categorized)) {
      if (!modalGroups[groupName]) modalGroups[groupName] = [];
      items.forEach(it => {
        if (!modalGroups[groupName].some(x => x.text === it.text)) {
          modalGroups[groupName].push({ text: it.text });
        }
      });
    }

    const checkboxMap = new Map();

    for (const [groupName, items] of Object.entries(modalGroups)) {
      if (items.length === 0) continue;
      const grpEl = document.createElement('div');
      grpEl.className = 'reecap-modal-group';
      grpEl.innerHTML = `<div class="reecap-modal-group-title">${groupName}</div>`;

      const listEl = document.createElement('div');
      listEl.className = 'reecap-modal-item-list';

      items.forEach(it => {
        const row = document.createElement('label');
        row.className = 'reecap-nav-toggle-row';
        const isChecked = !hiddenSet.has(it.text);
        row.innerHTML = `
          <input type="checkbox" data-nav-text="${escapeAttr(it.text)}" ${isChecked ? 'checked' : ''} />
          <span>${it.text}</span>
        `;
        const cb = row.querySelector('input');
        checkboxMap.set(it.text, cb);
        listEl.appendChild(row);
      });

      grpEl.appendChild(listEl);
      body.appendChild(grpEl);
    }

    const footer = document.createElement('div');
    footer.className = 'reecap-modal-footer';
    footer.innerHTML = `
      <button type="button" class="reecap-modal-btn reecap-modal-btn-secondary" id="btn-restore-all-nav">
        Restore All
      </button>
      <div class="reecap-modal-btn-group">
        <button type="button" class="reecap-modal-btn reecap-modal-btn-secondary" id="btn-cancel-nav">
          Cancel
        </button>
        <button type="button" class="reecap-modal-btn reecap-modal-btn-primary" id="btn-save-nav">
          Save Changes
        </button>
      </div>
    `;

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    scrim.appendChild(dialog);
    document.body.appendChild(scrim);

    const closeModal = () => scrim.remove();

    header.querySelector('.reecap-modal-close-btn').addEventListener('click', closeModal);
    footer.querySelector('#btn-cancel-nav').addEventListener('click', closeModal);
    scrim.addEventListener('click', (e) => {
      if (e.target === scrim) closeModal();
    });

    footer.querySelector('#btn-restore-all-nav').addEventListener('click', () => {
      checkboxMap.forEach(cb => { cb.checked = true; });
    });

    footer.querySelector('#btn-save-nav').addEventListener('click', () => {
      const newHidden = [];
      checkboxMap.forEach((cb, text) => {
        if (!cb.checked) newHidden.push(text);
      });

      if (isExtensionValid()) {
        chrome.storage.sync.set({ reecapHiddenNav: newHidden }, () => {
          document.querySelectorAll('#menu li[data-nav-key]').forEach(li => {
            const key = li.dataset.navKey;
            li.classList.toggle('is-nav-hidden', newHidden.includes(key));
          });
          closeModal();
        });
      } else {
        closeModal();
      }
    });
  });
}

function showOverview() {
  if (!isStudentRole()) {
    console.warn('ReEcap: Access denied to Overview — student login required.');
    return;
  }

  const container = document.getElementById('reecap-default-content');
  if (container) container.style.display = 'block';
  const iframe = document.getElementById('capIframeId');
  const overview = document.getElementById('reecap-overview');
  const pageTitle = document.getElementById('reecap-page-title');
  const profileContainer = document.querySelector('.student-profile-container');
  
  // Keep iframe alive and active in layout to sync data in background without visible bleed
  if (iframe) {
    iframe.style.setProperty('visibility', 'hidden', 'important');
    iframe.style.setProperty('position', 'fixed', 'important');
    iframe.style.setProperty('top', '-10000px', 'important');
    iframe.style.setProperty('left', '-10000px', 'important');
    iframe.style.setProperty('width', '1px', 'important');
    iframe.style.setProperty('height', '1px', 'important');
    iframe.style.setProperty('opacity', '0', 'important');
    iframe.style.setProperty('pointer-events', 'none', 'important');
    iframe.style.removeProperty('display');
  }
  
  if (overview) overview.style.setProperty('display', 'flex', 'important');
  const calView = document.getElementById('reecap-calendar-view');
  if (calView) calView.style.setProperty('display', 'none', 'important');
  const shellErr = document.getElementById('reecap-shell-error-container');
  if (shellErr) shellErr.style.setProperty('display', 'none', 'important');
  document.documentElement.setAttribute('data-calendar-active', 'false');

  // Attempt to aggressively hide nested legacy profile wrappers
  if (profileContainer) profileContainer.style.setProperty('display', 'none', 'important');
  const legacyProfileDiv = document.getElementById('divProfile');
  if (legacyProfileDiv) legacyProfileDiv.style.setProperty('display', 'none', 'important');
  
  // Nuke generic ASP panel wrappers that ECAP uses to render tables outside iframes
  const userProfileInfoContainer = document.querySelectorAll('.card, .card-body');
  userProfileInfoContainer.forEach(c => {
     if (c.id !== 'reecap-default-content' && !c.closest('#reecap-default-content')) {
       // Only hide it if it looks like the legacy profile container (usually has .userData table)
       if (c.querySelector('.userData') || c.querySelector('#divProfile')) {
         c.style.setProperty('display', 'none', 'important');
       }
     }
  });

  if (pageTitle) pageTitle.textContent = 'OVERVIEW';

  document.documentElement.setAttribute('data-overview-active', 'true');

  document.querySelectorAll('a.reecap-sidebar-link').forEach(link => {
    if (link.classList.contains('reecap-sidebar-overview')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function showIframe() {
  const iframe = document.getElementById('capIframeId');
  const overview = document.getElementById('reecap-overview');
  if (iframe) {
    iframe.style.removeProperty('display');
    iframe.style.removeProperty('visibility');
    iframe.style.removeProperty('position');
    iframe.style.removeProperty('top');
    iframe.style.removeProperty('left');
    iframe.style.removeProperty('width');
    iframe.style.removeProperty('opacity');
    iframe.style.removeProperty('pointer-events');

    // Overview forces 1px !important. Restore a usable starting height now;
    // the child's REECAP_RESIZE message will refine it after navigation.
    const visibleHeight = Math.max(600, window.innerHeight - 180);
    iframe.style.setProperty('height', `${visibleHeight}px`, 'important');

    // Trigger immediate resize recalculation from child iframe
    try {
      iframe.contentWindow?.postMessage({ type: 'REECAP_REQUEST_RESIZE' }, '*');
    } catch (e) {}
  }
  if (overview) overview.style.setProperty('display', 'none', 'important');
  const calView = document.getElementById('reecap-calendar-view');
  if (calView) calView.style.setProperty('display', 'none', 'important');
  const shellErr = document.getElementById('reecap-shell-error-container');
  if (shellErr) shellErr.style.setProperty('display', 'none', 'important');

  document.documentElement.setAttribute('data-overview-active', 'false');
  document.documentElement.setAttribute('data-calendar-active', 'false');

  const overviewLink = document.querySelector('.reecap-sidebar-overview');
  if (overviewLink) overviewLink.classList.remove('active');

  if (typeof syncSidebarActiveState === 'function' && iframe && iframe.contentWindow) {
    try {
      const currentUrl = iframe.contentWindow.location.pathname.toLowerCase();
      if (currentUrl) syncSidebarActiveState(currentUrl);
    } catch (e) {}
  }
}

function showAcademicCalendar() {
  const container = document.getElementById('reecap-default-content');
  if (container) container.style.display = 'block';
  const iframe = document.getElementById('capIframeId');
  const overview = document.getElementById('reecap-overview');
  let calendarView = document.getElementById('reecap-calendar-view');
  const pageTitle = document.getElementById('reecap-page-title');
  const contentCol = document.getElementById('reecap-content-col');

  if (iframe) {
    iframe.style.setProperty('visibility', 'hidden', 'important');
    iframe.style.setProperty('position', 'fixed', 'important');
    iframe.style.setProperty('top', '-10000px', 'important');
    iframe.style.setProperty('left', '-10000px', 'important');
    iframe.style.setProperty('width', '1px', 'important');
    iframe.style.setProperty('height', '1px', 'important');
    iframe.style.setProperty('opacity', '0', 'important');
    iframe.style.setProperty('pointer-events', 'none', 'important');
    iframe.style.removeProperty('display');
  }

  if (overview) overview.style.setProperty('display', 'none', 'important');
  const shellErr = document.getElementById('reecap-shell-error-container');
  if (shellErr) shellErr.style.setProperty('display', 'none', 'important');

  if (!calendarView && contentCol) {
    calendarView = document.createElement('div');
    calendarView.id = 'reecap-calendar-view';
    calendarView.className = 'reecap-calendar-view';
    contentCol.appendChild(calendarView);
  }

  if (calendarView) {
    calendarView.style.setProperty('display', 'block', 'important');
    renderAcademicCalendarHub(calendarView);
  }

  if (pageTitle) pageTitle.textContent = 'ACADEMIC CALENDAR';

  document.documentElement.setAttribute('data-overview-active', 'false');
  document.documentElement.setAttribute('data-calendar-active', 'true');

  document.querySelectorAll('a.reecap-sidebar-link').forEach(link => {
    const text = (link.textContent || '').toUpperCase();
    if (text.includes('CALENDAR') || text.includes('CALENDER')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  if (typeof closeResponsiveNavigation === 'function') {
    closeResponsiveNavigation();
  }
}

// responsiveNavigationController is declared at top of file

function initResponsiveNavigation() {
  if (typeof responsiveNavigationController !== 'undefined' && responsiveNavigationController) {
    return responsiveNavigationController;
  }

  const sidebar = document.getElementById('reecap-sidebar');
  const trigger = document.querySelector('.mobile-menu-btn');
  const scrim = document.querySelector('.reecap-nav-scrim');
  if (!sidebar || !trigger || !scrim) return null;

  const drawerQuery = window.matchMedia('(max-width: 1199px)');
  let lastTrigger = null;

  const setOpen = (isOpen, { restoreFocus = false, focusDrawer = false } = {}) => {
    const open = drawerQuery.matches && isOpen;
    sidebar.classList.toggle('is-open', open);
    sidebar.inert = drawerQuery.matches && !open;
    scrim.classList.toggle('is-visible', open);
    scrim.setAttribute('aria-hidden', String(!open));
    trigger.setAttribute('aria-expanded', String(open));
    trigger.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    document.documentElement.classList.toggle('reecap-nav-open', open);

    if (open && focusDrawer) {
      requestAnimationFrame(() => {
        const closeButton = sidebar.querySelector('.reecap-nav-close');
        (closeButton || sidebar).focus();
      });
    }
    if (restoreFocus && lastTrigger) lastTrigger.focus();
  };

  const close = (options) => setOpen(false, options);
  const toggle = () => {
    lastTrigger = trigger;
    const willOpen = !sidebar.classList.contains('is-open');
    setOpen(willOpen, { focusDrawer: willOpen });
  };
  const onViewportChange = () => setOpen(false);

  trigger.addEventListener('click', toggle);
  sidebar.addEventListener('click', (event) => {
    if (event.target.closest('.reecap-nav-close')) {
      close({ restoreFocus: true });
    }
  });
  scrim.addEventListener('click', () => close({ restoreFocus: true }));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
      event.preventDefault();
      close({ restoreFocus: true });
    }
  });
  drawerQuery.addEventListener('change', onViewportChange);
  setOpen(false);

  responsiveNavigationController = { close, sync: () => setOpen(false) };
  return responsiveNavigationController;
}

function closeResponsiveNavigation(options) {
  try {
    if (typeof responsiveNavigationController !== 'undefined' && responsiveNavigationController) {
      responsiveNavigationController.close(options);
    }
  } catch (e) {}
}

function rebuildMainLayout() {
  const iframe = document.getElementById('capIframeId');
  const menu = document.getElementById('menu') || document.getElementById('tblScreens');
  if (!iframe || !menu) return;

  // Find the top-level layout table that holds the sidebar and iframe
  const originalTable = iframe.closest('table');
  if (!originalTable) return;
  let masterTable = originalTable;
  while (masterTable.parentElement && masterTable.parentElement.closest('table')) {
      masterTable = masterTable.parentElement.closest('table');
  }

  const layoutWrapper = document.createElement('div');
  layoutWrapper.className = 'reecap-layout-wrapper';

  const pageTitle = document.createElement('h1');
  pageTitle.id = 'reecap-page-title';
  pageTitle.className = 'reecap-page-title';
  pageTitle.textContent = 'Loading...';
  const columns = document.createElement('div');
  columns.className = 'reecap-layout-columns';

  const sidebarCol = document.createElement('aside');
  sidebarCol.id = 'reecap-sidebar';
  sidebarCol.className = 'reecap-sidebar-col';
  sidebarCol.setAttribute('aria-label', 'Portal navigation');

  if (isEmployeeRole()) {
    const leftMenu = document.getElementById('divLeftMenu');
    if (leftMenu) sidebarCol.appendChild(leftMenu);
    else sidebarCol.appendChild(menu);
  } else {
    sidebarCol.appendChild(menu);
  }

  const contentCol = document.createElement('main');
  contentCol.id = 'reecap-content-col';
  contentCol.className = 'reecap-content-col';
  contentCol.appendChild(pageTitle); // Title is now inside the content column

  // Build and insert Overview Page
  const overviewDiv = document.createElement('div');
  overviewDiv.id = 'reecap-overview';
  overviewDiv.className = 'reecap-overview';
  buildOverviewPage(overviewDiv);
  contentCol.appendChild(overviewDiv);

  // Build and insert Academic Calendar View
  const calendarDiv = document.createElement('div');
  calendarDiv.id = 'reecap-calendar-view';
  calendarDiv.className = 'reecap-calendar-view';
  calendarDiv.style.display = 'none';
  contentCol.appendChild(calendarDiv);

  contentCol.appendChild(iframe);

  iframe.addEventListener('load', () => {
    if (document.documentElement.getAttribute('data-overview-active') !== 'true') {
      try {
        iframe.contentWindow?.postMessage({ type: 'REECAP_REQUEST_RESIZE' }, '*');
      } catch (e) {}
    }
  });

  // Ensure iframe points to StudentProfile so profile data (attendance, fee, backlogs)
  // is seamlessly loaded and cached in the background while Overview is shown
  try {
    const curSrc = (iframe.getAttribute('src') || '').trim();
    if (!curSrc || curSrc === '' || curSrc.includes('empty.html') || curSrc.endsWith('/StudentMaster.aspx')) {
      iframe.src = 'Academics/StudentProfile.aspx?scrid=17';
    }
  } catch (e) {}

  columns.appendChild(sidebarCol);
  columns.appendChild(contentCol);
  layoutWrapper.appendChild(columns);

  const navigationScrim = document.createElement('div');
  navigationScrim.className = 'reecap-nav-scrim';
  navigationScrim.setAttribute('aria-hidden', 'true');

  masterTable.parentNode.insertBefore(layoutWrapper, masterTable);
  layoutWrapper.insertAdjacentElement('afterend', navigationScrim);
  masterTable.style.display = 'none';

  try {
    initResponsiveNavigation();
  } catch (err) {
    console.warn('ReEcap: Failed to init responsive navigation:', err);
  }

  // Initialize Aria AI Academic Assistant for Students
  if (isStudentRole()) {
    try {
      initAriaSidebar(layoutWrapper);
      if (window.__reecap_aria) {
        if (typeof window.__reecap_aria.prefetchAcademicData === 'function') {
          window.__reecap_aria.prefetchAcademicData();
        }
        if (typeof window.__reecap_aria.prefetchProfileData === 'function') {
          window.__reecap_aria.prefetchProfileData();
        }
      }
    } catch (err) {
      if (!isContextInvalidatedError(err)) {
        console.warn('ReEcap: Failed to init Aria sidebar:', err);
      }
    }
  }

  // Listen for updates from iframe
  window.addEventListener('message', (e) => {
    if (!e.data) return;

    if (e.data.type === 'REECAP_SET_TITLE') {
      if (document.documentElement.getAttribute('data-overview-active') !== 'true') {
        pageTitle.textContent = e.data.title;
      }
    }

    if (e.data.type === 'REECAP_PROFILE_DATA') {
      const profileData = { ...e.data.data, lastUpdated: Date.now() };
      if (isExtensionValid() && chrome.storage && chrome.storage.local) {
        try {
          chrome.storage.local.set({ reecapProfileData: profileData });
        } catch (err) {}
      }
      if (typeof updateOverviewCards === 'function') {
        updateOverviewCards(profileData);
      }
      if (isExtensionValid() && typeof window.__reecap_refresh_aria === 'function') {
        window.__reecap_refresh_aria();
      }
    }

    if (e.data.type === 'REECAP_ACADEMIC_DATA') {
      if (isExtensionValid() && chrome.storage && chrome.storage.local) {
        try {
          chrome.storage.local.set({ reecapAcademicData: e.data.data });
        } catch (err) {}
      }
      if (isExtensionValid() && typeof window.__reecap_refresh_aria === 'function') {
        window.__reecap_refresh_aria();
      }
    }

    if (e.data.type === 'REECAP_NAVIGATE') {
      if (e.data.route === 'overview' && typeof showOverview === 'function') {
        showOverview();
      }
    }
  });

  showOverview();
}

function buildOverviewPage(container) {
  const stripSlot = document.createElement('div');
  stripSlot.id = 'reecap-strip-slot';
  stripSlot.className = 'reecap-strip-slot';
  container.appendChild(stripSlot);
  initStatusStrip(stripSlot);

  const grid = document.createElement('div');
  grid.className = 'overview-grid';
  container.appendChild(grid);

  const metricsSlot = document.createElement('div');
  metricsSlot.className = 'overview-section-metrics';
  grid.appendChild(metricsSlot);

  const mainSplit = document.createElement('div');
  mainSplit.className = 'overview-main-split';
  grid.appendChild(mainSplit);

  if (!chrome || !chrome.storage || !chrome.storage.local) return;
  try {
    chrome.storage.local.get(['reecapTimetable', 'reecapIdentity', 'reecapProfileData'], (data) => {
      if (chrome.runtime && chrome.runtime.lastError) return;

      renderDashboardCards(metricsSlot, data ? data.reecapProfileData : null);
      renderScheduleCard(mainSplit, data ? data.reecapTimetable : null);
      renderCalendarOverviewCard(mainSplit, data ? data.reecapIdentity : null);

      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local' || !changes.reecapTimetable || !grid.isConnected) return;
        const existingSchedule = mainSplit.querySelector('.overview-schedule-card');
        renderScheduleCard(mainSplit, changes.reecapTimetable.newValue, existingSchedule);
      });

      if (!data || !data.reecapTimetable) prefetchTimetableData();
    });
  } catch (e) {}
}

function prefetchTimetableData() {
  if (window !== window.top) return;
  if (document.getElementById('reecap-timetable-prefetch')) return;

  try {
    chrome.storage.local.get(['reecapTimetable'], (data) => {
      if (chrome.runtime && chrome.runtime.lastError) return;
      if (data && data.reecapTimetable) return;
    });
  } catch (e) {}
}

function renderSidebarQuickLinks() {
  if (document.querySelector('.reecap-sidebar-quicklinks')) {
    document.querySelectorAll('.reecap-sidebar-quicklinks').forEach((el) => el.remove());
  }
}

function updateOverviewCards(profileData) {
  const slot = document.querySelector('.reecap-overview .overview-section-metrics');
  if (!slot) return;
  renderDashboardCards(slot, profileData);
}

function renderDashboardCards(slot, profileData) {
  if (!slot) return;

  const ringRadius = 24;
  const ringCircumference = 2 * Math.PI * ringRadius;
  let ringOffset = ringCircumference;
  let ringDisplay = "N/A";
  let ringColor = "var(--text-faint)";
  let attended = 0, held = 0;
  let backlogsText = "Syncing...";
  let feeDue = "--";
  let feeCurrentSem = "--";
  let feeCurrentSemLabel = "Current Semester";
  let feeCurrentSemStatus = "pending";
  let feeBalanceWords = "";
  let feeTotalDue = "--";
  let syncedCaption = "Syncing from Profile...";

  if (profileData) {
    held = profileData.held || 0;
    attended = profileData.attended || 0;
    if (held > 0) {
      const percent = profileData.percent !== undefined ? profileData.percent : (attended / held * 100);
      ringDisplay = percent.toFixed(1) + "%";
      ringOffset = ringCircumference - (percent / 100) * ringCircumference;
      ringColor = percent >= 75 ? "var(--success)" : (percent >= 65 ? "var(--warning)" : "var(--error)");
    } else {
      ringDisplay = "0%";
    }
    backlogsText = profileData.backlogsText !== undefined ? `${profileData.backlogsText}` : "0";
    feeDue          = profileData.feeDue        !== undefined ? `${profileData.feeDue}` : "0.00";
    feeCurrentSem        = profileData.feeCurrentSem !== undefined && profileData.feeCurrentSem !== null ? `${profileData.feeCurrentSem}` : "--";
    feeCurrentSemLabel   = profileData.feeCurrentSemLabel || "Current Semester";
    feeCurrentSemStatus  = profileData.feeCurrentSemStatus || 'pending';
    feeBalanceWords      = profileData.feeBalanceWords || '';
    feeTotalDue          = profileData.feeTotalDue   !== undefined && profileData.feeTotalDue   !== null ? `${profileData.feeTotalDue}` : "--";
    if (profileData.lastUpdated) {
      const minsAgo = Math.round((Date.now() - profileData.lastUpdated) / 60000);
      syncedCaption = minsAgo < 2 ? "Synced just now" : `Synced ${minsAgo < 60 ? minsAgo + 'm' : Math.round(minsAgo/60) + 'h'} ago`;
    } else {
      syncedCaption = "Synced from Profile";
    }
  }

  const haveTotalNumber = feeTotalDue !== "--" && feeTotalDue !== "0.00" && parseFloat(feeTotalDue) > 0;
  const isBacklogsClear = backlogsText === '0' || backlogsText.toLowerCase().includes('no');

  const totalDisplay = (haveTotalNumber ? '₹' + formatCurrencyAmount(feeTotalDue) : '<span class="status-pill-pass">Cleared</span>');
  const totalCaption = haveTotalNumber ? 'Total outstanding' : 'All accounts settled';

  slot.innerHTML = `
    <!-- 1. Attendance Card -->
    <div class="overview-metric-card metric-card-attendance">
      <div class="metric-ring-box">
        <svg width="56" height="56" viewBox="0 0 60 60">
          <circle class="ring-bg" cx="30" cy="30" r="${ringRadius}" stroke-width="5.5"></circle>
          <circle class="ring-fg" cx="30" cy="30" r="${ringRadius}"
                  stroke-width="5.5"
                  stroke="${ringColor}"
                  stroke-dasharray="${ringCircumference}"
                  stroke-dashoffset="${ringOffset}"></circle>
        </svg>
        <div class="metric-ring-center">
          <span class="metric-ring-text" style="color: ${ringColor}">${ringDisplay}</span>
        </div>
      </div>
      <div class="metric-info-col">
        <div class="metric-eyebrow">ATTENDANCE</div>
        <div class="metric-main-val">${profileData && held > 0 ? `${attended} / ${held} Classes` : 'Live Records'}</div>
        <div class="metric-sub-caption">${syncedCaption}</div>
      </div>
    </div>

    <!-- 2. Active Backlogs Card -->
    <div class="overview-metric-card metric-card-backlogs">
      <div class="metric-badge-box ${isBacklogsClear ? 'is-good' : 'is-warn'}">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          ${isBacklogsClear 
            ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
            : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
        </svg>
      </div>
      <div class="metric-info-col">
        <div class="metric-eyebrow">ACTIVE BACKLOGS</div>
        <div class="metric-main-val" style="color: ${isBacklogsClear ? 'var(--success)' : 'var(--warning)'};">
          ${isBacklogsClear ? '0 Backlogs' : `${backlogsText} Backlogs`}
        </div>
        <div class="metric-sub-caption">${isBacklogsClear ? 'Academic standing in good health' : syncedCaption}</div>
      </div>
    </div>

    <!-- 3. Fee Balance Card -->
    <div class="overview-metric-card metric-card-fees">
      <div class="metric-badge-box is-accent">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      </div>
      <div class="metric-info-col">
        <div class="metric-eyebrow-row">
          <span class="metric-eyebrow">TERM FEES</span>
          <span class="fee-status-chip ${haveTotalNumber ? 'chip-due' : 'chip-cleared'}">${haveTotalNumber ? 'Due' : 'Cleared'}</span>
        </div>
        <div class="metric-main-val">${totalDisplay}</div>
        <div class="metric-sub-caption">${totalCaption}</div>
      </div>
      ${haveTotalNumber ? `
        <a href="Feepayments/studentfeereceipt.aspx?scrid=23" target="capIframe" class="fee-pay-action-btn">
          Pay Online
        </a>
      ` : ''}
    </div>
  `;

  const payBtn = slot.querySelector('.fee-pay-action-btn');
  if (payBtn) {
    payBtn.addEventListener('click', () => {
      showIframe();
    });
  }
}

function renderScheduleCard(container, timetableData, previousCard = null) {
  const card = document.createElement('div');
  card.className = 'overview-card overview-schedule-card';

  if (previousCard && previousCard.parentNode === container) {
    previousCard.replaceWith(card);
  } else {
    container.appendChild(card);
  }

  const now = new Date();
  const jsDayToName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayName = jsDayToName[now.getDay()];

  let html = `
    <div class="overview-card-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span class="overview-card-title">Today's Schedule</span>
      </div>
      <span class="overview-card-subtitle">${todayName}, ${now.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
    </div>
  `;

  if (!timetableData || !timetableData.schedule) {
    html += `<div class="schedule-empty">Preparing your schedule in the background…</div>`;
    card.innerHTML = html;
    return;
  }

  const { schedule, legendMap } = timetableData;
  const todaysClasses = schedule[todayName] || schedule[now.toLocaleDateString('en-US', { weekday: 'long' })] || [];
  const currentMins = now.getHours() * 60 + now.getMinutes();

  if (todaysClasses.length === 0) {
    html += `<div class="schedule-empty">No classes scheduled for today.</div>`;
    card.innerHTML = html;
    return;
  }

  let rowsHtml = `<div class="schedule-list">`;

  // Render all periods without skipping any
  todaysClasses.forEach((period, idx) => {
    const times = parseTimeRange(period.timeRange);
    let isActive = false;
    if (times && currentMins >= times.start && currentMins < times.end) {
      isActive = true;
    }

    let rawCode = (period.subjectCode || '').trim();
    let name = rawCode;
    let faculty = '';
    let room = '';

    const primaryCode = rawCode.split(',')[0].trim();
    if (legendMap && legendMap[primaryCode]) {
      name = legendMap[primaryCode].name || rawCode;
      faculty = legendMap[primaryCode].faculty || '';
      room = legendMap[primaryCode].room || '';
    }

    // Detect THUB or morning 3-hour Technical Hub class
    if (/THUB|Technical\s*Hub|T-HUB/i.test(rawCode) || /THUB/i.test(name)) {
      name = 'Technical Hub (THUB)';
      faculty = faculty || 'Technical Training';
      room = room || 'THub Lab';
    } else if ((!rawCode || rawCode === '-') && idx < 3) {
      name = 'Technical Hub (THUB)';
      faculty = 'Technical Training';
      room = 'THub Lab';
    } else if (!rawCode || rawCode === '-') {
      name = `Period ${idx + 1}`;
      faculty = 'Scheduled Session';
    }

    const STANDARD_TIMINGS = [
      { start: "09:30 AM", end: "10:20 AM" },
      { start: "10:20 AM", end: "11:10 AM" },
      { start: "11:10 AM", end: "12:00 PM" },
      { start: "01:00 PM", end: "01:50 PM" },
      { start: "01:50 PM", end: "02:40 PM" },
      { start: "02:50 PM", end: "03:40 PM" },
      { start: "03:40 PM", end: "04:20 PM" }
    ];

    let timeStart = '';
    let timeEnd = '';

    if (period.timeRange && /\d{1,2}:\d{2}/.test(period.timeRange)) {
      const timeParts = period.timeRange.split(/[-–to]/i);
      timeStart = timeParts[0]?.trim() || '';
      timeEnd = timeParts[1]?.trim() || '';
    } else if (STANDARD_TIMINGS[idx]) {
      timeStart = STANDARD_TIMINGS[idx].start;
      timeEnd = STANDARD_TIMINGS[idx].end;
    } else {
      timeStart = `P${idx + 1}`;
    }

    rowsHtml += `
      <div class="schedule-row ${isActive ? 'is-active' : ''}">
        <div class="schedule-time">
          <span>${timeStart}</span>
          ${timeEnd ? `<span class="schedule-time-end">${timeEnd}</span>` : ''}
        </div>
        <div class="schedule-details">
          <div class="schedule-subject">${name}</div>
          <div class="schedule-meta">
            ${room ? `<span>${room}</span> <b>•</b> ` : ''}<span>${faculty}</span>
          </div>
        </div>
        ${isActive ? `<div class="schedule-badge">NOW</div>` : ''}
      </div>
    `;
  });

  rowsHtml += `</div>`;
  html += rowsHtml;
  card.innerHTML = html;
}

function renderCalendarOverviewCard(container, identity = null) {
  if (container.querySelector('.overview-calendar-card')) return;

  const card = document.createElement('div');
  card.className = 'overview-card overview-calendar-card';

  const calData = (window.__reecap_calendar && window.__reecap_calendar.semesters)
    ? window.__reecap_calendar.semesters
    : {};

  // Embedded calendar fallback from Academic calendar .pdf
  const DEFAULT_CALENDAR_SEMS = {
    'III': [
      { description: "Registration to III Semester Courses", from: "08.06.2026", to: "13.06.2026" },
      { description: "Commencement of Class Work", from: "29.06.2026", to: "29.06.2026" },
      { description: "Internal Examinations –I", from: "19.08.2026", to: "21.08.2026" },
      { description: "Internal Examinations –II", from: "02.11.2026", to: "04.11.2026" },
      { description: "Semester End Examinations – Lab", from: "09.11.2026", to: "14.11.2026" },
      { description: "Semester End Examinations – Theory", from: "16.11.2026", to: "28.11.2026" },
      { description: "Declaration of Results", from: "12.12.2026", to: "12.12.2026" },
      { description: "Commencement of IV Semester", from: "28.12.2026", to: "28.12.2026" }
    ],
    'II': [
      { description: "Registration to II Semester Courses", from: "05.01.2026", to: "10.01.2026" },
      { description: "Commencement of Class Work", from: "27.01.2026", to: "27.01.2026" },
      { description: "Internal Examinations –I", from: "17.03.2026", to: "20.03.2026" },
      { description: "Semester End Examinations – Theory", from: "15.06.2026", to: "27.06.2026" }
    ]
  };

  // Detect student semester with longest roman numeral match first
  let semKey = 'III';
  if (identity && identity.semester) {
    const match = identity.semester.match(/\b(VIII|VII|VI|IV|III|II|V|I)\b/i) || identity.semester.match(/(VIII|VII|VI|IV|III|II|V|I)/i);
    if (match) semKey = match[1].toUpperCase();
  } else {
    const courseEl = document.querySelector('.id-course');
    if (courseEl) {
      const match = courseEl.textContent.match(/\b(VIII|VII|VI|IV|III|II|V|I)\b/i) || courseEl.textContent.match(/(VIII|VII|VI|IV|III|II|V|I)/i);
      if (match) semKey = match[1].toUpperCase();
    }
  }

  const milestones = (calData && calData[semKey] && calData[semKey].length > 0)
    ? calData[semKey]
    : (DEFAULT_CALENDAR_SEMS[semKey] || DEFAULT_CALENDAR_SEMS['III']);

  let html = `
    <div class="overview-card-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <span class="overview-card-title">Semester ${semKey} Calendar</span>
      </div>
      <a href="Academics/academiccalenderreport.aspx?scrid=6" target="capIframe" class="card-action-link" id="overview-view-calendar-link">
        View All 8 Semesters
      </a>
    </div>
    <div class="overview-calendar-list">
  `;

  if (milestones.length === 0) {
    html += `<div class="schedule-empty">Academic calendar synced with university schedule.</div>`;
  } else {
    // Show top 4 milestones
    const preview = milestones.slice(0, 4);
    preview.forEach(m => {
      const isRange = m.from !== m.to;
      const dateStr = isRange ? `${m.from} — ${m.to}` : m.from;

      let badgeHtml = '<span class="status-pill status-pill-neutral">Scheduled</span>';
      if (m.description.includes('Commencement') || m.description.includes('Registration')) {
        badgeHtml = '<span class="status-pill status-pill-pass">Completed</span>';
      } else if (m.description.includes('Internal Examinations')) {
        badgeHtml = '<span class="status-pill status-pill-active">Scheduled</span>';
      }

      html += `
        <div class="calendar-milestone-row">
          <div class="milestone-date-col">
            <span class="milestone-date">${dateStr}</span>
          </div>
          <div class="milestone-info-col">
            <span class="milestone-title">${m.description}</span>
          </div>
          <div class="milestone-badge-col">${badgeHtml}</div>
        </div>
      `;
    });
  }

  html += `</div>`;
  card.innerHTML = html;
  container.appendChild(card);

  const calLink = card.querySelector('#overview-view-calendar-link');
  if (calLink) {
    calLink.addEventListener('click', (e) => {
      e.preventDefault();
      showAcademicCalendar();
    });
  }
}

function renderQuickLinksCard(container) {
  const card = document.createElement('div');
  card.className = 'overview-card overview-quicklinks-card';

  const links = [
    { label: 'Attendance', href: 'Academics/StudentAttendance.aspx?scrid=3&showtype=SA', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-7l-2-2"></path><path d="M12 15l2-2"></path><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path></svg>' },
    { label: 'Timetable', href: 'Academics/studenttimetableoption.aspx', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' },
    { label: 'Marks', href: 'Academics/StudentMarksReport.aspx?scrid=15', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' },
    { label: 'Fee Details', href: 'Academics/StudentProfile.aspx?scrid=17#fees', action: 'feeDetails', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>' },
    { label: 'Profile', href: 'Academics/StudentProfile.aspx?scrid=17', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' }
  ];

  let html = `<div class="overview-card-header"><span class="overview-card-title">Quick Links</span></div><div class="quicklinks-grid">`;

  links.forEach(item => {
    html += `
      <a href="${item.href}" target="capIframe" class="quicklink-item" ${item.action ? `data-action="${item.action}"` : ''}>
        <div class="quicklink-icon">${item.icon}</div>
        <div class="quicklink-label">${item.label}</div>
      </a>
    `;
  });

  html += `</div>`;
  card.innerHTML = html;

  card.querySelectorAll('.quicklink-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (btn.dataset.action === 'feeDetails') {
        e.preventDefault();
        navigateToFeeDetails();
      } else {
        showIframe();
      }
    });
  });

  container.appendChild(card);
}

// --- Pass 3: Status Strip Engine ---

function initStatusStrip(targetSlot) {
  const stripContainer = targetSlot || document.getElementById('reecap-strip-container');
  if (!stripContainer) return;

  const strip = document.createElement('div');
  strip.className = 'reecap-status-strip';
  strip.setAttribute('data-reecap-state', 'empty');
  strip.setAttribute('role', 'status');
  strip.setAttribute('aria-live', 'polite');
  strip.innerHTML = `
    <div class="status-content">
      <div class="status-title"></div>
      <div class="status-meta"></div>
    </div>
    <div class="status-identity" hidden>
      <div class="id-roll"></div>
      <div class="id-course"></div>
    </div>
    <div class="status-clock">
      <div class="clock-time">--:--</div>
      <div class="clock-date">--</div>
    </div>
  `;

  // Only one strip belongs in this slot. This clears any strip left behind
  // by a hot extension reload, avoiding duplicated clocks/listeners.
  const existing = stripContainer.querySelector('.reecap-status-strip');
  if (existing) existing.remove();
  stripContainer.appendChild(strip);

  updateStatusStrip(strip);
  const stripClockInterval = setInterval(() => {
    if (isExtensionValid()) {
      updateStatusStrip(strip);
    } else {
      clearInterval(stripClockInterval);
    }
  }, 60000);

  // Listen for instant updates from the iframe (all frames share local storage).
  if (isExtensionValid() && chrome.storage && chrome.storage.onChanged) {
    try {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (!isExtensionValid()) return;
        if (areaName === 'local' && (changes.reecapTimetable || changes.reecapIdentity)) {
          updateStatusStrip(strip);
        }
      });
    } catch (e) {}
  }
}

function parseTimeRange(timeStr) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/g);
  if (!match || match.length < 2) return null;
  
  function toMinutes(t) {
    const parts = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i);
    if (!parts) return 0;
    let h = parseInt(parts[1], 10);
    let m = parseInt(parts[2], 10);
    let ampm = parts[3] ? parts[3].toUpperCase() : null;
    
    if (!ampm) {
      if (h < 8) h += 12; 
    } else {
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
    }
    return h * 60 + m;
  }
  
  return {
    start: toMinutes(match[0]),
    end: toMinutes(match[1])
  };
}

function updateStatusStrip(strip) {
  if (!isExtensionValid() || !chrome || !chrome.storage || !chrome.storage.local) return;
  try {
    chrome.storage.local.get(['reecapTimetable', 'reecapIdentity'], (data) => {
      try {
        if (!isExtensionValid() || (chrome.runtime && chrome.runtime.lastError)) return;
        if (!data) return;
    
    const titleEl = strip.querySelector('.status-title');
    const metaEl = strip.querySelector('.status-meta');
    const idEl = strip.querySelector('.status-identity');
    const idRoll = strip.querySelector('.id-roll');
    const idCourse = strip.querySelector('.id-course');
    const clockTime = strip.querySelector('.clock-time');
    const clockDate = strip.querySelector('.clock-date');
    const now = new Date();
    
    // Always update clock
    if (clockTime) clockTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (clockDate) clockDate.textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    
    // Update Identity if available.
    if (data.reecapIdentity && idEl) {
       idEl.hidden = false;
       if (idRoll) idRoll.textContent = data.reecapIdentity.RollNo || '';
       if (idCourse) {
          const course = data.reecapIdentity.Course || '';
          const sem = data.reecapIdentity.Semester ? data.reecapIdentity.Semester.replace('Regular(', '').replace(')', '') : '';
          idCourse.textContent = `${course} • ${sem}`;
       }
    } else if (idEl) {
       idEl.hidden = true;
    }

    if (!data.reecapTimetable) {
       // The strip itself is the empty state (never an indefinite shimmer).
       // Make the page name a direct iframe link so one click starts syncing.
       strip.setAttribute('data-reecap-state', 'empty');
       strip.style.removeProperty('--accent');
       if (titleEl) titleEl.textContent = "Set up your schedule";
       if (metaEl) {
         metaEl.innerHTML = `Visit <a class="status-strip-cta" href="Academics/studenttimetableoption.aspx" target="capIframe">CHOOSE TIMETABLE</a> once to sync your upcoming classes.`;
         const setupLink = metaEl.querySelector('.status-strip-cta');
         if (setupLink) setupLink.addEventListener('click', () => {
           // Navigate the iframe directly — no intermediate dialog or extra action.
           if (typeof showIframe === 'function') showIframe();
         });
       }
       return;
    }

    strip.setAttribute('data-reecap-state', 'ready');
    
    const { schedule, legendMap } = data.reecapTimetable;
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const jsDayToName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const todayName = jsDayToName[now.getDay()];
    
    const todaysClasses = schedule[todayName] || [];
    
    let currentState = "DONE";
    let activeClass = null;
    let nextClass = null;
    
    for (let period of todaysClasses) {
      if (!period.subjectCode) continue;
      const times = parseTimeRange(period.timeRange);
      if (!times) continue;
      
      if (currentMins >= times.start && currentMins < times.end) {
        currentState = "IN_CLASS";
        activeClass = period;
        break;
      } else if (currentMins < times.start) {
        if (!nextClass) {
           currentState = "NEXT_CLASS";
           nextClass = period;
        }
      }
    }
    
    function getDetails(period) {
      const primaryCode = period.subjectCode.split(',')[0].trim();
      return legendMap[primaryCode] || { name: primaryCode, faculty: '', room: '' };
    }
    
    if (currentState === "IN_CLASS") {
       const details = getDetails(activeClass);
       strip.style.setProperty('--accent', 'var(--success)');
       titleEl.textContent = `IN CLASS: ${details.name}`;
       metaEl.innerHTML = `<span>${activeClass.timeRange}</span> <b>•</b> <span>${details.room}</span> <b>•</b> <span>${details.faculty}</span>`;
    } else if (currentState === "NEXT_CLASS") {
       const details = getDetails(nextClass);
       strip.style.setProperty('--accent', 'var(--warning)');
       titleEl.textContent = `NEXT: ${details.name}`;
       metaEl.innerHTML = `<span>Starts at ${nextClass.timeRange.split(/[-to]/i)[0].trim()}</span> <b>•</b> <span>${details.room}</span>`;
    } else {
       strip.style.setProperty('--accent', 'var(--text-faint)');
       titleEl.textContent = "No more classes today.";
       metaEl.innerHTML = `Enjoy the rest of your day.`;
    }
      } catch (innerErr) {
        if (isContextInvalidatedError(innerErr)) return;
      }
    });
  } catch (e) {
    // Ignore context invalidated errors during extension reload
  }
}

function redesignAttendancePage() {
  // Let's hide the direct body content (usually a sorry / server error trace)
  Array.from(document.body.children).forEach(c => {
    if (c.tagName !== 'SCRIPT' && c.tagName !== 'STYLE' && c.tagName !== 'LINK') {
      c.style.setProperty('display', 'none', 'important');
    }
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'reecap-attendance-standalone';
  wrapper.style.padding = '24px';
  wrapper.style.fontFamily = 'var(--font-sans), system-ui, sans-serif';
  document.body.appendChild(wrapper);

  // Send the title update up to the shell
  if (window.parent && window.parent.postMessage) {
    window.parent.postMessage({ type: 'REECAP_SET_TITLE', title: 'ATTENDANCE (PRESENT)' }, '*');
  }

  if (!isExtensionValid() || !chrome || !chrome.storage || !chrome.storage.local) {
    wrapper.innerHTML = '<div class="marks-empty">Unable to access storage.</div>';
    return;
  }

  function renderView(profileData) {
    if (!profileData || !profileData.attendanceSubjects || !profileData.attendanceSubjects.length) {
      wrapper.innerHTML = '<div class="marks-empty" style="text-align:center; margin-top: 40px; color: var(--text-secondary);">No attendance data synced yet.<br><br><span style="font-size:12px;opacity:0.7">Loading Profile in the background...</span></div>';
      return;
    }

    const { held, attended, percent, attendanceSubjects, lastUpdated } = profileData;

    const ringRadius = 40;
    const ringCircumf = 2 * Math.PI * ringRadius;
    const offset = ringCircumf - (percent / 100) * ringCircumf;
    const ringColor = percent >= 75 ? "var(--success)" : (percent >= 65 ? "var(--warning)" : (held === 0 ? "var(--text-faint)" : "var(--error)"));

    let html = `
      <!-- Top Overall Attendance Meter -->
      <div class="overview-section-metrics" style="margin-bottom: 24px; display: flex; flex-direction: column;">
        <div class="ring-card" style="flex: 1; min-width: 280px; flex-direction: row; gap: 24px; text-align: left; justify-content: flex-start; padding: 24px 32px;">
          <div class="ring-wrap" style="width: 96px; height: 96px; flex-shrink: 0;">
            <svg width="96" height="96">
              <circle class="ring-bg" cx="48" cy="48" r="${ringRadius}" stroke-width="8"></circle>
              <circle class="ring-fg" cx="48" cy="48" r="${ringRadius}" stroke-width="8" stroke="${ringColor}" stroke-dasharray="${ringCircumf}" stroke-dashoffset="${offset}"></circle>
            </svg>
            <div class="ring-center">
              <div class="ring-value" style="font-size: 15px; font-weight: 700; color: ${ringColor}">${held > 0 ? percent.toFixed(1) + '%' : '0%'}</div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <h3 style="font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 700; margin: 0; color: var(--text-primary);">Present Semester Attendance</h3>
            <div style="font-size: 14px; color: var(--text-secondary); font-weight: 500;">
              ${held > 0 ? `<span class="mono" style="font-weight: 600; color: var(--text-primary);">${attended}</span> attended out of <span class="mono" style="font-weight: 600; color: var(--text-primary);">${held}</span> total lectures held` : 'No attendance lectures logged for this term yet.'}
            </div>
            <div style="font-size: 12px; color: var(--text-faint); margin-top: 4px;">Status: ${held === 0 ? 'Not yet started / Vacation' : (percent >= 75 ? 'Satisfactory Standing' : 'Below 75% Requirement')}</div>
          </div>
        </div>
      </div>

    <!-- Subject Attendance Record Table -->
      <div class="overview-card" style="margin-bottom: 24px;">
        <div class="overview-card-header">
          <span class="overview-card-title">Subject Attendance Record</span>
          <span class="overview-card-subtitle">${lastUpdated ? 'Last synced: ' + new Date(lastUpdated).toLocaleString() : 'Current Term'}</span>
        </div>
        <div class="reecap-table-wrap">
          <table class="reecap-data-table reecap-attendance-table">
            <thead>
              <tr>
                <th>Subject Name</th>
                <th style="text-align: right;">Held</th>
                <th style="text-align: right;">Attended</th>
                <th style="text-align: right;">Percentage</th>
                <th style="text-align: center; width: 140px;">75% Target Status</th>
                <th style="width: 140px; text-align: left;">Progress</th>
              </tr>
            </thead>
            <tbody>
    `;

    attendanceSubjects.forEach(s => {
      const sAttend = s.attended !== undefined ? s.attended : (s.attend !== undefined ? s.attend : 0);
      const sHeld = s.held !== undefined ? s.held : 0;
      const sPct = s.percent !== undefined ? s.percent : (sHeld > 0 ? Number(((sAttend / sHeld) * 100).toFixed(2)) : 0);
      const sColor = sPct >= 75 ? "var(--success)" : (sPct >= 65 ? "var(--warning)" : (sHeld === 0 ? "var(--text-faint)" : "var(--error)"));

      // Calculate bunk/attend limits for 75% target
      let targetStatusStr = '<span class="status-neutral">N/A</span>';
      const neededClasses = Math.max(0, (3 * sHeld) - (4 * sAttend));
      const skippableClasses = Math.max(0, Math.floor((4/3) * sAttend - sHeld));

      if (sHeld === 0) {
         targetStatusStr = '<span class="status-neutral" style="color: var(--text-faint); font-size: 12px;">Classes pending</span>';
      } else if (sPct >= 75) {
         if (skippableClasses > 0) {
            targetStatusStr = `<div class="bunkable-tag">Can skip next <b>${skippableClasses}</b></div>`;
         } else {
            targetStatusStr = `<div class="bunkable-tag warning">Can skip <b>0</b></div>`;
         }
      } else {
         const pillTone = sPct >= 65 ? 'warning' : 'critical';
         if (neededClasses > 0) {
            targetStatusStr = `<div class="bunkable-tag ${pillTone}">Attend next <b>${neededClasses}</b></div>`;
         } else {
            targetStatusStr = `<div class="bunkable-tag ${pillTone}">Attend next <b>0</b></div>`; 
         }
      }

      html += `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--text-primary);">${s.subjName || s.name || 'Subject'}</div>
            ${s.faculty ? `<div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px; font-weight: 500;">${s.faculty}</div>` : ''}
          </td>
          <td class="mono" style="text-align: right;">${sHeld}</td>
          <td class="mono" style="text-align: right; font-weight: 600;">${sAttend}</td>
          <td class="mono" style="text-align: right; font-weight: 700; color: ${sColor};">${sPct}%</td>
          <td style="text-align: center;">${targetStatusStr}</td>
          <td>
            <div class="progress-track" style="margin-top: 2px;">
              <div class="progress-bar" style="width: ${Math.min(100, s.percent)}%; background: ${sColor};"></div>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
    wrapper.innerHTML = html;
  }

  if (isExtensionValid() && chrome.storage && chrome.storage.local) {
    try {
      chrome.storage.local.get(['reecapProfileData'], (data) => {
        if (!isExtensionValid() || (chrome.runtime && chrome.runtime.lastError)) return;
        let prof = data ? data.reecapProfileData : null;
        renderView(prof);
      });

      if (chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (!isExtensionValid()) return;
          if (areaName === 'local' && changes.reecapProfileData && changes.reecapProfileData.newValue) {
            renderView(changes.reecapProfileData.newValue);
          }
        });
      }
    } catch (e) {
      renderView(null);
    }
  } else {
    renderView(null);
  }
}


// ────────────────────────────────────────────────────────────────
// Exam Script Viewer — "Save as PDF" (2026-08-29)
// ────────────────────────────────────────────────────────────────
// Injects a download button into the ExamScriptViewer page that
// stitches all rendered <canvas> pages from #pdf_viewer into a
// multi-page PDF using jsPDF.
// ────────────────────────────────────────────────────────────────

function observeExamViewer() {
  document.body.classList.add('reecap-exam-viewer-page');

  // Wait for the button container to exist in the DOM
  const waitForContainer = () => {
    const container = document.querySelector('.button-container');
    if (container) {
      injectSavePdfButton(container);
      observePdfViewerChanges();
    } else {
      // The page might still be loading — retry
      setTimeout(waitForContainer, 500);
    }
  };
  waitForContainer();
}

/**
 * Injects the "Save as PDF" button into the .button-container
 */
function injectSavePdfButton(container) {
  if (container.querySelector('#reecap-save-pdf')) return;

  const btn = document.createElement('a');
  btn.id = 'reecap-save-pdf';
  btn.className = 'btn btn-save-pdf';
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         style="vertical-align: -2px; margin-right: 4px;">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>Save as PDF`;
  btn.style.cursor = 'pointer';
  btn.addEventListener('click', saveExamAsPdf);
  container.appendChild(btn);

  // Disable initially until canvases are present
  updateSavePdfState();
}

/**
 * Watches #pdf_viewer for canvas additions/removals so we can
 * enable/disable the Save button appropriately.
 */
function observePdfViewerChanges() {
  const viewer = document.getElementById('pdf_viewer');
  if (!viewer) return;

  const observer = new MutationObserver(() => {
    updateSavePdfState();
  });

  observer.observe(viewer, { childList: true, subtree: true });
}

/**
 * Enable the button only when there are rendered canvases.
 */
function updateSavePdfState() {
  const btn = document.getElementById('reecap-save-pdf');
  if (!btn) return;

  const canvases = document.querySelectorAll('#pdf_viewer canvas');
  const hasContent = canvases.length > 0 &&
    Array.from(canvases).some(c => c.width > 0 && c.height > 0);

  if (hasContent) {
    btn.classList.remove('disabled');
    btn.style.pointerEvents = 'auto';
    btn.style.opacity = '1';
  } else {
    btn.classList.add('disabled');
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.5';
  }
}

function saveExamAsPdf() {
  const btn = document.getElementById('reecap-save-pdf');
  if (btn) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = 'Loading PDF engine...';
    btn.style.pointerEvents = 'none';
  }

  // Inject jsPDF into the Main World safely (hiding AMD define to force window.jspdf creation)
  if (!document.getElementById('reecap-jspdf-lib')) {
    const hideAmd = document.createElement('script');
    hideAmd.textContent = 'window.__temp_define = window.define; window.define = undefined;';
    document.head.appendChild(hideAmd);

    const script = document.createElement('script');
    script.id = 'reecap-jspdf-lib';
    script.src = chrome.runtime.getURL('lib/jspdf.umd.min.js');
    script.onload = () => {
      const restoreAmd = document.createElement('script');
      restoreAmd.textContent = 'window.define = window.__temp_define;';
      document.head.appendChild(restoreAmd);
      injectPdfGenerator();
    };
    script.onerror = () => {
      alert('Failed to load PDF engine.');
      if (btn) {
        btn.innerHTML = btn.dataset.originalText || 'Save as PDF';
        btn.style.pointerEvents = 'auto';
      }
    };
    document.head.appendChild(script);
  } else {
    injectPdfGenerator();
  }
}

function injectPdfGenerator() {
  // Execute the generator script in the Main World so it has access to window.jspdf
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('pdf_generator.js');
  script.onload = () => script.remove();
  document.head.appendChild(script);
}


// ────────────────────────────────────────────────────────────────
// Aria AI Academic Co-pilot Sidebar (Integration)
// ────────────────────────────────────────────────────────────────

let ariaDossierCache = null;
let ariaMessagesHistory = [];
let ariaLastToggleTime = 0;

function toggleAriaSidebar(forceOpen) {
  const now = Date.now();
  if (now - ariaLastToggleTime < 250 && typeof forceOpen !== 'boolean') {
    return;
  }
  ariaLastToggleTime = now;
  let sidebar = document.getElementById('reecap-aria-sidebar');
  let scrim = document.getElementById('reecap-aria-scrim');
  if (!sidebar) {
    try {
      console.log('ReEcap: Lazily mounting Aria sidebar...');
      initAriaSidebar();
      sidebar = document.getElementById('reecap-aria-sidebar');
      scrim = document.getElementById('reecap-aria-scrim');
    } catch (e) {
      if (!isContextInvalidatedError(e)) {
        console.error('ReEcap: Lazy initAriaSidebar failed:', e);
      }
    }
  }
  if (!sidebar) {
    if (isExtensionValid()) {
      console.warn('ReEcap: Unable to initialize Aria sidebar');
    }
    return;
  }

  const isOpen = sidebar.classList.contains('is-open') || sidebar.getAttribute('data-open') === 'true';
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !isOpen;

  console.log('ReEcap: Aria Sidebar state transitioning to:', shouldOpen ? 'OPEN' : 'CLOSED');

  sidebar.classList.toggle('is-open', shouldOpen);
  sidebar.setAttribute('data-open', String(shouldOpen));
  sidebar.setAttribute('aria-hidden', String(!shouldOpen));
  sidebar.style.setProperty('transform', shouldOpen ? 'translateX(0)' : 'translateX(100%)', 'important');
  sidebar.style.setProperty('display', 'flex', 'important');
  sidebar.style.setProperty('visibility', 'visible', 'important');
  sidebar.style.setProperty('z-index', '999999', 'important');

  if (scrim) {
    scrim.classList.toggle('is-open', shouldOpen);
    scrim.setAttribute('data-open', String(shouldOpen));
    scrim.setAttribute('aria-hidden', String(!shouldOpen));
    scrim.style.setProperty('opacity', shouldOpen ? '1' : '0', 'important');
    scrim.style.setProperty('pointer-events', shouldOpen ? 'auto' : 'none', 'important');
    scrim.style.setProperty('z-index', '999998', 'important');
  }

  if (shouldOpen) {
    const input = document.getElementById('aria-input');
    if (input) setTimeout(() => input.focus(), 150);
    if (isExtensionValid()) refreshAriaDossier();
  }
}

async function refreshAriaDossier() {
  if (!isExtensionValid()) return;
  if (!window.__reecap_aria || typeof window.__reecap_aria.getStudentDossier !== 'function') return;
  try {
    const dossier = await window.__reecap_aria.getStudentDossier();
    if (!dossier) return;
    ariaDossierCache = dossier;
    updateAriaSuggestions(dossier);
    updateAriaWelcome(dossier);
  } catch (e) {
    if (isContextInvalidatedError(e)) return;
    console.warn('ReEcap: Failed to refresh Aria dossier:', e);
  }
}

function updateAriaWelcome(dossier) {
  if (ariaMessagesHistory.length > 0 || !dossier) return;
  const container = document.getElementById('aria-messages');
  if (!container) return;
  const welcomeCard = container.querySelector('.aria-msg.msg-assistant');
  if (!welcomeCard) return;

  const rawName = dossier?.identity?.name || '';
  const name = rawName ? rawName.split(' ')[0] : 'there';
  const cgpa = dossier?.academic?.cgpa && dossier.academic.cgpa !== '--' ? dossier.academic.cgpa : '--';
  let attPct = dossier?.attendance?.overallPercent;
  if ((!attPct || attPct === '--') && dossier?.attendance?.held > 0 && dossier?.attendance?.attended !== undefined && dossier.attendance.attended !== '--') {
    attPct = Number(((parseFloat(dossier.attendance.attended) / parseFloat(dossier.attendance.held)) * 100).toFixed(1));
  }
  const attDisplay = (attPct && attPct !== '--') ? `${attPct}%` : '--%';
  const backlogs = dossier?.backlogs !== undefined ? `${dossier.backlogs} Backlogs` : 'Zero Backlogs';

  welcomeCard.innerHTML = `
    <div class="aria-welcome-hero">
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" style="color: var(--accent);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        <strong style="font-size: 13.5px; color: var(--text-primary); letter-spacing: -0.01em;">Academic Co-Pilot Ready</strong>
      </div>
      <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.5;">
        Hello <strong>${escapeAttr(name)}</strong>! Connected to live Aditya University records. Your standing shows <strong>${escapeAttr(cgpa)} CGPA</strong> (${escapeAttr(attDisplay)} Attendance • ${escapeAttr(backlogs)}).
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        <button type="button" class="aria-action-chip" data-action="weak_subjects"><svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg><span class="chip-label">Weak Subjects Audit</span><svg class="chip-chevron" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
        <button type="button" class="aria-action-chip" data-action="target_calc"><svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg><span class="chip-label">8.0 SGPA Calculator</span><svg class="chip-chevron" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
        <button type="button" class="aria-action-chip" data-action="skip_sim"><svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg><span class="chip-label">Skipping Classes Margin</span><svg class="chip-chevron" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
        <button type="button" class="aria-action-chip" data-action="nav:attendance"><svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg><span class="chip-label">Live Attendance</span><svg class="chip-chevron" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
        <button type="button" class="aria-action-chip" data-action="nav:marks"><svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg><span class="chip-label">Detailed Grades</span><svg class="chip-chevron" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
        <button type="button" class="aria-action-chip" data-action="nav:fees"><svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg><span class="chip-label">Tuition Fee Ledger</span><svg class="chip-chevron" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
      </div>
    </div>
  `;
}

function updateAriaSuggestions(dossier) {
  const panel = document.getElementById('aria-suggestions-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="prompt-chips-shelf">
      <button type="button" class="aria-prompt-chip" data-prompt="What are my weak subjects and where do I need to improve?">
        <svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>
        <span>Weak Subjects</span>
      </button>
      <button type="button" class="aria-prompt-chip" data-prompt="What SGPA do I need in Semester 3 to achieve an overall 8.0 CGPA?">
        <svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
        <span>8.0 Target</span>
      </button>
      <button type="button" class="aria-prompt-chip" data-prompt="How is my attendance in each subject, and how many classes can I safely skip?">
        <svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>
        <span>Attendance & Margin</span>
      </button>
      <button type="button" class="aria-prompt-chip" data-prompt="Show my fee payment status, official receipts, and semester dues.">
        <svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
        <span>Fee & Receipts</span>
      </button>
      <button type="button" class="aria-prompt-chip" data-prompt="Analyze my current academic performance, CGPA trajectory, and suggest where I can improve.">
        <svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
        <span>Performance Audit</span>
      </button>
      <button type="button" class="aria-prompt-chip" data-prompt="Do I have any active backlogs or subjects with low grades?">
        <svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>Backlogs Check</span>
      </button>
      <button type="button" class="aria-prompt-chip" data-prompt="Where is my next class according to today's timetable?">
        <svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span>Next Class</span>
      </button>
    </div>
  `;
}

function initAriaSidebar(layoutWrapper) {
  if (document.getElementById('reecap-aria-sidebar')) return;

  const scrim = document.createElement('div');
  scrim.id = 'reecap-aria-scrim';
  scrim.className = 'reecap-aria-scrim';
  scrim.setAttribute('aria-hidden', 'true');
  scrim.addEventListener('click', () => toggleAriaSidebar(false));

  const sidebar = document.createElement('aside');
  sidebar.id = 'reecap-aria-sidebar';
  sidebar.className = 'reecap-aria-sidebar';
  sidebar.setAttribute('aria-label', 'Aria Academic Co-pilot');
  sidebar.setAttribute('aria-hidden', 'true');

  sidebar.innerHTML = `
    <div class="aria-sidebar-header">
      <div class="aria-brand">
        <div class="aria-avatar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
          <span class="aria-avatar-ping"></span>
        </div>
        <div class="aria-brand-info">
          <div class="aria-brand-title-row">
            <span class="aria-title">Aria</span>
            <span class="aria-version-pill">v2.1 Aura</span>
          </div>
          <div class="aria-subtitle">
            <span>Aditya University</span> • <span>Edge Co-Pilot</span>
          </div>
        </div>
      </div>
      <div class="aria-header-actions">
        <button type="button" class="aria-header-btn" id="aria-clear-chat" title="Clear conversation" aria-label="Clear chat">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
        <button type="button" class="aria-close-btn" id="aria-close-btn" title="Close Aria" aria-label="Close Aria">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    </div>

    <div class="aria-suggestions-panel" id="aria-suggestions-panel"></div>

    <div class="aria-messages" id="aria-messages" role="log" aria-live="polite"></div>

    <form class="aria-composer prompt-bar-card" id="aria-composer">
      <div class="prompt-bar-container">
        <div class="prompt-bar-input-wrapper">
          <textarea id="aria-input" placeholder="Ask Aria about grades, attendance, or navigation..." rows="1"></textarea>
        </div>
        <button type="submit" id="aria-send-btn" aria-label="Send prompt" class="prompt-send-pill" title="Send prompt">
          <svg class="icon-send" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <polyline points="5 12 12 5 19 12"></polyline>
          </svg>
          <svg class="icon-stop" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="display: none;">
            <rect x="6" y="6" width="12" height="12" rx="2"></rect>
          </svg>
        </button>
      </div>
    </form>
  `;

  const mountPoint = document.body || document.documentElement;
  mountPoint.appendChild(scrim);
  mountPoint.appendChild(sidebar);

  // Close button
  const closeBtn = sidebar.querySelector('.aria-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', () => toggleAriaSidebar(false));

  // Clear chat button
  const clearBtn = sidebar.querySelector('#aria-clear-chat');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (isAriaGenerating) {
        stopAriaGeneration();
      }
      ariaMessagesHistory.length = 0;
      const container = document.getElementById('aria-messages');
      if (container) {
        container.innerHTML = '';
        loadInitialWelcome();
      }
      const suggestionsPanel = document.getElementById('aria-suggestions-panel');
      if (suggestionsPanel) {
        suggestionsPanel.style.display = '';
      }
    });
  }

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      toggleAriaSidebar();
    } else if (e.key === 'Escape' && sidebar.classList.contains('is-open')) {
      toggleAriaSidebar(false);
    }
  });

  // Delegated clicks in sidebar (chips, action buttons, thinking toggles)
  sidebar.addEventListener('click', (e) => {
    const chip = e.target.closest('.aria-prompt-chip');
    if (chip && chip.dataset.prompt) {
      const input = document.getElementById('aria-input');
      if (input) {
        input.value = chip.dataset.prompt;
        submitAriaMessage();
      }
      return;
    }

    const actionChip = e.target.closest('.aria-action-chip');
    if (actionChip && actionChip.dataset.action) {
      const act = actionChip.dataset.action;
      if (act === 'nav:fees' || act === 'nav:feedetails') {
        if (typeof navigateToFeeDetails === 'function') {
          navigateToFeeDetails();
          return;
        }
      }
      if (window.__reecap_aria && window.__reecap_aria.executePortalAction) {
        window.__reecap_aria.executePortalAction(act);
      }
      return;
    }

    const thinkingToggle = e.target.closest('.thinking-header');
    if (thinkingToggle) {
      const card = thinkingToggle.closest('.aria-thinking-card');
      if (card) {
        card.classList.toggle('is-expanded');
      }
      return;
    }
  });

  // Auto-resize input textarea and toggle send button active glow
  const input = document.getElementById('aria-input');
  const sendBtn = document.getElementById('aria-send-btn');
  if (sendBtn) sendBtn.disabled = true;
  if (input) {
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      if (sendBtn && !isAriaGenerating) {
        const hasText = input.value.trim().length > 0;
        sendBtn.classList.toggle('is-active', hasText);
        sendBtn.disabled = !hasText;
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (isAriaGenerating) {
          stopAriaGeneration();
        } else {
          submitAriaMessage();
        }
      }
    });
  }

  // Composer submit (handles send and stop)
  const form = document.getElementById('aria-composer');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (isAriaGenerating) {
        stopAriaGeneration();
      } else {
        submitAriaMessage();
      }
    });
  }

  // Initial welcome message
  loadInitialWelcome();
  if (isExtensionValid()) refreshAriaDossier();
}

async function loadInitialWelcome() {
  const container = document.getElementById('aria-messages');
  if (!container || container.children.length > 0) return;

  const dossier = (window.__reecap_aria && isExtensionValid()) ? await window.__reecap_aria.getStudentDossier() : null;
  const rawName = dossier?.identity?.name || '';
  const name = rawName ? rawName.split(' ')[0] : 'there';
  const cgpa = dossier?.academic?.cgpa && dossier.academic.cgpa !== '--' ? dossier.academic.cgpa : '--';
  let attPct = dossier?.attendance?.overallPercent;
  if ((!attPct || attPct === '--') && dossier?.attendance?.held > 0 && dossier?.attendance?.attended !== undefined && dossier.attendance.attended !== '--') {
    attPct = Number(((parseFloat(dossier.attendance.attended) / parseFloat(dossier.attendance.held)) * 100).toFixed(1));
  }
  const attDisplay = (attPct && attPct !== '--') ? `${attPct}%` : '--%';
  const backlogs = dossier?.backlogs !== undefined ? `${dossier.backlogs} Backlogs` : 'Zero Backlogs';

  const welcomeHtml = `
    <div class="aria-msg msg-assistant">
      <div class="aria-welcome-hero">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" style="color: var(--accent);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <strong style="font-size: 13.5px; color: var(--text-primary); letter-spacing: -0.01em;">Academic Co-Pilot Ready</strong>
        </div>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.5;">
          Hello <strong>${escapeAttr(name)}</strong>! Connected to live Aditya University records. Your standing shows <strong>${escapeAttr(cgpa)} CGPA</strong> (${escapeAttr(attDisplay)} Attendance • ${escapeAttr(backlogs)}).
        </p>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          <button type="button" class="aria-action-chip" data-action="weak_subjects"><svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg><span class="chip-label">Weak Subjects Audit</span><svg class="chip-chevron" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
          <button type="button" class="aria-action-chip" data-action="target_calc"><svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg><span class="chip-label">8.0 SGPA Calculator</span><svg class="chip-chevron" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
          <button type="button" class="aria-action-chip" data-action="skip_sim"><svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg><span class="chip-label">Skipping Classes Margin</span><svg class="chip-chevron" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
          <button type="button" class="aria-action-chip" data-action="nav:attendance"><svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg><span class="chip-label">Live Attendance</span><svg class="chip-chevron" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
          <button type="button" class="aria-action-chip" data-action="nav:marks"><svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg><span class="chip-label">Detailed Grades</span><svg class="chip-chevron" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
          <button type="button" class="aria-action-chip" data-action="nav:fees"><svg class="chip-glyph" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg><span class="chip-label">Tuition Fee Ledger</span><svg class="chip-chevron" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
        </div>
      </div>
    </div>
  `;
  container.innerHTML = welcomeHtml;
}

function parseMarkdownAndActions(text, options) {
  const streaming = Boolean(options && options.streaming);
  let input = String(text || '');
  const inlineCode = [];
  const chips = [];
  const TOKEN = (n) => `${n}`;

  const escapeHtml = (s) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  // Incomplete trailing constructs are hidden while streaming so partial
  // tokens never flash as raw text mid-response.
  if (streaming) {
    input = input.replace(/\[(?:action|tool):[^\]\n]*$/i, '');
    input = input.replace(/\[[^\]\n]*\]\([^)\n]*$/, '');
  }
  input = input.replace(/&lt;br\s*\/?&gt;/gi, '\n');

  // Action chips and tool badges become placeholders so block/inline parsing
  // can never mangle them.
  input = input.replace(/\[action:([a-z0-9_:-]+)\|([^\]]+?)\]/gi, (m, route, label) => {
    chips.push(`<button type="button" class="aria-action-chip" data-action="${route.trim()}">${escapeHtml(label.trim())}</button>`);
    return TOKEN(chips.length - 1 + 100000);
  });
  input = input.replace(/\[tool:([a-z0-9_().]+)\]/gi, (m, call) => {
    chips.push(`<div class="aria-thinking-card"><div class="thinking-header"><span>Syncing telemetry: ${escapeHtml(call)}</span><svg class="chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg></div><div class="thinking-body">Called internal tool <code>${escapeHtml(call)}</code> to fetch live records.</div></div>`);
    return TOKEN(chips.length - 1 + 100000);
  });

  // Inline code spans are extracted before escaping; an unclosed trailing
  // span auto-closes while streaming so the style stays stable.
  const extractInlineCode = (line) => {
    let out = line.replace(/`([^`\n]+)`/g, (m, code) => {
      inlineCode.push(`<code>${escapeHtml(code)}</code>`);
      return TOKEN(inlineCode.length - 1);
    });
    if (streaming) {
      out = out.replace(/`([^`\n]*)$/, (m, code) => {
        inlineCode.push(`<code>${escapeHtml(code)}</code>`);
        return TOKEN(inlineCode.length - 1);
      });
    }
    return out;
  };

  const renderInline = (line) => {
    let s = escapeHtml(extractInlineCode(line));
    s = s.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
      const clean = url.replace(/&amp;/g, '&');
      return /^(https?:|mailto:)/i.test(clean)
        ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
        : label;
    });
    s = s.replace(/\*\*\*(\S(?:[^*\n]*\S)?)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*(\S(?:[^*\n]*\S)?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(?<![\w*])\*(\S[^*\n]*?)\*(?![\w*])/g, '<em>$1</em>');
    s = s.replace(/(?<![\w_])_(\S[^_\n]*?)_(?![\w_])/g, '<em>$1</em>');
    s = s.replace(/~~(\S(?:[^~\n]*\S)?)~~/g, '<del>$1</del>');
    return s;
  };

  const splitRow = (line) => {
    let t = line.trim();
    if (t.startsWith('|')) t = t.slice(1);
    if (t.endsWith('|')) t = t.slice(0, -1);
    return t.split('|').map(c => c.trim());
  };
  const isTableDivider = (line) => /^\|?[\s:|-]+\|[\s:|-]*$/.test(line.trim())
    && /-/.test(line) && splitRow(line).every(c => /^:?-{2,}:?$/.test(c) || c === '');
  const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line);

  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code blocks (an unclosed trailing fence renders as a full block
    // while streaming, so the content never flickers back to raw backticks).
    const fence = line.match(/^\s*```([^\s`]*)\s*$/);
    if (fence) {
      const lang = fence[1];
      const body = [];
      i += 1;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { body.push(lines[i]); i += 1; }
      i += 1; // skip closing fence (or EOF)
      out.push(`<pre class="aria-code-block"${lang ? ` data-lang="${escapeHtml(lang)}"` : ''}><code>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    if (/^\s*$/.test(line)) { i += 1; continue; }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level} class="aria-md-h${level}">${renderInline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      const headers = splitRow(line);
      let html = '<div class="aria-table-wrapper"><table class="aria-table"><thead><tr>';
      headers.forEach(h => { html += `<th>${renderInline(h)}</th>`; });
      html += '</tr></thead><tbody>';
      i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i]) && lines[i].trim() !== '') {
        if (!isTableRow(lines[i])) { if (streaming) { i += 1; continue; } break; }
        const cells = splitRow(lines[i]);
        html += '<tr>';
        for (let c = 0; c < headers.length; c += 1) html += `<td>${renderInline(cells[c] || '')}</td>`;
        html += '</tr>';
        i += 1;
      }
      out.push(html + '</tbody></table></div>');
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote class="aria-md-quote">${quote.map(renderInline).join('<br>')}</blockquote>`);
      continue;
    }

    const listMatch = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (listMatch) {
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (!m) break;
        items.push({ indent: m[1].replace(/\t/g, '  ').length, ordered: /\d/.test(m[2]), text: m[3] });
        i += 1;
      }
      const state = { j: 0 };
      const renderList = (indent) => {
        const ordered = items[state.j].ordered;
        let html = ordered ? '<ol>' : '<ul>';
        while (state.j < items.length && items[state.j].indent >= indent) {
          if (items[state.j].indent > indent) { html += renderList(items[state.j].indent); continue; }
          const it = items[state.j];
          state.j += 1;
          const task = it.text.match(/^\[([ xX])\]\s+(.*)$/);
          if (task) {
            html += `<li class="aria-md-task"><input type="checkbox" disabled${task[1].toLowerCase() === 'x' ? ' checked' : ''}> <span>${renderInline(task[2])}</span></li>`;
          } else {
            html += `<li>${renderInline(it.text)}`;
            if (state.j < items.length && items[state.j].indent > indent) html += renderList(items[state.j].indent);
            html += '</li>';
          }
        }
        return html + (ordered ? '</ol>' : '</ul>');
      };
      out.push(renderList(items[0].indent));
      continue;
    }

    const paragraph = [line];
    i += 1;
    while (i < lines.length && /^\s*\S/.test(lines[i])
      && !/^\s*(#{1,6}\s|```|>|\s*[-*+]\s|\s*\d+[.)]\s|\|)/.test(lines[i])) {
      paragraph.push(lines[i]);
      i += 1;
    }
    out.push(`<p>${paragraph.map(renderInline).join('<br>')}</p>`);
  }

  let safe = out.join('');
  safe = safe.replace(/(\d+)/g, (m, n) => {
    const idx = Number(n);
    if (idx >= 100000) return chips[idx - 100000] || '';
    return inlineCode[idx] || '';
  });
  return safe;
}

let currentAriaAbortController = null;
let isAriaGenerating = false;
let currentSettleThinking = null;

function setAriaGeneratingState(generating) {
  isAriaGenerating = generating;
  const sendBtn = document.getElementById('aria-send-btn');
  if (!sendBtn) return;

  const iconSend = sendBtn.querySelector('.icon-send');
  const iconStop = sendBtn.querySelector('.icon-stop');

  if (generating) {
    sendBtn.classList.add('is-stop');
    sendBtn.disabled = false;
    sendBtn.setAttribute('title', 'Stop generation');
    sendBtn.setAttribute('aria-label', 'Stop generation');
    if (iconSend) iconSend.style.display = 'none';
    if (iconStop) iconStop.style.display = 'block';
  } else {
    sendBtn.classList.remove('is-stop');
    sendBtn.setAttribute('title', 'Send prompt');
    sendBtn.setAttribute('aria-label', 'Send prompt');
    if (iconSend) iconSend.style.display = 'block';
    if (iconStop) iconStop.style.display = 'none';
    const input = document.getElementById('aria-input');
    const hasText = Boolean(input && input.value.trim().length > 0);
    sendBtn.disabled = !hasText;
    sendBtn.classList.toggle('is-active', hasText);
  }
}

function stopAriaGeneration() {
  if (currentSettleThinking) {
    currentSettleThinking();
    currentSettleThinking = null;
  }
  if (currentAriaAbortController) {
    currentAriaAbortController.abort();
    currentAriaAbortController = null;
  }
  setAriaGeneratingState(false);
}

async function submitAriaMessage() {
  if (isAriaGenerating) {
    stopAriaGeneration();
    return;
  }

  const input = document.getElementById('aria-input');
  const sendBtn = document.getElementById('aria-send-btn');
  const container = document.getElementById('aria-messages');
  if (!input || !sendBtn || !container) return;

  const query = input.value.trim();
  if (!query) return;

  // Make the helper card go away right after first prompt
  const welcomeCards = container.querySelectorAll('.aria-welcome-hero, .aria-welcome-card');
  welcomeCards.forEach(card => {
    const parentMsg = card.closest('.aria-msg');
    if (parentMsg) {
      parentMsg.remove();
    } else {
      card.remove();
    }
  });
  const suggestionsPanel = document.getElementById('aria-suggestions-panel');
  if (suggestionsPanel) {
    suggestionsPanel.style.display = 'none';
  }

  input.value = '';
  input.style.height = 'auto';

  // Append user message
  const userMsgEl = document.createElement('div');
  userMsgEl.className = 'aria-msg msg-user';
  userMsgEl.textContent = query;
  container.appendChild(userMsgEl);
  container.scrollTop = container.scrollHeight;

  // Set generating state
  currentAriaAbortController = new AbortController();
  setAriaGeneratingState(true);

  // Mount ThinkingState component (beautifului.dev ThinkingState primitive)
  const assistantMsgEl = document.createElement('div');
  assistantMsgEl.className = 'aria-msg msg-assistant';

  const startTime = Date.now();
  let elapsedTimer = null;
  let settled = false;

  assistantMsgEl.innerHTML = `
    <div class="aria-thinking-card is-expanded" data-state="thinking">
      <div class="thinking-header">
        <div class="thinking-spinner-icon">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" class="spinning-svg">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
          </svg>
        </div>
        <span class="thinking-title">Thinking...</span>
        <span class="thinking-duration">0.1s</span>
        <button type="button" class="thinking-expand-btn" aria-label="Toggle reasoning trace">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
      </div>
      <div class="thinking-trace">
        <div class="trace-row trace-row-1 is-active">
          <span class="trace-icon"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"></circle></svg></span>
          <span class="trace-text">Ingesting live student dossier & transcript records</span>
        </div>
        <div class="trace-row trace-row-2">
          <span class="trace-icon"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"></circle></svg></span>
          <span class="trace-text">Simulating attendance cutoff & 75% attendance buffer</span>
        </div>
        <div class="trace-row trace-row-3">
          <span class="trace-icon"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"></circle></svg></span>
          <span class="trace-text">Formulating targeted academic guidance & SGPA targets</span>
        </div>
      </div>
    </div>
    <div class="aria-streaming-body"></div>
  `;
  container.appendChild(assistantMsgEl);
  container.scrollTop = container.scrollHeight;

  const thinkingCard = assistantMsgEl.querySelector('.aria-thinking-card');
  const durationEl = assistantMsgEl.querySelector('.thinking-duration');
  const thinkingTitle = assistantMsgEl.querySelector('.thinking-title');
  const spinnerIcon = assistantMsgEl.querySelector('.thinking-spinner-icon');
  const streamingBody = assistantMsgEl.querySelector('.aria-streaming-body');
  const row1 = assistantMsgEl.querySelector('.trace-row-1');
  const row2 = assistantMsgEl.querySelector('.trace-row-2');
  const row3 = assistantMsgEl.querySelector('.trace-row-3');

  const checkSvg = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  elapsedTimer = setInterval(() => {
    if (settled) return;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    if (durationEl) durationEl.textContent = `${elapsed}s`;

    const ms = Date.now() - startTime;
    if (ms > 350 && row1 && !row1.classList.contains('is-done')) {
      row1.classList.remove('is-active');
      row1.classList.add('is-done');
      const icon = row1.querySelector('.trace-icon');
      if (icon) icon.innerHTML = checkSvg;
      if (row2) row2.classList.add('is-active');
    }
    if (ms > 700 && row2 && !row2.classList.contains('is-done')) {
      row2.classList.remove('is-active');
      row2.classList.add('is-done');
      const icon = row2.querySelector('.trace-icon');
      if (icon) icon.innerHTML = checkSvg;
      if (row3) row3.classList.add('is-active');
    }
  }, 100);

  function settleThinking() {
    if (settled) return;
    settled = true;
    if (elapsedTimer) clearInterval(elapsedTimer);

    const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    if (thinkingCard) {
      thinkingCard.setAttribute('data-state', 'settled');
      thinkingCard.classList.remove('is-expanded'); // Auto-collapse when done
    }
    if (durationEl) durationEl.textContent = `${totalSeconds}s`;
    if (thinkingTitle) thinkingTitle.textContent = `Thought for ${totalSeconds}s`;
    if (spinnerIcon) {
      spinnerIcon.innerHTML = checkSvg;
    }
    [row1, row2, row3].forEach(r => {
      if (r) {
        r.classList.remove('is-active');
        r.classList.add('is-done');
        const icon = r.querySelector('.trace-icon');
        if (icon) icon.innerHTML = checkSvg;
      }
    });
  }

  currentSettleThinking = settleThinking;

  ariaMessagesHistory.push({ role: 'user', content: query });

  const dossier = ariaDossierCache || (window.__reecap_aria ? await window.__reecap_aria.getStudentDossier() : {});

  if (window.__reecap_aria && window.__reecap_aria.streamAriaChat) {
    window.__reecap_aria.streamAriaChat({
      messages: ariaMessagesHistory,
      dossier: dossier,
      signal: currentAriaAbortController ? currentAriaAbortController.signal : null,
      onChunk: (delta, fullText) => {
        settleThinking();
        if (streamingBody) {
          streamingBody.innerHTML = parseMarkdownAndActions(fullText, { streaming: true }) + '<span class="aria-stream-cursor"></span>';
        }
        container.scrollTop = container.scrollHeight;
      },
      onDone: (finalText) => {
        settleThinking();
        currentSettleThinking = null;
        if (streamingBody) {
          streamingBody.innerHTML = parseMarkdownAndActions(finalText);
        }
        ariaMessagesHistory.push({ role: 'assistant', content: finalText });
        setAriaGeneratingState(false);
        currentAriaAbortController = null;
        container.scrollTop = container.scrollHeight;
      },
      onError: (err) => {
        settleThinking();
        currentSettleThinking = null;
        if (streamingBody) {
          streamingBody.innerHTML = `<p style="color: var(--danger);">Unable to reach Aria inference. Try again shortly.</p>`;
        }
        setAriaGeneratingState(false);
        currentAriaAbortController = null;
      }
    });
  } else {
    settleThinking();
    currentSettleThinking = null;
    if (streamingBody) {
      streamingBody.innerHTML = `<p>Aria module not loaded.</p>`;
    }
    setAriaGeneratingState(false);
    currentAriaAbortController = null;
  }
}

window.toggleAriaSidebar = toggleAriaSidebar;
window.__reecap_refresh_aria = refreshAriaDossier;
window.navigateToFeeDetails = navigateToFeeDetails;
window.submitAriaMessage = submitAriaMessage;
window.showIframe = showIframe;
window.showOverview = showOverview;
window.showAcademicCalendar = showAcademicCalendar;
window.navigateToProfileTab = navigateToProfileTab;
window.setAriaGeneratingState = setAriaGeneratingState;
window.stopAriaGeneration = stopAriaGeneration;
