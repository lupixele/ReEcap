# ReEcap — Video Presentation & Mentor Review Script
**Project:** ReEcap: Modern Client-Side Workstation for Aditya University Student Portal  
**Team Members:** Gurala Ratan Teja (Lead / Architecture) & Yerru Lochan (Co-Presenter / Modules)  
**Mentor:** M. Ashok  
**Target Duration:** ~6 to 8 minutes  
**Format:** Practical rehearsal script & technical cheat sheet (Simple, concise, conversational)

---

## 0. Quick Technical Cheat Sheet for Ratan (What You MUST Know Cold)

Before recording or speaking to mentor M. Ashok, have these 5 core architectural facts clear in your head:

1. **What is ReEcap's "Backend"?**
   - ReEcap does **NOT** run a heavy custom server or external database.
   - It is a **pure client-side Manifest V3 browser extension** coupled with a lightweight **Cloudflare Edge Worker gateway** (`aria.lupixele.online`).
   - Why this is an advantage: Zero hosting cost, zero university database modifications, zero server maintenance, and zero storage of student credentials on external databases.

2. **How does it avoid breaking university ASP.NET WebForms?**
   - The legacy university portal relies on heavy ASP.NET server-side state (`__VIEWSTATE`, `__EVENTVALIDATION`, table postbacks).
   - If you inject raw DOM wrappers recklessly, ASP.NET postbacks fail.
   - **ReEcap's solution:** It loads the authentic portal inside an isolated, flush-docked `<iframe>` (`capIframeId`), injects CSS/DOM decorators around it, and forwards scroll events. All original forms, buttons, and postbacks trigger 100% natively without interference.

3. **How does the Alert Interceptor work?**
   - Legacy portal uses blocking JavaScript `alert("message")` which freezes the browser tab.
   - ReEcap injects a lightweight script into the **main world** (`world: "MAIN"` in `manifest.json`) that overrides `window.alert`, suppressing spam popups and routing them to non-blocking modern UI toast notifications.

4. **How does Aria AI calculate attendance & bunks?**
   - It doesn't guess with LLM hallucination.
   - It uses a deterministic **closed-form formula** client-side:
     $$\text{Safe Bunks} = \left\lfloor \frac{\text{Attended} - 0.75 \times \text{Held}}{0.75} \right\rfloor$$
     $$\text{Classes Needed (if shortage)} = \lceil 3 \times \text{Held} - 4 \times \text{Attended} \rceil$$
   - Only sanitized academic summary stats (CGPA, attendance %, schedule) are passed to Aria's edge LLM via Cloudflare Worker.

5. **Scope & License:**
   - **Scope:** Strictly designed and optimized for **Students only** (the teacher/employee administrative portal has completely different workflows and is intentionally untouched).
   - **License:** Governed by the **ReEcap Institutional License (RIL v1.0)** — authorized strictly for college faculty, management, and students.

---

## 1. Flow & Roles Overview

| Segment | Speaker | What's on Screen | Core Objective |
| :--- | :--- | :--- | :--- |
| **1. Hook & GitHub Setup** (~1.5 min) | **Ratan** | GitHub Repo & Chrome Extensions Tab | Introduce problem, showcase clean repo, demo instant 10-second installation. |
| **2. Architecture ("Backend")** (~1.5 min) | **Ratan** | Architecture Diagram & Code Structure | Explain MV3, alert interception, ASP.NET postback safety, and Aria edge worker. |
| **3. Showcase Part 1** (~1.5 min) | **Ratan** | Live Browser: Login, Dashboard & Aria | Demo glassmorphism login, nightTab overview dashboard, live SVG gauge, Aria copilot. |
| **4. Showcase Part 2** (~2 min) | **Lochan** | Live Browser: Sidebar, Timetable, Fees | Demo 4-group accordion navigation, calendar roadmap, solid timetable shading, fee ledger. |
| **5. Testing & Conclusion** (~1 min) | **Ratan & Lochan** | Test terminal & Closing screen | Highlight automated test suites (Vitest/Puppeteer), RIL v1.0 license, thank mentor. |

---

## 2. Full Video Script

### Act 1: Introduction & Installation (Ratan)
**Screen:** Start on GitHub repository (`https://github.com/lupixele/ReEcap`).

> **[Ratan Speaking]**  
> "Good morning/afternoon, Sir and evaluators. I am Ratan Teja, and with my project partner Yerru Lochan, we present **ReEcap** — a modern client-side workstation designed specifically for the students of Aditya University.
> 
> As students, we interact with the university portal every day for attendance, timetables, and internal marks. However, the current portal runs on legacy 2000s ASP.NET WebForms. It suffers from 97-pixel wide empty margins, clunky tables, non-responsive layouts on laptops, and jarring modal popups. 
> 
> Instead of proposing an expensive, multi-year backend rewrite that the university would have to re-host, we built **ReEcap** as a high-performance **Manifest V3 browser extension**. It completely modernizes the student experience directly in the browser without touching a single server line on the university backend.
> 
> Let me quickly show how simple installation is."

