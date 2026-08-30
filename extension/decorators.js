// ReEcap — decorators.js
// Isolated module for DOM-reading decorative enhancements (SVG rings, progress bars).

function escapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
  
  if (!path.includes('studentmaster.aspx')) return false;

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

function initDecorators() {
  // Prime the cached role before booting the UI
  chrome.storage.sync.get({ enabled: true, reecapLoginRole: 'rbtStudent' }, (data) => {
    CURRENT_ROLE = data.reecapLoginRole;
    console.log('ReEcap: Booting extension. Active role cached as:', CURRENT_ROLE);
    if (!data.enabled) return;
    
    // 0. Iframe Resize Listener
    if (window.location.pathname.toLowerCase().includes('studentmaster.aspx')) {
      window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'REECAP_RESIZE') {
          const iframe = document.getElementById('capIframeId');
          if (iframe) {
            iframe.style.setProperty('height', (e.data.height + 20) + 'px', 'important');
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
         
         const brandBlock = document.createElement('div');
         brandBlock.className = 'brand-block';
         brandBlock.innerHTML = `
           <button type="button" class="mobile-menu-btn" aria-label="Open navigation" aria-expanded="false" aria-controls="reecap-sidebar">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
               <path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path>
             </svg>
           </button>
           <div class="brand-identity">
             <div class="eyebrow">Student Portal</div>
             <h1 class="brand-title">ReEcap</h1>
           </div>
         `;
         
         const userCluster = document.createElement('div');
         userCluster.className = 'user-cluster';
         
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
               userCluster.appendChild(img);
            }
         }
         
         if (lblUser) {
            // Prefer the first <b>/<strong> child because the legacy "Hi..." prefix
            // has been known to mutate to "Welcome," or other tokens across portal versions.
            const inner = lblUser.querySelector('b, strong');
            if (inner) {
              inner.className = 'user-name';
              // Wipe the wrapper's other text nodes so the role prefix doesn't leak.
              Array.from(lblUser.childNodes).forEach(node => {
                if (node !== inner && node.nodeType === Node.TEXT_NODE) node.textContent = '';
              });
            } else {
              lblUser.className = 'user-name';
            }
            userCluster.appendChild(lblUser);
         }
         
         if (changePass) {
            changePass.className = 'pill-btn';
            userCluster.appendChild(changePass);
         }
         if (logout) {
            logout.className = 'pill-btn';
            userCluster.appendChild(logout);
         }
         
         header.appendChild(brandBlock);
         header.appendChild(userCluster);

         // 4. Inject header into DOM before the main layout table
         topContainer.insertBefore(header, mainLayoutTable);
      }
      
      // Sidebar Redesign
      buildSidebar();
      rebuildMainLayout();
    } else {
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
    if (window.location.pathname.toLowerCase().includes('studentmaster.aspx')) {
      initStatusStrip();
    }

    // 5. Online Payment (Phase 6, 2026-07-26) — studentfeereceipt.aspx.
    //    Renders the year-tabs of fee items in a readable single-column-per-field
    //    layout, plus a payment-channel picker and live totals at the bottom.
    if (window.location.pathname.toLowerCase().includes('studentfeereceipt.aspx')) {
      redesignOnlinePaymentPage();
    }

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
    
    // 7. Inject DOM-integrated Theme Toolbar Sidebar
    if (!window.location.pathname.toLowerCase().includes('default.aspx')) {
      injectThemeToolbar();
    }
  });
}

function injectThemeToolbar() {
  if (document.getElementById('reecap-theme-toolbar')) return;

  const toolbar = document.createElement('div');
  toolbar.id = 'reecap-theme-toolbar';
  toolbar.className = 'reecap-theme-toolbar';
  
  const iconPalette = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.02 0 1.93-.72 2.15-1.72.07-.32-.01-.65-.24-.89l-2.02-2.02c-.22-.22-.31-.55-.24-.87.16-.76.84-1.31 1.63-1.31h1.36c3.55 0 6.4-2.85 6.4-6.4 0-4.08-4.07-7.79-9.04-7.79z"/></svg>`;
  const iconLight = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
  const iconDark = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  const iconMoonPhase = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 20A7 7 0 1 0 11 4v16z"/></svg>`;

  toolbar.innerHTML = `
    <button class="reecap-toolbar-trigger" aria-label="Theme Settings">
       ${iconPalette}
    </button>
    <div class="reecap-toolbar-menu">
       <!-- Mode Toggles -->
       <div class="toolbar-mode-toggles">
         <button class="toolbar-mode-btn" data-mode="light" title="Light Mode">${iconLight}</button>
         <button class="toolbar-mode-btn" data-mode="dark" title="Dark Mode">${iconDark}</button>
         <button class="toolbar-mode-btn" data-mode="system" title="System Match">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
         </button>
       </div>
       
       <!-- Theme Families -->
       <div class="toolbar-family-list">
         <button class="toolbar-theme-btn" data-family="original">
            <span class="theme-swatch" style="background:var(--accent);"></span> Original Red
         </button>
         <button class="toolbar-theme-btn" data-family="cappuccino">
            <span class="theme-swatch" style="background:#B67E51;"></span> Cappuccino
         </button>
         <button class="toolbar-theme-btn" data-family="evergreen">
            <span class="theme-swatch" style="background:#2C6656;"></span> Evergreen
         </button>
         <button class="toolbar-theme-btn" data-family="midnight">
            <span class="theme-swatch" style="background:#555CD2;"></span> Midnight
         </button>
         <button class="toolbar-theme-btn" data-family="rosewood">
            <span class="theme-swatch" style="background:#9B385D;"></span> Rosewood
         </button>
         <div class="toolbar-divider"></div>
         <button class="toolbar-theme-btn amoled-btn" data-family="amoled">
            <span class="theme-swatch" style="background:#000; border: 1px solid #333;"></span> True AMOLED
         </button>
       </div>
    </div>
  `;
  document.body.appendChild(toolbar);

  const wrapper = document.getElementById('reecap-theme-toolbar');
  
  // Storage Fetch and active marking
  try {
    if (chrome && chrome.storage && chrome.storage.sync) {
       chrome.storage.sync.get(['themeFamily', 'themeMode'], (data) => {
         // Silently ignore if context was invalidated midway through the request
         if (chrome.runtime.lastError) return;
         let mode = data.themeMode || 'system';
         let fam = data.themeFamily || 'original';
         if (fam === 'amoled') mode = 'dark';
         
         wrapper.querySelectorAll('.toolbar-mode-btn').forEach(b => {
           if(b.dataset.mode === mode) b.classList.add('active');
         });
         wrapper.querySelectorAll('.toolbar-theme-btn').forEach(b => {
           if(b.dataset.family === fam) b.classList.add('active');
         });
       });
    }
  } catch (e) {
     // Usually means extension was instantly reloaded (context invalidated)
  }

  // Wiring Clicks to Background script message bus (avoids duplicating logic)
  const menuBtn = wrapper.querySelector('.reecap-toolbar-trigger');
  
  // Toggle Open/Close
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    wrapper.classList.toggle('is-open');
  });
  
  document.addEventListener('click', (e) => {
    if(!wrapper.contains(e.target)) wrapper.classList.remove('is-open');
  });

  // Handle Mode setting (light/dark/system)
  wrapper.querySelectorAll('.toolbar-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
       const m = btn.dataset.mode;
       try {
         chrome.storage.sync.get(['themeFamily'], (d) => {
           if (chrome.runtime.lastError) return;
           // AMOLED ignores light updates
           if (d.themeFamily === 'amoled' && m === 'light') return; 
           chrome.storage.sync.set({ themeMode: m }, () => {
             if (chrome.runtime.lastError) return;
             // Let content script react via background update
             chrome.runtime.sendMessage({ action: 'themeSyncRequested' });
           });
         });
       } catch (e) {}
       wrapper.querySelectorAll('.toolbar-mode-btn').forEach(b => b.classList.remove('active'));
       btn.classList.add('active');
    });
  });

  // Handle Family setting (cappuccino, original, etc)
  wrapper.querySelectorAll('.toolbar-theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
       const f = btn.dataset.family;
       let pack = { themeFamily: f };
       if (f === 'amoled') pack.themeMode = 'dark'; // Force dark explicitly
       
       try {
         chrome.storage.sync.set(pack, () => {
           if (chrome.runtime.lastError) return;
           chrome.runtime.sendMessage({ action: 'themeSyncRequested' });
         });
       } catch (e) {}
       
       wrapper.querySelectorAll('.toolbar-theme-btn').forEach(b => b.classList.remove('active'));
       btn.classList.add('active');
       
       if (f === 'amoled') {
         wrapper.querySelectorAll('.toolbar-mode-btn').forEach(b => b.classList.remove('active'));
         const dbBtn = wrapper.querySelector('.toolbar-mode-btn[data-mode="dark"]');
         if(dbBtn) dbBtn.classList.add('active');
       }
    });
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
          <h1 class="reecap-login-wordmark">ReEcap</h1>
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
    hidden.textContent = 'ReEcap sign in';
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

  // Pull column headers (S.No, Code, Name, Session, Grade, Points, Credits, Result)
  const headers = Array.from(headerRow.querySelectorAll('th, td')).map(td => td.textContent.trim().replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim());

  // Determine the session/column (varies by semester) and pull data.
  const subjectRows = dataRows.map(r => {
    const cells = Array.from(r.querySelectorAll('td')).map(td => td.textContent.trim());
    return cells;
  }).filter(c => c.length >= 7);

  const bodyHtml = subjectRows.map(cells => {
    const isPass = (cells[7] || '').toUpperCase().startsWith('P');
    return `
      <tr>
        <td class="mono">${cells[0] || ''}</td>
        <td class="mono">${cells[1] || ''}</td>
        <td>${cells[2] || ''}</td>
        <td class="mono">${cells[3] || ''}</td>
        <td class="mono"><b>${cells[4] || ''}</b></td>
        <td class="mono">${cells[5] || ''}</td>
        <td class="mono">${cells[6] || ''}</td>
        <td><span class="reecap-status-pill ${isPass ? 'status-pill-pass' : 'status-pill-fail'}">${cells[7] || '-'}</span></td>
      </tr>
    `;
  }).join('');

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
      if (!divfees.dataset.reecapPayReady && document.getElementById('divtabs')) {
        divfees.dataset.reecapPayReady = 'true';
        buildOnlinePaymentUI(divfees, document.getElementById('divtabs'));
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

  // Insert wrap right before legacyTabs.
  divfees.insertBefore(wrap, legacyTabs);

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

  setInterval(updateLiveTotals, 300);
  updateLiveTotals();
}

