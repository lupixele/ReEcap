// ReEcap — shared/theme.js
// Single source of truth for theme resolution, migration, family identity, and
// sidebar active-state matching. Loaded by content.js, decorators.js, and popup.
//
// Exposes:
//   window.__reecap_theme.resolveTheme(family, mode)
//   window.__reecap_theme.migrateThemeStorage(data)
//   window.__reecap_theme.FAMILY_META          // { id: { label, preview, accentVar, description } }
//   window.__reecap_theme.PATH_MATCH_TABLE     // Map of data-page keys -> [route substrings]
//   window.__reecap_theme.matchActivePage(iframePath)

(function (global) {
  'use strict';

  // ─── Theme Resolution ─────────────────────────────────────────────────────

  function resolveTheme(family, mode) {
    if (family === 'amoled')  return 'amoled';
    if (family === 'original') return mode || 'light';
    return `${family}-${mode || 'light'}`;
  }

  // ─── Legacy → New Storage Migration ───────────────────────────────────────

  const LEGACY_MAP = {
    'light':      { family: 'original',   mode: 'light' },
    'dark':       { family: 'original',   mode: 'dark'  },
    'cappuccino': { family: 'cappuccino', mode: 'light' },
    'amoled':     { family: 'amoled',     mode: 'dark'  },
    'evergreen':  { family: 'evergreen',  mode: 'light' },
    'midnight':   { family: 'midnight',   mode: 'dark'  },
    'rosewood':   { family: 'rosewood',   mode: 'light' },
  };

  function migrateThemeStorage(data) {
    if (data && data.themeFamily) {
      return { family: data.themeFamily, mode: data.themeMode || 'light' };
    }
    const mapped = (data && LEGACY_MAP[data.theme]) || LEGACY_MAP.light;
    return { family: mapped.family, mode: mapped.mode };
  }

  // ─── Family Identity ──────────────────────────────────────────────────────
  // preview colors are the bare hex of each family's accent. The popup uses
  // these to render a 6px color dot beside each family button so users can
  // scan the picker visually rather than reading six identical labels.

  const FAMILY_META = {
    original: {
      label: 'Original',
      preview: '#C1432E',
      accentVar: '--accent',
      description: 'Warm cream with a muted red accent (legacy light/dark).',
    },
    cappuccino: {
      label: 'Cappuccino',
      preview: '#935729',
      accentVar: '--accent',
      description: 'Coffee-toned warmth with a brown accent.',
    },
    evergreen: {
      label: 'Evergreen',
      preview: '#2D7A4F',
      accentVar: '--accent',
      description: 'Sage and forest botanical palette.',
    },
    midnight: {
      label: 'Midnight',
      preview: '#2B6CE0',
      accentVar: '--accent',
      description: 'Deep navy late-night study mode.',
    },
    rosewood: {
      label: 'Rosewood',
      preview: '#9E4B5E',
      accentVar: '--accent',
      description: 'Soft dusty rose and mauve.',
    },
    amoled: {
      label: 'AMOLED',
      preview: '#E8705A',
      accentVar: '--accent',
      description: 'True-black OLED with a dramatic coral glow.',
    },
  };

  // ─── Sidebar Active-State Match Table ─────────────────────────────────────
  // The portal mixes aspx filenames: many pages have the legacy "student"
  // prefix (e.g. `StudentBacklogs.aspx`, `studentcourseregistration.aspx`)
  // and several have `AttendanceReport.aspx`-style names. To match these
  // robustly we list each route's tails and additionally store the bare
  // keyword (e.g. "backlogs") so we can fall back to a basename-contains
  // match. End-with-a-tail still wins because it's the most specific signal.

  const ROUTE_TAILS = {
    // ─ Academics ─
    'attendance.aspx':       ['/academics/studentattendance.aspx', '/academics/studentattendancereport.aspx', '/attendance'],
    'timetable.aspx':        ['/academics/timetablereport.aspx', '/timetablereport'],
    'choose-timetable.aspx': ['/academics/studenttimetableoption.aspx', '/studenttimetableoption'],
    'course-registration.aspx':['/academics/studentcourseregistration.aspx', '/studentcourseregistration', '/courseregistration'],
    'marks.aspx':            ['/academics/studentmarksreport.aspx', '/studentmarksreport', '/marks'],
    'lesson-plan.aspx':      ['/academics/lpreport.aspx', '/lpreport', '/lessonplan'],
    'exams-details.aspx':    ['/examinations/studentexamtimetable.aspx', '/studentexamtimetable', '/examsdetails'],
    'hallticket.aspx':       ['/examinations/studenthallticket.aspx', '/studenthallticket', '/hallticket'],
    'view-answer-sheet.aspx':['/examinations/revalutionscriptviewer.aspx', '/revalutionscriptviewer', '/viewanswersheet'],
    'backlogs.aspx':         ['/academics/studentbacklogs.aspx', '/studentbacklogs', '/backlogs'],
    // ─ Finance ─
    'fee-details.aspx':      ['/feepayments/studentpayments.aspx', '/studentpayments'],
    'online-payment.aspx':   ['/feepayments/studentfeereceipt.aspx', '/studentfeereceipt'],
    'college-fee.aspx':      ['/feepayments/studentfeereceipt.aspx', '/feepayments/collegefee.aspx', '/collegefee', '/studentfeereceipt'],
    'exam-fee.aspx':         ['/studentexamfeeonline.aspx', '/studentexamfeeonline', '/examfee'],
    're-valuation.aspx':     ['/examinations/revaluationregistrationstudent.aspx', '/revaluationregistrationstudent', '/revaluation'],
    'online-transactions.aspx':['/feepayments/optransactions.aspx', '/optransactions', '/onlinetransactions'],
    'receipts.aspx':         ['/feepayments/studentreceipts.aspx', '/studentreceipts', '/receipts'],
    // ─ Account ─
    'profile.aspx':          ['/academics/studentprofile.aspx', '/studentprofile', '/profile'],
    'hostel-room-booking.aspx':['/hostel/hosteladmission.aspx', '/hostel/hostelbooking.aspx', '/hosteladmission', '/hostelbooking'],
    'library-books.aspx':    ['/library/studentsbooks.aspx', '/studentsbooks', '/librarybooks'],
    'book-search.aspx':      ['/library/booksearch1.aspx', '/booksearch1', '/booksearch'],
  };

  function _basename(pathLower) {
    const i = pathLower.lastIndexOf('/');
    return i >= 0 ? pathLower.slice(i + 1) : pathLower;
  }

  function matchActivePage(iframePath) {
    if (!iframePath) return null;
    const lower = iframePath.toLowerCase();
    const base = _basename(lower);
    let bestKey = null;
    let bestLen = -1;

    for (const [key, tails] of Object.entries(ROUTE_TAILS)) {
      for (const tail of tails) {
        const t = tail.toLowerCase();
        // Skip tails that are ambiguous (e.g. "/profile" matches many routes).
        // Long tails are unambiguous; short ones are matched on the basename
        // only so they don't bleed across sibling routes.
        const isLongTail = t.length >= 14;
        const candidateEndsWith = isLongTail && lower.endsWith(t);
        const candidateBasenameContains = !isLongTail && base.includes(t.replace(/^\//, ''));
        if (candidateEndsWith || candidateBasenameContains) {
          if (t.length > bestLen) { bestKey = key; bestLen = t.length; }
        }
      }
    }
    return bestKey;
  }

  function routeKeyForHref(href) {
    try {
      if (typeof href !== 'string' || !href) return null;
      const path = new URL(href, 'http://placeholder/').pathname;
      return matchActivePage(path);
    } catch (e) { return null; }
  }

  // ─── Export ───────────────────────────────────────────────────────────────

  const api = {
    resolveTheme,
    migrateThemeStorage,
    FAMILY_META,
    ROUTE_TAILS,
    matchActivePage,
    routeKeyForHref,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.__reecap_theme = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
