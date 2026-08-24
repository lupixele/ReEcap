# Graph Report - ReEcap  (2026-08-19)

## Corpus Check
- 13 files · ~34,264 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 136 nodes · 199 edges · 26 communities (16 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bca59017`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Chrome Extension Manifest
- buildProfilePanesRedesign
- Content Script Injection
- decorators.js
- Overview & Status Strip
- Popup Configuration
- Popup Logic
- Layout & Navigation
- Theme Resolution
- Architecture Overview
- Timetable Decoration
- Python Local Proxy
- Iframe Wrapper
- Icon 128px
- Icon 16px
- Icon 32px
- Icon 48px
- Icon 64px
- Icon SVG
- Popup Markup
- buildSidebar
- initDecorators
- buildOverviewPage
- buildTimetableDashboard
- rebuildMainLayout

## God Nodes (most connected - your core abstractions)
1. `initDecorators()` - 10 edges
2. `buildProfilePanesRedesign()` - 9 edges
3. `hideLegacyChildren()` - 8 edges
4. `buildProfileDashboard()` - 7 edges
5. `rebuildPresentSemTab()` - 6 edges
6. `rebuildFeeDetailsTab()` - 6 edges
7. `buildSidebar()` - 6 edges
8. `rebuildMainLayout()` - 6 edges
9. `buildOverviewPage()` - 6 edges
10. `icons` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Ambient Glow Stage` --conceptually_related_to--> `ReEcap`  [EXTRACTED]
  context.md → Readme.md
- `Theme System` --conceptually_related_to--> `ReEcap`  [EXTRACTED]
  context.md → Readme.md

## Import Cycles
- None detected.

## Communities (26 total, 10 thin omitted)

### Community 0 - "Chrome Extension Manifest"
Cohesion: 0.11
Nodes (17): content_scripts, description, host_permissions, icons, 128, 16, 32, 48 (+9 more)

### Community 1 - "buildProfilePanesRedesign"
Cohesion: 0.21
Nodes (16): buildBioDataRedesign(), buildProfileDashboard(), buildProfilePanesRedesign(), buildProfileTabs(), extractActiveSemesterLabel(), extractAttendanceProfileData(), extractPresentTabSupplementalData(), hideLegacyChildren() (+8 more)

### Community 2 - "Content Script Injection"
Cohesion: 0.33
Nodes (9): applyStoredTheme(), checkIframeUrl(), ensureSkipLink(), injectStyle(), injectStylesheet(), migrateThemeStorage(), removeStyle(), syncSidebarActiveState() (+1 more)

### Community 3 - "decorators.js"
Cohesion: 0.36
Nodes (7): buildMarksPageUI(), getAttendanceColor(), redesignMarksPage(), renderAttendanceBlock(), renderAttendanceContent(), renderInternalBlock(), renderTranscriptBlock()

### Community 4 - "Overview & Status Strip"
Cohesion: 0.33
Nodes (5): File Structure, Goal, Knowledge Sources, Metadata, ReEcap Project Index

### Community 5 - "Popup Configuration"
Cohesion: 0.22
Nodes (9): action, default_icon, default_popup, default_title, 128, 16, 32, 48 (+1 more)

### Community 6 - "Popup Logic"
Cohesion: 0.42
Nodes (8): announce(), applyTheme(), getActivePortalTab(), persist(), sendMessageToActivePortal(), STORAGE_DEFAULTS, updateEnabledUI(), updateThemeUI()

### Community 7 - "Layout & Navigation"
Cohesion: 0.33
Nodes (5): Current State, Last Updated, Next Steps, Open Questions / Blockers, Recent Decisions

### Community 8 - "Theme Resolution"
Cohesion: 0.47
Nodes (3): _basename(), matchActivePage(), routeKeyForHref()

### Community 9 - "Architecture Overview"
Cohesion: 0.50
Nodes (4): Ambient Glow Stage, Design Rules, Theme System, ReEcap

### Community 20 - "buildSidebar"
Cohesion: 0.40
Nodes (5): buildSidebar(), closeResponsiveNavigation(), renderQuickLinksCard(), showIframe(), showStudentsDirectory()

### Community 21 - "initDecorators"
Cohesion: 0.29
Nodes (7): buildOnlinePaymentUI(), initDecorators(), observeProfileDashboard(), redesignAttendancePage(), redesignLoginPage(), redesignOnlinePaymentPage(), renderYearPanel()

### Community 22 - "buildOverviewPage"
Cohesion: 0.40
Nodes (6): buildOverviewPage(), initStatusStrip(), parseTimeRange(), prefetchTimetableData(), renderScheduleCard(), updateStatusStrip()

### Community 23 - "buildTimetableDashboard"
Cohesion: 0.67
Nodes (4): buildTimetableDashboard(), escapeAttr(), observeTimetable(), renderTimetableLegend()

### Community 24 - "rebuildMainLayout"
Cohesion: 0.33
Nodes (6): formatCurrencyAmount(), initResponsiveNavigation(), rebuildMainLayout(), renderDashboardCards(), showOverview(), updateOverviewCards()

## Knowledge Gaps
- **42 isolated node(s):** `THEME_STORAGE_DEFAULTS`, `manifest_version`, `name`, `version`, `description` (+37 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `action` connect `Popup Configuration` to `Chrome Extension Manifest`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `THEME_STORAGE_DEFAULTS`, `manifest_version`, `name` to the rest of the system?**
  _42 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Chrome Extension Manifest` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._