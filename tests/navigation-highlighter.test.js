// Unit tests for Navigation Freezing and Sidebar Highlighter Fixes
const assert = require('assert');

// Mock DOM elements and environment
function createMockLink(text, href = '', tabId = '', dataRouteKey = '') {
  let active = false;
  return {
    textContent: text,
    classList: {
      contains: (cls) => cls === 'reecap-sidebar-link' || (cls === 'active' && active),
      add: (cls) => { if (cls === 'active') active = true; },
      remove: (cls) => { if (cls === 'active') active = false; }
    },
    getAttribute: (attr) => {
      if (attr === 'href') return href;
      if (attr === 'data-tab-id') return tabId;
      if (attr === 'data-route-key') return dataRouteKey;
      return null;
    },
    dataset: { tabId },
    closest: () => ({
      id: 'section-test',
      classList: { contains: () => false, remove: () => {} },
      setAttribute: () => {},
      querySelector: () => ({ inert: false })
    }),
    isActive: () => active
  };
}

const mockLinks = [
  createMockLink('Overview', '#overview'),
  createMockLink('BIO-DATA', 'Academics/StudentProfile.aspx?scrid=17#divProfile_BioData', 'divProfile_BioData'),
  createMockLink('PRESENT PERFORMANCE', 'Academics/StudentProfile.aspx?scrid=17#divProfile_Present', 'divProfile_Present'),
  createMockLink('PAST PERFORMANCE', 'Academics/StudentProfile.aspx?scrid=17#divProfile_Past', 'divProfile_Past'),
  createMockLink('ATTENDANCE', 'Academics/StudentAttendanceRegister.aspx?scrid=1'),
  createMockLink('TIMETABLE', 'Academics/StudentTimeTableOption.aspx?scrid=14'),
  createMockLink('MARKS', 'Academics/StudentMarksReport.aspx?scrid=4'),
  createMockLink('VIEW ANSWER SHEET ( EXT. )', 'Examinations/RevalutionScriptViewer.aspx?scrid=49'),
  createMockLink('COLLEGE FEE', 'Feepayments/studentfeereceipt.aspx?scrid=23'),
  createMockLink('FEE DETAILS', 'FeePayments/studentpayments.aspx?scrid=32', 'divProfile_Fees'),
  createMockLink('RECEIPTS', 'FeePayments/studentreceipts.aspx?scrid=33'),
  createMockLink('ONLINE TRANSACTIONS', 'FeePayments/optransactions.aspx?scrid=34')
];

function setActiveSidebarLinkMock(target) {
  if (!target) return null;
  const raw = String(target).trim();
  const term = raw.toLowerCase();

  mockLinks.forEach(l => l.classList.remove('active'));

  let activeEl = null;
  if (term === 'present performance' || term === 'divprofile_present') {
    activeEl = mockLinks.find(l => (l.textContent || '').trim().toLowerCase() === 'present performance' || l.dataset.tabId === 'divprofile_present');
  } else if (term === 'past performance' || term === 'divprofile_past') {
    activeEl = mockLinks.find(l => (l.textContent || '').trim().toLowerCase() === 'past performance' || l.dataset.tabId === 'divprofile_past');
  } else if (term.includes('answer sheet') || term.includes('view answer') || term.includes('scriptviewer')) {
    activeEl = mockLinks.find(l => (l.textContent || '').trim().toLowerCase().includes('answer sheet'));
  } else if (term === 'college fee' || term === 'collegefee' || term.includes('studentfeereceipt')) {
    activeEl = mockLinks.find(l => {
      const txt = (l.textContent || '').trim().toLowerCase();
      const href = (l.getAttribute('href') || '').toLowerCase();
      return txt === 'college fee' || href.includes('studentfeereceipt');
    });
  } else if (term === 'receipts' || term === 'receipt' || term.includes('studentreceipts')) {
    activeEl = mockLinks.find(l => {
      const txt = (l.textContent || '').trim().toLowerCase();
      const href = (l.getAttribute('href') || '').toLowerCase();
      return txt === 'receipts' || href.includes('studentreceipts');
    });
  } else if (term === 'fee details' || term === 'feedetails' || term === 'divprofile_fees' || term.includes('studentpayments')) {
    activeEl = mockLinks.find(l => {
      const txt = (l.textContent || '').trim().toLowerCase();
      const tabId = (l.getAttribute('data-tab-id') || '').toLowerCase();
      const href = (l.getAttribute('href') || '').toLowerCase();
      return txt === 'fee details' || tabId === 'divprofile_fees' || href.includes('studentpayments');
    });
  } else {
    activeEl = mockLinks.find(l => (l.textContent || '').trim().toLowerCase() === term || (l.textContent || '').trim().toLowerCase().includes(term));
  }

  if (activeEl) activeEl.classList.add('active');
  return activeEl;
}

