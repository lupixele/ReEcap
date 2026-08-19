// Injectable chunk array fetching script
window.REECAP_STUDENTS = [];
window.REECAP_STUDENTS_LOADED = false;

// We pull the chrome runtime URL injected via dataset attribute in content.js since `chrome.runtime` 
// is not accessible directly in injected document context script blocks.
const scriptEl = document.currentScript;
const jsonUrl = scriptEl && scriptEl.dataset.jsonUrl ? scriptEl.dataset.jsonUrl : '';

if (jsonUrl) {
  fetch(jsonUrl)
    .then(r => r.json())
    .then(data => { window.REECAP_STUDENTS = data; window.REECAP_STUDENTS_LOADED = true; })
    .catch(e => console.error('Failed to load students.json', e));
}