// Render a single year's fee table in our clean 6-column itemised structure.
// Keeps the original checkboxes and amount inputs connected to the portal DOM
// so when the user clicks our visible row, the portal's checkboxes toggle and
// trigger onFeeCheckBoxClick / calculateAmounts natively.
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

    // Col 1: Checkbox (we move the real checkbox node here so clicks stay bound).
    const tdChk = document.createElement('td');
    tdChk.className = 'col-chk';
    if (chk) {
      tdChk.appendChild(chk);
      // Give the checkbox a clean custom wrapper style without overriding rules.
      chk.classList.add('reecap-native-chk');
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

    // Col 6: Amount Paying input (relocate real input so onblur handlers fire).
    const tdPay = document.createElement('td');
    tdPay.className = 'col-pay';
    tdPay.style.textAlign = 'right';
    if (payingInp) {
      payingInp.classList.add('reecap-pay-input');
      tdPay.appendChild(payingInp);
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

    // Make clicking the row toggle the checkbox if it isn't disabled.
    tr.addEventListener('click', (e) => {
      if (e.target === chk || e.target === payingInp) return;
      if (chk && !chk.disabled) chk.click();
    });
  });

  container.appendChild(table);
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
        const timeNode = cell.querySelector('div, p');
        const sourceHtml = timeNode ? timeNode.innerHTML : cell.innerHTML;
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

        // The time belongs to the cell, not the column. Preserve it verbatim
        // after normalising separator spacing; this supports AM/PM and ranges
        // such as "09:30 AM-10:19 AM" from the live portal.
        const timeIndex = lines.findIndex(line => /\d{1,2}:\d{2}\s*(?:AM|PM)?\s*(?:-|–|to)\s*\d{1,2}:\d{2}\s*(?:AM|PM)?/i.test(line));
        const timeRange = timeIndex >= 0
          ? lines[timeIndex]
              .replace(/\s*(?:-|–|to)\s*/i, ' – ')
              .replace(/\s+/g, ' ')
              .trim()
          : '';
        const subjectStr = lines
          .filter((_, index) => index !== timeIndex)
          .join(', ');

        schedule[day].push({ timeRange, subjectCode: subjectStr });
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

  // Build the marks/legend strip below the grid.
  let html = `<div class="tt-grid" style="--cols: ${periodCount}" role="grid" aria-label="Weekly timetable">`;

  html += `<div class="tt-cell tt-header" role="columnheader">Day</div>`;
  headerLabels.forEach((label) => {
    html += `<div class="tt-cell tt-header" role="columnheader">${escapeAttr(label)}</div>`;
  });

  for (const day of sortedDays) {
    const slots = layoutByDay[day];
    if (!slots) continue;
    const isToday = (day === todayName) ? 'is-today' : '';

    html += `<div class="tt-cell tt-day ${isToday}">${escapeAttr(day)}</div>`;

    // Tooltip placement follows the first/last actual class of the day—not
    // period 1/last period—so leading or trailing empty cells cannot make an
    // edge detail panel spill outside the no-scroll timetable.
    const classSlotIndexes = slots
      .map((slot, index) => slot.type === 'class' ? index : -1)
      .filter(index => index >= 0);
    const firstClassIndex = classSlotIndexes[0];
    const lastClassIndex = classSlotIndexes[classSlotIndexes.length - 1];

    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const slot = slots[slotIndex];
      if (slot.type === 'empty') {
        html += `<div class="tt-cell tt-empty ${isToday}"><span class="tt-period-label">P${slot.periodStart}</span></div>`;
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
        <div class="tt-cell tt-class ${isToday}${slot.span > 1 ? ' tt-merged' : ''}${tooltipEdge}" style="${spanStyle} --palette: ${slot.palette};" tabindex="0" role="gridcell" aria-label="${escapeAttr(ttAriaLabel)}">
          <div class="tt-period-label">${escapeAttr(periodLabel)}</div>
          ${slot.timeRange ? `<div class="tt-time">${escapeAttr(slot.timeRange)}</div>` : ''}
          <div class="tt-subject">${escapeAttr(slot.allCodes)}</div>
          ${slot.details.name && slot.details.name !== slot.allCodes
            ? `<div class="tt-subject-name">${escapeAttr(slot.details.name)}</div>`
            : ''}

          <div class="tt-tooltip">
            <div class="tt-tt-name">${escapeAttr(slot.details.name)}</div>
            ${slot.faculty ? `<div class="tt-tt-meta"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>${escapeAttr(slot.faculty)}</div>` : ''}
            ${slot.room ? `<div class="tt-tt-meta"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>${escapeAttr(slot.room)}</div>` : ''}
          </div>
        </div>
      `;
    }
  }

  html += `</div>`;

  // Phone layout trades the compressed matrix for complete, vertically flowing
  // day sections. This keeps every source field visible without horizontal
  // scrolling or tooltip-only information on touch devices.
  html += `<div class="tt-mobile-schedule" aria-label="Weekly timetable, day-by-day">`;
  for (const day of sortedDays) {
    const slots = layoutByDay[day];
    if (!slots) continue;
    const isToday = day === todayName ? ' is-today' : '';
    const classes = slots.filter(slot => slot.type === 'class');
    html += `<section class="tt-mobile-day${isToday}"><h3>${escapeAttr(day)}</h3>`;
    if (!classes.length) {
      html += `<p class="tt-mobile-empty">No classes scheduled.</p>`;
    } else {
      html += `<div class="tt-mobile-list">`;
      classes.forEach(slot => {
        const periodLabel = slot.span > 1
          ? `Period ${slot.periodStart}–${slot.periodStart + slot.span - 1}`
          : `Period ${slot.periodStart}`;
        html += `
          <article class="tt-mobile-class" style="--palette: ${slot.palette};">
            <div class="tt-mobile-period">${escapeAttr(periodLabel)}</div>
            <div class="tt-mobile-main">
              ${slot.timeRange ? `<div class="tt-mobile-time">${escapeAttr(slot.timeRange)}</div>` : ''}
              <div class="tt-mobile-subject">${escapeAttr(slot.allCodes)}</div>
              ${slot.details.name && slot.details.name !== slot.allCodes
                ? `<div class="tt-mobile-name">${escapeAttr(slot.details.name)}</div>`
                : ''}
              ${slot.faculty ? `<div class="tt-mobile-meta">Faculty: ${escapeAttr(slot.faculty)}</div>` : ''}
              ${slot.room ? `<div class="tt-mobile-meta">Room: ${escapeAttr(slot.room)}</div>` : ''}
            </div>
          </article>`;
      });
      html += `</div>`;
    }
    html += `</section>`;
  }
  html += `</div>`;
  html += renderTimetableLegend(schedule, legendMap);
  dashboard.innerHTML = html;

  tbl.parentElement.insertBefore(dashboard, tbl);
}

// Render a legend strip showing the legend key for every subject in the schedule.
// Each chip uses the same palette colour as the timetable cells, so the
// user can map a coloured block back to its name without reading the tooltip.
function renderTimetableLegend(schedule, legendMap) {
  const seen = new Map();
  Object.values(schedule).forEach((daySlots) => {
    daySlots.forEach((p) => {
      if (!p.subjectCode) return;
      const code = p.subjectCode.split(',')[0].trim();
      if (code && !seen.has(code)) seen.set(code, legendMap[code] || { name: code });
    });
  });
  if (seen.size === 0) return '';
  const PALETTE_SIZE = 12;
  let legendHtml = '<div class="tt-legend">';
  Array.from(seen.entries()).forEach(([code, details]) => {
    let hash = 5381;
    for (let i = 0; i < code.length; i++) hash = ((hash << 5) + hash + code.charCodeAt(i)) | 0;
    const palette = Math.abs(hash) % PALETTE_SIZE;
    legendHtml += `<span class="tt-legend-chip" style="--palette: ${palette};" title="${escapeAttr(details.name)}"><span class="tt-legend-dot"></span><span class="tt-legend-code">${escapeAttr(code)}</span><span class="tt-legend-name">${escapeAttr(details.name || code)}</span></span>`;
  });
  legendHtml += '</div>';
  return legendHtml;
}

function observeProfileDashboard() {
  const targetNode = document.getElementById('divProfile') || document.body;
  if (!targetNode) return;
  
  const observer = new MutationObserver((mutations, obs) => {
    const tblReport = document.getElementById('tblReport');
    if (tblReport && !document.getElementById('reecap-profile-dashboard')) {
      obs.disconnect();
      buildProfileDashboard(tblReport);
      // Title is now sent to parent via sendTitle() in the else-branch above
    }
  });
  
  observer.observe(targetNode, { childList: true, subtree: true });
}


function extractAttendanceProfileData(pane) {
  let held = 0, attended = 0, percent = 0;
  const subjects = [];

  if (!pane) return { held, attended, percent, subjects };

  // The first reportTable inside the Present pane is the current-semester
  // Attendance table. Its .rows/.cells collections deliberately exclude the
  // containing layout rows, which contain text from all later sections.
  const table = pane.querySelector('table.reportTable');
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

    if (raw[0].toUpperCase().includes('TOTAL')) {
      const tail = raw.slice(-3);
      held = parseInt(tail[0], 10) || 0;
      attended = parseInt(tail[1], 10) || 0;
      const totalPercent = parseFloat(tail[2]);
      percent = Number.isFinite(totalPercent)
        ? totalPercent
        : (held > 0 ? Number(((attended / held) * 100).toFixed(2)) : 0);
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
      faculty: colFaculty >= 0 ? String(raw[colFaculty] || '').trim() : '',
      held: subjectHeld,
      attend: subjectAttend,
      percent: subjectPercent
    });
  });

  if (!held && subjects.length) {
    held = subjects.reduce((sum, subject) => sum + subject.held, 0);
    attended = subjects.reduce((sum, subject) => sum + subject.attend, 0);
    percent = held > 0 ? Number(((attended / held) * 100).toFixed(2)) : 0;
  }

  return { held, attended, percent, subjects };
}
function buildProfileDashboard(accordion) {
  // --- A. Scrape Data ---
  const attendance = extractAttendanceProfileData(accordion);
  const held = attendance.held;
  const attended = attendance.attended;
  const percent = attendance.percent;
  const attendanceSubjects = attendance.subjects;
  let backlogsText = "No data";
  let feeDue = "0.00";

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
      const cells = row.querySelectorAll('td');
      // Structure: [GRAND TOTALS, Total, Paid, empty, empty, Due, Excess, Refund]
      if (cells.length >= 6) {
        feeDue = cells[4].textContent.trim() || cells[5].textContent.trim(); // handle varying column counts due to colspans/empties
        // Safer approach: iterate siblings to find the Due column.
        // Actually, in the HTML provided: [GRAND TOTALS (colspan=2), Total, Paid, space, space, Due, Excess, Refund]
        // Which is: [GRAND TOTALS, Total, Paid, space, space, Due] -> Due is index 5 or 6 depending on dom.
      }
      // Let's refine fee Due extraction:
      const dueCell = row.children[5]; 
      if (dueCell) feeDue = dueCell.textContent.trim();
      break;
    }
  }

  // --- B. Send Data to Parent ---
  // Use the same robust ledger scraper that the Fees-tab rebuild now relies
  // on. The "Current Semester" label is sourced from the BioData pane text
  // (e.g. "Regular(III Semester- 2025)") — that is the term the student
  // is *enrolled* in, not the term whose bill happens to be open. The amount
  // comes from the matching fee summary if the portal has already posted the
  // assessment for that term; otherwise the row reads "—" / pending.
  let feeCurrentSem = '--';
  let feeCurrentSemLabel = 'Current Semester';
  let feeCurrentSemPayable = '--';
  let feeCurrentSemStatus = 'pending'; // 'pending' | 'paid' | 'due'
  let feeTotalDue = '--';
  let feeBalanceWords = '';
  // Read the active semester text from the BioData pane on this same page.
  // The BioData parse ran earlier in this function and saved it into
  // `data.Semester`. If for any reason that's empty (e.g., a manual
  // refresh after navigation) read it directly from the DOM.
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
    const parsedFees = parseFeeLedger(feesPane);
    if (parsedFees) {
      feeBalanceWords = parsedFees.balanceWords || '';
      if (parsedFees.grandTotals) {
        const td = parseFloat((parsedFees.grandTotals.due || '0').replace(/,/g, '')) || 0;
        feeTotalDue = isFinite(td) && !isNaN(td) ? td.toFixed(2) : '--';
      }

      // Look up the matching semester summary by the enrollment label
      // (e.g. "III SEMESTER"). Search by exact roman prefix to tolerate the
      // summary strings being lowercase vs. uppercase.
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
        // Enrollment semester was not found in the ledger. The portal likely
        // hasn't posted an assessment row for this term yet.
        feeCurrentSemStatus = 'pending';
      }
    }
  } catch (e) { /* fee breakdown is best-effort — fall back to feeDue */ }

  const profileData = {
    held, attended, percent, attendanceSubjects, backlogsText, feeDue,
    feeCurrentSem, feeCurrentSemLabel,
    feeCurrentSemPayable,
    feeCurrentSemStatus,
    feeTotalDue, feeBalanceWords,
    lastUpdated: Date.now()
  };
  chrome.storage.local.set({ reecapProfileData: profileData });
  window.parent.postMessage({
    type: 'REECAP_PROFILE_DATA',
    data: profileData
  }, '*');

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
  buildProfileTabs(accordion);
}

function buildProfileTabs(accordion) {
  const headers = accordion.querySelectorAll('h1');
  const panes = accordion.querySelectorAll('div[id^="divProfile_"]');
  
  if (headers.length === 0 || panes.length === 0) return;
  
  const tabContainer = document.createElement('div');
  tabContainer.className = 'reecap-tabs';
  
  headers.forEach((h1, index) => {
    const btn = document.createElement('button');
    btn.className = 'reecap-tab-btn';
    btn.textContent = h1.textContent.trim();
    if (index === 0) btn.classList.add('active');
    
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Update buttons
      tabContainer.querySelectorAll('.reecap-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update panes
      panes.forEach(p => p.classList.remove('reecap-pane-active'));
      panes[index].classList.add('reecap-pane-active');
      
      // Post message to parent to resize iframe (since content height changed)
      window.parent.postMessage({ type: 'REECAP_RESIZE', height: document.body.scrollHeight }, '*');
    });
    
    tabContainer.appendChild(btn);
  });
  
  // Set first pane as active initially
  panes[0].classList.add('reecap-pane-active');
  
  // Insert tabs before accordion
  accordion.parentElement.insertBefore(tabContainer, accordion);

  // Simulate click after a tiny delay to ensure jQuery UI or async scripts don't override the initial state
  setTimeout(() => {
    const firstBtn = tabContainer.querySelector('.reecap-tab-btn');
    if (firstBtn) firstBtn.click();
  }, 150);

  // 5. Redesign the BioData Table
  buildBioDataRedesign(accordion);

  // 6. Redesign remaining 7 Profile Tabs
  buildProfilePanesRedesign(accordion);
}

function buildBioDataRedesign(accordion) {
  const bioPane = document.getElementById('divProfile_BioData');
  if (!bioPane) return;
  
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
  chrome.storage.local.set({
    reecapIdentity: {
      RollNo: data['RollNo'],
      Course: data['Course'],
      Branch: data['Branch'],
      Semester: data['Semester']
    }
  });

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
    } else if (currentSem && row.children.length >= 7 && !isNaN(parseInt(row.children[0].textContent.trim(), 10))) {
      const cells = row.querySelectorAll('td');
      const code = cells[1]?.textContent.trim() || '';
      const name = cells[2]?.textContent.trim() || '';
      const session = cells[3]?.textContent.trim() || '';
      const grade = cells[4]?.textContent.trim() || '';
      const points = cells[5]?.textContent.trim() || '-';
      const credits = cells[6]?.textContent.trim() || '-';
      const result = cells[7]?.textContent.trim() || (cells[6]?.textContent.trim() === 'PASS' || cells[6]?.textContent.trim() === 'FAIL' ? cells[6]?.textContent.trim() : '');
      if (code || name) {
        currentSem.subjects.push({ code, name, session, grade, points, credits, result });
      }
    }
  });

  if (!semesters.length && cgpa === '--') return; // defensive

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
        <div class="reecap-table-wrap">
          <table class="reecap-data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Subject Title</th>
                <th>Session</th>
                <th>Grade</th>
                <th>Points</th>
                <th>Credits</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
    `;
    sem.subjects.forEach(s => {
      const isPass = s.result && (s.result.toUpperCase().includes('PASS') || s.grade === 'O' || s.grade === 'A' || s.grade === 'B' || s.grade === 'C' || s.grade === 'D' || s.grade === 'S');
      const badgeClass = isPass ? 'status-pill-pass' : 'status-pill-fail';
      const resultLabel = s.result ? s.result.toUpperCase() : (isPass ? 'PASS' : 'FAIL');
      html += `
        <tr>
          <td class="mono" style="color: var(--text-secondary);">${s.code}</td>
          <td style="font-weight: 600; color: var(--text-primary);">${s.name}</td>
          <td class="mono" style="font-size: 11px;">${s.session}</td>
          <td class="mono" style="font-weight: 700; color: var(--text-primary);">${s.grade}</td>
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

// Ensure the iframe correctly reports its content height on load
if (window.self !== window.top) {
  window.addEventListener('load', () => {
    // Small timeout to allow DOM/jQuery UI to settle before measuring
    setTimeout(() => {
      window.parent.postMessage({ type: 'REECAP_RESIZE', height: document.documentElement.offsetHeight }, '*');
    }, 100);
  });
}

function buildSidebar() {
  const menu = document.getElementById('menu');
  if (!menu) return;
  
  const links = Array.from(menu.querySelectorAll('a.menuLink, a[id^="MenuLink"]'));
  if (links.length === 0) return;
  
  // Clean up submenu structures if they exist
  const submenus = menu.querySelectorAll('.submenu');
  submenus.forEach(s => s.remove());
  
  const groups = {
    'Academics': ['ATTENDANCE', 'TIME TABLE', 'CHOOSE TIMETABLE', 'COURSE REGISTRATION', 'MARKS', 'LESSON PLAN', 'EXAMS DETAILS', 'HALLTICKET', 'VIEW ANSWER SHEET', 'VIEW EXAM PAPER', 'BACKLOGS'],
    'Finance': ['FEE DETAILS', 'ONLINE PAYMENT', 'COLLEGE FEE', 'EXAM FEE', 'RE-VALUATION', 'ONLINE TRANSACTIONS', 'RECEIPTS'],
    'Account': ['PROFILE', 'HOSTEL ROOM BOOKING', 'LIBRARY BOOKS', 'BOOK SEARCH']
  };
  
  const icons = {
    'ATTENDANCE': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-7l-2-2"></path><path d="M12 15l2-2"></path><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path></svg>',
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
    'HOSTEL ROOM BOOKING': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
    'LIBRARY BOOKS': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    'BOOK SEARCH': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'
  };

  const genericIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>';

  const categorized = { 'Academics': [], 'Finance': [], 'Account': [] };
  let profileItem = null;

  links.forEach(link => {
    let text = link.textContent.replace('»', '').trim().toUpperCase();
    if (text === 'ONLINE PAYMENT') return; // Skip dropdown parent
    if (text === 'PROFILE') {
      profileItem = { text, link };
      return;
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

  chrome.storage.sync.get({ sidebarOpen: { Academics: true, Finance: false, Account: false } }, ({ sidebarOpen }) => {
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

    // Add OVERVIEW item at top (Only for Students)
    if (isStudentRole()) {
      const overviewLi = document.createElement('li');
      const overviewA = document.createElement('a');
      overviewA.className = 'reecap-sidebar-link reecap-sidebar-overview';
      overviewA.href = 'javascript:void(0);';
      const overviewIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>';
      overviewA.title = 'Overview';
      overviewA.innerHTML = `<span class="reecap-sidebar-icon">${overviewIcon}</span><span class="reecap-sidebar-text">OVERVIEW</span>`;
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

    if (profileItem) {
      const profileLink = profileItem.link;
      profileLink.className = 'reecap-sidebar-link';
      const profileRouteKey = window.__reecap_theme?.routeKeyForHref(profileLink.getAttribute('href') || '');
      if (profileRouteKey) profileLink.setAttribute('data-route-key', profileRouteKey);
      profileLink.title = profileItem.text;
      profileLink.innerHTML = `<span class="reecap-sidebar-icon">${icons.PROFILE || genericIcon}</span><span class="reecap-sidebar-text">${profileItem.text}</span>`;
      profileLink.addEventListener('click', () => {
        if (typeof showIframe === 'function') showIframe();
        if (typeof closeResponsiveNavigation === 'function') closeResponsiveNavigation();
      });
      const profileLi = document.createElement('li');
      profileLi.appendChild(profileLink);
      menu.appendChild(profileLi);
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

        // Stamp data-route-key at link creation so the sync side becomes a
        // single dict lookup. We resolve against window.location for relative
        // URLs (the portal mixes absolute and relative hrefs).
        const routeKey = (window.__reecap_theme && window.__reecap_theme.routeKeyForHref)
          ? window.__reecap_theme.routeKeyForHref(a.getAttribute('href') || '')
          : null;
        if (routeKey) a.setAttribute('data-route-key', routeKey);

        // Seed the initial active state from the resolved route key. We do not
        // call syncSidebarActiveState at build time because the iframe has not
        // navigated yet — instead, we set the active class iff the *shell*
        // pathname itself matches the link's route key.
        if (routeKey) {
          const shellKey = (window.__reecap_theme && window.__reecap_theme.matchActivePage)
            ? window.__reecap_theme.matchActivePage(window.location.pathname)
            : null;
          a.classList.toggle('active', shellKey === routeKey);
        }

        a.title = item.text;
        a.innerHTML = `<span class="reecap-sidebar-icon">${icons[item.text] || genericIcon}</span><span class="reecap-sidebar-text">${item.text}</span>`;
        a.addEventListener('click', () => {
          if (typeof showIframe === 'function') showIframe();
          if (typeof closeResponsiveNavigation === 'function') closeResponsiveNavigation();
        });
        const li = document.createElement('li');
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
        const isCollapsed = !groupHeader.classList.contains('is-collapsed');
        setGroupCollapsed(isCollapsed);

        // An extension reload invalidates this page's existing content-script
        // context. Keep the visual toggle working and skip preference storage
        // until the user refreshes into the current extension context.
        if (typeof chrome === 'undefined' || !chrome.runtime?.id || !chrome.storage?.sync) return;

        try {
          chrome.storage.sync.get({ sidebarOpen: {} }, (data) => {
            try {
              if (!chrome.runtime?.id || chrome.runtime.lastError) return;
              const currentSidebarOpen = data.sidebarOpen || {};
              currentSidebarOpen[groupName] = !isCollapsed;
              chrome.storage.sync.set({ sidebarOpen: currentSidebarOpen }, () => {
                // Consume a potential context-invalidated error after reload.
                void chrome.runtime?.lastError;
              });
            } catch (e) {
              // The extension was reloaded between get() and its callback.
            }
          });
        } catch (e) {
          // The extension context has been invalidated; a page refresh reconnects it.
        }
      });

      menu.appendChild(groupHeader);
      menu.appendChild(section);
    }
    
    // Add Directory at bottom (Only for Students)
    if (isStudentRole()) {
      const directoryDivider = document.createElement('div');
      directoryDivider.className = 'reecap-sidebar-overview-divider';
      menu.appendChild(directoryDivider);

      const usersLi = document.createElement('li');
      const usersA = document.createElement('a');
      usersA.className = 'reecap-sidebar-link reecap-sidebar-students';
      usersA.href = 'javascript:void(0);';
      const usersIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';
      usersA.title = 'Student Directory';
      usersA.innerHTML = `<span class="reecap-sidebar-icon">${usersIcon}</span><span class="reecap-sidebar-text">STUDENTS</span>`;
      usersA.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.reecap-sidebar-link').forEach(link => link.classList.remove('active'));
        usersA.classList.add('active');
        if (typeof showStudentsDirectory === 'function') showStudentsDirectory();
        if (typeof closeResponsiveNavigation === 'function') closeResponsiveNavigation();
      });
      usersLi.appendChild(usersA);
      menu.appendChild(usersLi);
    }
  });
}

function showOverview() {
  if (!isStudentRole()) {
    console.warn('ReEcap: Access denied to Overview — student login required.');
    return;
  }

  const dirCont = document.getElementById('reecap-students-directory');
  if (dirCont) dirCont.style.setProperty('display', 'none', 'important');
  const container = document.getElementById('reecap-default-content');
  if (container) container.style.display = 'block';
  const iframe = document.getElementById('capIframeId');
  const overview = document.getElementById('reecap-overview');
  const directory = document.getElementById('reecap-students-directory');
  const pageTitle = document.getElementById('reecap-page-title');
  const profileContainer = document.querySelector('.student-profile-container');
  
  // UNCONDITIONALLY hide iframe so legacy views NEVER bleed into custom Overview
  if (iframe) iframe.style.setProperty('display', 'none', 'important');
  
  if (directory) directory.style.setProperty('display', 'none', 'important');
  if (overview) overview.style.setProperty('display', 'flex', 'important');
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

function showStudentsDirectory() {
  const container = document.getElementById('reecap-default-content');
  
  if (!isStudentRole()) {
    if (container) {
      container.innerHTML = '<div class="overview-grid" style="padding: 40px; text-align: center; color: var(--text-secondary);">Access Restricted. Please log in as a student to view the Directory.</div>';
      container.style.display = 'block';
    }
    return;
  }

  const iframe = document.getElementById('capIframeId');
  const overview = document.getElementById('reecap-overview');
  let directory = document.getElementById('reecap-students-directory');
  const pageTitle = document.getElementById('reecap-page-title');
  const profileContainer = document.querySelector('.student-profile-container');
  
  if (iframe) iframe.style.setProperty('display', 'none', 'important');
  if (overview) overview.style.setProperty('display', 'none', 'important');
  if (container) container.style.setProperty('display', 'none', 'important');
  // Attempt to aggressively hide nested legacy profile wrappers
  if (profileContainer) profileContainer.style.setProperty('display', 'none', 'important');
  const legacyProfileDiv = document.getElementById('divProfile');
  if (legacyProfileDiv) legacyProfileDiv.style.setProperty('display', 'none', 'important');
  
  if (!directory) {
    directory = document.createElement('div');
    directory.id = 'reecap-students-directory';
    directory.className = 'reecap-students-directory';
    const contentCol = document.getElementById('reecap-content-col');
    if (contentCol) {
      contentCol.appendChild(directory);
      buildStudentsDirectory(directory);
    }
  }
  
  directory.style.setProperty('display', 'block', 'important');
  if (pageTitle) pageTitle.textContent = 'STUDENT DIRECTORY';

  document.documentElement.setAttribute('data-overview-active', 'false');

  document.querySelectorAll('a.reecap-sidebar-link').forEach(link => {
    if (link.classList.contains('reecap-sidebar-students')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function showIframe() {
  const iframe = document.getElementById('capIframeId');
  const overview = document.getElementById('reecap-overview');
  const directory = document.getElementById('reecap-students-directory');
  if (iframe) iframe.style.removeProperty('display');
  if (overview) overview.style.setProperty('display', 'none', 'important');
  if (directory) directory.style.setProperty('display', 'none', 'important');

  document.documentElement.setAttribute('data-overview-active', 'false');

  const overviewLink = document.querySelector('.reecap-sidebar-overview');
  if (overviewLink) overviewLink.classList.remove('active');
  const studentsLink = document.querySelector('.reecap-sidebar-students');
  if (studentsLink) studentsLink.classList.remove('active');

  if (typeof syncSidebarActiveState === 'function' && iframe && iframe.contentWindow) {
    try {
      const currentUrl = iframe.contentWindow.location.pathname.toLowerCase();
      if (currentUrl) syncSidebarActiveState(currentUrl);
    } catch (e) {}
  }
}

let responsiveNavigationController = null;

function initResponsiveNavigation() {
  if (responsiveNavigationController) return responsiveNavigationController;

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
  responsiveNavigationController?.close(options);
}

function rebuildMainLayout() {
  const iframe = document.getElementById('capIframeId');
  const menu = document.getElementById('menu');
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
  sidebarCol.appendChild(menu);

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

  contentCol.appendChild(iframe);

  columns.appendChild(sidebarCol);
  columns.appendChild(contentCol);
  layoutWrapper.appendChild(columns);

  const navigationScrim = document.createElement('div');
  navigationScrim.className = 'reecap-nav-scrim';
  navigationScrim.setAttribute('aria-hidden', 'true');

  masterTable.parentNode.insertBefore(layoutWrapper, masterTable);
  layoutWrapper.insertAdjacentElement('afterend', navigationScrim);
  masterTable.style.display = 'none';
  initResponsiveNavigation();

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
      chrome.storage.local.set({ reecapProfileData: profileData });
      if (typeof updateOverviewCards === 'function') {
        updateOverviewCards(profileData);
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
  // Phase 3 (2026-07-26): the strip slot is now ALWAYS populated by
  // initStatusStrip with a real DOM node carrying data-reecap-state. The
  // shimmer skeleton has been removed — it was getting stuck visible
  // because the legacy .reecap-status-strip CSS hides the real strip until
  // data-reecap-strip-active is set, leaving the skeleton in front of nothing.
  initStatusStrip(stripSlot);

  const grid = document.createElement('div');
  grid.className = 'overview-grid';
  container.appendChild(grid);

  const metricsSlot = document.createElement('div');
  metricsSlot.className = 'overview-section-metrics';
  grid.appendChild(metricsSlot);

  if (!chrome || !chrome.storage || !chrome.storage.local) return;
  try {
    chrome.storage.local.get(['reecapTimetable', 'reecapIdentity', 'reecapProfileData'], (data) => {
      if (chrome.runtime && chrome.runtime.lastError) return;

      renderDashboardCards(metricsSlot, data ? data.reecapProfileData : null);
      renderScheduleCard(grid, data ? data.reecapTimetable : null);
      // renderQuickLinksCard(grid);
      // The categorized sidebar groups are the single source of truth for
      // navigation. Rendering a second quick-links strip there created
      // duplicate entries, so we no longer inject reecap-sidebar-quicklinks.

      // When the hidden cache warmer finishes, replace only the schedule card
      // in place — no page refresh and no user navigation required.
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local' || !changes.reecapTimetable || !grid.isConnected) return;
        const existingSchedule = grid.querySelector('.overview-schedule-card');
        renderScheduleCard(grid, changes.reecapTimetable.newValue, existingSchedule);
      });

      // No schedule yet? Load the existing portal page silently in a one-shot
      // helper iframe. Its all-frames content script runs observeTimetable(),
      // writes the usual chrome.storage.local cache, then this helper removes
      // itself. The user never has to open CHOOSE TIMETABLE manually.
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
      // Intentionally NOT prefetching timetable data in the background.
      // Concurrent requests crash the ASP.NET session state causing a 401 loop.
    });
  } catch (e) {
    // A reload can invalidate the extension context between overview render
    // and storage lookup; the direct status-strip CTA remains available.
  }
}

function renderSidebarQuickLinks() {
  // Deprecated (Phase 4, 2026-07-26). The categorized sidebar groups already
  // cover Attendance, Timetable, Marks, Fee, Profile, and Backlogs, so
  // rendering a second list doubled every entry. The footer slot is removed.
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

  const ringRadius = 42;
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
  let feeCurrentSemPayable = null;
  let feeBalanceWords = "";
  let feeTotalDue = "--";
  let syncedCaption = "Syncing from background Profile...";

  if (profileData) {
    held = profileData.held || 0;
    attended = profileData.attended || 0;
    if (held > 0) {
      const percent = profileData.percent !== undefined ? profileData.percent : (attended / held * 100);
      ringDisplay = percent.toFixed(2) + "%";
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
    feeCurrentSemPayable = profileData.feeCurrentSemPayable !== undefined && profileData.feeCurrentSemPayable !== null ? `${profileData.feeCurrentSemPayable}` : null;
    feeBalanceWords      = profileData.feeBalanceWords || '';
    feeTotalDue          = profileData.feeTotalDue   !== undefined && profileData.feeTotalDue   !== null ? `${profileData.feeTotalDue}` : "--";
    if (profileData.lastUpdated) {
      const minsAgo = Math.round((Date.now() - profileData.lastUpdated) / 60000);
      syncedCaption = minsAgo < 2 ? "Synced just now" : `Synced ${minsAgo < 60 ? minsAgo + 'm' : Math.round(minsAgo/60) + 'h'} ago`;
    } else {
      syncedCaption = "Synced from Profile";
    }
  }

  // Color logic + caption text for the two fee values.
  // - Current semester bill: amber if due, green if paid, mute + "Assessment
  //   pending" caption if the portal hasn't yet posted the row.
  // - Total outstanding: red if anything owed, green otherwise.
  // - The optional balance-words caption (e.g. "Three Lakh Ninety Three …")
  //   sits under the Total row so the user can spot-check the portal.
  const haveSemNumber   = feeCurrentSem !== "--" && feeCurrentSem !== "0.00" && parseFloat(feeCurrentSem) > 0;
  const haveTotalNumber = feeTotalDue   !== "--" && feeTotalDue   !== "0.00" && parseFloat(feeTotalDue)   > 0;

  let semClass = 'is-muted';
  let semDisplay = '<span class="fee-status-badge is-success">Cleared</span>';
  let semCaption = 'Assessment pending';
  if (feeCurrentSemStatus === 'due') {
    semClass = 'is-warning';
    semDisplay = '₹' + formatCurrencyAmount(feeCurrentSem);
    semCaption = 'Amount outstanding this term';
  } else if (feeCurrentSemStatus === 'paid') {
    semClass = 'is-success';
    semDisplay = '<span class="fee-status-badge is-success">Cleared</span>';
    semCaption = 'Cleared in full' + (feeBalanceWords ? ' · ' + feeBalanceWords : '');
  }
  // Fall through: 'pending' → green "Cleared" badge + pending caption.

  const totalDisplay  = (haveTotalNumber ? '₹' + formatCurrencyAmount(feeTotalDue) : '<span class="fee-status-badge is-success">Cleared</span>');
  const totalCaption  = haveTotalNumber
    ? 'Across all assessed terms'
    : 'All accounts settled';

  slot.innerHTML = `
    <div class="ring-card">
      <div class="ring-wrap">
        <svg width="100" height="100">
          <circle class="ring-bg" cx="50" cy="50" r="${ringRadius}"></circle>
          <circle class="ring-fg" cx="50" cy="50" r="${ringRadius}"
                  stroke="${ringColor}"
                  stroke-dasharray="${ringCircumference}"
                  stroke-dashoffset="${ringOffset}"></circle>
        </svg>
        <div class="ring-center">
          <div class="ring-value overview-ring-value" style="color: ${ringColor}">${ringDisplay}</div>
        </div>
      </div>
      <div class="ring-label">Attendance</div>
      <div class="ring-caption">${profileData && held > 0 ? `${attended} / ${held} attended` : syncedCaption}</div>
    </div>

    <div class="stat-card">
      <div class="stat-top">
        <div class="stat-label">Active Backlogs</div>
      </div>
      <div class="ring-value" style="color: var(--text-primary); font-size: ${profileData ? '16px' : '14px'};">
        ${backlogsText}
      </div>
      <div class="ring-caption">${syncedCaption}</div>
    </div>

    <div class="stat-card fee-balance-card">
      <div class="stat-top">
        <div class="stat-label">Fee Balance</div>
      </div>

      <div class="fee-row">
        <span class="fee-row-label">${feeCurrentSemLabel}</span>
        <span class="fee-row-amount ${semClass}">${semDisplay}</span>
      </div>
      <div class="fee-row-caption">${semCaption}</div>

      <div class="fee-divider"></div>

      <div class="fee-row">
        <span class="fee-row-label">Total Outstanding</span>
        <span class="fee-row-amount ${haveTotalNumber ? 'is-critical' : 'is-success'}">${totalDisplay}</span>
      </div>
      <div class="fee-row-caption">${totalCaption}</div>

      <a href="Feepayments/studentfeereceipt.aspx?scrid=23" target="capIframe" class="fee-pay-pill">Pay Online</a>
    </div>
  `;

  const payBtn = slot.querySelector('.fee-pay-pill');
  if (payBtn) {
    payBtn.addEventListener('click', () => {
      showIframe();
    });
  }
}

function renderScheduleCard(container, timetableData, previousCard = null) {
  const card = document.createElement('div');
  card.className = 'overview-card overview-schedule-card';

  // Cache warmers update chrome.storage.local asynchronously. Replace the
  // existing empty card in place rather than append a duplicate schedule.
  if (previousCard && previousCard.parentNode === container) {
    previousCard.replaceWith(card);
  } else {
    container.appendChild(card);
  }

  const now = new Date();
  const jsDayToName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayName = jsDayToName[now.getDay()];

  let html = `<div class="overview-card-header"><span class="overview-card-title">Today's Schedule</span><span class="overview-card-subtitle">${todayName}, ${now.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span></div>`;

  if (!timetableData || !timetableData.schedule) {
    html += `<div class="schedule-empty">Preparing your schedule in the background…</div>`;
    card.innerHTML = html;
    return;
  }

  const { schedule, legendMap } = timetableData;
  const todaysClasses = schedule[todayName] || [];
  const currentMins = now.getHours() * 60 + now.getMinutes();

  let hasClasses = false;
  let rowsHtml = `<div class="schedule-list">`;

  todaysClasses.forEach(period => {
    if (!period.subjectCode) return;
    hasClasses = true;

    const times = parseTimeRange(period.timeRange);
    let isActive = false;
    if (times && currentMins >= times.start && currentMins < times.end) {
      isActive = true;
    }

    const primaryCode = period.subjectCode.split(',')[0].trim();
    const details = (legendMap && legendMap[primaryCode]) || { name: period.subjectCode, faculty: '', room: '' };

    rowsHtml += `
      <div class="schedule-row ${isActive ? 'is-active' : ''}">
        <div class="schedule-time">
          <span>${period.timeRange.split(/[-to]/i)[0].trim()}</span>
          <span class="schedule-time-end">${period.timeRange.split(/[-to]/i)[1] ? period.timeRange.split(/[-to]/i)[1].trim() : ''}</span>
        </div>
        <div class="schedule-details">
          <div class="schedule-subject">${details.name}</div>
          <div class="schedule-meta">
            ${details.room ? `<span>${details.room}</span> <b>•</b> ` : ''}<span>${details.faculty}</span>
          </div>
        </div>
        ${isActive ? `<div class="schedule-badge">NOW</div>` : ''}
      </div>
    `;
  });

  rowsHtml += `</div>`;

  if (!hasClasses) {
    html += `<div class="schedule-empty">No classes scheduled for today. Enjoy!</div>`;
  } else {
    html += rowsHtml;
  }

  card.innerHTML = html;
}

function renderQuickLinksCard(container) {
  const card = document.createElement('div');
  card.className = 'overview-card overview-quicklinks-card';

  const links = [
    { label: 'Attendance', href: 'Academics/StudentAttendance.aspx?scrid=3&showtype=SA', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-7l-2-2"></path><path d="M12 15l2-2"></path><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path></svg>' },
    { label: 'Timetable', href: 'Academics/TimeTableReport.aspx?scrid=18', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' },
    { label: 'Marks', href: 'Academics/StudentMarksReport.aspx?scrid=15', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' },
    { label: 'Fee Details', href: 'FeePayments/studentpayments.aspx?scrid=11', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>' },
    { label: 'Profile', href: 'Academics/StudentProfile.aspx?scrid=17', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' }
  ];

  let html = `<div class="overview-card-header"><span class="overview-card-title">Quick Links</span></div><div class="quicklinks-grid">`;

  links.forEach(item => {
    html += `
      <a href="${item.href}" target="capIframe" class="quicklink-item">
        <div class="quicklink-icon">${item.icon}</div>
        <div class="quicklink-label">${item.label}</div>
      </a>
    `;
  });

  html += `</div>`;
  card.innerHTML = html;

  card.querySelectorAll('.quicklink-item').forEach(btn => {
    btn.addEventListener('click', () => {
      showIframe();
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
  setInterval(() => updateStatusStrip(strip), 60000);

  // Listen for instant updates from the iframe (all frames share local storage).
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && (changes.reecapTimetable || changes.reecapIdentity)) {
      updateStatusStrip(strip);
    }
  });
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
  if (!chrome || !chrome.storage || !chrome.storage.local) return;
  try {
    chrome.storage.local.get(['reecapTimetable', 'reecapIdentity'], (data) => {
      if (chrome.runtime && chrome.runtime.lastError) return;
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

  if (!chrome || !chrome.storage || !chrome.storage.local) {
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
      const sColor = s.percent >= 75 ? "var(--success)" : (s.percent >= 65 ? "var(--warning)" : (s.held === 0 ? "var(--text-faint)" : "var(--error)"));
      
      // Calculate bunk/attend limits for 75% target
      let targetStatusStr = '<span class="status-neutral">N/A</span>';
      
      // We want: (attended + attend_more) / (held + attend_more) >= 0.75
      // To find attend_more: attended + A = 0.75*(held + A) 
      // => attended + A = 0.75*held + 0.75*A 
      // => 0.25*A = 0.75*held - attended
      // => A = 3*held - 4*attended
      const neededClasses = (3 * s.held) - (4 * s.attend);
      
      // We want: attended / (held + skip_more) >= 0.75
      // => attended = 0.75*held + 0.75*skip_more
      // => 0.75*skip_more = attended - 0.75*held
      // => skip_more = (4/3)*attended - held
      const skippableClasses = Math.floor((4/3) * s.attend - s.held);

      if (s.held === 0) {
         targetStatusStr = '<span class="status-neutral" style="color: var(--text-faint); font-size: 12px;">Classes pending</span>';
      } else if (s.percent >= 75) {
         if (skippableClasses > 0) {
            targetStatusStr = `<div class="bunkable-tag">Can skip next <b>${skippableClasses}</b></div>`;
         } else {
            // They are at exactly 75%. Falling below it is bad, so this is a warning.
            targetStatusStr = `<div class="bunkable-tag warning">Can skip <b>0</b></div>`;
         }
      } else {
         // If they are between 65% and 75%, it's just a warning. Below 65% is critical red.
         const pillTone = s.percent >= 65 ? 'warning' : 'critical';
         if (neededClasses > 0) {
            targetStatusStr = `<div class="bunkable-tag ${pillTone}">Attend next <b>${neededClasses}</b></div>`;
         } else {
            // Technically impossible string if percent < 75, but safeguard.
            targetStatusStr = `<div class="bunkable-tag ${pillTone}">Attend next <b>0</b></div>`; 
         }
      }

      html += `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--text-primary);">${s.subjName}</div>
            ${s.faculty ? `<div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px; font-weight: 500;">${s.faculty}</div>` : ''}
          </td>
          <td class="mono" style="text-align: right;">${s.held}</td>
          <td class="mono" style="text-align: right; font-weight: 600;">${s.attend}</td>
          <td class="mono" style="text-align: right; font-weight: 700; color: ${sColor};">${s.percent}%</td>
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

  chrome.storage.local.get(['reecapProfileData'], (data) => {
    if (chrome.runtime && chrome.runtime.lastError) return;

    // First, sync it immediately if we have it
    let prof = data ? data.reecapProfileData : null;
    renderView(prof);

    // If it's missing or subjects aren't populated, we cannot prefetch it safely
    // because background iframe fetching corrupts the ASP.NET scrid session and
    // causes 401 Unauthorized logout loops.
  });
}

// escapeAttr is defined at the module top so all DOM renderers share the
// same complete escaping behavior for portal-provided values.

function showStudentsDirectory() {
  const container = document.getElementById('reecap-default-content');
  let directory = document.getElementById('reecap-students-directory');
  const iframe = document.getElementById('capIframeId');
  const overview = document.getElementById('reecap-overview');
  const pageTitle = document.getElementById('reecap-page-title');

  if (iframe) iframe.style.setProperty('display', 'none', 'important');
  if (overview) overview.style.setProperty('display', 'none', 'important');
  if (container) container.style.setProperty('display', 'none', 'important');
  
  if (!directory) {
    const parentContainer = document.getElementById('reecap-content-col');
    if (parentContainer) {
      directory = document.createElement('div');
      directory.id = 'reecap-students-directory';
      directory.className = 'reecap-students-directory';
      parentContainer.appendChild(directory);
      buildStudentsDirectory(directory);
    }
  }

  if (directory) {
    directory.style.setProperty('display', 'block', 'important');
  }
  if (pageTitle) pageTitle.textContent = 'STUDENT DIRECTORY';
}

function buildStudentsDirectory(container) {
  container.innerHTML = `
    <div class="directory-controls">
      <!-- Custom Select: Batch -->
      <div class="custom-select-wrapper" id="dir-year-wrapper">
        <div class="custom-select-trigger">
          <span class="custom-select-label">Campus All Batches</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="directory-filter-chevron"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
        <div class="custom-select-options">
          <div class="custom-select-option selected" data-value="">Campus All Batches</div>
          <div class="custom-select-group">Undergraduate</div>
          <div class="custom-select-option" data-value="25B11">2nd Year (2025)</div>
          <div class="custom-select-option" data-value="24B11">3rd Year (2024)</div>
          <div class="custom-select-option" data-value="23A91A,23B11,23P31A,23MH1A">4th Year (2023)</div>
          <div class="custom-select-group">Alumni Shell</div>
          <div class="custom-select-option" data-value="22A91A,22P31A,22MH1A">2022 Passouts</div>
        </div>
        <select id="dir-year" style="display: none;">
          <option value="">Campus All Batches</option>
          <option value="25B11">2nd Year (2025)</option>
          <option value="24B11">3rd Year (2024)</option>
          <option value="23A91A,23B11,23P31A,23MH1A">4th Year (2023)</option>
          <option value="22A91A,22P31A,22MH1A">2022 Passouts</option>
        </select>
      </div>
      
      <!-- Custom Select: Branch -->
      <div class="custom-select-wrapper" id="dir-branch-wrapper">
        <div class="custom-select-trigger">
          <span class="custom-select-label">All Branches</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="directory-filter-chevron"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
        <div class="custom-select-options">
          <div class="custom-select-option selected" data-value="">All Branches</div>
          <div class="custom-select-group">Engineering Core</div>
          <div class="custom-select-option" data-value="CS">Computer Science (CSE)</div>
          <div class="custom-select-option" data-value="AI">AI & Machine Learning</div>
          <div class="custom-select-option" data-value="DS">Data Science (DS)</div>
          <div class="custom-select-option" data-value="IT">Information Technology</div>
          <div class="custom-select-group">Electronics & Mechanics</div>
          <div class="custom-select-option" data-value="EC">Electronics & Comm (ECE)</div>
          <div class="custom-select-option" data-value="EE">Electrical & Elect (EEE)</div>
          <div class="custom-select-option" data-value="ME">Mechanical</div>
          <div class="custom-select-option" data-value="CE">Civil</div>
          <div class="custom-select-group">Specialized</div>
          <div class="custom-select-option" data-value="AE">Agricultural</div>
          <div class="custom-select-option" data-value="MN">Mining</div>
          <div class="custom-select-option" data-value="PT">Petroleum</div>
        </div>
        <select id="dir-branch" style="display: none;">
          <option value="">All Branches</option>
          <option value="CS">Computer Science (CSE)</option>
          <option value="AI">AI & Machine Learning (AIML)</option>
          <option value="DS">Data Science (DS)</option>
          <option value="IT">Information Technology (IT)</option>
          <option value="EC">Electronics & Comm (ECE)</option>
          <option value="EE">Electrical & Elect (EEE)</option>
          <option value="ME">Mechanical</option>
          <option value="CE">Civil</option>
          <option value="AE">Agricultural</option>
          <option value="MN">Mining</option>
          <option value="PT">Petroleum</option>
        </select>
      </div>
      
      <div class="directory-search-wrapper">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="directory-search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="dir-search" class="directory-search-input" placeholder="Search by name or type exact roll number..." spellcheck="false" autocomplete="off">
      </div>
    </div>
    <div id="dir-grid" class="student-card-grid">
      <div class="directory-loader">Loading student database...</div>
    </div>
  `;

  if (!document.getElementById('reecap-photo-modal')) {
    const modal = document.createElement('div');
    modal.id = 'reecap-photo-modal';
    modal.className = 'reecap-photo-modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <button class="modal-close"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>
        <img id="modal-img" class="modal-image" src="" alt="Student Photo">
        <div style="text-align:center;">
          <h2 id="modal-name" class="bio-name" style="margin-bottom:8px;">Student</h2>
          <div id="modal-roll" class="student-card-roll" style="display:inline-block;">25B11CS001</div>
        </div>
        <div class="modal-actions">
          <button id="modal-copy-roll" class="modal-btn-copy">Copy Roll</button>
          <a id="modal-mail-btn" href="#" class="modal-btn-primary">Email Student</a>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.classList.remove('is-open'));
    modal.querySelector('.modal-close').addEventListener('click', () => modal.classList.remove('is-open'));
    
    document.getElementById('modal-copy-roll').addEventListener('click', function() {
      const roll = document.getElementById('modal-roll').textContent;
      navigator.clipboard.writeText(roll);
      const original = this.textContent;
      this.textContent = 'Copied!';
      setTimeout(() => this.textContent = original, 2000);
    });
  }

  const grid = document.getElementById('dir-grid');
  const yearSelect = document.getElementById('dir-year');
  const branchSelect = document.getElementById('dir-branch');
  const searchInput = document.getElementById('dir-search');

  let allStudents = [];
  let displayedCount = 0;
  const BATCH_SIZE = 40;
  let filteredStudents = [];
  
  // Load students directly since decorators.js runs in extension isolated world
  // and cannot access window.REECAP_STUDENTS from page context.
  async function loadStudentsData() {
    if (!isStudentRole()) {
      console.warn('ReEcap Security: Blocked student database fetch. Active user is not a student.');
      grid.innerHTML = '<div class="directory-loader">Access Restricted. Only logged-in students can view the Student Directory.</div>';
      return;
    }

    try {
      const jsonUrl = chrome.runtime.getURL('shared/students.json');
      const response = await fetch(jsonUrl);
      const data = await response.json();
      const brMap = {'CS':'CSE','AI':'AIML','DS':'Data Sci','EC':'ECE','EE':'EEE','IT':'IT','ME':'Mech','CE':'Civil','AE':'AgE','MN':'Mining','PT':'Petrol'};
      
      allStudents = data.map(s => {
        const roll = s[0].toUpperCase();
        let branch = 'Unknown';
        if (roll.includes('B11')) {
           const br = roll.substring(5, 7);
           branch = brMap[br] || br;
        } else if (roll.includes('A91A') || roll.includes('P31A') || roll.includes('MH1A')) {
           const brCode = roll.substring(6, 8);
           const mapping = {'05':'CSE','42':'AIML','44':'Data Sci','04':'ECE','02':'EEE','12':'IT','03':'Mech','01':'Civil'};
           branch = mapping[brCode] || brCode;
        }
        return { roll, name: s[1], email: s[2], branch };
      });
      applyFilters();
    } catch (e) {
      console.error('Failed to load students.json in decorators.js:', e);
    }
  }
  
  loadStudentsData();

  function getPhotoUrl(roll) {
    if (roll.startsWith('25B11') || roll.startsWith('24B11')) return `https://info.aec.edu.in/aus/StudentPhotos_Original/${roll}.jpg`;
    if (roll.includes('A91A') || roll.includes('P31A') || roll.includes('MH1A')) return `https://info.aec.edu.in/aec/StudentPhotos/${roll}.jpg`;
    return `https://info.aec.edu.in/aus/StudentPhotos_Original/${roll}.jpg`;
  }

  function renderBatch() {
    let html = '';
    const slice = filteredStudents.slice(displayedCount, displayedCount + BATCH_SIZE);
    
    slice.forEach(s => {
      const photoUrl = getPhotoUrl(s.roll);
      html += `
        <div class="student-card">
          <img class="student-card-avatar" src="${photoUrl}" alt="${s.roll}" loading="lazy" onerror="this.src=''; this.style.display='none';" data-roll="${s.roll}" data-name="${escapeAttr(s.name)}" data-email="${s.email}">
          <div class="student-card-meta">${s.branch}</div>
          <h3 class="student-card-name" title="${escapeAttr(s.name)}">${escapeAttr(s.name)}</h3>
          <div class="student-card-roll">${s.roll}</div>
          <a href="mailto:${s.email}" class="student-mail-btn">Mail Student</a>
        </div>
      `;
    });

    if (displayedCount === 0) {
      grid.innerHTML = html;
      if (filteredStudents.length === 0) grid.innerHTML = '<div class="directory-loader">No students found matching your criteria.</div>';
    } else {
      grid.insertAdjacentHTML('beforeend', html);
    }
    
    displayedCount += slice.length;
    
    grid.querySelectorAll('.student-card-avatar:not(.bound)').forEach(img => {
      img.classList.add('bound');
      img.addEventListener('click', function() {
        const modal = document.getElementById('reecap-photo-modal');
        document.getElementById('modal-img').src = this.src;
        document.getElementById('modal-name').textContent = this.dataset.name;
        document.getElementById('modal-roll').textContent = this.dataset.roll;
        document.getElementById('modal-mail-btn').href = 'mailto:' + this.dataset.email;
        modal.classList.add('is-open');
      });
    });
  }

  function applyFilters() {
    const yearSelectNode = document.getElementById('dir-year');
    const branchSelectNode = document.getElementById('dir-branch');
    const yearVal = yearSelectNode ? yearSelectNode.value : '';
    const branchVal = branchSelectNode ? branchSelectNode.value : '';
    const searchVal = searchInput.value.trim().toUpperCase();

    filteredStudents = allStudents.filter(s => {
      if (yearVal) {
        const prefixes = yearVal.split(',');
        if (!prefixes.some(p => s.roll.startsWith(p))) return false;
      }
      if (branchVal && !s.roll.includes(branchVal)) return false;
      if (searchVal && !s.roll.includes(searchVal) && !s.name.toUpperCase().includes(searchVal)) return false;
      return true;
    });

    // Dynamic generation of cards for Valid Roll Numbers that are completely missing from JSON database
    // So someone actively querying their own exact roll number can still generate the card from the AEC server
    if (searchVal.length >= 10 && filteredStudents.length === 0) {
      if (/^\d{2}[A-Z0-9]{8}$/.test(searchVal) || /^\d{2}[A-Z0-9]{3,8}$/.test(searchVal)) {
         
         const brMap = {'CS':'CSE','AI':'AIML','DS':'Data Sci','EC':'ECE','EE':'EEE','IT':'IT','ME':'Mech','CE':'Civil','AE':'AgE','MN':'Mining','PT':'Petrol'};
         let branch = 'Unknown';
         if (searchVal.includes('B11')) {
           const br = searchVal.substring(5, 7);
           branch = brMap[br] || br;
         } else if (searchVal.includes('A91A') || searchVal.includes('P31A') || searchVal.includes('MH1A')) {
           const brCode = searchVal.substring(6, 8);
           const mapping = {'05':'CSE','42':'AIML','44':'Data Sci','04':'ECE','02':'EEE','12':'IT','03':'Mech','01':'Civil'};
           branch = mapping[brCode] || brCode;
         }

         let constructedEmail = '';
         if (searchVal.startsWith('24B11')) constructedEmail = `${searchVal.toLowerCase()}@aec.edu.in`;
         if (searchVal.startsWith('25B11')) constructedEmail = `${searchVal.toLowerCase()}@aec.edu.in`;

         filteredStudents.push({
           roll: searchVal,
           name: searchVal, // Fallback if name is totally missing
           email: constructedEmail,
           branch: branch
         });
      }
    }

    displayedCount = 0;
    grid.innerHTML = '';
    renderBatch();
  }

  let debounceTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(applyFilters, 150);
  });
  
  // Custom Select Dropdown Logic
  document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
    const trigger = wrapper.querySelector('.custom-select-trigger');
    const optionsPanel = wrapper.querySelector('.custom-select-options');
    const label = wrapper.querySelector('.custom-select-label');
    const hiddenSelect = wrapper.querySelector('select');
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select-wrapper.is-open').forEach(w => {
         if (w !== wrapper) w.classList.remove('is-open');
      });
      wrapper.classList.toggle('is-open');
    });
    
    wrapper.querySelectorAll('.custom-select-option').forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Update styling
        wrapper.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        // Update text + value
        label.textContent = option.textContent;
        hiddenSelect.value = option.dataset.value;
        
        wrapper.classList.remove('is-open');
        applyFilters();
      });
    });
  });

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-wrapper.is-open').forEach(w => w.classList.remove('is-open'));
  });

  const contentCol = document.getElementById('reecap-content-col');
  if (contentCol) {
    contentCol.addEventListener('scroll', () => {
      if (contentCol.scrollHeight - contentCol.scrollTop <= contentCol.clientHeight + 400) {
        if (displayedCount < filteredStudents.length) renderBatch();
      }
    }, { passive: true });
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