**Screen Action:** Open Chrome -> Navigate to `chrome://extensions/` -> Toggle on **Developer Mode** -> Click **Load unpacked** -> Select the `extension/` folder.

> **[Ratan Speaking]**  
> "As you can see, in less than 5 seconds, the extension is loaded. No external software, no database servers, and zero setup dependencies for the student. It works out-of-the-box on any Chromium browser."

---

### Act 2: Architecture & Technical "Backend" Explanation (Ratan)
**Screen:** Switch to the Architecture Diagram (`docs/architecture.png`) or display the project files in VS Code.

> **[Ratan Speaking]**  
> "Before we show the interface, I want to briefly explain the engineering architecture — what serves as the 'backend' of ReEcap.
> 
> Many people assume reskinning a website is just changing some CSS, but for an enterprise ASP.NET application, that breaks the portal immediately. Here is how our architecture solves this:
> 
> 1. **Isolated Frame & Postback Integrity:** We load the official portal routes inside an isolated, flush-docked iframe. This guarantees that ASP.NET `__VIEWSTATE` and encrypted session cookies are never tampered with. Every submission, attendance query, and fee receipt triggers natively.
> 2. **Main-World Alert Interception:** Legacy ASP.NET pages throw blocking modal `window.alert()` dialogs that freeze tab interaction. Using Manifest V3's main-world execution, we intercept these alerts and convert them into sleek, non-blocking toast notifications.
> 3. **Mathematical Token Engine:** Instead of hardcoded colors, we built an HSL token engine adapted from nightTab with 14 luminance levels and automatic sRGB contrast calculation, allowing 45 distinct themes with perfect WCAG readability.
> 4. **Aria Edge AI Gateway:** For our academic copilot, Aria, we deployed a Cloudflare Edge Worker gateway (`aria.lupixele.online`). Attendance calculations — like how many classes you can safely miss or need to attend for 75% — are computed client-side using exact math before querying the model, ensuring zero AI hallucinations and complete privacy."

---

### Act 3: Live Showcase Part 1 — Authentication, Dashboard & Aria (Ratan)
**Screen:** Open the live portal at `studentlogin.aspx`.

> **[Ratan Speaking]**  
> "Now let's see ReEcap in action.
> 
> First, the **Login Experience**: The legacy page had scattered banners and offset input fields. ReEcap replaces this with a centered glassmorphic card. Students have 1-click role toggles, automatic credential retention, and seamless Cloudflare Turnstile bot verification.
> 
> Let's log in to the student workstation."

**Screen Action:** Click login -> Land on the unified Student Overview Dashboard.

> **[Ratan Speaking]**  
> "This is the **Student Overview Dashboard**. 
> Instead of an empty screen with raw links:
> - On the top left, we have a **Live Circular SVG Attendance Gauge** that shows overall percentage instantly.
> - Next to it, an **Academic Standing Card** verifying 0 backlogs and current CGPA.
> - A **Fee Balance Chip** that tells the student immediately if any tuition dues remain.
> - And a **Today's Class Timeline** with a live countdown to the next scheduled period.
> 
> If the student wants instant answers, they can open **Aria**, our academic co-pilot on the right."

**Screen Action:** Click the Aria floating button on the bottom right -> The copilot sidebar smoothly slides out -> Click the prompt chip *"How is my attendance buffer?"*.

> **[Ratan Speaking]**  
> "Aria reads the student's local session dossier, detects subject percentages, and tells them their exact bunk buffer or classes needed. It also provides 1-click action buttons to navigate directly to detailed marks or timetable.
> 
> Now, I'll hand over to Lochan to showcase the navigation overhaul, timetable enhancements, and fee ledger."

---

### Act 4: Live Showcase Part 2 — Portal Modules (Lochan)
*(Lochan takes over speaking. Keep delivery calm, natural, and clear).*

**Screen Action:** Point cursor to the left sidebar.

> **[Lochan Speaking]**  
> "Thank you, Ratan. Hello Sir.
> 
> In the original portal, students were overwhelmed by over 40 unordered raw links scattered in a confusing tree. 
> 
> In ReEcap, I worked on the **Sidebar Navigation Overhaul**. We organized all student workflows into **4 clean accordion categories**:
> 1. **Academics** — for Attendance, Day-wise Attendance, and Timetable.
> 2. **Examination** — for Marks Report, Mid Marks, and Script Viewer.
> 3. **Finance** — for Online Payments and Fee Receipts.
> 4. **Services** — for Transport, Hostel, and Feedback.
> 
> The sidebar is collapsible to give students a full-width workstation, and it highlights the active page automatically."

