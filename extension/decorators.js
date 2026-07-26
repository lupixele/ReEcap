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

  // --- B. Send Data to Parent ---
  window.parent.postMessage({
    type: 'REECAP_PROFILE_DATA',
    data: { held, attended, percent, backlogsText, feeDue }
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

  // 3. Build New Structure
  const newBio = document.createElement('div');
  newBio.className = 'reecap-biodata';

  // Helper to build field: never drop fields even if empty/0/NO
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

function rebuildPresentSemTab() {
  const pane = document.getElementById('divProfile_Present') || document.getElementById('divProfile_PresentSem');
  if (!pane || pane.dataset.reecapEnhanced === 'true') return;

  // 1. Scrape data across all sections
  let totalHeld = 0, totalAttend = 0, totalPercent = 0;
  const subjects = [];
  const internalMarksHeaders = [];
  const internalMarksRows = [];
  let achievementsText = 'No achievements recorded.';
  let presentationsText = 'No paper presentations recorded.';

  let currentSection = 'ATTENDANCE';
  const allRows = pane.querySelectorAll('tr');

  allRows.forEach(row => {
    const text = row.textContent.trim().toUpperCase();
    if (text.includes('INTERNAL MARKS')) {
      currentSection = 'INTERNAL';
      return;
    }
    if (text === 'ACHIEVEMENTS' || text.startsWith('ACHIEVEMENTS')) {
      currentSection = 'ACHIEVEMENTS';
      return;
    }
    if (text === 'PAPER PRESENTATIONS' || text.startsWith('PAPER PRESENTATIONS')) {
      currentSection = 'PRESENTATIONS';
      return;
    }

    const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent.trim());
    if (!cells.length) return;

    if (currentSection === 'ATTENDANCE') {
      if (cells.length >= 4 && cells[0].toUpperCase() === 'TOTAL') {
        totalHeld = parseInt(cells[1], 10) || 0;
        totalAttend = parseInt(cells[2], 10) || 0;
        totalPercent = parseFloat(cells[3]) || 0;
      } else if (cells.length >= 5 && !isNaN(parseInt(cells[0], 10))) {
        subjects.push({
          subjName: cells[1] || 'Subject',
          held: parseInt(cells[2], 10) || 0,
          attend: parseInt(cells[3], 10) || 0,
          percent: parseFloat(cells[4]) || 0
        });
      }
    } else if (currentSection === 'INTERNAL') {
      if (cells.length > 2 && (row.classList.contains('reportHeading2WithBackground') || cells[0].toLowerCase() === 'sl.no.' || cells[0].toLowerCase() === 's.no')) {
        if (!internalMarksHeaders.length) internalMarksHeaders.push(...cells);
      } else if (cells.length > 2 && !isNaN(parseInt(cells[0], 10))) {
        internalMarksRows.push(cells);
      }
    } else if (currentSection === 'ACHIEVEMENTS') {
      if (cells[0] && !cells[0].toUpperCase().includes('ACHIEVEMENTS')) {
        achievementsText = cells[0];
      }
    } else if (currentSection === 'PRESENTATIONS') {
      if (cells[0] && !cells[0].toUpperCase().includes('PRESENTATIONS')) {
        presentationsText = cells[0];
      }
    }
  });

  pane.dataset.reecapEnhanced = 'true';
  const newView = document.createElement('div');
  newView.className = 'reecap-enhanced-tab';

  const ringRadius = 40;
  const ringCircumf = 2 * Math.PI * ringRadius;
  const offset = ringCircumf - (totalPercent / 100) * ringCircumf;
  const ringColor = totalPercent >= 75 ? "var(--success)" : (totalPercent >= 65 ? "var(--warning)" : (totalHeld === 0 ? "var(--text-faint)" : "var(--error)"));

  let html = `
    <!-- Top Overall Attendance Meter -->
    <div class="overview-section-metrics" style="margin-bottom: 24px;">
      <div class="ring-card" style="flex: 1; min-width: 280px; flex-direction: row; gap: 24px; text-align: left; justify-content: flex-start; padding: 24px 32px;">
        <div class="ring-wrap" style="width: 96px; height: 96px; flex-shrink: 0;">
          <svg width="96" height="96">
            <circle class="ring-bg" cx="48" cy="48" r="${ringRadius}" stroke-width="8"></circle>
            <circle class="ring-fg" cx="48" cy="48" r="${ringRadius}" stroke-width="8" stroke="${ringColor}" stroke-dasharray="${ringCircumf}" stroke-dashoffset="${offset}"></circle>
          </svg>
          <div class="ring-center">
            <div class="ring-value" style="font-size: 20px; color: ${ringColor}">${totalHeld > 0 ? totalPercent.toFixed(1) + '%' : '0%'}</div>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <h3 style="font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 700; margin: 0; color: var(--text-primary);">Present Semester Attendance</h3>
          <div style="font-size: 14px; color: var(--text-secondary); font-weight: 500;">
            ${totalHeld > 0 ? `<span class="mono" style="font-weight: 600; color: var(--text-primary);">${totalAttend}</span> attended out of <span class="mono" style="font-weight: 600; color: var(--text-primary);">${totalHeld}</span> total lectures held` : 'No attendance lectures logged for this term yet.'}
          </div>
          <div style="font-size: 12px; color: var(--text-faint); margin-top: 4px;">Status: ${totalHeld === 0 ? 'Not yet started / Vacation' : (totalPercent >= 75 ? 'Satisfactory Standing' : 'Below 75% Requirement')}</div>
        </div>
      </div>
    </div>

    <!-- Subject Attendance Record Table -->
    <div class="overview-card" style="margin-bottom: 24px;">
      <div class="overview-card-header">
        <span class="overview-card-title">Subject Attendance Record</span>
        <span class="overview-card-subtitle">Current Term</span>
      </div>
  `;

  if (!subjects.length) {
    html += `
      <div style="text-align: center; padding: 32px; background: var(--surface-sunken); border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 14px;">
        No course subject attendance rows recorded for this term yet.
      </div>
    `;
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
    subjects.forEach(s => {
      const sColor = s.percent >= 75 ? "var(--success)" : (s.percent >= 65 ? "var(--warning)" : (s.held === 0 ? "var(--text-faint)" : "var(--error)"));
      html += `
        <tr>
          <td style="font-weight: 600; color: var(--text-primary);">${s.subjName}</td>
          <td class="mono" style="text-align: right;">${s.held}</td>
          <td class="mono" style="text-align: right; font-weight: 600;">${s.attend}</td>
          <td class="mono" style="text-align: right; font-weight: 700; color: ${sColor};">${s.percent}%</td>
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
    `;
  }
  html += `</div>`;

  // Internal Marks Card
  html += `
    <div class="overview-card" style="margin-bottom: 24px;">
      <div class="overview-card-header">
        <span class="overview-card-title">Internal Marks & Mid-Terms</span>
        <span class="overview-card-subtitle">Continuous Evaluation</span>
      </div>
  `;
  if (!internalMarksRows.length) {
    html += `
      <div style="text-align: center; padding: 28px; background: var(--surface-sunken); border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 13.5px;">
        No internal exam marks have been published for this semester yet.
      </div>
    `;
  } else {
    html += `
      <div class="reecap-table-wrap">
        <table class="reecap-data-table">
          <thead>
            <tr>
              ${internalMarksHeaders.map(h => `<th>${h}</th>`).join('') || '<th>Subject</th><th>Marks</th>'}
            </tr>
          </thead>
          <tbody>
            ${internalMarksRows.map(rowCells => `
              <tr>
                ${rowCells.map((c, idx) => idx === 0 ? `<td class="mono">${c}</td>` : (idx === 1 ? `<td style="font-weight: 600; color: var(--text-primary);">${c}</td>` : `<td class="mono" style="font-weight: 500;">${c}</td>`)).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  html += `</div>`;

  // Achievements & Paper Presentations Two-Column Grid
  html += `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
      <div class="overview-card">
        <div class="overview-card-header">
          <span class="overview-card-title">Achievements</span>
        </div>
        <div style="background: var(--surface-sunken); padding: 20px; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
          <p style="margin: 0; font-size: 13.5px; color: var(--text-secondary); line-height: 1.5;">
            ${achievementsText || 'No extra-curricular or departmental achievements recorded.'}
          </p>
        </div>
      </div>

      <div class="overview-card">
        <div class="overview-card-header">
          <span class="overview-card-title">Paper Presentations</span>
        </div>
        <div style="background: var(--surface-sunken); padding: 20px; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
          <p style="margin: 0; font-size: 13.5px; color: var(--text-secondary); line-height: 1.5;">
            ${presentationsText || 'No paper presentations recorded for this session.'}
          </p>
        </div>
      </div>
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

function rebuildFeeDetailsTab() {
  const pane = document.getElementById('divProfile_Fees');
  if (!pane || pane.dataset.reecapEnhanced === 'true') return;

  const allRows = pane.querySelectorAll('tr');
  let totalPayable = '--', totalPaid = '--', totalDue = '--', balanceWords = '';
  const items = [];
  let currentGroup = 'Main Semesters';

  allRows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
    if (!cells.length) return;
    if (cells[0] === 'GRAND TOTALS') {
      if (cells[1]) totalPayable = cells[1];
      if (cells[2]) totalPaid = cells[2];
      if (cells[5]) totalDue = cells[5];
    } else if (cells[0] === 'Balance' || cells[0] === 'Due Balance') {
      balanceWords = cells[1] || '';
    } else if (cells.length === 1 || (cells[0] && cells[1] === undefined) || row.querySelector('td')?.colSpan >= 7) {
      if (!cells[0].includes('TOTALS') && cells[0].includes('Semester')) {
        currentGroup = cells[0];
      }
    } else if (cells.length >= 7 && !isNaN(parseInt(cells[0], 10))) {
      items.push({
        group: currentGroup,
        title: cells[1] || 'Fee',
        payable: cells[2] || '0.00',
        paid: cells[3] || '0.00',
        receipt: cells[4] || '-',
        date: cells[5] || '-',
        due: cells[6] || '0.00'
      });
    }
  });

  if (!items.length && totalPayable === '--') return;

  pane.dataset.reecapEnhanced = 'true';
  const newView = document.createElement('div');
  newView.className = 'reecap-enhanced-tab';

  const hasDue = totalDue !== '--' && totalDue !== '0.00' && totalDue !== '0' && totalDue !== '0.0';
  let html = `
    <!-- Financial Overview Banner -->
    <div class="overview-section-metrics" style="margin-bottom: 24px;">
      <div class="stat-card">
        <div class="stat-top"><div class="stat-label">Total Payable</div></div>
        <div class="ring-value" style="color: var(--text-primary); font-size: 24px;">₹${totalPayable}</div>
        <div class="ring-caption">All Assessed Charges</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><div class="stat-label">Total Paid</div></div>
        <div class="ring-value" style="color: var(--success); font-size: 24px;">₹${totalPaid}</div>
        <div class="ring-caption">Verified Receipts</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><div class="stat-label">Current Balance Due</div></div>
        <div class="ring-value" style="color: ${hasDue ? 'var(--error)' : 'var(--success)'}; font-size: 26px;">₹${totalDue}</div>
        <div class="ring-caption">${hasDue ? 'Payment Required' : 'All accounts settled'}</div>
      </div>
    </div>

    <!-- Fee Ledger View -->
    <div class="overview-card">
      <div class="overview-card-header">
        <span class="overview-card-title">Detailed Fee Ledger</span>
        <span class="overview-card-subtitle">${balanceWords || 'Complete Transaction History'}</span>
      </div>
      <div class="reecap-table-wrap">
        <table class="reecap-data-table">
          <thead>
            <tr>
              <th>Fee Category</th>
              <th>Receipt Info</th>
              <th style="text-align: right;">Billed</th>
              <th style="text-align: right;">Paid</th>
              <th style="text-align: right;">Balance</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
  `;

  items.forEach(i => {
    const iDue = parseFloat(i.due.replace(/,/g, '')) || 0;
    const isPaid = iDue <= 0 && parseFloat(i.paid.replace(/,/g, '')) > 0;
    const stClass = isPaid ? 'status-pill-pass' : (iDue > 0 ? 'status-pill-fail' : 'status-pill-neutral');
    const stLabel = isPaid ? 'PAID' : (iDue > 0 ? 'DUE' : 'SETTLED');

    html += `
      <tr>
        <div>
          <div style="font-weight: 600; color: var(--text-primary);">${i.title}</div>
          <div style="font-size: 11px; color: var(--text-faint);">${i.group}</div>
        </td>
        <div>
          <div class="mono" style="font-size: 12px; color: var(--text-secondary);">${i.receipt.replace(/:/g, ', ')}</div>
          <div class="mono" style="font-size: 10px; color: var(--text-faint);">${i.date.replace(/:/g, ', ')}</div>
        </td>
        <td class="mono" style="text-align: right; font-weight: 500;">₹${i.payable}</td>
        <td class="mono" style="text-align: right; color: var(--success); font-weight: 600;">₹${i.paid}</td>
        <td class="mono" style="text-align: right; color: ${iDue > 0 ? 'var(--error)' : 'var(--text-faint)'}; font-weight: 700;">₹${i.due}</td>
        <td style="text-align: center;"><span class="reecap-status-pill ${stClass}">${stLabel}</span></td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  newView.innerHTML = html;
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
          <h3 style="font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 700; margin: 0 0 4px 0; color: var(--text-primary);">${counselorInfo.split(',')[1] || counselorInfo}</h3>
          <div class="mono" style="font-size: 12px; color: var(--text-secondary);">Employee Code: ${counselorInfo.split(',')[0] || 'Faculty'}</div>
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

  chrome.storage.sync.get({ sidebarOpen: { Academics: true, Finance: false, Account: false } }, ({ sidebarOpen }) => {
    menu.innerHTML = '';

    // Add OVERVIEW item at top
    const overviewLi = document.createElement('li');
    const overviewA = document.createElement('a');
    overviewA.className = 'reecap-sidebar-link reecap-sidebar-overview';
    overviewA.href = 'javascript:void(0);';
    const overviewIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>';
    overviewA.innerHTML = `<span class="reecap-sidebar-icon">${overviewIcon}</span><span class="reecap-sidebar-text">OVERVIEW</span>`;
    overviewA.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof showOverview === 'function') showOverview();
    });
    overviewLi.appendChild(overviewA);
    menu.appendChild(overviewLi);

    const divider = document.createElement('div');
    divider.className = 'reecap-sidebar-overview-divider';
    menu.appendChild(divider);

    for (const [groupName, items] of Object.entries(categorized)) {
      if (items.length === 0) continue;

      const groupHeader = document.createElement('div');
      groupHeader.className = 'reecap-sidebar-group';
      groupHeader.dataset.group = groupName;
      groupHeader.innerHTML = `<span>${groupName}</span><span class="reecap-sidebar-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></span>`;

      if (sidebarOpen[groupName] === false) {
        groupHeader.classList.add('is-collapsed');
      }

      const section = document.createElement('div');
      section.className = 'reecap-sidebar-section';
      if (sidebarOpen[groupName] === false) {
        section.classList.add('is-collapsed');
      }

      const sectionInner = document.createElement('div');
      sectionInner.className = 'reecap-sidebar-section-inner';

      items.forEach(item => {
        const a = item.link;
        a.className = 'reecap-sidebar-link';
        if (window.location.href.includes(a.getAttribute('href') || '')) {
           a.classList.add('active');
        }
        a.innerHTML = `<span class="reecap-sidebar-icon">${icons[item.text] || genericIcon}</span><span class="reecap-sidebar-text">${item.text}</span>`;
        a.addEventListener('click', () => {
          if (typeof showIframe === 'function') showIframe();
        });
        const li = document.createElement('li');
        li.appendChild(a);
        sectionInner.appendChild(li);
      });
      
      section.appendChild(sectionInner);
      
      groupHeader.addEventListener('click', () => {
        const isCollapsed = groupHeader.classList.toggle('is-collapsed');
        section.classList.toggle('is-collapsed', isCollapsed);

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
  });
}

function showOverview() {
  const iframe = document.getElementById('capIframeId');
  const overview = document.getElementById('reecap-overview');
  const pageTitle = document.getElementById('reecap-page-title');
  if (iframe) iframe.style.setProperty('display', 'none', 'important');
  if (overview) overview.style.setProperty('display', 'flex', 'important');
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
  if (iframe) iframe.style.removeProperty('display');
  if (overview) overview.style.setProperty('display', 'none', 'important');

  document.documentElement.setAttribute('data-overview-active', 'false');

  const overviewLink = document.querySelector('.reecap-sidebar-overview');
  if (overviewLink) overviewLink.classList.remove('active');

  if (typeof syncSidebarActiveState === 'function' && iframe && iframe.contentWindow) {
    try {
      const currentUrl = iframe.contentWindow.location.pathname.toLowerCase();
      if (currentUrl) syncSidebarActiveState(currentUrl);
    } catch (e) {}
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
  pageTitle.textContent = 'Loading...';
  const columns = document.createElement('div');
  columns.className = 'reecap-layout-columns';

  const sidebarCol = document.createElement('aside');
  sidebarCol.className = 'reecap-sidebar-col';
  sidebarCol.appendChild(menu);

  const contentCol = document.createElement('main');
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

  masterTable.parentNode.insertBefore(layoutWrapper, masterTable);
  masterTable.style.display = 'none';

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
  initStatusStrip(stripSlot);

  const grid = document.createElement('div');
  grid.className = 'overview-grid';
  container.appendChild(grid);

  const metricsSlot = document.createElement('div');
  metricsSlot.className = 'overview-section-metrics';
  grid.appendChild(metricsSlot);

  const contentRow = document.createElement('div');
  contentRow.className = 'overview-content-row';
  grid.appendChild(contentRow);

  if (!chrome || !chrome.storage || !chrome.storage.local) return;
  try {
    chrome.storage.local.get(['reecapTimetable', 'reecapIdentity', 'reecapProfileData'], (data) => {
      if (chrome.runtime && chrome.runtime.lastError) return;

      renderDashboardCards(metricsSlot, data ? data.reecapProfileData : null);
      renderScheduleCard(contentRow, data ? data.reecapTimetable : null);
      renderQuickLinksCard(contentRow);
    });
  } catch (e) {}
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
    feeDue = profileData.feeDue !== undefined ? `${profileData.feeDue}` : "0.00";
    if (profileData.lastUpdated) {
      const minsAgo = Math.round((Date.now() - profileData.lastUpdated) / 60000);
      syncedCaption = minsAgo < 2 ? "Synced just now" : `Synced ${minsAgo < 60 ? minsAgo + 'm' : Math.round(minsAgo/60) + 'h'} ago`;
    } else {
      syncedCaption = "Synced from Profile";
    }
  }

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
          <div class="ring-value" style="color: ${ringColor}">${ringDisplay}</div>
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

    <div class="stat-card">
      <div class="stat-top">
        <div class="stat-label">Fee Balance</div>
      </div>
      <div class="ring-value" style="color: ${profileData && feeDue !== '0.00' && feeDue !== '0' && feeDue !== '0.0' && feeDue !== '--' ? 'var(--error)' : 'var(--success)'}; font-size: 24px;">
        ${feeDue !== '--' ? '₹' + feeDue : feeDue}
      </div>
      <a href="../Feepayments/studentfeereceipt.aspx?scrid=23" target="capIframe" class="masthead-btn stat-cta" style="text-align: center; display: block; padding: 10px; width: 100%;">Pay Online</a>
    </div>
  `;

  const payBtn = slot.querySelector('.stat-cta');
  if (payBtn) {
    payBtn.addEventListener('click', () => {
      showIframe();
    });
  }
}

function renderScheduleCard(container, timetableData) {
  const card = document.createElement('div');
  card.className = 'overview-card overview-schedule-card';

  const now = new Date();
  const jsDayToName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayName = jsDayToName[now.getDay()];

  let html = `<div class="overview-card-header"><span class="overview-card-title">Today's Schedule</span><span class="overview-card-subtitle">${todayName}, ${now.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span></div>`;

  if (!timetableData || !timetableData.schedule) {
    html += `<div class="schedule-empty">Visit <b>CHOOSE TIMETABLE</b> page once to sync your schedule.</div>`;
    card.innerHTML = html;
    container.appendChild(card);
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
  container.appendChild(card);
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
  // Inject directly into targetSlot, or fall back to container
  const stripContainer = targetSlot || document.getElementById('reecap-strip-container');
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
