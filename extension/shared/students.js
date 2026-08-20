// Injectable chunk array fetching script
window.REECAP_STUDENTS = window.REECAP_STUDENTS || [];
window.REECAP_STUDENTS_LOADED = window.REECAP_STUDENTS_LOADED || false;

// We pull the chrome runtime URL injected via dataset attribute in content.js since `chrome.runtime` 
// is not accessible directly in injected document context script blocks.
(function() {
  const scriptElement = document.currentScript;
  const jsonUrl = scriptElement && scriptElement.dataset.jsonUrl ? scriptElement.dataset.jsonUrl : '';

  if (jsonUrl && !window.REECAP_STUDENTS_LOADED) {
    fetch(jsonUrl)
      .then(r => r.json())
      .then(data => { window.REECAP_STUDENTS = data; window.REECAP_STUDENTS_LOADED = true; })
      .catch(e => console.error('Failed to load students.json', e));
  }
})();

