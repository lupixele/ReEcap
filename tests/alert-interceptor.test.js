// Regression tests for ReEcap alert interceptor and in-UI error card handling
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Sample payload matching user's exact uploaded 401 error screenshot:
const sample401Payload = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1"/>
<title>401 - Unauthorized: Access is denied due to invalid credentials.</title>
<style type="text/css">
<!--
body{margin:0;font-size:.7em;font-family:Verdana, Arial, Helvetica, sans-serif;background:#EEEEEE;}
fieldset{padding:0 15px 10px 15px;} 
h1{font-size:2.4em;margin:0;color:#FFF;}
h2{font-size:1.7em;margin:0;color:#CC0000;} 
h3{font-size:1.2em;margin:10px 0 0 0;color:#000000;} 
#header{width:96%;margin:0 0 0 0;padding:6px 2% 6px 2%;font-family:"trebuchet MS", Verdana, sans-serif;color:#FFF;background-color:#555555;}
#content{margin:0 0 0 2%;position:relative;}
.content-container{background:#FFF;width:96%;margin-top:8px;padding:10px;position:relative;}
-->
</style>
</head>
<body>
<div id="header"><h1>Server Error</h1></div>
<div id="content">
 <div class="content-container"><fieldset>
  <h2>401 - Unauthorized: Access is denied due to invalid credentials.</h2>
  <h3>You do not have permission to view this directory or page using the credentials that you supplied.</h3>
 </fieldset></div>
</div>
</body>
</html>`;

// Sample ASP.NET AJAX UpdatePanel unhandled exception wrapper
const sampleAspNetAjaxPayload = `Sys.WebForms.PageRequestManagerServerErrorException: ` + sample401Payload;

// Read decorators.js to extract the core logic
const decoratorsCode = fs.readFileSync(path.join(__dirname, '../extension/decorators.js'), 'utf-8');

// Create mock environment
const documentMock = {
  readyState: 'complete',
  documentElement: {
    appendChild: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    classList: { add: () => {}, remove: () => {} }
  },
  head: {
    appendChild: () => {}
  },
  body: {
    children: [],
    appendChild: (el) => { documentMock.body.children.push(el); return el; },
    textContent: '',
    querySelectorAll: () => [],
    querySelector: () => null,
    getBoundingClientRect: () => ({ top: 0, bottom: 0, height: 0 })
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
      querySelector: (sel) => {
        return {
          addEventListener: () => {},
          style: {}
        };
      },
      querySelectorAll: () => []
    };
    return el;
  },
  forms: [],
  getElementById: (id) => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};

let interceptedAlerts = [];
let nativeAlertCallCount = 0;

const windowMock = {
  self: {},
  top: {}, // distinct so window.self !== window.top (simulating iframe)
  location: { pathname: '/AEC/Academics/StudentExamDetails.aspx' },
  alert: (msg) => { nativeAlertCallCount++; },
  addEventListener: () => {},
  dispatchEvent: (ev) => {},
  parent: { postMessage: () => {} }
};
windowMock.self = windowMock;

const context = vm.createContext({
  window: windowMock,
  document: documentMock,
  chrome: { runtime: { id: 'test-id', lastError: null }, storage: { sync: { get: () => {} } } },
  console: console,
  setInterval: () => 1,
  clearInterval: () => {},
  setTimeout: (fn) => fn(),
  CustomEvent: function(type, init) { this.type = type; this.detail = init ? init.detail : {}; },
  MutationObserver: function() { this.observe = () => {}; this.disconnect = () => {}; }
});

vm.runInContext(decoratorsCode, context);

// Test 1: Verify isRawHtmlOrServerError detection
const isRaw = vm.runInContext('isRawHtmlOrServerError', context);
assert.strictEqual(typeof isRaw, 'function', 'isRawHtmlOrServerError should be defined');
assert.strictEqual(isRaw(sample401Payload), true, 'Sample 401 payload must be detected as raw HTML error');
assert.strictEqual(isRaw(sampleAspNetAjaxPayload), true, 'ASP.NET AJAX error must be detected');
assert.strictEqual(isRaw('500 - Internal Server Error'), true, '500 error must be detected');
assert.strictEqual(isRaw('Sorry, error while accessing page'), true, 'Sorry error must be detected');
assert.strictEqual(isRaw('Access is denied due to invalid credentials'), true, 'Access denied must be detected');
assert.strictEqual(isRaw('Please fill out all mandatory fields.'), false, 'Legitimate alerts must NOT be intercepted');
assert.strictEqual(isRaw('Password updated successfully!'), false, 'Normal confirmations must NOT be intercepted');

// Test 2: Verify parseServerErrorInfo
const parseInfo = vm.runInContext('parseServerErrorInfo', context);
assert.strictEqual(typeof parseInfo, 'function', 'parseServerErrorInfo should be defined');
const examInfo = parseInfo(sample401Payload, '/Academics/StudentExamDetails.aspx');
assert.strictEqual(examInfo.statusCode, '401', 'Status code must be 401');
assert.strictEqual(examInfo.isExamRelated, true, 'Should detect exam-related context from path');
assert.ok(examInfo.title.includes('Exam Details'), 'Title must be specific to exam details');
assert.ok(examInfo.description.includes('401 - Unauthorized'), 'Description should mention 401 unauthorized');

// Test 3: Verify alert override suppresses native alert for 401 HTML
const origAlertCalls = nativeAlertCallCount;
context.window.alert(sample401Payload);
assert.strictEqual(nativeAlertCallCount, origAlertCalls, 'Native alert must NOT be called for 401 HTML error');

// Verify native alert still works for legitimate user alerts
context.window.alert('Normal harmless notification');
assert.strictEqual(nativeAlertCallCount, origAlertCalls + 1, 'Native alert MUST be called for normal dialogs');

console.log('PASS: All alert interceptor, 401 error parsing, and UI recovery card tests passed cleanly.');