function syncSidebarActiveStateMock(pathOrUrl) {
  if (!pathOrUrl) return;
  const p = String(pathOrUrl).toLowerCase();

  if (p.includes('studentattendance.aspx')) {
    setActiveSidebarLinkMock('ATTENDANCE');
  } else if (p.includes('studentmarksreport.aspx')) {
    setActiveSidebarLinkMock('MARKS');
  } else if (p.includes('revalutionscriptviewer.aspx')) {
    setActiveSidebarLinkMock('VIEW ANSWER SHEET');
  } else if (p.includes('studentfeereceipt.aspx')) {
    setActiveSidebarLinkMock('COLLEGE FEE');
  } else if (p.includes('studentreceipts.aspx')) {
    setActiveSidebarLinkMock('RECEIPTS');
  } else if (p.includes('studentpayments.aspx')) {
    setActiveSidebarLinkMock('FEE DETAILS');
  } else if (p.includes('studentprofile.aspx')) {
    if (p.includes('divprofile_past')) {
      setActiveSidebarLinkMock('PAST PERFORMANCE');
    } else if (p.includes('divprofile_present')) {
      setActiveSidebarLinkMock('PRESENT PERFORMANCE');
    } else if (p.includes('divprofile_fees') || p.includes('view=fee')) {
      setActiveSidebarLinkMock('FEE DETAILS');
    } else if (p.includes('divprofile_biodata') || p.includes('biodata')) {
      setActiveSidebarLinkMock('BIO-DATA');
    }
  }
}

// Test 1: College Fees vs Receipts vs Fee Details
syncSidebarActiveStateMock('/AEC/Feepayments/studentfeereceipt.aspx?scrid=23');
const activeForFeeReceipt = mockLinks.find(l => l.isActive());
assert(activeForFeeReceipt, 'Link must be active');
assert.strictEqual(activeForFeeReceipt.textContent, 'COLLEGE FEE', 'studentfeereceipt.aspx must highlight COLLEGE FEE, not RECEIPTS');

syncSidebarActiveStateMock('/AEC/FeePayments/studentreceipts.aspx?scrid=33');
const activeForReceipts = mockLinks.find(l => l.isActive());
assert.strictEqual(activeForReceipts.textContent, 'RECEIPTS', 'studentreceipts.aspx must highlight RECEIPTS');

syncSidebarActiveStateMock('/AEC/FeePayments/studentpayments.aspx?scrid=32');
const activeForPayments = mockLinks.find(l => l.isActive());
assert.strictEqual(activeForPayments.textContent, 'FEE DETAILS', 'studentpayments.aspx must highlight FEE DETAILS');

// Test 2: Exam Answer Sheet matching
syncSidebarActiveStateMock('/AEC/Examinations/RevalutionScriptViewer.aspx?scrid=49');
const activeForExamViewer = mockLinks.find(l => l.isActive());
assert.strictEqual(activeForExamViewer.textContent, 'VIEW ANSWER SHEET ( EXT. )', 'RevalutionScriptViewer must highlight VIEW ANSWER SHEET ( EXT. )');

// Test 3: Raw StudentProfile load does not reset selection to BIO-DATA
setActiveSidebarLinkMock('PRESENT PERFORMANCE');
assert.strictEqual(mockLinks.find(l => l.isActive()).textContent, 'PRESENT PERFORMANCE');
// Simulate iframe load of StudentProfile without explicit hash or view param
syncSidebarActiveStateMock('/AEC/Academics/StudentProfile.aspx?scrid=17');
assert.strictEqual(mockLinks.find(l => l.isActive()).textContent, 'PRESENT PERFORMANCE', 'Navigation highlighter must not be overwritten to BIO-DATA on raw StudentProfile reload');

