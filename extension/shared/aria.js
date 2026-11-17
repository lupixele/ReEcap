// ReEcap — aria.js
// Autonomous Aria AI academic assistant engine & portal intelligence module.
// Ingests student grades, attendance, timetable, and bio-data, connects to Aria's edge LLM,
// and provides in-portal academic suggestions and deep-link navigation.

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.__reecap_aria = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ARIA_CHAT_ENDPOINT = 'https://aria.lupixele.online/api/chat';
  const ARIA_DEFAULT_MODEL = 'lupixele/aura-super';

  /**
   * Safe extraction of text from nodes
   */
  function cleanText(txt) {
    return (txt || '').replace(/\s+/g, ' ').trim();
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

  /**
   * Collects all student profile, attendance, timetable, and academic records from chrome.storage.local.
   */
  function getStudentDossier() {
    return new Promise((resolve) => {
      chrome.storage.local.get([
        'reecapIdentity',
        'reecapProfileData',
        'reecapTimetable',
        'reecapAcademicData'
      ], (data) => {
        const id = data.reecapIdentity || {};
        const profile = data.reecapProfileData || {};
        const timetable = data.reecapTimetable || {};
        const academic = data.reecapAcademicData || {};

        const rollNo = id.RollNo || id.rollNo || '';
        const name = id.Name || id.name || '';
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

        resolve({
          identity: { rollNo, name, course, branch, semester: sem },
          attendance: {
            overallPercent: (profile.percent !== undefined && profile.percent !== null && profile.percent !== '') ? profile.percent : '--',
            attended: (profile.attended !== undefined && profile.attended !== null && profile.attended !== '') ? profile.attended : '--',
            held: (profile.held !== undefined && profile.held !== null && profile.held !== '') ? profile.held : '--',
            subjects: subjectsAttendance
          },
          academic: {
            cgpa: academic.overallStats?.cgpa || profile.cgpa || profile.academicSummary?.cgpa || '--',
            credits: academic.overallStats?.credits || profile.academicSummary?.credits || '--',
            result: academic.overallStats?.result || profile.academicSummary?.result || '--',
            passed: academic.overallStats?.passed || profile.academicSummary?.passed || '--',
            failed: academic.overallStats?.failed || profile.academicSummary?.failed || '--',
            semesters: academic.semesterGrades || []
          },
          schedule: todaySchedule,
          backlogs: profile.backlogsText || '0',
          feeDue: profile.feeCurrentSem || profile.feeDue || '0'
        });
      });
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
      const topBunks = safeSubjects.slice(0, 2).map(s => `${s.name}: ${s.bunks} bunk(s)`).join(', ');
      suggestions.push({
        type: 'success',
        category: 'Attendance',
        title: 'Attendance In Safe Zone',
        message: `Your overall attendance is **${overallAtt || '75+'}%**. Available bunk buffer: ${topBunks}.`
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
    // Also trigger profile/attendance prefetch in parallel
    prefetchProfileData();

    return new Promise((resolve) => {
      chrome.storage.local.get(['reecapAcademicData'], async (data) => {
        if (data.reecapAcademicData && data.reecapAcademicData.lastUpdated && (Date.now() - data.reecapAcademicData.lastUpdated < 1000 * 60 * 60 * 12)) {
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
            resp = await fetch('Academics/StudentMarksReport.aspx?scrid=15', { credentials: 'same-origin' });
          } catch (e) {}

          if (!resp || !resp.ok) {
            try {
              resp = await fetch('studentmarksreport.aspx', { credentials: 'same-origin' });
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
          chrome.storage.local.set({ reecapAcademicData: parsed });
          resolve(parsed);
        } catch (e) {
          console.warn('ReEcap: Background academic prefetch skipped:', e);
          resolve(null);
        }
      });
    });
  }

  /**
   * Pre-fetches student profile and attendance telemetry in the background.
   */
  async function prefetchProfileData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['reecapProfileData', 'reecapIdentity'], async (data) => {
        if (data.reecapProfileData && data.reecapProfileData.percent !== undefined && data.reecapProfileData.attendanceSubjects?.length) {
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
            resp = await fetch('Academics/StudentProfile.aspx?scrid=17', { credentials: 'same-origin' });
          } catch (e) {}

          if (!resp || !resp.ok) {
            try {
              resp = await fetch('studentprofile.aspx', { credentials: 'same-origin' });
            } catch (e) {}
          }

          if (!resp || !resp.ok) {
            resolve(null);
            return;
          }

          const pageHtml = await resp.text();
          const tknMatch = pageHtml.match(/_tkn\s*=\s*['"]([a-zA-Z0-9-]+)['"]/);
          const rollMatch = pageHtml.match(/id=['"][^'"]*txtRollNo['"][^>]*value=['"]([^'"]+)['"]/) ||
                            pageHtml.match(/value=['"](\d{2}[A-Za-z0-9]{3,8})['"]/);

          const rollNo = rollMatch ? rollMatch[1] : (data.reecapIdentity?.rollNo || data.reecapIdentity?.RollNo);
          const token = tknMatch ? tknMatch[1] : '';

          if (!rollNo) {
            resolve(null);
            return;
          }

          let profileHtml = '';
          try {
            const postResp = await fetch('Academics/studentprofile.aspx/ShowStudentProfileNew', {
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
            }
          } catch (e) {}

          if (!profileHtml) {
            try {
              const postResp2 = await fetch('studentprofile.aspx/ShowStudentProfileNew', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json; charset=utf-8',
                  'X-Auth-Token': token
                },
                body: JSON.stringify({ RollNo: rollNo, isImageDisplay: false }),
                credentials: 'same-origin'
              });
              if (postResp2.ok) {
                const json2 = await postResp2.json();
                profileHtml = json2.d || json2;
              }
            } catch (e2) {}
          }

          if (!profileHtml || typeof profileHtml !== 'string') {
            resolve(null);
            return;
          }

          const doc = new DOMParser().parseFromString(profileHtml, 'text/html');
          const att = parseAttendanceFromDoc(doc);
          const acad = parseAcademicFromDoc(doc);
          const backlogsText = parseBacklogsFromDoc(doc);

          const profileData = {
            held: att.held,
            attended: att.attended,
            percent: att.percent,
            attendanceSubjects: att.subjects,
            backlogsText: backlogsText,
            cgpa: acad.cgpa,
            academicSummary: acad.academicSummary,
            lastUpdated: Date.now()
          };

          chrome.storage.local.set({ reecapProfileData: profileData });

          if (acad.academicSummary && acad.cgpa !== '--') {
            chrome.storage.local.get(['reecapAcademicData'], (existing) => {
              const cur = existing?.reecapAcademicData || {};
              const updated = {
                ...cur,
                overallStats: { ...(cur.overallStats || {}), ...acad.academicSummary },
                lastUpdated: Date.now()
              };
              chrome.storage.local.set({ reecapAcademicData: updated });
            });
          }

          if (typeof window.__reecap_refresh_aria === 'function') {
            window.__reecap_refresh_aria();
          }

          resolve(profileData);
        } catch (err) {
          console.warn('ReEcap: Background profile prefetch failed:', err);
          resolve(null);
        }
      });
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

  function parseAcademicFromDoc(doc) {
    let cgpa = '--';
    let academicSummary = null;
    const pastPane = doc.getElementById('divProfile_Past') || doc.getElementById('divProfile_PastSem');
    if (pastPane) {
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
    return { cgpa, academicSummary };
  }

  function parseBacklogsFromDoc(doc) {
    let backlogsText = '0';
    const backlogsDiv = doc.getElementById('divProfile_Backlogs');
    if (backlogsDiv && backlogsDiv.textContent.trim()) {
      backlogsText = backlogsDiv.textContent.trim();
    }
    return backlogsText;
  }

  /**
   * Parses structured grade data from divMarks element
   */
  function parseMarksFromDiv(divMarks) {
    const overallStats = { cgpa: '--', credits: '--', result: '--', passed: '--', failed: '--' };
    const semesterGrades = [];

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

    // Semester tables
    let currentSemester = null;
    Array.from(divMarks.children).forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const text = cleanText(node.textContent).toUpperCase();
      if (text.includes('PREVIOUS SEMESTERS ATTENDANCE') || text.includes('PREVIOUS SEMESTERS INTERNAL')) {
        currentSemester = null;
        return;
      }

      if (text.match(/^\s*([IVX]+)\s+SEMESTER\s*$/)) {
        currentSemester = text.replace(/\s+/g, ' ').trim();
        return;
      }

      if (node.tagName === 'TABLE' && currentSemester) {
        const rows = Array.from(node.querySelectorAll('tr'));
        if (rows.length > 1) {
          const courses = [];
          rows.slice(1).forEach(r => {
            const cols = Array.from(r.querySelectorAll('td, th')).map(c => cleanText(c.textContent));
            if (cols.length >= 4) {
              courses.push({
                sno: cols[0] || '',
                code: cols[1] || '',
                name: cols[2] || '',
                grade: cols[3] || '',
                credits: cols[4] || '',
                status: cols[5] || (cols[3] === 'F' ? 'FAIL' : 'PASS')
              });
            }
          });
          if (courses.length > 0) {
            semesterGrades.push({ semester: currentSemester, courses });
          }
        }
      }
    });

    return { overallStats, semesterGrades, lastUpdated: Date.now() };
  }

  /**
   * Constructs the specialized system prompt embedding the student's live records.
   */
  function buildSystemPrompt(dossier) {
    const id = dossier.identity || {};
    const att = dossier.attendance || {};
    const acad = dossier.academic || {};
    const subList = att.subjects?.map(s => `- ${s.name}: ${s.percent}% (Held: ${s.held}, Attended: ${s.attended}, Bunks: ${s.bunks}, Needed: ${s.needed})`).join('\n') || 'None recorded';
    
    let gradesSummary = 'No detailed semester grades recorded yet.';
    if (acad.semesters && acad.semesters.length > 0) {
      gradesSummary = acad.semesters.map(sem => {
        const cList = sem.courses.map(c => `  * ${c.name} (${c.code}): Grade ${c.grade}, Credits ${c.credits}`).join('\n');
        return `Semester: ${sem.semester}\n${cList}`;
      }).join('\n\n');
    }

    return `You are Aria, an intelligent academic co-pilot and portal assistant embedded directly into ReEcap for Aditya University students.
You are built by lupel (Gurala Ratan Teja) to guide students through their academics, analyze their performance, and help them navigate their student portal.

[CURRENT STUDENT DOSSIER]:
- Name: ${id.name || 'Student'}
- Roll Number: ${id.rollNo || 'Not specified'}
- Branch / Course: ${id.branch || id.course || 'Aditya University'}
- Current Semester: ${id.semester || 'Current'}
- Overall CGPA: ${acad.cgpa} (Credits: ${acad.credits}, Passed: ${acad.passed}, Failed: ${acad.failed})
- Overall Attendance: ${att.overallPercent}% (${att.attended}/${att.held} classes)
- Active Backlogs: ${dossier.backlogs}
- Semester Fee Balance: ₹${dossier.feeDue}

[SUBJECT-WISE ATTENDANCE BREAKDOWN]:
${subList}

[ACADEMIC GRADES & PERFORMANCE RECORD]:
${gradesSummary}

[TODAY'S TIMETABLE SCHEDULE]:
${dossier.schedule.length > 0 ? JSON.stringify(dossier.schedule) : 'No timetable schedule cached for today.'}

[YOUR CORE ROLES]:
1. ACADEMIC ADVISOR: Analyze grades, identify weak subjects (C, D, F grades), evaluate internal test patterns, and suggest practical study strategies.
2. ATTENDANCE STRATEGIST: Calculate precise bunk allowances or mandatory attendance targets using the 75% formula.
3. PORTAL NAVIGATOR: Guide the student to the exact sections of ReEcap.

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
   * Streams a query to Aria AI edge endpoint with automatic fallback.
   */
  async function streamAriaChat({ messages, dossier, onChunk, onDone, onError }) {
    const systemPrompt = buildSystemPrompt(dossier);
    const payloadMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    try {
      const response = await fetch(ARIA_CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: payloadMessages,
          model: ARIA_DEFAULT_MODEL,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Aria API returned ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullText = '';

      while (true) {
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

    if (q.includes('cgpa') || q.includes('grade') || q.includes('mark') || q.includes('performance')) {
      const cgpa = acad.cgpa || '--';
      const credits = acad.credits || '--';
      const passed = acad.passed || '--';
      const failed = acad.failed || '0';
      return `### 📊 Academic Performance Overview\n\n` +
        `- **Current CGPA:** **${cgpa}**\n` +
        `- **Total Credits Earned:** ${credits}\n` +
        `- **Courses Passed:** ${passed} | **Failed / Arrears:** ${failed}\n\n` +
        (parseFloat(cgpa) >= 7.5
          ? `🌟 **Excellent standing!** You are well within the First Class with Distinction criteria. Keep focusing on core domain subjects.\n\n`
          : `💡 **Target:** Aim to boost internal assignment and lab viva scores by 3–5 marks to improve your semester grade point average (SGPA).\n\n`) +
        `[action:nav:marks|Open Detailed Marks Report]`;
    }

    if (q.includes('attendance') || q.includes('bunk') || q.includes('shortage')) {
      const overall = att.overallPercent || '--';
      const critical = att.subjects?.filter(s => s.status === 'critical') || [];
      const safe = att.subjects?.filter(s => s.status === 'safe' && s.bunks > 0) || [];

      let resp = `### 🏖️ Attendance Analysis (Overall: ${overall}%)\n\n`;
      if (critical.length > 0) {
        resp += `⚠️ **Critical Subjects (< 75%):**\n` +
          critical.map(s => `- **${s.name}**: ${s.percent}% (Attend **${s.needed}** more classes consecutively)`).join('\n') + '\n\n';
      }
      if (safe.length > 0) {
        resp += `✅ **Safe Cushion:**\n` +
          safe.slice(0, 3).map(s => `- **${s.name}**: ${s.bunks} class(es) bunk buffer remaining`).join('\n') + '\n\n';
      }
      resp += `[action:nav:attendance|View Live Attendance Table]`;
      return resp;
    }

    if (q.includes('class') || q.includes('timetable') || q.includes('schedule') || q.includes('period') || q.includes('next')) {
      return `### 🕒 Today's Schedule & Classes\n\n` +
        (dossier.schedule?.length > 0
          ? `You have classes scheduled today. Check the timetable dashboard for faculty and room details.\n\n`
          : `No classes recorded or today is a declared holiday / weekend.\n\n`) +
        `[action:nav:timetable|Open Full Timetable]`;
    }

    if (q.includes('fee') || q.includes('due') || q.includes('payment')) {
      return `### 💳 Tuition & Semester Fees\n\n` +
        `Your currently recorded semester fee balance is: **₹${dossier.feeDue || '0.00'}**.\n\n` +
        `[action:nav:fees|Go to Online Fee Receipt & Payment]`;
    }

    return `Hello ${dossier.identity?.name || 'Student'}! I am **Aria**, your academic co-pilot in ReEcap.\n\n` +
      `Here is a quick snapshot of your records:\n` +
      `- **CGPA:** ${acad.cgpa || '--'} | **Credits:** ${acad.credits || '--'}\n` +
      `- **Attendance:** ${att.overallPercent || '--'}%\n` +
      `- **Backlogs:** ${dossier.backlogs || '0'}\n\n` +
      `How can I assist you today? You can ask about your attendance buffer, grade breakdown, or navigation.\n\n` +
      `[action:nav:marks|Marks Report] [action:nav:attendance|Attendance] [action:nav:timetable|Timetable]`;
  }

  /**
   * Executes a portal navigation or UI action triggered from an action chip.
   */
  function executePortalAction(actionKey) {
    if (!actionKey) return;
    const [domain, verb, target] = actionKey.split(':');

    if (domain === 'nav') {
      const iframe = document.getElementById('capIframeId');
      const overview = document.getElementById('reecap-overview');
      const pageTitle = document.getElementById('reecap-page-title');

      const routeMap = {
        attendance: { url: 'Academics/StudentAttendance.aspx?scrid=3&showtype=SA', title: 'ATTENDANCE' },
        marks: { url: 'Academics/StudentMarksReport.aspx?scrid=15', title: 'MARKS REPORT' },
        timetable: { url: 'Academics/TimeTableReport.aspx?scrid=18', title: 'TIME TABLE' },
        fees: { url: 'FeePayments/studentpayments.aspx?scrid=11', title: 'FEE DETAILS' },
        examviewer: { url: 'Examinations/RevalutionScriptViewer.aspx', title: 'VIEW ANSWER SHEET' }
      };

      if (verb === 'overview') {
        if (typeof root.showOverview === 'function') root.showOverview();
        return;
      }

      const route = routeMap[verb];
      if (route && iframe) {
        if (typeof root.showIframe === 'function') {
          root.showIframe();
        } else {
          if (overview) overview.style.setProperty('display', 'none', 'important');
          iframe.style.removeProperty('display');
          document.documentElement.setAttribute('data-overview-active', 'false');
        }
        if (pageTitle) pageTitle.textContent = route.title;
        iframe.src = route.url;

        // Sync sidebar active class
        const links = document.querySelectorAll('a.reecap-sidebar-link');
        links.forEach(l => {
          const href = (l.getAttribute('href') || '').toLowerCase();
          l.classList.toggle('active', href.includes(route.url.toLowerCase()));
        });
      }
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
    executePortalAction
  };
});
