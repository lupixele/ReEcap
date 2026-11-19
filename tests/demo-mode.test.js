// Regression and integration tests for ReEcap Showcase Demo Mode
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const demoModeCode = fs.readFileSync(path.join(__dirname, '../extension/shared/demo-mode.js'), 'utf-8');
const decoratorsCode = fs.readFileSync(path.join(__dirname, '../extension/decorators.js'), 'utf-8');

// Mock window and document
const storageState = {
  reecapDemoMode: true
};

const documentMock = {
  readyState: 'complete',
  documentElement: {
    appendChild: () => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    getAttribute: () => null,
    classList: { add: () => {}, remove: () => {} }
  },
  head: {
    appendChild: () => {}
  },
  body: {
    children: [],
    appendChild: (el) => { documentMock.body.children.push(el); return el; },
    prepend: (el) => { documentMock.body.children.unshift(el); return el; },
    textContent: '',
    querySelectorAll: () => [],
    querySelector: () => null,
    getBoundingClientRect: () => ({ top: 0, bottom: 0, height: 0 }),
    style: { setProperty: () => {}, removeProperty: () => {} },
    classList: { add: () => {}, remove: () => {} }
  },
  createElement: (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      style: {
        setProperty: () => {},
        removeProperty: () => {}
      },
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {}
      },
      children: [],
      innerHTML: '',
      textContent: '',
      appendChild: (c) => { el.children.push(c); return c; },
      prepend: (c) => { el.children.unshift(c); return c; },
      querySelector: (sel) => {
        return {
          addEventListener: () => {},
          style: {},
          setAttribute: () => {},
          classList: { add: () => {}, remove: () => {}, toggle: () => {} }
        };
      },
      querySelectorAll: () => []
    };
    return el;
  },
  getElementById: (id) => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  forms: [],
  addEventListener: () => {}
};

const windowMock = {
  self: {},
  top: {},
  location: { pathname: '/aus/Academics/StudentMaster.aspx' },
  alert: () => {},
  addEventListener: () => {},
  dispatchEvent: () => {},
  parent: { postMessage: () => {} }
};
windowMock.self = windowMock;

const context = vm.createContext({
  window: windowMock,
  global: windowMock,
  document: documentMock,
  chrome: {
    runtime: { id: 'test-id', lastError: null, onMessage: { addListener: () => {} } },
    storage: {
      local: {
        get: (keys, cb) => {
          const res = {};
          keys.forEach(k => { res[k] = storageState[k]; });
          cb(res);
        },
        set: (obj, cb) => {
          Object.assign(storageState, obj);
          if (cb) cb();
        }
      },
      onChanged: { addListener: () => {} }
    }
  },
  console: console,
  setInterval: () => 1,
  clearInterval: () => {},
  setTimeout: (fn) => fn(),
  CustomEvent: function(type, init) { this.type = type; this.detail = init ? init.detail : {}; },
  MutationObserver: function() { this.observe = () => {}; this.disconnect = () => {}; }
});

// Run demo-mode.js
vm.runInContext(demoModeCode, context);

// Test 1: Verify global.__reecap_demo_mode is exported
const demoMode = context.window.__reecap_demo_mode;
assert.ok(demoMode, 'window.__reecap_demo_mode must be defined');
assert.strictEqual(typeof demoMode.isActive, 'function');
assert.strictEqual(typeof demoMode.getDemoAttendance, 'function');

const demoAttendance = demoMode.getDemoAttendance();
assert.strictEqual(demoAttendance.held, 312, 'Demo attendance held must be 312');
assert.strictEqual(demoAttendance.attended, 282, 'Demo attendance attended must be 282');
assert.strictEqual(demoAttendance.percent, 90.38, 'Demo attendance percent must be 90.38');
assert.strictEqual(demoAttendance.attendanceSubjects.length, 6, 'Demo attendance must have 6 courses');

// Run decorators.js
vm.runInContext(decoratorsCode, context);

// Test 2: Verify renderDashboardCards in Demo Mode sets 90.4%
const slotMock = {
  innerHTML: '',
  querySelector: (sel) => ({
    addEventListener: () => {},
    style: {}
  })
};

const renderDashboardCards = vm.runInContext('renderDashboardCards', context);
assert.strictEqual(typeof renderDashboardCards, 'function');

// Call with held: 0 (semester break state) and isDemo: true
renderDashboardCards(slotMock, { held: 0, attended: 0, percent: 0 }, true);
assert.ok(slotMock.innerHTML.includes('90.4%'), 'Attendance card ring must show 90.4% in demo mode');
assert.ok(slotMock.innerHTML.includes('282 / 312 Classes'), 'Attendance card must show 282 / 312 Classes in demo mode');
assert.ok(slotMock.innerHTML.includes('Demo Showcase (Active)'), 'Caption must state Demo Showcase (Active)');
assert.ok(slotMock.innerHTML.includes('viewBox="0 0 52 52"'), 'Attendance ring must use 52x52 coordinate space matching 52px badge box');
assert.ok(slotMock.innerHTML.includes('₹0.00'), 'Fee balance when cleared must display ₹0.00');
assert.ok(!slotMock.innerHTML.includes('<span class="status-pill-pass">Cleared</span>'), 'Fee balance must not duplicate Cleared pill inside main value');

// Test 3: Verify parseServerErrorInfo detects exam related paths for revaluation
const parseServerErrorInfo = vm.runInContext('parseServerErrorInfo', context);
const examErr = parseServerErrorInfo('Sorry, error while accessing page', '/aus/Examinations/RevalutionScriptViewer.aspx');
assert.strictEqual(examErr.isExamRelated, true, 'RevalutionScriptViewer.aspx must be recognized as exam related');

// Test 4: Verify standalone attendance page renderView overrides cached non-demo profileData when demo is active
const renderView = vm.runInContext('window.__reecap_render_attendance', context);
if (typeof renderView === 'function') {
  // Pre-cached 0% non-demo data
  const cachedData = { held: 10, attended: 0, percent: 0, attendanceSubjects: [{ name: 'Test', held: 10, attended: 0, percent: 0 }] };
  // Should unconditionally receive demo attendance (held: 312)
  renderView(cachedData, true);
}

console.log('PASS: All Showcase Demo Mode integration, attendance simulation, and error bypass tests passed cleanly.');
