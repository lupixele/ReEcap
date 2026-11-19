import matplotlib.pyplot as plt
import matplotlib.patches as patches

def create_architecture_diagram():
    plt.rcParams['font.sans-serif'] = ['Segoe UI', 'Segoe UI Symbol', 'DejaVu Sans', 'Arial']
    fig, ax = plt.subplots(figsize=(10.5, 6.5), dpi=300)
    ax.set_facecolor('#ffffff')
    fig.patch.set_facecolor('#ffffff')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Main Title Banner
    banner = patches.FancyBboxPatch((5, 91), 90, 7, boxstyle='round,pad=0.5,rounding_size=1.2',
                                    facecolor='#0f172a', edgecolor='none')
    ax.add_patch(banner)
    ax.text(50, 94.5, 'ReEcap — High-Level Client-Side System Architecture',
            color='#ffffff', fontsize=13.5, fontweight='bold', ha='center', va='center')

    # Left Box: University Portal Backend
    box_portal = patches.FancyBboxPatch((4, 34), 26, 53, boxstyle='round,pad=0.5,rounding_size=1.2',
                                       facecolor='#f0f9ff', edgecolor='#0284c7', linewidth=1.5)
    ax.add_patch(box_portal)
    ax.text(17, 83.5, 'Aditya University Portal', color='#0369a1', fontsize=10.5, fontweight='bold', ha='center', va='center')
    ax.text(17, 80.5, '(Native WebForms Platform)', color='#0284c7', fontsize=8, fontstyle='italic', ha='center', va='center')

    portal_items = [
        ('• info.aec.edu.in/aus/', False),
        ('• IIS 10.0 / ASP.NET WebForms', False),
        ('• Form State Integrity:', True),
        ('   - __VIEWSTATE', False),
        ('   - __EVENTVALIDATION', False),
        ('   - AJAX UpdatePanels', False),
        ('• Native Portal Routes:', True),
        ('   - StudentMaster.aspx', False),
        ('   - StudentProfile.aspx', False),
        ('   - studentreceipts.aspx', False),
        ('   - studentbacklogs.aspx', False),
        ('• HTTP 401 Restricted Endpoints', False),
        ('  (Exam details IIS access blocks)', False)
    ]
    y = 76
    for item, is_bold in portal_items:
        sz = 8.0 if not item.startswith('   -') else 7.5
        clr = '#0369a1' if is_bold else '#0f172a'
        ax.text(6, y, item, color=clr, fontsize=sz, fontweight='bold' if is_bold else 'normal', va='center')
        y -= 3.2

    # Center Box: ReEcap Extension Engine
    box_engine = patches.FancyBboxPatch((34, 25), 32, 62, boxstyle='round,pad=0.5,rounding_size=1.2',
                                       facecolor='#faf5ff', edgecolor='#7c3aed', linewidth=1.5)
    ax.add_patch(box_engine)
    ax.text(50, 83.5, 'ReEcap Extension Engine', color='#6d28d9', fontsize=10.5, fontweight='bold', ha='center', va='center')
    ax.text(50, 80.5, '(Manifest V3 • Client-Side Only)', color='#7c3aed', fontsize=8, fontstyle='italic', ha='center', va='center')

    engine_items = [
        ('1. document_start Scripts:', True),
        ('   • theme.js (45 Presets, 14-Shade Math)', False),
        ('   • aria.js (In-Memory Dossier, KaTeX)', False),
        ('   • content.js (CSS Token Injection)', False),
        ('   • decorators.js (DOM Re-architecture)', False),
        ('2. Interception & Sanitization:', True),
        ('   • Main-World Alert Interceptor', False),
        ('     (Suppresses raw 401 XHTML modals)', False),
        ('   • True Content Height Engine', False),
        ('     (Eliminates blank scroll ratcheting)', False),
        ('   • Receipts Cyan Style Sanitizer', False),
        ('   • Tooltip Collision Boundaries', False),
        ('3. State & Sync Architecture:', True),
        ('   • chrome.storage.local (Canonical)', False),
        ('   • postMessage (Cross-frame event relay)', False)
    ]
    y = 76
    for item, is_bold in engine_items:
        sz = 8.0 if is_bold else 7.2
        clr = '#581c87' if is_bold else '#1e1b4b'
        indent = 35.5 if is_bold else (37.5 if not item.startswith('     (') else 39.5)
        ax.text(indent, y, item, color=clr, fontsize=sz, fontweight='bold' if is_bold else 'normal', va='center')
        y -= 2.9

    # Right Box: Modernized Viewport
    box_ui = patches.FancyBboxPatch((70, 34), 26, 53, boxstyle='round,pad=0.5,rounding_size=1.2',
                                   facecolor='#f0fdf4', edgecolor='#059669', linewidth=1.5)
    ax.add_patch(box_ui)
    ax.text(83, 83.5, 'Modernized Student UI', color='#047857', fontsize=10.5, fontweight='bold', ha='center', va='center')
    ax.text(83, 80.5, '(nightTab Design System)', color='#059669', fontsize=8, fontstyle='italic', ha='center', va='center')

    ui_items = [
        ('• Pinned Masthead (Header):', True),
        ('   - Brand: "ReEcap"/', False),
        ('   - Dynamic Title Case Greeting', False),
        ('• Independent Dual-Pane View:', True),
        ('   - Isolated Sidebar Scroll', False),
        ('   - Isolated Content Scroll', False),
        ('   - Child Iframe Wheel Relay', False),
        ('• Accordion Navigation (Zero Dup):', True),
        ('   - Academics, Finance,', False),
        ('     Profile, Account', False),
        ('• Dedicated Fee-Only View', False),
        ('• Standalone Backlogs View', False),
        ('• In-UI 401 Recovery Hero Cards', False),
        ('• 8-Semester Calendar Hub', False)
    ]
    y = 76
    for item, is_bold in ui_items:
        sz = 8.0 if is_bold else 7.5
        clr = '#065f46' if is_bold else '#0f172a'
        ax.text(72, y, item, color=clr, fontsize=sz, fontweight='bold' if is_bold else 'normal', va='center')
        y -= 2.95

    # Bottom Left: Security & Privacy Guarantee
    box_sec = patches.FancyBboxPatch((4, 4), 45, 17, boxstyle='round,pad=0.5,rounding_size=1.2',
                                    facecolor='#fffbeb', edgecolor='#d97706', linewidth=1.5)
    ax.add_patch(box_sec)
    ax.text(26.5, 18.2, 'Zero-Server Privacy & Data Integrity Guarantee', color='#b45309', fontsize=9.2, fontweight='bold', ha='center')
    sec_text = [
        '• No external database, tracking server, or credential relays',
        '• Student credentials, grades and fee ledgers never leave the browser',
        '• Zero hardcoded personal identifiers (runtime extraction from DOM)',
        '• Complete preservation of native ASP.NET postbacks and validations'
    ]
    y = 14.5
    for st in sec_text:
        ax.text(6, y, st, color='#78350f', fontsize=7.4, va='center')
        y -= 2.8

    # Bottom Right: Aria AI Edge Assistant
    box_aria = patches.FancyBboxPatch((51, 4), 45, 17, boxstyle='round,pad=0.5,rounding_size=1.2',
                                     facecolor='#f8fafc', edgecolor='#64748b', linewidth=1.5)
    ax.add_patch(box_aria)
    ax.text(73.5, 18.2, 'Aria AI Academic Copilot Edge Architecture', color='#334155', fontsize=9.2, fontweight='bold', ha='center')
    aria_text = [
        '• Cloudflare Edge Worker gateway (aria.lupixele.online)',
        '• Origin security: verified by strict X-Aria-Client headers',
        '• In-memory client dossier compilation (aggregated SGPA, % only)',
        '• Streaming markdown parser with live KaTeX mathematical formula rendering'
    ]
    y = 14.5
    for at in aria_text:
        ax.text(53, y, at, color='#1e293b', fontsize=7.4, va='center')
        y -= 2.8

    # Connecting Arrows
    arrow1 = patches.FancyArrowPatch((30, 62), (34, 62), arrowstyle='<->', mutation_scale=14,
                                    color='#0284c7', linewidth=2)
    ax.add_patch(arrow1)
    ax.text(32, 64.5, 'DOM & AJAX', color='#0369a1', fontsize=7, fontweight='bold', ha='center')

    arrow2 = patches.FancyArrowPatch((66, 62), (70, 62), arrowstyle='<->', mutation_scale=14,
                                    color='#059669', linewidth=2)
    ax.add_patch(arrow2)
    ax.text(68, 64.5, 'Render & Sync', color='#047857', fontsize=7, fontweight='bold', ha='center')

    arrow3 = patches.FancyArrowPatch((50, 25), (73.5, 21), arrowstyle='->', mutation_scale=12,
                                    color='#64748b', linewidth=1.5, linestyle='--')
    ax.add_patch(arrow3)

    plt.tight_layout()
    plt.savefig(r'p:\Magnanimity\Projects\ReEcap\docs\architecture.png', dpi=300, bbox_inches='tight')
    print('Generated architecture.png successfully!')

if __name__ == '__main__':
    create_architecture_diagram()
