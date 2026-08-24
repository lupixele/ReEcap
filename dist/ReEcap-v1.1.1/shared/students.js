// Injectable chunk array fetching script
window.REECAP_STUDENTS = [];
window.REECAP_STUDENTS_LOADED = false;
fetch(chrome.runtime.getURL('shared/students.json'))
  .then(r => r.json())
  .then(data => { window.REECAP_STUDENTS = data; window.REECAP_STUDENTS_LOADED = true; })
  .catch(e => console.error('Failed to load students.json', e));