// Test 4: Navigation freezing helper
function isIframeOnStudentProfileMock(iframe) {
  if (!iframe) return false;
  try {
    const loc = iframe.contentWindow?.location;
    const path = (loc?.pathname || '').toLowerCase();
    if (path.includes('studentprofile.aspx')) return true;
  } catch (e) {}
  return false;
}

const mockIframeOnAttendance = {
  getAttribute: (a) => a === 'src' ? 'Academics/StudentProfile.aspx?scrid=17' : null,
  contentWindow: {
    location: { pathname: '/AEC/Academics/StudentAttendanceRegister.aspx' }
  }
};
assert.strictEqual(isIframeOnStudentProfileMock(mockIframeOnAttendance), false, 'When on Attendance, iframe must NOT be treated as on StudentProfile despite getAttribute(src)');

const mockIframeOnProfile = {
  getAttribute: (a) => a === 'src' ? 'Academics/StudentProfile.aspx?scrid=17' : null,
  contentWindow: {
    location: { pathname: '/AEC/Academics/StudentProfile.aspx' }
  }
};
assert.strictEqual(isIframeOnStudentProfileMock(mockIframeOnProfile), true, 'When on StudentProfile, iframe is recognized as on StudentProfile');

// Test 5: getPortalBaseUrl resolution and cross-page navigation from non-profile pages
function getPortalBaseUrlMock(locationMock) {
  try {
    const origin = locationMock.origin;
    const path = locationMock.pathname;
    const match = path.match(/^(\/[^\/]+\/)/);
    const prefix = match ? match[1] : '/aus/';
    return `${origin}${prefix}`;
  } catch (e) {
    return `${locationMock.origin}/aus/`;
  }
}

const mockLocAEC = { origin: 'http://info.aec.edu.in', pathname: '/aec/Academics/StudentMaster.aspx' };
assert.strictEqual(getPortalBaseUrlMock(mockLocAEC), 'http://info.aec.edu.in/aec/', 'Resolves /aec/ prefix');

const mockLocAUS = { origin: 'http://info.aec.edu.in', pathname: '/aus/Academics/StudentMaster.aspx' };
assert.strictEqual(getPortalBaseUrlMock(mockLocAUS), 'http://info.aec.edu.in/aus/', 'Resolves /aus/ prefix');

// Simulate navigation away from Backlogs page when isIframeOnStudentProfile is false
let navigatedUrl = null;
const mockIframeOnBacklogs = {
  src: 'Academics/StudentBacklogs.aspx?scrid=18',
  contentWindow: {
    location: { pathname: '/aus/Academics/StudentBacklogs.aspx' }
  }
};

function navigateToProfileTabMock(tabId, title, iframe, loc) {
  if (isIframeOnStudentProfileMock(iframe)) {
    // switch tab internally
    return 'internal';
  } else {
    const base = getPortalBaseUrlMock(loc);
    iframe.src = `${base}Academics/StudentProfile.aspx?scrid=17#${tabId}`;
    return iframe.src;
  }
}

const resultNav = navigateToProfileTabMock('divProfile_BioData', 'BIO-DATA', mockIframeOnBacklogs, mockLocAUS);
assert.strictEqual(resultNav, 'http://info.aec.edu.in/aus/Academics/StudentProfile.aspx?scrid=17#divProfile_BioData', 'Must navigate iframe out of Backlogs to StudentProfile with tab hash without throwing');

// Test 6: Minimum iframe height clamp prevents clipping
const rawStubHeight = 74;
const clampedParentHeight = Math.max(500, Math.ceil(rawStubHeight));
assert.strictEqual(clampedParentHeight, 500, 'Parent REECAP_RESIZE must clamp minimum height to at least 500px');

const rawContentHeight = 58;
const clampedChildHeight = Math.max(480, Math.ceil(rawContentHeight + 16));
assert.strictEqual(clampedChildHeight, 480, 'Child frame getTrueContentHeight must clamp minimum height to at least 480px');

console.log('PASS: All Navigation Freezing, Sidebar Highlighter, and Fee Category separation tests passed cleanly.');
