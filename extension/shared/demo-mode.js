// ReEcap Showcase Demo Mode — Local Modular Simulation Engine
// Provides high-fidelity mock data (90.4% attendance, sample exam answer sheets, 8.78 CGPA)
// for mentor project showcases during vacation / semester break.
// Completely inert when showcase demo mode toggle is OFF.

(function (global) {
  'use strict';

  let demoActive = false;

  const DEMO_ATTENDANCE = {
    held: 312,
    attended: 282,
    percent: 90.38,
    lastUpdated: new Date().toISOString(),
    attendanceSubjects: [
      { name: 'Data Structures & Algorithms (CS301)', held: 48, attended: 45, percent: 93.8 },
      { name: 'Operating Systems (CS302)', held: 52, attended: 47, percent: 90.4 },
      { name: 'Database Management Systems (CS303)', held: 50, attended: 46, percent: 92.0 },
      { name: 'Computer Networks (CS304)', held: 46, attended: 41, percent: 89.1 },
      { name: 'Discrete Mathematics (BS301)', held: 44, attended: 39, percent: 88.6 },
      { name: 'Algorithms & Computing Laboratory (CS305)', held: 72, attended: 64, percent: 88.9 }
    ]
  };

  const DEMO_DOSSIER = {
    identity: {
      name: '',
      rollNo: '22A91A0501',
      branch: 'Computer Science and Engineering',
      course: 'B.Tech',
      semester: 'III'
    },
    academic: {
      cgpa: '8.78',
      summary: 'Academic Standing: Excellent (Distinction). Strong performance across Data Structures, Algorithms, and Systems courses.'
    },
    attendance: {
      overallPercent: 90.4,
      held: 312,
      attended: 282
    },
    backlogs: 0
  };

  function initStorage() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['reecapDemoMode'], (res) => {
          demoActive = Boolean(res?.reecapDemoMode);
          if (demoActive) applyDemoHooks();
        });
      }
    } catch (e) {}
  }

  function applyDemoHooks() {
    if (!demoActive) return;

    // 1. Dashboard Overview Attendance Card update
    simulateOverviewCard();
    observeOverviewMetrics();

    // 2. Attendance page simulation if current URL is attendance
    const path = (window.location.pathname || '').toLowerCase();
    if (path.includes('studentattendance') || path.includes('attendancereport') || path.includes('attendanceregister')) {
      simulateAttendancePage();
    }

    // 3. Exam viewer simulation if current URL is exam script or revaluation script
    if (path.includes('examscriptviewer.aspx') || path.includes('revalutionscriptviewer.aspx') || path.includes('scriptviewer.aspx')) {
      simulateExamScriptViewer();
    }
  }

  function simulateOverviewCard() {
    const attCard = document.querySelector('.overview-metric-card.metric-card-attendance');
    if (!attCard) return;

    const ringRadius = 21;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const percent = DEMO_ATTENDANCE.percent;
    const ringOffset = ringCircumference - (percent / 100) * ringCircumference;
    const ringColor = 'var(--success)';

    const ringFg = attCard.querySelector('.ring-fg');
    if (ringFg) {
      ringFg.setAttribute('stroke', ringColor);
      ringFg.style.stroke = ringColor;
      ringFg.setAttribute('stroke-dasharray', String(ringCircumference));
      ringFg.setAttribute('stroke-dashoffset', String(ringOffset));
    }
    const ringText = attCard.querySelector('.metric-ring-text');
    if (ringText) {
      ringText.textContent = percent.toFixed(1) + '%';
      ringText.style.color = ringColor;
    }
    const mainVal = attCard.querySelector('.metric-main-val');
    if (mainVal) {
      mainVal.textContent = `${DEMO_ATTENDANCE.attended} / ${DEMO_ATTENDANCE.held} Classes`;
    }
    const subCaption = attCard.querySelector('.metric-sub-caption');
    if (subCaption) {
      subCaption.textContent = 'Demo Showcase (Active)';
    }

    attCard.style.cursor = 'pointer';
    attCard.title = 'View Detailed Attendance Breakdown';
  }

  let overviewObserver = null;
  function observeOverviewMetrics() {
    if (overviewObserver) return;
    const checkAndUpdate = () => {
      const card = document.querySelector('.overview-metric-card.metric-card-attendance');
      if (card) {
        simulateOverviewCard();
      }
    };

    checkAndUpdate();
    if (document.body) {
      overviewObserver = new MutationObserver(checkAndUpdate);
      overviewObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  function simulateAttendancePage() {
    // Clean up any error recovery cards that may have mounted on network failure
    const errCard = document.getElementById('reecap-error-recovery-card') || document.querySelector('.reecap-error-recovery-container');
    if (errCard) errCard.remove();

    Array.from(document.body.children).forEach(c => {
      if (c.tagName !== 'SCRIPT' && c.tagName !== 'STYLE' && c.tagName !== 'LINK') {
        c.style.removeProperty('display');
      }
    });

    if (typeof window.__reecap_render_attendance === 'function') {
      window.__reecap_render_attendance(DEMO_ATTENDANCE, true);
      return;
    }

    if (typeof window.redesignAttendancePage === 'function') {
      window.redesignAttendancePage();
      return;
    }

    // Direct fallback if standalone container is already in DOM
    let wrapper = document.querySelector('.reecap-attendance-standalone');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'reecap-attendance-standalone';
      wrapper.style.padding = '24px';
      wrapper.style.fontFamily = 'var(--font-sans), system-ui, sans-serif';
      document.body.appendChild(wrapper);
    }
    renderDemoAttendanceHtml(wrapper);
  }

  function renderDemoAttendanceHtml(wrapper) {
    if (!wrapper) return;
    const { held, attended, percent, attendanceSubjects } = DEMO_ATTENDANCE;
    const ringRadius = 40;
    const ringCircumf = 2 * Math.PI * ringRadius;
    const offset = ringCircumf - (percent / 100) * ringCircumf;
    const ringColor = "var(--success)";

    let html = `
      <div class="overview-section-metrics" style="margin-bottom: 24px; display: flex; flex-direction: column;">
        <div class="ring-card" style="flex: 1; min-width: 280px; flex-direction: row; gap: 24px; text-align: left; justify-content: flex-start; padding: 24px 32px;">
          <div class="ring-wrap" style="width: 96px; height: 96px; flex-shrink: 0;">
            <svg width="96" height="96">
              <circle class="ring-bg" cx="48" cy="48" r="${ringRadius}" stroke-width="8"></circle>
              <circle class="ring-fg" cx="48" cy="48" r="${ringRadius}" stroke-width="8" stroke="${ringColor}" stroke-dasharray="${ringCircumf}" stroke-dashoffset="${offset}"></circle>
            </svg>
            <div class="ring-center">
              <div class="ring-value" style="font-size: 15px; font-weight: 700; color: ${ringColor}">${percent.toFixed(1)}%</div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <h3 style="font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 700; margin: 0; color: var(--text-primary);">Present Semester Attendance</h3>
            <div style="font-size: 14px; color: var(--text-secondary); font-weight: 500;">
              <span class="mono" style="font-weight: 600; color: var(--text-primary);">${attended}</span> attended out of <span class="mono" style="font-weight: 600; color: var(--text-primary);">${held}</span> total lectures held
            </div>
            <div style="font-size: 12px; color: var(--text-faint); margin-top: 4px;">Status: Satisfactory Standing (Demo Showcase Simulation)</div>
          </div>
        </div>
      </div>

      <div class="overview-card" style="margin-bottom: 24px;">
        <div class="overview-card-header">
          <span class="overview-card-title">Subject Attendance Record</span>
          <span class="overview-card-subtitle">Demo Showcase Session</span>
        </div>
        <div class="reecap-table-wrap">
          <table class="reecap-data-table reecap-attendance-table">
            <thead>
              <tr>
                <th>Subject Name</th>
                <th style="text-align: right;">Held</th>
                <th style="text-align: right;">Attended</th>
                <th style="text-align: right;">Percentage</th>
                <th style="text-align: center; width: 140px;">75% Target Status</th>
                <th style="width: 140px; text-align: left;">Progress</th>
              </tr>
            </thead>
            <tbody>
    `;

    attendanceSubjects.forEach(s => {
      const sAttend = s.attended;
      const sHeld = s.held;
      const sPct = s.percent;
      const sColor = "var(--success)";
      const skippableClasses = Math.max(0, Math.floor((4/3) * sAttend - sHeld));
      const targetStatusStr = `<div class="bunkable-tag">Can skip next <b>${skippableClasses}</b></div>`;

      html += `
        <tr>
          <td style="font-weight: 500;">${s.name}</td>
          <td class="mono" style="text-align: right;">${sHeld}</td>
          <td class="mono" style="text-align: right;">${sAttend}</td>
          <td class="mono" style="text-align: right; color: ${sColor}; font-weight: 600;">${sPct.toFixed(1)}%</td>
          <td style="text-align: center;">${targetStatusStr}</td>
          <td>
            <div class="reecap-prog-track" style="height: 6px; background: var(--surface-secondary, rgba(255,255,255,0.06)); border-radius: 99px; overflow: hidden;">
              <div class="reecap-prog-fill" style="width: ${Math.min(100, sPct)}%; background: ${sColor}; height: 100%; border-radius: 99px;"></div>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    wrapper.innerHTML = html;
  }

  function createExamCanvasPage(pageNum, title, contentDrawer) {
    const canvas = document.createElement('canvas');
    canvas.width = 840;
    canvas.height = 1180;
    canvas.className = 'page-canvas';
    canvas.style.cssText = 'width: 100%; max-width: 840px; margin: 16px auto; display: block; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.18); background: #ffffff;';

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Background paper
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Margin rule
    ctx.strokeStyle = '#e2d9cf';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(90, 0);
    ctx.lineTo(90, canvas.height);
    ctx.stroke();

    // Horizontal notebook lines
    ctx.strokeStyle = '#ede6dc';
    ctx.lineWidth = 0.8;
    for (let y = 140; y < canvas.height - 60; y += 32) {
      ctx.beginPath();
      ctx.moveTo(90, y);
      ctx.lineTo(canvas.width - 40, y);
      ctx.stroke();
    }

    // Call custom drawer
    if (typeof contentDrawer === 'function') {
      contentDrawer(ctx, canvas.width, canvas.height);
    }

    // Footer page number
    ctx.fillStyle = '#64748b';
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText(`Page ${pageNum} of 3  •  Aditya University Autonomous Examination Booklet`, 220, canvas.height - 24);

    return canvas;
  }

  function simulateExamScriptViewer() {
    // Clean up any error recovery cards
    const errCard = document.getElementById('reecap-error-recovery-card') || document.querySelector('.reecap-error-recovery-container') || document.getElementById('reecap-shell-error-container');
    if (errCard) errCard.remove();

    Array.from(document.body.children).forEach(c => {
      if (c.tagName !== 'SCRIPT' && c.tagName !== 'STYLE' && c.tagName !== 'LINK') {
        c.style.removeProperty('display');
      }
    });

    let viewer = document.getElementById('pdf_viewer');
    let btnContainer = document.querySelector('.button-container');

    if (!btnContainer) {
      btnContainer = document.createElement('div');
      btnContainer.className = 'button-container';
      btnContainer.style.cssText = 'padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; background: var(--surface-card); border-bottom: 1px solid var(--border);';
      document.body.prepend(btnContainer);
    }

    // Subject tabs container
    let scriptTabs = document.getElementById('div_scripts');
    if (!scriptTabs) {
      scriptTabs = document.createElement('div');
      scriptTabs.id = 'div_scripts';
      scriptTabs.style.cssText = 'display: flex; gap: 8px; align-items: center;';
      scriptTabs.innerHTML = `
        <a class="btn btn-sm btn-outline-secondary" style="padding: 4px 10px; font-size: 12px; border-radius: 6px;">CS301 - DSA</a>
        <a class="btn btn-sm btn-primary active" style="padding: 4px 10px; font-size: 12px; border-radius: 6px; font-weight: 600;">CS305 - DAA</a>
        <a class="btn btn-sm btn-outline-secondary" style="padding: 4px 10px; font-size: 12px; border-radius: 6px;">CS302 - OS</a>
      `;
      btnContainer.prepend(scriptTabs);
    }

    if (!viewer) {
      viewer = document.createElement('div');
      viewer.id = 'pdf_viewer';
      viewer.style.cssText = 'padding: 24px; display: flex; flex-direction: column; align-items: center; width: 100%; box-sizing: border-box;';
      document.body.appendChild(viewer);
    }

    if (viewer.querySelectorAll('canvas').length > 0) return;

    // Page 1: Cover & Part A
    const page1 = createExamCanvasPage(1, 'Cover', (ctx) => {
      // Header Box
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 2;
      ctx.strokeRect(110, 40, 680, 160);

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ADITYA UNIVERSITY (AUTONOMOUS)', 450, 75);

      ctx.font = '15px system-ui, sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText('B.Tech III Semester End Examinations (Regular)', 450, 102);

      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('Subject: DESIGN AND ANALYSIS OF ALGORITHMS (CS305)', 450, 130);

      ctx.font = '14px system-ui, sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('Max Marks: 70   |   Time: 3 Hours   |   Regulation: AR23', 450, 155);

      // Student Score Badge
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(620, 50, 150, 138);

      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('TOTAL MARKS', 695, 74);
      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.fillText('64', 695, 118);
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText('/ 70  (Grade O)', 695, 150);

      // Question 1
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('Q1. (a) Define Asymptotic Notations: Big-O, Big-Omega, Big-Theta.', 110, 240);

      ctx.fillStyle = '#1e293b';
      ctx.font = '14px "Comic Sans MS", "Segoe Print", cursive, sans-serif';
      ctx.fillText('Ans: Asymptotic notations describe the limiting behavior of an algorithm execution time.', 110, 272);
      ctx.fillText('1. Big-O (O): Upper bound. f(n) = O(g(n)) if 0 <= f(n) <= c * g(n) for all n >= n0.', 110, 304);
      ctx.fillText('2. Big-Omega (Ω): Lower bound. f(n) = Ω(g(n)) if 0 <= c * g(n) <= f(n) for all n >= n0.', 110, 336);
      ctx.fillText('3. Big-Theta (Θ): Tight bound. 0 <= c1*g(n) <= f(n) <= c2*g(n) for all n >= n0.', 110, 368);

      // Evaluator Tick & Score
      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('✓ Correct', 680, 330);
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText('[ 5 / 5 ]', 680, 360);

      // Question 2
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('Q1. (b) Solve Recurrence Relation T(n) = 2T(n/2) + O(n) using Master Theorem.', 110, 432);

      ctx.fillStyle = '#1e293b';
      ctx.font = '14px "Comic Sans MS", "Segoe Print", cursive, sans-serif';
      ctx.fillText('Ans: Here a = 2, b = 2, f(n) = n.', 110, 464);
      ctx.fillText('Calculate n^(log_b(a)) = n^(log_2(2)) = n^1 = n.', 110, 496);
      ctx.fillText('Comparing f(n) with n^(log_b(a)): f(n) = Θ(n^(log_b(a))).', 110, 528);
      ctx.fillText('This falls under Master Theorem Case 2: T(n) = Θ(n * log(n)).', 110, 560);

      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('✓ Clean proof', 680, 520);
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText('[ 5 / 5 ]', 680, 550);
    });

    // Page 2: Dijkstra's Algorithm
    const page2 = createExamCanvasPage(2, 'Algorithms', (ctx) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('Q2. State Dijkstra’s Single-Source Shortest Path Algorithm on Directed Graph.', 110, 160);

      ctx.fillStyle = '#1e293b';
      ctx.font = '14px "Comic Sans MS", "Segoe Print", cursive, sans-serif';
      ctx.fillText('1. Maintain a min-priority queue Q of all unvisited vertices.', 110, 192);
      ctx.fillText('2. Initialize dist[source] = 0 and dist[v] = ∞ for all other vertices.', 110, 224);
      ctx.fillText('3. While Q is not empty, extract vertex u with minimum dist[u].', 110, 256);
      ctx.fillText('4. For each neighbor v of u, relax edge (u, v):', 110, 288);
      ctx.fillText('     if dist[u] + weight(u, v) < dist[v] then dist[v] = dist[u] + weight(u, v).', 110, 320);

      // Graph Diagram
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      const nodes = [
        { label: 'A (0)', x: 180, y: 440 },
        { label: 'B (4)', x: 320, y: 390 },
        { label: 'C (2)', x: 320, y: 490 },
        { label: 'D (6)', x: 460, y: 440 }
      ];

      nodes.forEach(n => {
        ctx.fillStyle = '#eff6ff';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 26, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e3a8a';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + 4);
      });

      // Arrows
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      function drawEdge(x1, y1, x2, y2, w) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.fillStyle = '#b91c1c';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillText(w, (x1 + x2) / 2, (y1 + y2) / 2 - 6);
      }
      drawEdge(206, 440, 294, 396, '4');
      drawEdge(206, 440, 294, 484, '2');
      drawEdge(346, 396, 434, 434, '5');
      drawEdge(346, 484, 434, 446, '4');

      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('✓ Full credit', 680, 440);
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText('[ 10 / 10 ]', 680, 470);
    });

    // Page 3: 0/1 Knapsack DP
    const page3 = createExamCanvasPage(3, 'Dynamic Programming', (ctx) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('Q3. Solve 0/1 Knapsack Problem with Capacity W = 6, weights [1, 2, 3], values [10, 15, 40].', 110, 160);

      ctx.fillStyle = '#1e293b';
      ctx.font = '14px "Comic Sans MS", "Segoe Print", cursive, sans-serif';
      ctx.fillText('Recurrence: DP[i][w] = max(DP[i-1][w], DP[i-1][w - wt[i]] + val[i]).', 110, 192);

      // Table
      const startX = 140;
      const startY = 240;
      const cellW = 65;
      const cellH = 34;
      const headers = ['w=0', 'w=1', 'w=2', 'w=3', 'w=4', 'w=5', 'w=6'];
      const rows = [
        ['i=0', '0', '0', '0', '0', '0', '0', '0'],
        ['i=1', '0', '10', '10', '10', '10', '10', '10'],
        ['i=2', '0', '10', '15', '25', '25', '25', '25'],
        ['i=3', '0', '10', '15', '40', '50', '55', '65']
      ];

      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(startX, startY, cellW * 8, cellH * 5);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;

      for (let r = 0; r <= 4; r++) {
        ctx.beginPath();
        ctx.moveTo(startX, startY + r * cellH);
        ctx.lineTo(startX + cellW * 8, startY + r * cellH);
        ctx.stroke();
      }
      for (let c = 0; c <= 8; c++) {
        ctx.beginPath();
        ctx.moveTo(startX + c * cellW, startY);
        ctx.lineTo(startX + c * cellW, startY + cellH * 4);
        ctx.stroke();
      }

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ['', ...headers].forEach((h, idx) => {
        ctx.fillText(h, startX + idx * cellW + cellW / 2, startY - 8);
      });

      rows.forEach((row, rIdx) => {
        row.forEach((val, cIdx) => {
          ctx.fillStyle = (rIdx === 3 && cIdx === 7) ? '#16a34a' : '#0f172a';
          if (rIdx === 3 && cIdx === 7) ctx.font = 'bold 14px system-ui, sans-serif';
          else ctx.font = '13px monospace';
          ctx.fillText(val, startX + cIdx * cellW + cellW / 2, startY + rIdx * cellH + cellH / 2 + 5);
        });
      });

      ctx.textAlign = 'left';
      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('Optimal Max Value = 65 (Items: 2 and 3 selected)', startX, startY + cellH * 4 + 32);

      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('✓ Excellent DP Table', 640, 320);
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText('[ 10 / 10 ]', 640, 350);
    });

    viewer.appendChild(page1);
    viewer.appendChild(page2);
    viewer.appendChild(page3);

    // Provide "Save as PDF" button
    if (!btnContainer.querySelector('#reecap-save-pdf')) {
      const btn = document.createElement('a');
      btn.id = 'reecap-save-pdf';
      btn.className = 'btn btn-save-pdf';
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="vertical-align: -2px; margin-right: 4px;">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>Save as PDF`;
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', () => {
        if (typeof window.saveExamAsPdf === 'function') {
          window.saveExamAsPdf();
        } else if (typeof window.injectSavePdfButton === 'function') {
          window.saveExamAsPdf();
        }
      });
      btnContainer.appendChild(btn);
    }

    // Call observeExamViewer hooks if available
    try {
      if (typeof window.injectSavePdfButton === 'function') {
        window.injectSavePdfButton(btnContainer);
      }
      if (typeof window.updateSavePdfState === 'function') {
        window.updateSavePdfState();
      }
    } catch (e) {}

    // Tell parent to set title and enlarge iframe height for booklet viewing
    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage({ type: 'REECAP_SET_TITLE', title: 'VIEW ANSWER SHEET (EXT)' }, '*');
      window.parent.postMessage({ type: 'REECAP_RESIZE', height: 3800 }, '*');
    }
  }

  // Public API
  global.__reecap_demo_mode = {
    isActive: () => demoActive,
    getDemoAttendance: () => DEMO_ATTENDANCE,
    getDemoDossier: () => DEMO_DOSSIER,
    simulateAttendancePage,
    simulateExamScriptViewer,
    simulateOverviewCard
  };

  // Real-time synchronization across all tabs and frames via chrome.storage.onChanged
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.reecapDemoMode !== undefined) {
        demoActive = Boolean(changes.reecapDemoMode.newValue);
        if (demoActive) {
          applyDemoHooks();
        } else {
          window.location.reload();
        }
      }
    });
  }

  // Listen for direct broadcast toggle from popup
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === 'REECAP_SET_DEMO_MODE') {
        demoActive = Boolean(msg.enabled);
        if (demoActive) {
          applyDemoHooks();
        } else {
          window.location.reload();
        }
      }
    });
  }

  initStorage();

})(typeof window !== 'undefined' ? window : globalThis);
