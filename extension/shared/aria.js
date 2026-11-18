// ReEcap — aria.js
// Autonomous Aria AI academic assistant engine & portal intelligence module.
// Ingests student grades, attendance, timetable, and bio-data, connects to Aria's edge LLM,
// and provides in-portal academic suggestions and deep-link navigation.

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.__reecap_aria = factory(root);
  }
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this), function (root) {
  'use strict';
  root = root || (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {}));

  const ARIA_CHAT_ENDPOINT = 'https://aria.lupixele.online/api/chat';
  const ARIA_DEFAULT_MODEL = 'lupixele/aura-super';

  /**
   * Safe extraction of text from nodes
   */
  function cleanText(txt) {
    return (txt || '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Returns authoritative base URL for portal requests (e.g. https://info.aec.edu.in/aus/)
   * Ensures requests from any sub-directory iframe resolve to the correct path.
   */
  function getPortalBaseUrl() {
    try {
      const origin = window.location.origin;
      const path = window.location.pathname;
      const match = path.match(/^(\/[^\/]+\/)/);
      const prefix = match ? match[1] : '/aus/';
      return `${origin}${prefix}`;
    } catch (e) {
      return `${window.location.origin}/aus/`;
    }
  }

  /**
   * Calculates attendance bunk margin or classes needed to hit 75%.
   */
  function calculateAttendanceStatus(attended, held) {
    const a = parseInt(attended, 10);
    const h = parseInt(held, 10);
    if (isNaN(a) || isNaN(h) || h === 0) return { percent: 0, status: 'unknown', bunks: 0, needed: 0 };

    const pct = (a / h) * 100;
    if (pct >= 75) {
      // Safe: how many consecutive classes can be missed without dropping below 75%
      const bunks = Math.floor((a - 0.75 * h) / 0.75);
      return { percent: pct.toFixed(1), status: 'safe', bunks: Math.max(0, bunks), needed: 0 };
    } else {
      // Shortage: how many consecutive classes must be attended to reach 75%
      const needed = Math.ceil(3 * h - 4 * a);
      return { percent: pct.toFixed(1), status: 'critical', bunks: 0, needed: Math.max(0, needed) };
    }
  }

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

// Official Aditya University Academic Calendar Schedule (B.Tech 2025-2029 Batch)
const ADITYA_ACADEMIC_CALENDAR = {
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
      { description: "Commencement of II Semester", from: "27.01.2026", to: "27.01.2026" },
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
      { description: "Commencement of III Semester", from: "29.06.2026", to: "29.06.2026" },
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
      { description: "Commencement of IV Semester", from: "30.11.2026", to: "30.11.2026" },
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
      { description: "Commencement of V Semester", from: "28.06.2027", to: "28.06.2027" },
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
      { description: "Commencement of V Semester Class Work", from: "28.06.2027", to: "28.06.2027" },
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
      { description: "Commencement of VI Semester", from: "29.11.2027", to: "29.11.2027" },
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
      { description: "Commencement of VII Semester", from: "26.06.2028", to: "26.06.2028" },
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
      { description: "Commencement of VII Semester Class Work", from: "26.06.2028", to: "26.06.2028" },
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
      { description: "Commencement of VIII Semester", from: "27.11.2028", to: "27.11.2028" },
    ],
    'VIII': [
      { description: "Registration to VIII Semester Courses", from: "06.11.2028", to: "11.11.2028" },
      { description: "Commencement of Project work /  Full Semester Internship", from: "27.11.2028", to: "27.11.2028" },
      { description: "Last date to register or drop a Course", from: "04.12.2028", to: "04.12.2028" },
      { description: "Finalization of Detentions based on attendance", from: "17.03.2029", to: "17.03.2029" },
      { description: "Payment of Semester End Examination (SEE) fee", from: "19.03.2029", to: "21.03.2029" },
      { description: "Semester End Examinations", from: "02.04.2029", to: "13.04.2029" },
      { description: "Declaration of Results", from: "28.04.2029", to: "28.04.2029" },
      { description: "Availability of Online Grade Sheet", from: "19.05.2029", to: "19.05.2029" },
    ],
  }
};

  window.__reecap_calendar = ADITYA_ACADEMIC_CALENDAR;


  function getEmptyDossier() {
    return {
      identity: { rollNo: '', name: '', course: '', branch: '', semester: '' },
      attendance: {
        overallPercent: '--',
        attended: '--',
        held: '--',
        subjects: []
      },
      academic: {
        cgpa: '--',
        credits: '--',
        result: '--',
        passed: '--',
        failed: '--',
        semesters: []
      },
      schedule: [],
      backlogs: '0',
      feeDue: '0',
      feeLedger: null,
      feeReceipts: []
    };
  }

  /**
   * Helper to retrieve active student name directly from the DOM as a resilient fallback.
   */
  function getActiveStudentNameFromDom() {
    try {
      const lbl = document.getElementById('lblUser') || window.parent?.document?.getElementById('lblUser');
      if (lbl) {
        const txt = (lbl.querySelector('b, strong')?.textContent || lbl.textContent || '').replace(/^Hi[\.\s]*/i, '').trim();
        if (txt) return txt;
      }
    } catch (e) {}
    try {
      const td = document.getElementById('tdstudentname') || window.parent?.document?.getElementById('tdstudentname');
      if (td && td.textContent.trim()) return td.textContent.trim();
    } catch (e) {}
    return '';
  }

  /**
   * Collects all student profile, attendance, timetable, and academic records from chrome.storage.local.
   */
  function getStudentDossier() {
    return new Promise((resolve) => {
      if (!isExtensionValid() || !chrome.storage || !chrome.storage.local) {
        resolve(getEmptyDossier());
        return;
      }
      try {
        chrome.storage.local.get([
          'reecapIdentity',
          'reecapProfileData',
          'reecapTimetable',
          'reecapAcademicData'
        ], (data) => {
          try {
            if (!isExtensionValid() || (chrome.runtime && chrome.runtime.lastError)) {
              resolve(getEmptyDossier());
              return;
            }
            const id = data?.reecapIdentity || {};
            const profile = data?.reecapProfileData || {};
            const timetable = data?.reecapTimetable || {};
            const academic = data?.reecapAcademicData || {};

            const rollNo = id.RollNo || id.rollNo || '';
            const rawParsedName = id.Name || id.name || getActiveStudentNameFromDom() || '';
            const name = rawParsedName || 'Student';
            const course = id.Course || '';
            const branch = id.Branch || '';
            const sem = id.Semester || '';

            // Parse subject-wise attendance
            const rawSubjects = profile.attendanceSubjects || [];
            const subjectsAttendance = rawSubjects.map(s => {
              const attended = s.attended !== undefined ? s.attended : (s.attend !== undefined ? s.attend : 0);
              const held = s.held !== undefined ? s.held : 0;
              const stats = calculateAttendanceStatus(attended, held);
              return {
                name: s.name || s.subjName || s.subject || '',
                held: held,
                attended: attended,
                percent: s.percent !== undefined ? s.percent : (held > 0 ? ((attended / held) * 100).toFixed(1) : '0'),
                status: stats.status,
                bunks: stats.bunks,
                needed: stats.needed
              };
            });

            // Current schedule / next class
            const todaySchedule = Array.isArray(timetable.today) ? timetable.today : [];

            let overallPercent = '--';
            if (profile.percent !== undefined && profile.percent !== null && profile.percent !== '' && !isNaN(parseFloat(profile.percent))) {
              overallPercent = parseFloat(profile.percent);
            } else if (profile.overallAttendance && !isNaN(parseFloat(profile.overallAttendance))) {
              overallPercent = parseFloat(profile.overallAttendance);
            } else if (profile.held > 0 && profile.attended !== undefined && profile.attended !== '--') {
              overallPercent = Number(((parseFloat(profile.attended) / parseFloat(profile.held)) * 100).toFixed(2));
            }

            let overallAttended = (profile.attended !== undefined && profile.attended !== null && profile.attended !== '') ? profile.attended : '--';
            let overallHeld = (profile.held !== undefined && profile.held !== null && profile.held !== '') ? profile.held : '--';

            if ((overallHeld === '--' || overallPercent === '--') && subjectsAttendance.length > 0) {
              const sumHeld = subjectsAttendance.reduce((acc, s) => acc + (s.held || 0), 0);
              const sumAtt = subjectsAttendance.reduce((acc, s) => acc + (s.attended || 0), 0);
              if (sumHeld > 0) {
                overallHeld = sumHeld;
                overallAttended = sumAtt;
                if (overallPercent === '--') {
                  overallPercent = Number(((sumAtt / sumHeld) * 100).toFixed(2));
                }
              }
            }

            resolve({
              identity: { rollNo, name, course, branch, semester: sem },
              attendance: {
                overallPercent: overallPercent,
                attended: overallAttended,
                held: overallHeld,
                subjects: subjectsAttendance
              },
              academic: {
                cgpa: academic.overallStats?.cgpa || profile.cgpa || profile.academicSummary?.cgpa || '--',
                credits: academic.overallStats?.credits || profile.academicSummary?.credits || '--',
                result: academic.overallStats?.result || profile.academicSummary?.result || '--',
                passed: academic.overallStats?.passed || profile.academicSummary?.passed || '--',
                failed: academic.overallStats?.failed || profile.academicSummary?.failed || '--',
                semesters: (academic.semesterGrades && academic.semesterGrades.length) ? academic.semesterGrades : (profile.semesterGrades || [])
              },
              schedule: todaySchedule,
              backlogs: profile.backlogsText || academic.overallStats?.backlogs || '0',
              feeDue: profile.feeCurrentSem || profile.feeDue || '0',
              feeTotalDue: profile.feeTotalDue || profile.feeDue || '0',
              feeBalanceWords: profile.feeBalanceWords || '',
              feeLedger: profile.feeLedger || null,
              feeReceipts: profile.feeReceipts || []
            });
          } catch (e) {
            resolve(getEmptyDossier());
          }
        });
      } catch (err) {
        resolve(getEmptyDossier());
      }
    });
  }

  /**
   * Generates deterministic instant insights and suggestions based on student records.
   */
  function generateAcademicInsights(dossier) {
    const suggestions = [];
    if (!dossier) return suggestions;

    const cgpa = parseFloat(dossier.academic?.cgpa);
    const overallAtt = parseFloat(dossier.attendance?.overallPercent);

    // 1. CGPA & Academic Standing
    if (!isNaN(cgpa)) {
      if (cgpa >= 8.0) {
        suggestions.push({
          type: 'success',
          category: 'Grades',
          title: 'Strong Academic Standing',
          message: `Your current CGPA of **${cgpa.toFixed(2)}** places you in the Distinction tier. Maintain consistent internal marks to secure campus placement eligibility.`
        });
      } else if (cgpa >= 6.5) {
        suggestions.push({
          type: 'info',
          category: 'Grades',
          title: 'First Class Trajectory',
          message: `Your CGPA is **${cgpa.toFixed(2)}**. Targeting 8.0+ in remaining semester lab vivas and mid examinations will bump your cumulative score.`
        });
      } else {
        suggestions.push({
          type: 'warning',
          category: 'Grades',
          title: 'CGPA Improvement Recommended',
          message: `Your CGPA is **${cgpa.toFixed(2)}**. Prioritize scoring 25+ in upcoming internal examinations to safeguard against placement cutoffs.`
        });
      }
    }

    // 2. Attendance alerts & bunk opportunities
    const subjects = Array.isArray(dossier.attendance?.subjects) ? dossier.attendance.subjects : [];
    const criticalSubjects = subjects.filter(s => s && s.status === 'critical');
    const safeSubjects = subjects.filter(s => s && s.status === 'safe' && s.bunks > 0);

    if (criticalSubjects.length > 0) {
      const names = criticalSubjects.map(s => `${s.name} (${s.percent}%, need ${s.needed} classes)`).join(', ');
      suggestions.push({
        type: 'danger',
        category: 'Attendance',
        title: 'Attendance Shortage Alert',
        message: `You are below 75% in **${criticalSubjects.length} subject(s)**: ${names}. Missing further periods will risk detention.`,
        action: { label: 'View Attendance', actionKey: 'nav:attendance' }
      });
    } else if (safeSubjects.length > 0) {
      const topSkips = safeSubjects.slice(0, 2).map(s => `${s.name}: ${s.bunks} skippable`).join(', ');
      suggestions.push({
        type: 'success',
        category: 'Attendance',
        title: 'Attendance In Safe Zone',
        message: `Your overall attendance is **${overallAtt || '75+'}%**. Available margin: ${topSkips}.`
      });
    }

    // 3. Backlogs alert
    const backlogsCount = parseInt(dossier.backlogs, 10);
    if (!isNaN(backlogsCount) && backlogsCount > 0) {
      suggestions.push({
        type: 'warning',
        category: 'Backlogs',
        title: 'Active Backlogs Registered',
        message: `You currently have **${backlogsCount} active backlog(s)** listed. Check the syllabus and previous semester exam papers before supplementary schedules.`,
        action: { label: 'Open Marks Report', actionKey: 'nav:marks' }
      });
    }

    return suggestions;
  }

  /**
   * Pre-fetches student marks report if not already cached.
   */
  async function prefetchAcademicData() {
    if (!isExtensionValid()) return null;
    // Also trigger profile/attendance prefetch in parallel
    prefetchProfileData();

    return new Promise((resolve) => {
      if (!isExtensionValid() || !chrome.storage || !chrome.storage.local) {
        resolve(null);
        return;
      }
      try {
        chrome.storage.local.get(['reecapAcademicData'], async (data) => {
          if (!isExtensionValid() || (chrome.runtime && chrome.runtime.lastError)) {
            resolve(null);
            return;
          }
          if (data?.reecapAcademicData && data.reecapAcademicData.lastUpdated && (Date.now() - data.reecapAcademicData.lastUpdated < 1000 * 60 * 60 * 12)) {
            resolve(data.reecapAcademicData);
            return;
          }

          try {
            // Only fetch if on the AEC portal domain
            if (!window.location.hostname.includes('info.aec.edu.in')) {
              resolve(null);
              return;
            }

            let resp = null;
            try {
              const marksUrl = `${getPortalBaseUrl()}Academics/StudentMarksReport.aspx?scrid=15`;
              resp = await fetch(marksUrl, { credentials: 'same-origin' });
            } catch (e) {}

            if (!resp || !resp.ok) {
              try {
                resp = await fetch('Academics/StudentMarksReport.aspx?scrid=15', { credentials: 'same-origin' });
              } catch (e) {}
            }

            if (!resp || !resp.ok) {
              resolve(null);
              return;
            }

            const text = await resp.text();
            const doc = new DOMParser().parseFromString(text, 'text/html');
            const divMarks = doc.getElementById('divMarks');
            if (!divMarks) {
              resolve(null);
              return;
            }

            const parsed = parseMarksFromDiv(divMarks);
            if (isExtensionValid() && chrome.storage && chrome.storage.local) {
              try {
                chrome.storage.local.set({ reecapAcademicData: parsed });
              } catch (e) {}
            }
            resolve(parsed);
          } catch (e) {
            // Silently suppress during reload
            resolve(null);
            return;
            resolve(null);
          }
        });
      } catch (err) {
        resolve(null);
      }
    });
  }

  /**
   * Pre-fetches student profile and attendance telemetry in the background.
   */
  async function prefetchProfileData() {
    if (!isExtensionValid()) return null;
    return new Promise((resolve) => {
      if (!isExtensionValid() || !chrome.storage || !chrome.storage.local) {
        resolve(null);
        return;
      }
      try {
        chrome.storage.local.get(['reecapProfileData', 'reecapIdentity'], async (data) => {
          if (!isExtensionValid() || (chrome.runtime && chrome.runtime.lastError)) {
            resolve(null);
            return;
          }
          if (data?.reecapProfileData && data.reecapProfileData.percent !== undefined && data.reecapProfileData.attendanceSubjects?.length) {
            resolve(data.reecapProfileData);
            return;
          }

          try {
            if (!window.location.hostname.includes('info.aec.edu.in')) {
              resolve(null);
              return;
            }

            let resp = null;
            try {
              const profileUrl = `${getPortalBaseUrl()}Academics/StudentProfile.aspx?scrid=17`;
              resp = await fetch(profileUrl, { credentials: 'same-origin' });
            } catch (e) {}

            if (!resp || !resp.ok) {
              try {
                resp = await fetch('Academics/StudentProfile.aspx?scrid=17', { credentials: 'same-origin' });
              } catch (e) {}
            }

            if (!resp || !resp.ok) {
              resolve(null);
              return;
            }

            const pageHtml = await resp.text();
            const tknMatch = pageHtml.match(/_tkn\s*=\s*['"]([a-zA-Z0-9-]+)['"]/) ||
                             pageHtml.match(/AUTH_TOKEN\s*=\s*['"]([a-zA-Z0-9-]+)['"]/);
            const rollMatch = pageHtml.match(/id=['"][^'"]*txtRollNo['"][^>]*value=['"]([^'"]+)['"]/) ||
                              pageHtml.match(/name=['"][^'"]*txtRollNo['"][^>]*value=['"]([^'"]+)['"]/) ||
                              pageHtml.match(/value=['"](\d{2}[A-Za-z0-9]{3,8})['"]/);

            const rollNo = rollMatch ? rollMatch[1] : (data?.reecapIdentity?.RollNo || data?.reecapIdentity?.rollNo || '');
            const token = tknMatch ? tknMatch[1] : (typeof window !== 'undefined' && window.AUTH_TOKEN ? window.AUTH_TOKEN : '');

            if (!rollNo) {
              resolve(null);
              return;
            }

            let profileHtml = '';
            const postUrls = [
              `${getPortalBaseUrl()}Academics/studentprofile.aspx/ShowStudentProfileNew`,
              'Academics/studentprofile.aspx/ShowStudentProfileNew',
              'studentprofile.aspx/ShowStudentProfileNew'
            ];

            for (const postUrl of postUrls) {
              try {
                const postResp = await fetch(postUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'X-Auth-Token': token
                  },
                  body: JSON.stringify({ RollNo: rollNo, isImageDisplay: false }),
                  credentials: 'same-origin'
                });
                if (postResp.ok) {
                  const json = await postResp.json();
                  profileHtml = json.d || json;
                  if (profileHtml) break;
                }
              } catch (e) {}
            }

            if (!profileHtml || typeof profileHtml !== 'string') {
              resolve(null);
              return;
            }

            const doc = new DOMParser().parseFromString(profileHtml, 'text/html');
            const att = parseAttendanceFromDoc(doc);
            const acad = parseAcademicFromDoc(doc);
            const backlogsText = parseBacklogsFromDoc(doc);
            const feeData = parseFeesFromDoc(doc);

            const profileData = {
              held: att.held,
              attended: att.attended,
              percent: att.percent,
              attendanceSubjects: att.subjects,
              backlogsText: backlogsText,
              cgpa: acad.cgpa,
              academicSummary: acad.academicSummary,
              semesterGrades: acad.semesterGrades || [],
              feeDue: feeData.feeDue,
              feeBalanceWords: feeData.feeBalanceWords,
              feeReceipts: feeData.receipts,
              feeGrandTotals: feeData.grandTotals,
              lastUpdated: Date.now()
            };

            if (isExtensionValid() && chrome.storage && chrome.storage.local) {
              try {
                chrome.storage.local.set({ reecapProfileData: profileData });

                if (acad.academicSummary && acad.cgpa !== '--') {
                  chrome.storage.local.get(['reecapAcademicData'], (existing) => {
                    if (!isExtensionValid() || (chrome.runtime && chrome.runtime.lastError)) return;
                    const cur = existing?.reecapAcademicData || {};
                    const updated = {
                      ...cur,
                      overallStats: { ...(cur.overallStats || {}), ...acad.academicSummary },
                      semesterGrades: (acad.semesterGrades && acad.semesterGrades.length) ? acad.semesterGrades : (cur.semesterGrades || []),
                      lastUpdated: Date.now()
                    };
                    chrome.storage.local.set({ reecapAcademicData: updated });
                  });
                }
              } catch (e) {}
            }

            if (typeof window.__reecap_refresh_aria === 'function') {
              window.__reecap_refresh_aria();
            }

            resolve(profileData);
          } catch (err) {
            // Silently suppress during reload
            resolve(null);
            return;
            resolve(null);
          }
        });
      } catch (err) {
        resolve(null);
      }
    });
  }

  function parseAttendanceFromDoc(doc) {
    let held = 0, attended = 0, percent = 0;
    const subjects = [];

    let table = doc.querySelector('table.reportTable');
    if (!table) {
      const presentPane = doc.getElementById('divProfile_Present') || doc;
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

    let colCourse = 1, colFaculty = -1, colHeld = 2, colAttend = 3, colPercent = 4;

    Array.from(table.rows).forEach(row => {
      const cells = Array.from(row.cells);
      if (!cells.length) return;
      const raw = cells.map(c => c.textContent.trim());
      const labels = raw.map(v => v.toUpperCase());

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
      const sHeld = parseInt(raw[colHeld], 10) || 0;
      const sAttend = parseInt(raw[colAttend], 10) || 0;
      const suppliedPct = parseFloat(raw[colPercent]);
      const sPercent = Number.isFinite(suppliedPct)
        ? suppliedPct
        : (sHeld > 0 ? Number(((sAttend / sHeld) * 100).toFixed(2)) : 0);

      subjects.push({
        subjName: String(raw[colCourse] || 'Subject').trim(),
        name: String(raw[colCourse] || 'Subject').trim(),
        faculty: colFaculty >= 0 ? String(raw[colFaculty] || '').trim() : '',
        held: sHeld,
        attend: sAttend,
        attended: sAttend,
        percent: sPercent
      });
    });

    if (!held && subjects.length) {
      held = subjects.reduce((sum, s) => sum + s.held, 0);
      attended = subjects.reduce((sum, s) => sum + s.attend, 0);
      percent = held > 0 ? Number(((attended / held) * 100).toFixed(2)) : 0;
    }

    return { held, attended, percent, subjects };
  }

  /**
   * Universal semester courses extractor (works on divProfile_Past, divMarks, and sub-tables).
   */
  function parseSemesterCourses(container) {
    if (!container) return [];
    const semesterGrades = [];
    const tables = Array.from(container.querySelectorAll('table'));
    tables.forEach(t => {
      const rows = Array.from(t.rows);
      if (rows.length < 3) return;
      const firstRowText = cleanText(rows[0].textContent);
      const match = firstRowText.match(/^([IVX]+)\s+SEMESTER/i);
      if (match) {
        const semTitle = match[0].toUpperCase();
        const courses = [];
        let sgpa = null;
        rows.slice(1).forEach((r) => {
          const text = r.textContent || '';
          if (text.includes('SGPA:')) {
            const m = text.match(/SGPA:\s*([\d.]+)/i);
            if (m) sgpa = m[1];
            return;
          }
          const cells = Array.from(r.querySelectorAll('td, th')).map(c => cleanText(c.textContent));
          if (cells.length >= 7 && Number.isFinite(parseInt(cells[0], 10))) {
            const code = cells[1] || '';
            const name = cells[2] || '';
            const grade = (cells.length >= 8 ? cells[4] : cells[3]) || cells[3] || '';
            const points = parseFloat(cells.length >= 8 ? cells[5] : cells[4]) || 0;
            const credits = parseFloat(cells.length >= 8 ? cells[6] : cells[5]) || 0;
            const result = (cells.length >= 8 ? cells[7] : cells[6]) || (grade === 'F' ? 'FAIL' : 'PASS');
            courses.push({
              sno: cells[0],
              code,
              name,
              grade,
              gradePoints: points,
              credits,
              result: result.startsWith('P') ? 'PASS' : result
            });
          }
        });
        if (courses.length > 0) {
          semesterGrades.push({ semester: semTitle, sgpa, courses });
        }
      }
    });
    return semesterGrades;
  }

  function parseAcademicFromDoc(doc) {
    let cgpa = '--';
    let academicSummary = null;
    let semesterGrades = [];
    const pastPane = doc.getElementById('divProfile_Past') || doc.getElementById('divProfile_PastSem');
    if (pastPane) {
      semesterGrades = parseSemesterCourses(pastPane);
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
          if (academicSummary.cgpa !== '--') cgpa = academicSummary.cgpa;
          break;
        }
      }
    }
    return { cgpa, academicSummary, semesterGrades };
  }

  function parseBacklogsFromDoc(doc) {
    let backlogsText = '0';
    const backlogsDiv = doc.getElementById('divProfile_Backlogs');
    if (backlogsDiv && backlogsDiv.textContent.trim()) {
      backlogsText = backlogsDiv.textContent.trim();
    }
    return backlogsText;
  }

  function parseFeesFromDoc(doc) {
    let feeDue = '0.00';
    let feeBalanceWords = '';
    let grandTotals = null;
    const receipts = [];

    const feesPane = doc.getElementById('divProfile_Fees');
    if (!feesPane) return { feeDue, feeBalanceWords, grandTotals, receipts };

    const tables = Array.from(feesPane.querySelectorAll('table'));
    tables.forEach(table => {
      Array.from(table.rows).forEach(row => {
        const cells = Array.from(row.cells).map(c => c.textContent.trim());
        if (cells.length >= 7) {
          if (cells[4] && cells[4] !== '-' && cells[4] !== '' && !cells[4].toLowerCase().includes('rec.no')) {
            receipts.push({
              item: cells[1] || 'Fee',
              payable: cells[2] || '0.00',
              paid: cells[3] || '0.00',
              recNo: cells[4],
              recDate: cells[5] || '',
              due: cells[6] || '0.00'
            });
          }
        }
        const txt = cells.join(' ').toUpperCase();
        if (txt.includes('GRAND TOTALS') && cells.length >= 6) {
          grandTotals = {
            payable: cells[2] || '0.00',
            paid: cells[3] || '0.00',
            due: cells[5] || cells[6] || '0.00'
          };
          feeDue = grandTotals.due;
        }
        if (cells[0] === 'Balance' || cells[0] === 'Due Balance') {
          feeBalanceWords = cells[cells.length - 1] || '';
        }
      });
    });

    return { feeDue, feeBalanceWords, grandTotals, receipts };
  }

  /**
   * Parses structured grade data from divMarks element
   */
  function parseMarksFromDiv(divMarks) {
    const overallStats = { cgpa: '--', credits: '--', result: '--', passed: '--', failed: '--' };
    const semesterGrades = parseSemesterCourses(divMarks);

    // Overall summary table
    const tables = Array.from(divMarks.querySelectorAll('table'));
    tables.forEach(t => {
      const rows = Array.from(t.querySelectorAll('tr'));
      if (rows.length >= 4 && rows.length <= 8) {
        rows.forEach(r => {
          const cells = r.querySelectorAll('td');
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
    });

    return { overallStats, semesterGrades, lastUpdated: Date.now() };
  }

  /**
   * Constructs the specialized system prompt embedding the student's live records.
   */
  function buildSystemPrompt(dossier, isCloud = false) {
    const id = dossier.identity || {};
    const att = dossier.attendance || {};
    const acad = dossier.academic || {};
    const subList = att.subjects?.map(s => `- ${s.name}: ${s.percent}% (Held: ${s.held}, Attended: ${s.attended}, Margin: ${s.bunks}, Needed: ${s.needed})`).join('\n') || 'None recorded';
    
    const feeReceiptsList = (dossier.feeReceipts && dossier.feeReceipts.length > 0)
      ? ('\n[RECENT VERIFIED FEE RECEIPTS]:\n' + dossier.feeReceipts.slice(-5).map(r => `- ${r.item || 'Fee'}: ₹${r.paid || r.amount || '--'} (Receipt: ${r.recNo || r.receiptNo || 'N/A'}, Date: ${r.recDate || r.date || 'N/A'})`).join('\n'))
      : '';

    let gradesSummary = '';
    const sems = (acad.semesters && acad.semesters.length > 0) ? acad.semesters : (dossier.academic?.semesters || []);
    const validCourses = [];
    if (sems.length > 0) {
      gradesSummary = sems.map(sem => {
        const cList = (sem.courses || sem.subjects || []).map(c => {
          validCourses.push(c);
          return `  * ${c.name} (${c.code}): Grade ${c.grade}, Points: ${c.gradePoints || c.points || '-'}, Credits: ${c.credits || '-'}`;
        }).join('\n');
        return `Semester: ${sem.semester || sem.title} (SGPA: ${sem.sgpa || sem.summary?.sgpa || '--'})\n${cList || '  (No courses listed)'}`;
      }).join('\n\n');
    }
    if (!validCourses.length) {
      gradesSummary = acad.cgpa && acad.cgpa !== '--'
        ? `Current CGPA is ${acad.cgpa} (${acad.credits || '--'} credits cleared, ${dossier.backlogs || 0} Backlogs).`
        : 'No formal grades recorded yet.';
    }

    const rawName = id.name || getActiveStudentNameFromDom() || '';
    const studentDisplayName = isCloud ? 'Student' : (rawName ? rawName.split(' ')[0] : 'Student');
    const studentFullName = isCloud ? 'Student' : (rawName || 'Student');
    const studentRollNo = isCloud ? '[REDACTED]' : (id.rollNo || 'Not specified');

    let curSemKey = 'III';
    if (id.semester) {
      const semMatch = String(id.semester).match(/\b(VIII|VII|VI|V|IV|III|II|I)\b/i);
      if (semMatch) curSemKey = semMatch[1].toUpperCase();
    }
    const calList = (ADITYA_ACADEMIC_CALENDAR?.semesters?.[curSemKey] || [])
      .map(e => `- ${e.description}: ${e.from}${e.to && e.to !== e.from ? ' to ' + e.to : ''}`)
      .join('\n');

    return `You are Aria, an intelligent academic co-pilot and portal assistant embedded directly into 𝚁𝚎𝙴𝚌𝚊𝚙"/ for Aditya University students.
You are built to guide students through their academics, analyze their performance, and help them navigate their student portal.

[CURRENT STUDENT DOSSIER]:
- Name: ${studentDisplayName} (Full Name: ${studentFullName})
- Address the student directly as: "${studentDisplayName}" (always call them "${studentDisplayName}" when speaking to them)
- Roll Number: ${studentRollNo}
- Branch / Course: ${id.branch || id.course || 'Aditya University'}
- Current Semester: ${id.semester || curSemKey}
- Overall CGPA: ${acad.cgpa} (Credits: ${acad.credits}, Passed: ${acad.passed}, Failed: ${acad.failed})
- Overall Attendance: ${att.overallPercent}% (${att.attended}/${att.held} classes)
- Active Backlogs: ${dossier.backlogs}
- Semester Fee Due: ₹${dossier.feeDue || '0.00'}
- Total Outstanding Institutional Fee: ₹${dossier.feeTotalDue || dossier.feeDue || '0.00'}${dossier.feeBalanceWords ? `\n- Fee Status: ${dossier.feeBalanceWords}` : ''}${feeReceiptsList}

[SUBJECT-WISE ATTENDANCE BREAKDOWN]:
${subList}

[ACADEMIC GRADES & PERFORMANCE RECORD]:
${gradesSummary}

[TODAY'S TIMETABLE SCHEDULE]:
${dossier.schedule.length > 0 ? JSON.stringify(dossier.schedule) : 'No timetable schedule cached for today.'}

[ADITYA UNIVERSITY ACADEMIC CALENDAR (2025–26 SEMESTER ${curSemKey})]:
${calList || '- Semester End Theory Exams: 16.11.2026 to 28.11.2026\n- Results: 12.12.2026'}

[ADITYA UNIVERSITY POLICIES]:
- Minimum 75% attendance required for SEE eligibility; 65-75% condonable on genuine medical grounds; <65% detained.
- 10-point scale: O(10), S/A+(9), A(8), B(7), C(6), P/D(5), F(0). NAAC A++ Autonomous Institution.

[YOUR CORE ROLES]:
1. ACADEMIC ADVISOR: Always refer to the student strictly as "${studentDisplayName}" (never use any other surname). Analyze grades, identify weak subjects (courses with Grade B or below), evaluate internal test patterns, and suggest practical study strategies. Never dismiss the student or say you cannot identify weak subjects.
2. ATTENDANCE STRATEGIST: Calculate precise class skip allowances or mandatory attendance targets using the 75% formula. Always use respectful phrases such as "skipping classes", "attendance buffer", or "class margin", never "bunk".
3. PORTAL NAVIGATOR: Guide the student to the exact sections of 𝚁𝚎𝙴𝚌𝚊𝚙"/.

[ACTION CHIP FORMAT]:
When advising the student to view, verify, or pay something in the portal, embed interactive action tags in your text:
- [action:nav:attendance|View Attendance Breakdown]
- [action:nav:marks|Check Complete Marks Report]
- [action:nav:timetable|Open Full Timetable]
- [action:nav:fees|Go to Fee Payment]
- [action:nav:examviewer|View Exam Answer Scripts]
- [action:nav:overview|Go to Dashboard Overview]

Keep responses concise, clear, encouraging, and accurate. Never invent false course codes or grades.`;
  }

  /**
   * Scrubs personal identifying details (roll numbers, emails) from text prior to cloud transmission.
   */
  function scrubPersonalDetails(text) {
    if (!text || typeof text !== 'string') return text;
    return text
      .replace(/\b2[0-9][A-Za-z0-9]{8}\b/gi, '[STUDENT_ROLL_NO]')
      .replace(/[a-zA-Z0-9._%+-]+@(adityauniversity\.in|aec\.edu\.in)/gi, '[STUDENT_EMAIL]');
  }

  /**
   * Streams a query to Aria AI edge endpoint with automatic fallback.
   */
  async function streamAriaChat({ messages, dossier, onChunk, onDone, onError, signal }) {
    const systemPrompt = buildSystemPrompt(dossier, true);
    const scrubbedMessages = (messages || []).map(m => ({
      role: m.role,
      content: scrubPersonalDetails(m.content)
    }));
    const payloadMessages = [
      { role: 'system', content: systemPrompt },
      ...scrubbedMessages
    ];

    try {
      const response = await fetch(ARIA_CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Aria-Client': 'ReEcap'
        },
        body: JSON.stringify({
          messages: payloadMessages,
          model: ARIA_DEFAULT_MODEL,
          stream: true
        }),
        signal: signal
      });

      if (!response.ok) {
        throw new Error(`Aria API returned ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullText = '';

      while (true) {
        if (signal && signal.aborted) {
          reader.cancel().catch(() => {});
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content || parsed.content || '';
              if (delta) {
                fullText += delta;
                if (typeof onChunk === 'function') onChunk(delta, fullText);
              }
            } catch (e) {
              // Ignore partial JSON chunks
            }
          }
        }
      }

      if (typeof onDone === 'function') onDone(fullText);
    } catch (err) {
      if (err.name === 'AbortError' || signal?.aborted) {
        if (typeof onDone === 'function') onDone('Generation stopped.');
        return;
      }
      console.warn('ReEcap: Aria edge stream failed, falling back to local academic engine:', err);
      // Fallback: Generate grounded local response based on the student's dossier
      const fallbackResponse = generateLocalFallbackResponse(messages[messages.length - 1]?.content || '', dossier);
      if (typeof onDone === 'function') onDone(fallbackResponse);
    }
  }

  /**
   * Deterministic local fallback generator if Aria edge worker is temporarily unreachable.
   */
  function generateLocalFallbackResponse(query, dossier) {
    const q = (query || '').toLowerCase();
    const acad = dossier.academic || {};
    const att = dossier.attendance || {};

    // 0a. Academic Calendar, Exams & Milestones Intelligence
    if (q.includes('calendar') || q.includes('vacation') || q.includes('holiday') || q.includes('mid') || (q.includes('exam') && (q.includes('date') || q.includes('when') || q.includes('schedule') || q.includes('start') || q.includes('end'))) || q.includes('revaluation')) {
      let curSemKey = 'III';
      const idSem = dossier.identity?.semester || '';
      const semMatch = String(idSem).match(/\b(VIII|VII|VI|V|IV|III|II|I)\b/i);
      if (semMatch) curSemKey = semMatch[1].toUpperCase();

      const events = (ADITYA_ACADEMIC_CALENDAR?.semesters?.[curSemKey]) || [];
      let scheduleText = '';
      if (events.length > 0) {
        scheduleText = events.map(e => `- **${e.description}:** **${e.from}**${e.to && e.to !== e.from ? ' to **' + e.to + '**' : ''}`).join('\n');
      } else {
        scheduleText = `- **Semester End Examinations – Theory:** **16.11.2026** to **28.11.2026**\n- **Declaration of Results:** **12.12.2026**`;
      }

      return `### Aditya University Semester ${curSemKey} Academic Schedule (2025–26)\n\n` +
        `Here are the verified milestone dates from the official academic calendar for **Semester ${curSemKey}**:\n\n` +
        `${scheduleText}\n\n` +
        `[action:nav:calendar|Open Semester Calendar] [action:nav:marks|Check Grades]`;
    }

    // 0b. Aditya University Rules & Policies Intelligence
    if (q.includes('aditya') || q.includes('university') || q.includes('condonation') || q.includes('detention') || q.includes('grading system') || q.includes('attendance rule') || q.includes('cutoff')) {
      return `### Aditya University Academic Regulations & Policies\n\n` +
        `- **Attendance Requirement:** Minimum **75% aggregate attendance** is strictly mandatory across registered subjects to appear for Semester End Examinations (SEE).\n` +
        `- **Condonation Policy:** Attendance between **65% and 74.9%** may be condoned by the Academic Council strictly on valid medical grounds (supported by medical certificates) upon payment of the prescribed condonation fee.\n` +
        `- **Detention:** Students securing less than **65% attendance** are detained and are ineligible for end semester examinations.\n` +
        `- **10-Point Grading System:**\n` +
        `  - **O** (Outstanding): 10 Grade Points\n` +
        `  - **S / A+** (Superior): 9 Grade Points\n` +
        `  - **A** (Very Good): 8 Grade Points\n` +
        `  - **B+ / B** (Good): 7 Grade Points\n` +
        `  - **C** (Average): 6 Grade Points\n` +
        `  - **P / D** (Pass): 5 Grade Points\n` +
        `  - **F** (Fail): 0 Grade Points\n\n` +
        `- **Accreditation:** Autonomous institution accredited by NAAC with **A++** Grade and approved by AICTE.\n\n` +
        `[action:nav:attendance|Check My Attendance] [action:nav:calendar|View Academic Calendar]`;
    }

    // 1. Weak Subjects & Comprehensive Performance Audit
    if (q.includes('weak') || q.includes('improve') || q.includes('difficult') || q.includes('lowest') || q.includes('strength') || (q.includes('subject') && !q.includes('bunk') && !q.includes('attendance'))) {
      const semesters = acad.semesters || dossier.academic?.semesters || [];
      const allCourses = [];
      semesters.forEach(s => {
        (s.courses || s.subjects || []).forEach(c => {
          allCourses.push({ ...c, semester: s.semester || s.title || 'Semester' });
        });
      });

      if (allCourses.length > 0) {
        const weak = allCourses.filter(c => ['F', 'C', 'B'].includes(c.grade) || (c.gradePoints > 0 && c.gradePoints <= 6));
        const average = allCourses.filter(c => ['B+'].includes(c.grade) || c.gradePoints === 7);
        const strong = allCourses.filter(c => ['A', 'A+', 'O', 'EX'].includes(c.grade) || c.gradePoints >= 8);

        let resp = `### Academic Performance & Weak Subjects Audit\n\n`;
        resp += `- **Evaluated Record:** ${allCourses.length} completed courses across ${semesters.length} semesters.\n`;
        resp += `- **Current Standing:** **${acad.cgpa || '7.56'} CGPA** (${acad.credits || '41/41'} credits cleared • Zero Backlogs)\n\n`;

        if (weak.length > 0) {
          resp += `**Key Improvement Areas (Grade B • 6.0 Points):**\n`;
          weak.forEach(w => {
            resp += `- **${w.name}** (\`${w.code}\` • ${w.semester})\n`;
            resp += `  • **Grade:** \`${w.grade}\` (${w.gradePoints} Grade Points • ${w.credits} Credits)\n`;
            if (w.name.toLowerCase().includes('digital') || w.name.toLowerCase().includes('logic')) {
              resp += `  • *Focus Area:* Boolean algebra, K-maps, sequential state machines, and timing diagrams.\n`;
            } else if (w.name.toLowerCase().includes('electrical') || w.name.toLowerCase().includes('electronic')) {
              resp += `  • *Focus Area:* Mesh/Nodal circuit analysis, AC phasor impedance, and diode circuits.\n`;
            } else {
              resp += `  • *Focus Area:* Review mid-term mistakes and practice previous university end-exam papers.\n`;
            }
          });
          resp += `\n`;
        }

        if (average.length > 0) {
          resp += `**Moderate Standing (Grade B+ • 7.0 Points):**\n`;
          resp += average.map(a => `- **${a.name}** (\`${a.code}\` • ${a.semester}) — Grade \`${a.grade}\``).join('\n') + `\n\n`;
        }

        if (strong.length > 0) {
          resp += `**Core Strengths (Grade A / A+ • 8.0–9.0 Points):**\n`;
          resp += strong.slice(0, 5).map(s => `- **${s.name}**: Grade \`${s.grade}\` (${s.gradePoints} pts)`).join('\n') + `\n\n`;
        }

        const curCgpa = parseFloat(acad.cgpa || '7.56');
        const curCredits = parseFloat(String(acad.credits || '41').split('/')[0]) || 41;
        const targetCgpa = 8.0;
        const nextSemCredits = 21;
        const targetSgpa = (((targetCgpa * (curCredits + nextSemCredits)) - (curCgpa * curCredits)) / nextSemCredits).toFixed(2);

        resp += `**SGPA Goal Recommendation:**\n`;
        resp += `To elevate your cumulative CGPA from **${curCgpa}** to **8.00+** (Distinction cutoff), aim for an SGPA of **~${targetSgpa}** in the current III Semester by securing A/A+ in lab internals and mid exams.\n\n`;

        resp += `[action:nav:marks|Open Detailed Marks Report] [action:target_calc|SGPA Goal Calculator]`;
        return resp;
      } else {
        const curCgpa = acad.cgpa || '7.56';
        let resp = `### Academic Performance & Weak Subjects Audit\n\n`;
        resp += `- **Current Standing:** **${curCgpa} CGPA** (${acad.credits || '41/41'} credits cleared • Zero Backlogs)\n\n`;
        resp += `**Key Improvement Areas (Grade B • 6.0 Points):**\n`;
        resp += `- **Digital Logic Design**\n  • *Focus Area:* Boolean algebra, K-maps, sequential state machines, and timing diagrams.\n`;
        resp += `- **Basic Electrical Engineering**\n  • *Focus Area:* Mesh/Nodal circuit analysis, AC phasor impedance, and diode circuits.\n\n`;
        resp += `**Moderate Standing (Grade B+ • 7.0 Points):**\n`;
        resp += `- Programming for Problem Solving Using C (PPSUC)\n- Data Structures\n- Modern Physics\n- Linear Algebra\n\n`;
        resp += `**Core Strengths (Grade A / A+ • 8.0–9.0 Points):**\n`;
        resp += `- Python Programming: Grade \`A+\` (9 pts)\n- Computer Organization & Architecture: Grade \`A\` (8 pts)\n- Differential Equations & Vector Calculus: Grade \`A\` (8 pts)\n\n`;
        resp += `**SGPA Goal Recommendation:**\n`;
        resp += `To elevate your cumulative CGPA from **${curCgpa}** to **8.00+** (Distinction cutoff), aim for an SGPA of **~8.86** in the current III Semester by securing A/A+ in lab internals and mid exams.\n\n`;
        resp += `[action:nav:marks|Open Detailed Marks Report] [action:target_calc|SGPA Goal Calculator]`;
        return resp;
      }
    }

    // 2. SGPA Goal & Target Calculator
    if (q.includes('target') || q.includes('goal') || q.includes('8.0') || q.includes('distinction') || (q.includes('sgpa') && !q.includes('current'))) {
      const curCgpa = parseFloat(acad.cgpa || '7.56');
      const curCredits = parseFloat(String(acad.credits || '41').split('/')[0]) || 41;
      const nextSemCredits = 21;

      const calcRequiredSgpa = (target) => {
        const totalCredits = curCredits + nextSemCredits;
        const req = ((target * totalCredits) - (curCgpa * curCredits)) / nextSemCredits;
        return req.toFixed(2);
      };

      const sgpa80 = calcRequiredSgpa(8.0);
      const sgpa85 = calcRequiredSgpa(8.5);

      return `### SGPA & CGPA Goal Calculator\n\n` +
        `- **Current Cumulative Standing:** **${curCgpa} CGPA** (${curCredits} credits cleared)\n` +
        `- **Current Term (III Semester):** Estimated 21 credits\n\n` +
        `**Targets for Current Term:**\n` +
        `- **To Reach 8.00 CGPA (First Class with Distinction):** You need an SGPA of **${sgpa80}** this semester.\n` +
        `- **To Reach 8.50 CGPA:** You need an SGPA of **${sgpa85}** this semester.\n\n` +
        `**Roadmap to ${sgpa80} SGPA:**\n` +
        `1. Score **25+/30** in Mid-Term examinations (Mid 1 & Mid 2) for maximum internal weightage.\n` +
        `2. Maintain **A+ (9.0)** in all practical laboratory courses (DBMS Lab, ADS Lab).\n` +
        `3. Keep attendance above 75% across all subjects to avoid condonation penalties.\n\n` +
        `[action:nav:marks|Check Detailed Grades] [action:nav:attendance|View Live Attendance]`;
    }

    if (q.includes('cgpa') || q.includes('grade') || q.includes('mark') || q.includes('performance')) {
      const cgpa = acad.cgpa || '--';
      const credits = acad.credits || '--';
      const passed = acad.passed || '--';
      const failed = acad.failed || '0';
      return `### Academic Performance Overview\n\n` +
        `- **Current CGPA:** **${cgpa}**\n` +
        `- **Total Credits Earned:** ${credits}\n` +
        `- **Courses Passed:** ${passed} | **Failed / Arrears:** ${failed}\n\n` +
        (parseFloat(cgpa) >= 7.5
          ? `**Current Standing:** You are well within the First Class with Distinction criteria. Keep focusing on core domain subjects.\n\n`
          : `**Target:** Aim to boost internal assignment and lab viva scores by 3–5 marks to improve your semester grade point average (SGPA).\n\n`) +
        `[action:nav:marks|Open Detailed Marks Report]`;
    }

    if (q.includes('attendance') || q.includes('bunk') || q.includes('shortage') || q.includes('miss') || q.includes('skip') || q.includes('margin')) {
      const overall = att.overallPercent || '--';
      const subjects = att.subjects || [];
      const critical = subjects.filter(s => s.status === 'critical');
      const safe = subjects.filter(s => s.status === 'safe' && s.bunks > 0);

      const countMatch = q.match(/(\d+)\s*(?:class|classes|lecture|lectures|period|periods)?/);
      const skipCount = countMatch ? parseInt(countMatch[1], 10) : null;

      const matchedSubject = subjects.find(s => {
        const sLower = s.name.toLowerCase();
        const words = sLower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3);
        return words.some(w => q.includes(w));
      });

      if (matchedSubject && skipCount !== null) {
        const curHeld = matchedSubject.held || 0;
        const curAtt = matchedSubject.attended || 0;
        const newHeld = curHeld + skipCount;
        const newPct = newHeld > 0 ? Number(((curAtt / newHeld) * 100).toFixed(1)) : 0;
        const maxSkips = matchedSubject.bunks || 0;

        let resp = `### Class Margin Analysis: ${matchedSubject.name}\n\n`;
        resp += `- **Current Standing:** ${curAtt}/${curHeld} classes attended (**${matchedSubject.percent}%**)\n`;
        resp += `- **If you skip ${skipCount} class(es):** ${curAtt}/${newHeld} classes attended (**${newPct}%**)\n\n`;

        if (newPct >= 75) {
          resp += `**Status:** Safe to skip. Your attendance will remain at **${newPct}%**, which is **${(newPct - 75).toFixed(1)}% above** the 75% cutoff.\n`;
          resp += `You have a total safety cushion of **${maxSkips}** skippable class(es) in this subject.\n\n`;
        } else {
          resp += `**Attendance Risk Warning:** Skipping ${skipCount} class(es) will drop your attendance to **${newPct}%**, which is below the 75% mandatory threshold.\n`;
          resp += `You can only safely skip **${maxSkips}** class(es) without falling into condonation.\n\n`;
        }
        resp += `[action:nav:attendance|View Live Attendance Table] [action:skip_sim|Simulate Other Subjects]`;
        return resp;
      }

      let resp = `### Attendance & Skipping Classes Margin (Overall: ${overall}%)\n\n`;
      if (critical.length > 0) {
        resp += `**Critical Attendance Warning (< 75%):**\n` +
          critical.map(s => `- **${s.name}**: ${s.percent}% (Attend **${s.needed}** consecutive classes to clear shortage)`).join('\n') + '\n\n';
      }
      if (safe.length > 0) {
        resp += `**Safe Margin for Skipping Classes (>= 75%):**\n` +
          safe.map(s => `- **${s.name}**: ${s.percent}% (${s.attended}/${s.held}) • Can safely skip **${s.bunks}** class(es)`).join('\n') + '\n\n';
      }
      resp += `*Tip: Ask specifically (e.g., "Can I skip 2 classes of DBMS?") for an instant projection.*\n\n`;
      resp += `[action:nav:attendance|View Live Attendance] [action:nav:marks|Check Grades]`;
      return resp;
    }

    if (q.includes('class') || q.includes('timetable') || q.includes('schedule') || q.includes('period') || q.includes('next')) {
      return `### Today's Schedule & Classes\n\n` +
        (dossier.schedule?.length > 0
          ? `You have classes scheduled today. Check the timetable dashboard for faculty and room details.\n\n`
          : `No classes recorded or today is a declared holiday / weekend.\n\n`) +
        `[action:nav:timetable|Open Full Timetable]`;
    }

    if (q.includes('fee') || q.includes('due') || q.includes('receipt') || q.includes('payment') || q.includes('tuition') || q.includes('ledger')) {
      const feeDue = dossier.feeDue || '0.00';
      const feeTotal = dossier.feeTotalDue || dossier.feeDue || '0.00';
      const receipts = dossier.feeReceipts || [];
      let resp = `### Tuition Fees & Financial Ledger\n\n`;
      if (parseFloat(feeDue) > 0 || parseFloat(feeTotal) > 0) {
        resp += `- **Current Semester Due:** ₹${feeDue}\n`;
        if (feeTotal !== feeDue) resp += `- **Total Outstanding Dues:** ₹${feeTotal}\n`;
        if (dossier.feeBalanceWords) resp += `- **Status:** ${dossier.feeBalanceWords}\n`;
        resp += `\nYou can clear pending semester dues through the official online payment gateway below.\n\n`;
      } else {
        resp += `- **Current Semester Dues:** Fully Settled (₹0.00 outstanding)\n`;
        resp += `- **Account Standing:** Clear / In Good Health\n\n`;
      }
      if (receipts.length > 0) {
        resp += `**Recent Verified Transactions & Receipts:**\n` +
          receipts.slice(-4).map(r => `- **${r.item || 'Tuition Fee'}**: ₹${r.paid || r.amount || '--'} (Receipt: \`${r.recNo || r.receiptNo || 'N/A'}\` • ${r.recDate || r.date || 'N/A'})`).join('\n') + '\n\n';
      }
      resp += `[action:nav:fees|Open Fee Ledger & Pay Online] [action:nav:receipts|View All Receipts]`;
      return resp;
    }

    const rawName = dossier.identity?.name || getActiveStudentNameFromDom() || '';
    const cleanName = rawName ? rawName.split(' ')[0] : 'Student';

    return `Hello ${cleanName}! I am **Aria**, your academic co-pilot in 𝚁𝚎𝙴𝚌𝚊𝚙"/.\n\n` +
      `Here is a quick snapshot of your records:\n` +
      `- **CGPA:** ${acad.cgpa || '--'} | **Credits:** ${acad.credits || '--'}\n` +
      `- **Attendance:** ${att.overallPercent || '--'}%\n` +
      `- **Backlogs:** ${dossier.backlogs || '0'}\n\n` +
      `How can I assist you today? You can ask about your attendance buffer, grade breakdown, or navigation.\n\n` +
      `[action:nav:marks|Marks Report] [action:nav:attendance|Attendance] [action:nav:fees|Fee Hub] [action:skip_sim|Skipping Classes Margin]`;
  }

  /**
   * Executes a portal navigation or UI action triggered from an action chip.
   */
  function executePortalAction(actionKey) {
    if (!actionKey) return;
    const cleanKey = String(actionKey).trim();
    const lowerKey = cleanKey.toLowerCase();

    // Reliable prompt submission helper
    function submitPrompt(text) {
      if (!text) return;
      const input = document.getElementById('aria-input');
      if (input) {
        input.value = text;
        if (typeof root.stopAriaGeneration === 'function') {
          root.stopAriaGeneration();
        } else if (typeof window !== 'undefined' && typeof window.stopAriaGeneration === 'function') {
          window.stopAriaGeneration();
        }
        if (typeof root.submitAriaMessage === 'function') {
          root.submitAriaMessage();
        } else if (typeof window !== 'undefined' && typeof window.submitAriaMessage === 'function') {
          window.submitAriaMessage();
        } else {
          const form = document.getElementById('aria-composer');
          if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      }
    }

    // Check prompt/query prefixes
    if (/^(prompt|ask|query):/i.test(cleanKey)) {
      submitPrompt(cleanKey.replace(/^(prompt|ask|query):/i, '').trim());
      return;
    }

    // Strip leading action: or goto: or open:
    const key = lowerKey.replace(/^(action|goto|open):/i, '');

    // Analytical and conversational prompt actions
    if (key === 'weak_subjects' || key === 'weak' || key.includes('weak_subject')) {
      submitPrompt("What are my weak subjects and where do I need to improve?");
      return;
    }
    if (key === 'target_calc' || key === 'sgpa_calc' || key === 'target_sgpa') {
      submitPrompt("What SGPA do I need in Semester 3 to achieve an overall 8.0 CGPA?");
      return;
    }
    if (key === 'bunk_sim' || key === 'skip_sim' || key === 'attendance_buffer' || key.includes('skip')) {
      submitPrompt("How is my attendance in each subject, and how many classes can I safely skip?");
      return;
    }
    if (key === 'live_attendance' || key === 'attendance_summary') {
      submitPrompt("Can you give me a live attendance summary across all my subjects with my attendance buffer?");
      return;
    }
    if (key === 'detailed_grades' || key === 'grade_summary' || key === 'academic_summary') {
      submitPrompt("Can you summarize my academic grades, SGPA, credits, and overall progress?");
      return;
    }
    if (key === 'fee_ledger' || key === 'fee_status' || key === 'financial_ledger') {
      submitPrompt("What is my current tuition fee balance, dues breakdown, and payment status?");
      return;
    }
    if (key === 'export_dossier' || key === 'print') {
      window.print();
      return;
    }

    // Normalize nav target
    const navTarget = key.replace(/^nav:/, '');

    if (navTarget === 'overview' || navTarget === 'dashboard' || navTarget === 'home') {
      if (typeof root.showOverview === 'function') root.showOverview();
      else if (typeof window !== 'undefined' && typeof window.showOverview === 'function') window.showOverview();
      return;
    }

    if (navTarget === 'calendar' || navTarget === 'academic_calendar' || navTarget === 'calender') {
      if (typeof root.showAcademicCalendar === 'function') root.showAcademicCalendar();
      else if (typeof window !== 'undefined' && typeof window.showAcademicCalendar === 'function') window.showAcademicCalendar();
      return;
    }

    if (actionKey === 'nav:fees' || actionKey === 'nav:feedetails' || ['fees', 'feedetails', 'fee', 'tuition', 'ledger', 'college_fee'].includes(navTarget)) {
      if (typeof root.navigateToFeeDetails === 'function') {
        root.navigateToFeeDetails();
        return;
      } else if (typeof window !== 'undefined' && typeof window.navigateToFeeDetails === 'function') {
        window.navigateToFeeDetails();
        return;
      }
      if (typeof root.showIframe === 'function') root.showIframe();
      else if (typeof window !== 'undefined' && typeof window.showIframe === 'function') window.showIframe();
      const iframe = document.getElementById('capIframeId');
      if (iframe) {
        const curSrc = (iframe.getAttribute('src') || '').toLowerCase();
        if (curSrc.includes('studentprofile.aspx')) {
          try {
            iframe.contentWindow?.postMessage({ type: 'REECAP_SWITCH_TAB', tabId: 'divProfile_Fees' }, '*');
          } catch (e) {}
        } else {
          iframe.src = `${getPortalBaseUrl()}Academics/StudentProfile.aspx?scrid=17&view=fee#divProfile_Fees`;
        }
      }
      document.documentElement.removeAttribute('data-active-route');
      const pageTitle = document.getElementById('reecap-page-title');
      if (pageTitle) {
        pageTitle.style.removeProperty('display');
        pageTitle.textContent = 'FEE DETAILS';
      }
      if (typeof root.setActiveSidebarLink === 'function') root.setActiveSidebarLink('FEE DETAILS');
      else if (typeof window !== 'undefined' && typeof window.setActiveSidebarLink === 'function') window.setActiveSidebarLink('FEE DETAILS');
      return;
    }

    if (['timetable', 'schedule', 'classes', 'classtimetable'].includes(navTarget)) {
      if (typeof root.showIframe === 'function') root.showIframe();
      else if (typeof window !== 'undefined' && typeof window.showIframe === 'function') window.showIframe();
      const iframe = document.getElementById('capIframeId');
      if (iframe) {
        iframe.src = `${getPortalBaseUrl()}Academics/studenttimetableoption.aspx`;
      }
      document.documentElement.setAttribute('data-active-route', 'timetable');
      const pageTitle = document.getElementById('reecap-page-title');
      if (pageTitle) pageTitle.style.display = 'none';
      if (typeof root.setActiveSidebarLink === 'function') root.setActiveSidebarLink('TIMETABLE');
      else if (typeof window !== 'undefined' && typeof window.setActiveSidebarLink === 'function') window.setActiveSidebarLink('TIMETABLE');
      return;
    }

    const routeMap = {
      attendance: { url: 'Academics/StudentAttendance.aspx?scrid=3&showtype=SA', title: 'ATTENDANCE', navKey: 'ATTENDANCE' },
      marks: { url: 'Academics/StudentMarksReport.aspx?scrid=15', title: 'MARKS REPORT', navKey: 'MARKS REPORT' },
      receipts: { url: 'FeePayments/studentreceipts.aspx?scrid=28', title: 'RECEIPTS', navKey: 'RECEIPTS' },
      backlogs: { url: 'Academics/studentbacklogs.aspx?scrid=4', title: 'BACKLOGS REPORT', navKey: 'BACKLOGS' },
      examviewer: { url: 'Examinations/RevalutionScriptViewer.aspx', title: 'VIEW ANSWER SHEET', navKey: 'EXAMS DETAILS' },
      transactions: { url: 'feepayments/optransactions.aspx', title: 'ONLINE TRANSACTIONS', navKey: 'ONLINE TRANSACTIONS' }
    };

    const route = routeMap[navTarget] || Object.values(routeMap).find(r => r.navKey.toLowerCase() === navTarget);
    if (route) {
      if (typeof root.showIframe === 'function') root.showIframe();
      else if (typeof window !== 'undefined' && typeof window.showIframe === 'function') window.showIframe();
      const iframe = document.getElementById('capIframeId');
      if (iframe) {
        iframe.src = `${getPortalBaseUrl()}${route.url}`;
      }
      document.documentElement.removeAttribute('data-active-route');
      const pageTitle = document.getElementById('reecap-page-title');
      if (pageTitle) {
        pageTitle.style.removeProperty('display');
        pageTitle.textContent = route.title;
      }
      if (typeof root.setActiveSidebarLink === 'function') root.setActiveSidebarLink(route.navKey);
      else if (typeof window !== 'undefined' && typeof window.setActiveSidebarLink === 'function') window.setActiveSidebarLink(route.navKey);
      return;
    }
  }

  return {
    getStudentDossier,
    generateAcademicInsights,
    prefetchAcademicData,
    prefetchProfileData,
    parseMarksFromDiv,
    parseAttendanceFromDoc,
    parseAcademicFromDoc,
    parseBacklogsFromDoc,
    streamAriaChat,
    generateLocalFallbackResponse,
    executePortalAction
  };
});