**Screen Action:** Click on **Academics -> Academic Calendar**.

> **[Lochan Speaking]**  
> "Next is the **Academic Calendar & Roadmap**. 
> Originally, this was an unstyled text dump. We transformed it into a full 8-semester milestone roadmap. Students can instantly filter events using the live search bar, and see color-coded status badges showing which semesters and exams are Completed, In Progress, or Scheduled."

**Screen Action:** Click on **Academics -> Timetable**.

> **[Lochan Speaking]**  
> "Here is the **Timetable and Class Schedule**. 
> We added solid theme shading to highlight multi-period lab blocks and theory subjects cleanly. 
> Also, because the timetable runs inside an inner frame, normal mouse scrolling used to get trapped. We implemented **iframe wheel forwarding**, so scrolling with the mouse wheel flows smoothly across the entire page without getting stuck."

**Screen Action:** Click on **Finance -> Fee Receipt**.

> **[Lochan Speaking]**  
> "Finally, the **Fee Receipt & Ledger**: 
> All payment histories and transaction tables are now cleanly formatted with clear receipt IDs, payment modes, and balance highlights, allowing students to verify their fee records in seconds.
> 
> Back to Ratan for the conclusion."

---

### Act 5: Testing, License & Wrap Up (Ratan)
**Screen:** Switch briefly to terminal / test runner output or the project documentation summary.

> **[Ratan Speaking]**  
> "Thank you, Lochan.
> 
> To ensure production reliability, we didn't just build the UI — we wrote automated test suites. We have automated unit tests using **Vitest** covering our token math and alert interceptor, plus integration tests verifying navigation across authenticated routes.
> 
> Regarding intellectual property and distribution, ReEcap is released under the **ReEcap Institutional License (RIL v1.0)**. This specifically restricts permitted use exclusively to Aditya University faculty, management, and students.
> 
> In summary, ReEcap gives our university a modern, high-speed, beautiful portal experience today, with zero server migration costs and zero backend downtime.
> 
> We want to express our sincere gratitude to our mentor, **Mr. M. Ashok**, for his continuous guidance throughout this project.
> 
> Thank you, Sir! We are now open for any questions."

---

## 3. Mentor Defense: Expected Questions & Confident Answers

Evaluators and Mentor M. Ashok will likely test your technical depth. Here are the exact answers to have ready:

### Q1: "Did you make any changes to the college database or backend server code?"
- **Answer (Ratan):** *"No, Sir. ReEcap operates entirely client-side as a Manifest V3 browser extension. It reads and styles the DOM directly inside the student's browser. The university's ASP.NET backend, database schemas, and IIS server remain 100% untouched and unmodified."*

### Q2: "Is there any security risk of student passwords or data leaking to third parties?"
- **Answer (Ratan):** *"None at all, Sir. Credentials are submitted directly to the college's official `studentlogin.aspx` over HTTPS just like normal. We do not maintain any intermediate database. The only external API is our Cloudflare edge worker for Aria AI, which receives only sanitized numerical stats (attendance %, CGPA) to answer queries. No passwords, session cookies, or personal phone numbers ever touch the AI."*

### Q3: "What if the university updates or renames an element on the portal page?"
- **Answer (Lochan or Ratan):** *"We built defensive query selectors and graceful fallbacks. If an element cannot be found or fails to decorate, ReEcap safely leaves the standard ASP.NET table visible inside the iframe. The student is never locked out of their data."*

### Q4: "Why did you build this as an extension instead of building a full new website?"
- **Answer (Ratan):** *"Because of authentication and privacy, Sir. If we made a separate web app, students would have to trust our third-party server with their university passwords, and our server would have to scrape the college portal, which violates security boundaries. An extension runs in the student's own browser, keeping their login strictly between their machine and the university."*

### Q5: "What exactly was the contribution split between the two of you?"
- **Answer:**
  - **Ratan:** *"I focused on system architecture, Manifest V3 service worker configuration, the mathematical HSL token engine, Aria AI copilot integration, alert interception, and automated test suites."*
  - **Lochan:** *"I focused on the sidebar navigation reorganization into the 4 accordion categories, DOM styling enhancements, iframe mouse wheel forwarding, fee receipt formatting, and manual testing across live pages."*

---

## 4. Rehearsal Checklist (Before Recording)

- [ ] Clear browser cache or ensure extension loads cleanly on `chrome://extensions`.
- [ ] Test the demo login account or test credentials beforehand.
- [ ] Have the GitHub repo tab and architecture diagram open in background tabs.
- [ ] Test screen sharing and verify both Ratan and Lochan's microphones are clear.
- [ ] Keep phone on silent and record in a quiet room.
- [ ] Relax and speak naturally — keep it conversational and confident!
