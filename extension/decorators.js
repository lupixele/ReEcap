// ReEcap — decorators.js
// Isolated module for DOM-reading decorative enhancements (SVG rings, progress bars).

function initDecorators() {
  chrome.storage.sync.get({ enabled: true }, (data) => {
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
      
      if (topContainer && userDataRow) {
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
         brandBlock.innerHTML = '<div class="eyebrow">Student Portal</div><h1 class="brand-title">ReEcap</h1>';
         
         const userCluster = document.createElement('div');
         userCluster.className = 'user-cluster';
         
         if (avatarDiv) {
            const img = avatarDiv.querySelector('img');
            if (img) {
               img.className = 'user-avatar';
               userCluster.appendChild(img);
            }
         }
         
         if (lblUser) {
            lblUser.textContent = lblUser.textContent.replace('Hi...', '').trim();
            lblUser.className = 'user-name';
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
         
         // 4. Build isolated Status Strip container
         const stripContainer = document.createElement('div');
         stripContainer.id = 'reecap-strip-container';
         
         // 5. Inject into DOM before the main layout table
         topContainer.insertBefore(stripContainer, mainLayoutTable);
         topContainer.insertBefore(header, stripContainer);
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
    
    // 2. Profile Dashboard (Pass 1)
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
  });
}

function observeTimetable() {
  const targetNode = document.getElementById('divdetails') || document.body;
  
  const observer = new MutationObserver((mutations, obs) => {
    const tbl = document.getElementById('tbldetails');
    // Check if table has been populated with rows (more than just a header)
    if (tbl && tbl.rows.length > 5 && !document.getElementById('reecap-timetable')) {
      // The AJAX script first clears then appends. We wait a tiny bit to ensure it's fully populated.
      setTimeout(() => {
        if (!document.getElementById('reecap-timetable')) {
          buildTimetableDashboard(tbl);
        }
      }, 100);
    }
  });
  
  observer.observe(targetNode, { childList: true, subtree: true });
}

function buildTimetableDashboard(tbl) {
  const rows = Array.from(tbl.querySelectorAll('tr'));
  if (rows.length < 2) return;

  // --- A. Scrape Header (Periods) ---
  const headerCells = rows[0].querySelectorAll('td');
  const periodCount = headerCells.length - 1; 

  // --- B. Scrape Days (1 to 6/7) ---
  const schedule = {};
  let legendStartIndex = 1;
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.querySelectorAll('td');
    
    const firstCellText = cells[0]?.textContent.trim() || "";
    if (cells.length > 1 && dayNames.some(d => firstCellText.includes(d))) {
      const day = firstCellText;
      schedule[day] = [];
      
      for (let j = 1; j < cells.length; j++) {
        const cellHtml = cells[j].innerHTML;
        const divMatch = cellHtml.match(/<div>(.*?)<br\/?>([\s\S]*?)<\/div>/i);
        let timeRange = "";
        let subjectStr = "";
        
        if (divMatch) {
          timeRange = divMatch[1].trim();
          subjectStr = divMatch[2].replace(/<br\/?>/gi, ", ").trim();
        } else {
          const text = cells[j].innerText || cells[j].textContent;
          const parts = text.split('\n');
          if (parts.length >= 2) {
             timeRange = parts[0].trim();
             subjectStr = parts.slice(1).join(', ').trim();
          }
        }
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

  // --- D. Build UI (CSS Grid) ---
  tbl.style.display = 'none';

  const dashboard = document.createElement('div');
  dashboard.id = 'reecap-timetable';
  dashboard.className = 'reecap-timetable';
  
  const currentDayIndex = new Date().getDay(); 
  const jsDayToName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayName = jsDayToName[currentDayIndex];

  let html = `<div class="tt-grid" style="--cols: ${periodCount}">`;
  
  html += `<div class="tt-cell tt-header">Day</div>`;
  for (let p = 1; p <= periodCount; p++) {
    html += `<div class="tt-cell tt-header">Period ${p}</div>`;
  }

  const sortedDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  sortedDays.forEach(day => {
    if (!schedule[day]) return;
    const isToday = (day === todayName) ? 'is-today' : '';
    
    html += `<div class="tt-cell tt-day ${isToday}">${day}</div>`;
    
    schedule[day].forEach(period => {
      if (!period.subjectCode) {
        html += `<div class="tt-cell tt-empty ${isToday}"></div>`;
      } else {
        const code = period.subjectCode;
        // Handle multiple subjects (e.g. labs)
        const codes = code.split(',').map(c => c.trim());
        const primaryCode = codes[0];
        const details = legendMap[primaryCode] || { name: code, faculty: 'Unknown', room: 'Unknown' };
        
        html += `
          <div class="tt-cell tt-class ${isToday}">
            <div class="tt-time">${period.timeRange}</div>
            <div class="tt-subject">${code}</div>
            
            <div class="tt-tooltip">
              <div class="tt-tt-name">${details.name}</div>
              <div class="tt-tt-meta">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                ${details.faculty}
              </div>
              <div class="tt-tt-meta">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                ${details.room}
              </div>
            </div>
          </div>
        `;
      }
    });
  });

  html += `</div>`;
  dashboard.innerHTML = html;

  tbl.parentElement.insertBefore(dashboard, tbl);
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

function buildProfileDashboard(accordion) {
  // --- A. Scrape Data ---
  let held = 0, attended = 0, percent = 0;
  let backlogsText = "No data";
  let feeDue = "0.00";

  // 1. Attendance
  const tds = accordion.querySelectorAll('td');
  for (let td of tds) {
    if (td.textContent.trim() === 'TOTAL') {
      const row = td.parentElement;
      const cells = row.querySelectorAll('td');
      // Structure: [TOTAL (colspan=2), Held, Attend, %]
      if (cells.length >= 4) {
        held = parseInt(cells[1].textContent.trim(), 10) || 0;
        attended = parseInt(cells[2].textContent.trim(), 10) || 0;
        percent = parseFloat(cells[3].textContent.trim()) || 0;
      }
      break;
    }
  }

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

  // --- B. Calculate SVG Ring ---
  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius; // ~264
  let ringOffset = ringCircumference;
  let ringDisplay = "N/A";
  let ringColor = "var(--text-faint)"; // Neutral for 0 held
  
  if (held > 0) {
    percent = (attended / held) * 100;
    ringDisplay = percent.toFixed(2) + "%";
    ringOffset = ringCircumference - (percent / 100) * ringCircumference;
    ringColor = percent >= 75 ? "var(--success)" : (percent >= 65 ? "var(--warning)" : "var(--error)");
  }

  // --- C. Build UI ---
  const dashboard = document.createElement('div');
  dashboard.id = 'reecap-profile-dashboard';
  dashboard.className = 'dashboard-container';
  dashboard.style.marginBottom = '24px';

  dashboard.innerHTML = `
    <div class="metric-row">
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
          <div class="ring-value" style="color: ${ringColor}">${ringDisplay}</div>
        </div>
      </div>
      <div class="ring-label">Attendance</div>
      <div class="ring-caption">${attended} / ${held} attended</div>
    </div>
    
    <div class="stat-card">
      <div class="stat-top">
        <div class="stat-label">Active Backlogs</div>
      </div>
      <div class="ring-value" style="color: var(--text-primary); font-size: 16px;">
        ${backlogsText}
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-top">
        <div class="stat-label">Fee Balance</div>
      </div>
      <div class="ring-value" style="color: var(--error); font-size: 24px;">
        ₹${feeDue}
      </div>
      <a href="../Feepayments/studentfeereceipt.aspx?scrid=23" class="masthead-btn" style="text-align: center; display: block; padding: 10px; width: 100%;">Pay Online</a>
    </div>
  </div>
  `;

  // Inject before the accordion
  accordion.parentElement.insertBefore(dashboard, accordion);
  
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
    'Gender', 'DOB', 'Nationality', 'Religion', 'SSC Marks, %', 
    'Inter Marks, %', 'SSC Gradepoints', 'Inter Gradepoints', 
    'Entrance Type', 'EAMCET/ECET Rank', 'Seat Type', 'Caste', 
    'Last Studied', 'Joining Date', 'Phone.No', 'Mobile.No', 'Email', 
    'Bank A/C.No', 'Adhar.No', 'Ration Card.No', 'APAAR Id/ABC Id',
    'Father Name', 'Mother Name', 'Occupation', 'Father Mobile.No', 'Mother Mobile.No', 'Annual Income',
    'Correspondence Address', 'Permanent Address'
  ];

  for (let i = 0; i < tds.length; i++) {
    const text = (tds[i].innerText || tds[i].textContent).trim();
    if (!text || text === ':') continue;
    
    for (let key of possibleKeys) {
      if (text === key) {
         let nextVal = '';
         for (let j = i + 1; j < Math.min(i + 4, tds.length); j++) {
            const nextText = (tds[j].innerText || tds[j].textContent).trim();
            if (nextText === ':' || nextText === '') continue; // skip colon or empty
            
            // If it's another known key, we've gone too far (meaning the value was empty)
            if (possibleKeys.includes(nextText)) break;
            
            nextVal = nextText.replace(/\n/g, '<br>');
            break;
         }
         data[key] = nextVal;
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
  
  // 3. Build New Structure
  const newBio = document.createElement('div');
  newBio.className = 'reecap-biodata';
  
  // Helper to build field
  const makeField = (label, value) => {
    if (!value || value === '-' || value === 'NO' || value === '0') return '';
    return `
      <div class="biodata-field">
        <div class="biodata-label">${label}</div>
        <div class="biodata-value">${value}</div>
      </div>
    `;
  };

  newBio.innerHTML = `
    <!-- 2. Personal & Demographics -->
    <div class="biodata-section">
       <h3 class="biodata-section-title">Personal Details</h3>
       <div class="biodata-grid">
         ${makeField('DOB', data['DOB'])}
         ${makeField('Gender', data['Gender'])}
         ${makeField('Religion', data['Religion'])}
         ${makeField('Caste', data['Caste'])}
         ${makeField('Nationality', data['Nationality'])}
         ${makeField('Aadhar No', data['Adhar.No'])}
         ${makeField('Admission No', data['Admission.No'])}
         ${makeField('Joining Date', data['Joining Date'])}
       </div>
    </div>
    
    <!-- 3. Academic History -->
    <div class="biodata-section">
       <h3 class="biodata-section-title">Academic History</h3>
       <div class="biodata-grid">
         ${makeField('SSC', data['SSC Marks, %'] ? data['SSC Marks, %'] + ' (' + (data['SSC Gradepoints']||'') + ')' : '')}
         ${makeField('Intermediate', data['Inter Marks, %'] ? data['Inter Marks, %'] + ' (' + (data['Inter Gradepoints']||'') + ')' : '')}
         ${makeField('Entrance', data['Entrance Type'] ? data['Entrance Type'] + (data['EAMCET/ECET Rank'] ? ' (Rank: ' + data['EAMCET/ECET Rank'] + ')' : '') : '')}
         ${makeField('Seat Type', data['Seat Type'])}
         ${makeField('Last Studied', data['Last Studied'])}
       </div>
    </div>

    <!-- 4. Contact & Parents -->
    <div class="biodata-section">
       <h3 class="biodata-section-title">Contact & Guardians</h3>
       <div class="biodata-grid">
         ${makeField('Mobile', data['Mobile.No'])}
         ${makeField('Email', data['Email'])}
         ${makeField('Father', data['Father Name'] ? data['Father Name'] + ' (' + (data['Father Mobile.No']||'') + ')' : '')}
         ${makeField('Mother', data['Mother Name'] ? data['Mother Name'] + ' (' + (data['Mother Mobile.No']||'') + ')' : '')}
         ${makeField('Address', data['Permanent Address'])}
       </div>
    </div>
  `;
  
  bioPane.insertBefore(newBio, legacyTable);
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
      window.parent.postMessage({ type: 'REECAP_RESIZE', height: document.body.scrollHeight }, '*');
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
    'Academics': ['ATTENDANCE', 'TIME TABLE', 'CHOOSE TIMETABLE', 'COURSE REGISTRATION', 'MARKS', 'LESSON PLAN', 'EXAMS DETAILS', 'HALLTICKET', 'VIEW ANSWER SHEET', 'BACKLOGS'],
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
  
  links.forEach(link => {
    let text = link.textContent.replace('»', '').trim().toUpperCase();
    if (text === 'ONLINE PAYMENT') return; // Skip dropdown parent
    
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

  menu.innerHTML = '';
  
  for (const [groupName, items] of Object.entries(categorized)) {
    if (items.length === 0) continue;
    
    const groupHeader = document.createElement('div');
    groupHeader.className = 'reecap-sidebar-group';
    groupHeader.textContent = groupName;
    menu.appendChild(groupHeader);
    
    items.forEach(item => {
      const a = item.link;
      a.className = 'reecap-sidebar-link';
      if (window.location.href.includes(a.getAttribute('href') || '')) {
         a.classList.add('active');
      }
      a.innerHTML = `<span class="reecap-sidebar-icon">${icons[item.text] || genericIcon}</span><span class="reecap-sidebar-text">${item.text}</span>`;
      const li = document.createElement('li');
      li.appendChild(a);
      menu.appendChild(li);
    });
  }
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
  pageTitle.textContent = ''; 
  layoutWrapper.appendChild(pageTitle);

  const columns = document.createElement('div');
  columns.className = 'reecap-layout-columns';

  const sidebarCol = document.createElement('aside');
  sidebarCol.className = 'reecap-sidebar-col';
  sidebarCol.appendChild(menu);

  const contentCol = document.createElement('main');
  contentCol.className = 'reecap-content-col';
  contentCol.appendChild(iframe);

  columns.appendChild(sidebarCol);
  columns.appendChild(contentCol);
  layoutWrapper.appendChild(columns);

  masterTable.parentNode.insertBefore(layoutWrapper, masterTable);
  masterTable.style.display = 'none';

  // Listen for title updates from iframe
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'REECAP_SET_TITLE') {
      pageTitle.textContent = e.data.title;
    }
  });
}

// --- Pass 3: Status Strip Engine ---

function initStatusStrip() {
  // Inject directly into the new masthead container
  const stripContainer = document.getElementById('reecap-strip-container');
  if (!stripContainer) return;

  const strip = document.createElement('div');
  strip.className = 'reecap-status-strip';
  strip.innerHTML = `
    <div class="status-content">
      <div class="status-title">Loading...</div>
      <div class="status-meta">...</div>
    </div>
    <div class="status-identity" style="display: none;">
      <div class="id-roll"></div>
      <div class="id-course"></div>
    </div>
    <div class="status-clock">
      <div class="clock-time">--:--</div>
      <div class="clock-date">--</div>
    </div>
  `;
  
  if (!document.querySelector('.reecap-status-strip')) {
    stripContainer.appendChild(strip);
  }

  updateStatusStrip(strip);
  setInterval(() => updateStatusStrip(strip), 60000);

  // Listen for instant updates from the iframe
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
    
    strip.setAttribute('data-reecap-strip-active', 'true');
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
    
    // Update Identity if available
    if (data.reecapIdentity && idEl) {
       idEl.style.display = 'flex';
       if (idRoll) idRoll.textContent = data.reecapIdentity.RollNo || '';
       if (idCourse) {
          const course = data.reecapIdentity.Course || '';
          const sem = data.reecapIdentity.Semester ? data.reecapIdentity.Semester.replace('Regular(', '').replace(')', '') : '';
          idCourse.textContent = `${course} • ${sem}`;
       }
    }
    
    if (!data.reecapTimetable) {
       strip.style.setProperty('--accent', 'var(--text-faint)');
       if (titleEl) titleEl.textContent = "Status Strip Inactive";
       if (metaEl) metaEl.innerHTML = `Please visit the <b>CHOOSE TIMETABLE</b> page once to sync.`;
       return;
    }
    
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
