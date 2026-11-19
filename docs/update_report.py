import zipfile
import os
import re

def make_drawing_xml(rid, filename, cx, cy, doc_id, doc_name):
    return (
        f'<w:drawing xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        f'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
        f'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
        f'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" '
        f'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<wp:inline distT="0" distB="0" distL="0" distR="0">'
        f'<wp:extent cx="{cx}" cy="{cy}"/>'
        f'<wp:effectExtent l="0" t="0" r="0" b="0"/>'
        f'<wp:docPr id="{doc_id}" name="{doc_name}"/>'
        f'<wp:cNvGraphicFramePr>'
        f'<a:graphicFrameLocks noChangeAspect="1"/>'
        f'</wp:cNvGraphicFramePr>'
        f'<a:graphic>'
        f'<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        f'<pic:pic>'
        f'<pic:nvPicPr>'
        f'<pic:cNvPr id="0" name="{filename}"/>'
        f'<pic:cNvPicPr/>'
        f'</pic:nvPicPr>'
        f'<pic:blipFill>'
        f'<a:blip r:embed="{rid}"/>'
        f'<a:stretch>'
        f'<a:fillRect/>'
        f'</a:stretch>'
        f'</pic:blipFill>'
        f'<pic:spPr>'
        f'<a:xfrm>'
        f'<a:off x="0" y="0"/>'
        f'<a:ext cx="{cx}" cy="{cy}"/>'
        f'</a:xfrm>'
        f'<a:prstGeom prst="rect">'
        f'<a:avLst/>'
        f'</a:prstGeom>'
        f'</pic:spPr>'
        f'</pic:pic>'
        f'</a:graphicData>'
        f'</a:graphic>'
        f'</wp:inline>'
        f'</w:drawing>'
    )

def make_footer_xml():
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n'
        '  <w:p>\n'
        '    <w:pPr>\n'
        '      <w:pStyle w:val="Footer"/>\n'
        '      <w:tabs>\n'
        '        <w:tab w:val="right" w:pos="9072"/>\n'
        '      </w:tabs>\n'
        '      <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>\n'
        '    </w:pPr>\n'
        '    <w:r>\n'
        '      <w:rPr>\n'
        '        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>\n'
        '        <w:sz w:val="20"/>\n'
        '      </w:rPr>\n'
        '      <w:t>CodeForge BuildX 2026</w:t>\n'
        '    </w:r>\n'
        '    <w:r>\n'
        '      <w:tab/>\n'
        '    </w:r>\n'
        '    <w:r>\n'
        '      <w:rPr>\n'
        '        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>\n'
        '        <w:sz w:val="20"/>\n'
        '      </w:rPr>\n'
        '      <w:t xml:space="preserve">Page | </w:t>\n'
        '    </w:r>\n'
        '    <w:fldSimple w:instr="PAGE"/>\n'
        '  </w:p>\n'
        '</w:ftr>'
    )

def replace_p_by_paraid(xml_text, para_id, new_p_xml):
    pattern = rf'<w:p\b[^>]*w14:paraId="{para_id}"[^>]*>.*?</w:p>'
    match = re.search(pattern, xml_text, flags=re.DOTALL)
    if match:
        return xml_text[:match.start()] + new_p_xml + xml_text[match.end():]
    else:
        print(f"WARNING: paraId '{para_id}' not found for replacement!")
        return xml_text

def delete_p_by_paraid(xml_text, para_id):
    pattern = rf'\s*<w:p\b[^>]*w14:paraId="{para_id}"[^>]*>.*?</w:p>'
    match = re.search(pattern, xml_text, flags=re.DOTALL)
    if match:
        return xml_text[:match.start()] + xml_text[match.end():]
    else:
        print(f"WARNING: paraId '{para_id}' not found for deletion!")
        return xml_text

def update_report():
    backup_path = r'p:\Magnanimity\Projects\ReEcap\docs\documentation_original_backup.docx'
    output_path = r'p:\Magnanimity\Projects\ReEcap\docs\documentation.docx'

    logo_path = r'p:\Magnanimity\Projects\ReEcap\docs\logo.png'
    arch_path = r'p:\Magnanimity\Projects\ReEcap\docs\architecture.png'
    fig3_path = r'p:\Magnanimity\Projects\ReEcap\docs\figure3_login.png'
    fig4_path = r'p:\Magnanimity\Projects\ReEcap\docs\figure4_overview.jpg'
    fig5_path = r'p:\Magnanimity\Projects\ReEcap\docs\figure5_themed_calendar.jpg'

    with zipfile.ZipFile(backup_path, 'r') as zin:
        file_map = {item.filename: zin.read(item.filename) for item in zin.infolist()}

    # 1. Update [Content_Types].xml
    content_types = file_map['[Content_Types].xml'].decode('utf-8')
    if 'Extension="png"' not in content_types:
        content_types = content_types.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>')
    if 'Extension="jpg"' not in content_types:
        content_types = content_types.replace('</Types>', '<Default Extension="jpg" ContentType="image/jpeg"/></Types>')
    if 'Extension="jpeg"' not in content_types:
        content_types = content_types.replace('</Types>', '<Default Extension="jpeg" ContentType="image/jpeg"/></Types>')
    file_map['[Content_Types].xml'] = content_types.encode('utf-8')

    # 2. Update word/_rels/document.xml.rels
    rels = file_map['word/_rels/document.xml.rels'].decode('utf-8')
    rel_entries = [
        ('<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>'),
        ('<Relationship Id="rIdArch" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/architecture.png"/>'),
        ('<Relationship Id="rIdFig3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/figure3_login.png"/>'),
        ('<Relationship Id="rIdFig4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/figure4_overview.jpg"/>'),
        ('<Relationship Id="rIdFig5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/figure5_themed_calendar.jpg"/>')
    ]
    to_add = [r for r in rel_entries if r.split('Id="')[1].split('"')[0] not in rels]
    if to_add:
        rels = rels.replace('</Relationships>', ''.join(to_add) + '</Relationships>')
        file_map['word/_rels/document.xml.rels'] = rels.encode('utf-8')

    # 3. Add images to media/
    media_files = [
        ('word/media/logo.png', logo_path),
        ('word/media/architecture.png', arch_path),
        ('word/media/figure3_login.png', fig3_path),
        ('word/media/figure4_overview.jpg', fig4_path),
        ('word/media/figure5_themed_calendar.jpg', fig5_path)
    ]
    for target_name, src_path in media_files:
        with open(src_path, 'rb') as f:
            file_map[target_name] = f.read()

    # 4. Update footers
    footer_content = make_footer_xml().encode('utf-8')
    file_map['word/footer1.xml'] = footer_content
    file_map['word/footer2.xml'] = footer_content

    # 4b. Update word/styles.xml to tighten TOC font and line height so it fits on Page 2
    styles_xml = file_map['word/styles.xml'].decode('utf-8')
    styles_xml = re.sub(
        r'(<w:style\b[^>]*w:styleId="TOC1"[^>]*>.*?<w:spacing\b)[^/>]*/>',
        r'\1 w:after="0" w:line="200" w:lineRule="auto"/>',
        styles_xml,
        flags=re.DOTALL
    )
    styles_xml = re.sub(
        r'(<w:style\b[^>]*w:styleId="TOC2"[^>]*>.*?<w:spacing\b)[^/>]*/>',
        r'\1 w:after="0" w:line="200" w:lineRule="auto"/>',
        styles_xml,
        flags=re.DOTALL
    )
    file_map['word/styles.xml'] = styles_xml.encode('utf-8')

    # 5. Update word/document.xml
    doc_xml = file_map['word/document.xml'].decode('utf-8')

    # Make Table of Contents Level 1 only so it fits perfectly on Page 2
    doc_xml = doc_xml.replace('TOC \\o &quot;1-2&quot; \\f', 'TOC \\o &quot;1-1&quot; \\h \\z \\u')
    doc_xml = doc_xml.replace('TOC \\o "1-2" \\f', 'TOC \\o "1-1" \\h \\z \\u')
    doc_xml = re.sub(
        r'<w:p\b[^>]*>(?:(?!<w:p\b).)*?<w:t>Contents</w:t>.*?</w:p>',
        r'<w:p w14:paraId="34757271" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6"><w:pPr><w:spacing w:before="60" w:after="80"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="28"/></w:rPr><w:t>Contents</w:t></w:r></w:p>',
        doc_xml,
        count=1,
        flags=re.DOTALL
    )

    # -------------------------------------------------------------
    # Table 2: Functional Requirements column header change
    # -------------------------------------------------------------
    doc_xml = doc_xml.replace('<w:t>Actor</w:t>', '<w:t>User</w:t>')

    # -------------------------------------------------------------
    # Table 1: Project Overview updates
    # 1. Remove Documented version row completely
    # 2. Update Primary users
    # 3. Update GitHub URL
    # 4. Add License row: ReEcap Institutional License (RIL v1.0)
    # -------------------------------------------------------------
    doc_xml = re.sub(r'<w:tr\b[^>]*>(?:(?!<w:tr\b).)*?Documented version.*?</w:tr>', '', doc_xml, flags=re.DOTALL)

    # Primary users description cell (paraId 08B3566B)
    p_primary_users = (
        '<w:p w14:paraId="08B3566B" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr>'
        '<w:t>Students of Aditya University. The modernized shell and navigation are strictly designed and optimized for students only (the interface is not optimized for teachers).</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '08B3566B', p_primary_users)

    # Source code URL cell (paraId 1EF24612)
    p_repo_url = (
        '<w:p w14:paraId="1EF24612" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:color w:val="0000EE"/><w:u w:val="single"/></w:rPr>'
        '<w:t>https://github.com/lupixele/ReEcap.git</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '1EF24612', p_repo_url)

    # -------------------------------------------------------------
    # Cover Page Updates (ContestPulse Layout)
    # -------------------------------------------------------------
    # Title (paraId 7F130A84) + CLEARING GAP AFTER (1800 dxa / 90 pt)
    p_title = (
        '<w:p w14:paraId="7F130A84" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="1800"/><w:jc w:val="center"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="32"/></w:rPr>'
        '<w:t>ReEcap: A Modern Reskin for the Aditya University Student Portal</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '7F130A84', p_title)

    # Submitted by members (paraId 20421836) + CLEARING GAP AFTER (1000 dxa / 50 pt)
    p_members = (
        '<w:p w14:paraId="20421836" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="1000"/><w:jc w:val="center"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="28"/></w:rPr>'
        '<w:t>Gurala Ratan Teja (25B11DS190), Yerru Lochan (25B11DS629)</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '20421836', p_members)

    # Mentor (paraId 22A7924E) + BIG CLEARING GAP AFTER (2200 dxa / 110 pt)
    p_mentor = (
        '<w:p w14:paraId="22A7924E" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="2200"/><w:jc w:val="center"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr>'
        '<w:t>Mentor: M. Ashok</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '22A7924E', p_mentor)

    # Department Full Form (paraId 11A48724)
    p_dept = (
        '<w:p w14:paraId="11A48724" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="80"/><w:jc w:val="center"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="32"/></w:rPr>'
        '<w:t>Department: Computer Science and Engineering (Data Science)</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '11A48724', p_dept)

    # Academic Year (paraId 2C29243B) + CLEARING GAP BEFORE LOGO (1400 dxa / 70 pt)
    p_ay = (
        '<w:p w14:paraId="2C29243B" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="1400"/><w:jc w:val="center"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="28"/></w:rPr>'
        '<w:t>Academic Year: 2026–2027</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '2C29243B', p_ay)

    # Institution Logo (paraId 415FC546) - Centered branding banner without caption
    drawing_logo = make_drawing_xml('rIdLogo', 'logo.png', 4145280, 753438, 1, 'Institution Logo')
    p_logo = (
        '<w:p w14:paraId="415FC546" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr>'
        f'<w:r>{drawing_logo}</w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '415FC546', p_logo)

    # REMOVE BLOAT CAPTION (paraId 121FE01B: 'Figure 1: Institution logo')
    doc_xml = delete_p_by_paraid(doc_xml, '121FE01B')

    # -------------------------------------------------------------
    # Section 2.4 User Roles
    # -------------------------------------------------------------
    p_user_roles = (
        '<w:p w14:paraId="2EFA4CAF" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr>'
        '<w:t>Students are the sole target user role, receiving the dedicated dual-pane dashboard, 4-group accordion sidebar, rebuilt academic pages, and the Aria AI copilot. The shell layout and interaction models are optimized exclusively for students; the interface is explicitly not optimized for teachers or teaching staff, who access distinct university employee workflows. Permitted parties are strictly governed by the ReEcap Institutional License (RIL v1.0), exclusively authorizing college faculty, management, and students. No administrator role exists, because the project operates client-side with zero server infrastructure.</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '2EFA4CAF', p_user_roles)

    # -------------------------------------------------------------
    # Figure 1: Architecture Diagram
    # -------------------------------------------------------------
    drawing_arch = make_drawing_xml('rIdArch', 'architecture.png', 3800000, 1950000, 2, 'Figure 1 Architecture Diagram')
    p_arch_draw = (
        '<w:p w14:paraId="43BC7F16" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:before="30" w:after="10"/><w:jc w:val="center"/></w:pPr>'
        f'<w:r>{drawing_arch}</w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '43BC7F16', p_arch_draw)

    p_arch_cap = (
        '<w:p w14:paraId="31643D71" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:pStyle w:val="Caption"/><w:spacing w:before="10" w:after="40"/><w:jc w:val="center"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/></w:rPr>'
        '<w:t>Figure 1: High-Level System Architecture</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '31643D71', p_arch_cap)

    # -------------------------------------------------------------
    # Table 3: Default Preset Identifier (Point is default)
    # -------------------------------------------------------------
    doc_xml = doc_xml.replace('Canonical preset identifier, point', 'Canonical preset identifier, default point')

    # -------------------------------------------------------------
    # Table 5: Major Modules - Add Main-World Interceptor row
    # -------------------------------------------------------------
    interceptor_row = (
        '<w:tr w:rsidR="00A3252E" w14:paraId="9A1B2C3D" w14:textId="77777777">'
        '<w:trPr><w:jc w:val="center"/></w:trPr>'
        '<w:tc><w:tcPr><w:tcW w:w="3009" w:type="dxa"/></w:tcPr>'
        '<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:b/></w:rPr>'
        '<w:t>Main-world interceptor</w:t></w:r></w:p></w:tc>'
        '<w:tc><w:tcPr><w:tcW w:w="2646" w:type="dxa"/></w:tcPr>'
        '<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr>'
        '<w:t>shared/interceptor.js</w:t></w:r></w:p></w:tc>'
        '<w:tc><w:tcPr><w:tcW w:w="3417" w:type="dxa"/></w:tcPr>'
        '<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr>'
        '<w:t>MV3 main-world script injection; intercepts native alert popouts and unhandled AJAX/401 XHTML errors without CSP violations, surfacing modern in-UI recovery cards</w:t></w:r></w:p></w:tc>'
        '</w:tr>'
    )
    # Insert interceptor_row before closing </w:tbl> of Table 5
    doc_xml = re.sub(
        r'(<w:tr\b[^>]*>(?:(?!<w:tr\b).)*?pdf_generator\.js.*?</w:tr>)(\s*</w:tbl>)',
        rf'\1{interceptor_row}\2',
        doc_xml,
        flags=re.DOTALL
    )

    # -------------------------------------------------------------
    # Section 4.2 Expanding Decorators & Layout Architecture
    # paraId 04BAB436
    # -------------------------------------------------------------
    expanded_sec42 = (
        'Decorators represent the core layout transformation module, executed across top-level pages and nested iframes. '
        'The architecture introduces enforceFlushWallDock() to completely eliminate legacy ASP.NET 97-pixel centering margins '
        '(body.bodyStyle max-width: 1536px, width: 96%, margin: 0 auto), docking the sidebar flush against the left viewport '
        'wall and header masthead with a zero-gap grid. Collapsible sidebar support smoothly toggles navigation width between '
        '248px and 0px via a 300ms cubic-bezier transition, persisting collapse state in local storage while dispatching '
        'REECAP_REQUEST_RESIZE postMessages to child iframes. The masthead profile cluster is reorganized with student identity '
        'and an enlarged Feather SVG logout action docked rightmost in a dedicated 2-row CSS grid. A dynamic Google Fonts CSS2 '
        'pipeline loads 59 on-demand web typography assets across 45 nightTab presets. To overcome Content Security Policy (CSP) '
        'restrictions without inline scripts, shared/interceptor.js runs directly in the MV3 main world, intercepting disruptively '
        'modal browser alert() popouts and unhandled 401 XHTML responses to render graceful in-UI error recovery cards.'
    )
    p_sec42 = (
        '<w:p w14:paraId="04BAB436" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>'
        f'<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr><w:t>{expanded_sec42}</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '04BAB436', p_sec42)

    # -------------------------------------------------------------
    # Section 4.3 Key Algorithm & Aria Copilot Architecture
    # paraId 62F069BB
    # -------------------------------------------------------------
    aria_arch_text = (
        'The Aria AI academic copilot operates through an edge-client hybrid architecture. On the client side, '
        'shared/aria.js compiles an in-memory academic dossier by scanning the active portal DOM for semester grade point averages, '
        'backlog counts, and attendance rates, completely scrubbing student names, roll numbers, and raw marks to preserve data privacy. '
        'The assistant communicates with a dedicated Cloudflare Edge Worker gateway (aria.lupixele.online) protected by strict X-Aria-Client '
        'origin headers and validation against info.aec.edu.in, returning HTTP 401 unauthorized to external scrapers. Responses stream in real time '
        'through an embedded markdown parser supporting task lists, fenced code blocks, and KaTeX mathematical formulas. For offline resilience, '
        'the assistant evaluates academic margins in closed form directly in the browser: classes a student may still miss without falling below the '
        '75% threshold equals the floor of (attended - 0.75 * held) / 0.75, while classes required to recover a shortage equals the ceiling of '
        '(3 * held - 4 * attended). Both operate strictly on rendered DOM figures without requiring external connectivity.'
    )
    p_aria_arch = (
        '<w:p w14:paraId="62F069BB" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>'
        f'<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr><w:t>{aria_arch_text}</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '62F069BB', p_aria_arch)

    # -------------------------------------------------------------
    # Section 5.1 Test Approach (paraId 6205222C)
    # -------------------------------------------------------------
    expanded_sec51 = (
        'Testing combines automated unit and regression suites with authenticated browser harnesses. The automated suite '
        'executes clean under Node.js across four dedicated harnesses: alert-interceptor.test.js (asserting 401 XHTML detection, '
        'alert suppression, and recovery card rendering), aria-composer.test.js (validating streamlined composer geometry, stop button '
        'state machine, and fee ledger navigation), aria-markdown.test.js (45 assertions verifying GitHub-flavored tables, task checkboxes, '
        'and KaTeX math streaming), and theme-architecture.test.js (asserting 45 unique presets, 35 dark and 10 light palettes, '
        'Google Fonts CSS2 font catalog loaders, HSL color mathematics, and storage migration cases with Point as default).'
    )
    p_sec51 = (
        '<w:p w14:paraId="6205222C" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>'
        f'<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr><w:t>{expanded_sec51}</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '6205222C', p_sec51)

    # -------------------------------------------------------------
    # Table 6: Test Cases TC-05 to TC-08 Pass Status
    # paraIds 609CB7DA, 5B235FAD, 3610BDBD, 05929958
    # -------------------------------------------------------------
    for tc_pid in ['609CB7DA', '5B235FAD', '3610BDBD', '05929958']:
        p_tc = (
            f'<w:p w14:paraId="{tc_pid}" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
            '<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr>'
            '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:b/></w:rPr>'
            '<w:t>Pass (2026-11-18)</w:t></w:r>'
            '</w:p>'
        )
        doc_xml = replace_p_by_paraid(doc_xml, tc_pid, p_tc)

    # -------------------------------------------------------------
    # Figure 2: Redesigned Login Page Screenshot
    # Dimensions: 3,840,480 x 2,160,270 EMUs (16:9, ~4.2 in x 2.36 in)
    # -------------------------------------------------------------
    drawing_fig2 = make_drawing_xml('rIdFig3', 'figure3_login.png', 3840480, 2160270, 3, 'Figure 2 Redesigned Login Page')
    p_fig2_draw = (
        '<w:p w14:paraId="3BB8320B" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:before="30" w:after="10"/><w:jc w:val="center"/></w:pPr>'
        f'<w:r>{drawing_fig2}</w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '3BB8320B', p_fig2_draw)

    p_fig2_cap = (
        '<w:p w14:paraId="2464AA23" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:pStyle w:val="Caption"/><w:spacing w:before="10" w:after="30"/><w:jc w:val="center"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/></w:rPr>'
        '<w:t>Figure 2: Redesigned Login Page</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '2464AA23', p_fig2_cap)

    # -------------------------------------------------------------
    # Figure 3: Student Overview Dashboard Screenshot
    # Dimensions: 3,840,480 x 2,160,270 EMUs (16:9, ~4.2 in x 2.36 in)
    # -------------------------------------------------------------
    drawing_fig3 = make_drawing_xml('rIdFig4', 'figure4_overview.jpg', 3840480, 2160270, 4, 'Figure 3 Student Overview Dashboard')
    p_fig3_draw = (
        '<w:p w14:paraId="44DFC7E6" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:before="30" w:after="10"/><w:jc w:val="center"/></w:pPr>'
        f'<w:r>{drawing_fig3}</w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '44DFC7E6', p_fig3_draw)

    p_fig3_cap = (
        '<w:p w14:paraId="58048B75" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:pStyle w:val="Caption"/><w:spacing w:before="10" w:after="30"/><w:jc w:val="center"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/></w:rPr>'
        '<w:t>Figure 3: Student Overview Dashboard</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '58048B75', p_fig3_cap)

    # -------------------------------------------------------------
    # Figure 4: Themed Academic Calendar Screenshot
    # Dimensions: 3,840,480 x 2,160,270 EMUs (16:9, ~4.2 in x 2.36 in)
    # -------------------------------------------------------------
    drawing_fig4 = make_drawing_xml('rIdFig5', 'figure5_themed_calendar.jpg', 3840480, 2160270, 5, 'Figure 4 Default Theme Applied to Academic Calendar View')
    p_fig4_draw = (
        '<w:p w14:paraId="4166FD97" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:before="30" w:after="10"/><w:jc w:val="center"/></w:pPr>'
        f'<w:r>{drawing_fig4}</w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '4166FD97', p_fig4_draw)

    p_fig4_cap = (
        '<w:p w14:paraId="271B6DE3" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:pStyle w:val="Caption"/><w:spacing w:before="10" w:after="30"/><w:jc w:val="center"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/></w:rPr>'
        '<w:t>Figure 4: Default Theme Applied to Academic Calendar View</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '271B6DE3', p_fig4_cap)

    # -------------------------------------------------------------
    # Section 6.2 Interpreting the Output Narrative
    # -------------------------------------------------------------
    output_narrative = (
        'The output screens illustrate the modernized interface provided by ReEcap across critical user workflows. '
        'Figure 2 shows the redesigned login page featuring centered glassmorphism styling, clean role toggles '
        '(Student, Parent, Employee), automatic password retention, and seamless native Cloudflare Turnstile integration. '
        'Figure 3 displays the unified student overview dashboard, highlighting the live SVG attendance gauge, zero-backlog academic verification, '
        'transparent fee dues with direct receipt links, and the real-time next-class schedule countdown. Figure 4 showcases '
        'the full academic calendar view, presenting batch milestone timelines across Semesters I through VIII with instant search, '
        'color-coded status badges, and multi-period timetable blocks.'
    )
    doc_xml = re.sub(
        r'(<w:p\b[^>]*>.*?6\.2 Interpreting the Output.*?</w:p>\s*)<w:p\b[^>]*>.*?</w:p>',
        rf'\1<w:p w14:paraId="70DF3894" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6"><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr><w:t>{output_narrative}</w:t></w:r></w:p>',
        doc_xml,
        flags=re.DOTALL
    )

    # -------------------------------------------------------------
    # Table 7: Team Contributions
    # paraIds 0FBD8FA0, 763BB940, 2E0D8F6B, 5943C0A7
    # -------------------------------------------------------------
    p_m1_name = (
        '<w:p w14:paraId="0FBD8FA0" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:b/></w:rPr>'
        '<w:t>Gurala Ratan Teja (25B11DS190)</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '0FBD8FA0', p_m1_name)

    ratan_contributions = (
        'Overall system architecture, Manifest V3 specification, nightTab mathematical token engine (14-shade HSL ramp, '
        'sRGB luma auto-contrast), Aria AI copilot integration and Cloudflare edge worker gateway (aria.lupixele.online), '
        'flush viewport docking (enforceFlushWallDock), collapsible sidebar with frame resize coordination, main-world alert interceptor, '
        'dynamic Google Fonts loader, canonical storage schema, theme migration, extension popup UI, and automated test regression suites.'
    )
    p_m1_contrib = (
        '<w:p w14:paraId="763BB940" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="0" w:line="210" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="21"/></w:rPr>'
        f'<w:t>{ratan_contributions}</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '763BB940', p_m1_contrib)

    p_m2_name = (
        '<w:p w14:paraId="2E0D8F6B" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="0" w:line="210" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="21"/><w:b/></w:rPr>'
        '<w:t>Yerru Lochan (25B11DS629)</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '2E0D8F6B', p_m2_name)

    lochan_contributions = (
        'Sidebar navigation grouping (organizing portal links into 4 accordion categories), basic DOM styling adjustments, '
        'iframe scrolling wheel forwarding helper, fee receipt table view formatting, manual test case verification '
        '(TC-05 through TC-08 on live portal), and project documentation review.'
    )
    p_m2_contrib = (
        '<w:p w14:paraId="5943C0A7" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="0" w:line="210" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="21"/></w:rPr>'
        f'<w:t>{lochan_contributions}</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '5943C0A7', p_m2_contrib)

    # -------------------------------------------------------------
    # Section 7.4 AI Tools Declaration
    # paraId 5191E5A8
    # -------------------------------------------------------------
    ai_decl = (
        'AI-assisted development tools were employed throughout the project lifecycle. Claude Code served as the primary '
        'coding and engineering agent for architectural scaffolding and implementation, complemented by OpenCode for targeted refactoring '
        'and code generation, and the Google Antigravity CLI collectively for debugging, test verification, and documentation orchestration. '
        'Every generated suggestion was validated against live portal postbacks, verified through automated regression suites '
        '(alert-interceptor.test.js, aria-composer.test.js, theme-architecture.test.js, aria-markdown.test.js), and manually tested across '
        'authenticated routes. The submitted codebase, test suites, and reported outcomes remain the complete responsibility of the team.'
    )
    p_ai_decl = (
        '<w:p w14:paraId="5191E5A8" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="80" w:line="240" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>'
        f'<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>{ai_decl}</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '5191E5A8', p_ai_decl)

    # -------------------------------------------------------------
    # Section 8.1 Conclusion & 8.2 Future Enhancements Optimization
    # -------------------------------------------------------------
    p_81 = (
        '<w:p w14:paraId="6CF45610" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="60" w:line="240" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr>'
        '<w:t>ReEcap demonstrates that legacy institutional portals can be modernized strictly client-side without modifying backend servers. By respecting native ASP.NET view states and postbacks, the extension delivers eleven modernized student surfaces, a 45-preset mathematical theme engine, an edge-powered copilot with closed-form attendance evaluation, and streamlined browser workflows.</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '6CF45610', p_81)

    # Delete redundant future scope bullets to fit within exact 15-page budget
    doc_xml = delete_p_by_paraid(doc_xml, '4BAA8E00')
    doc_xml = delete_p_by_paraid(doc_xml, '69166DD0')
    doc_xml = delete_p_by_paraid(doc_xml, '11ECFCCA') # move calendar bullet

    # Tighten spacing on remaining 8.2 bullets
    for b_pid in ['4F19C210', '2A36C33E', '1C7FC046']:
        doc_xml = re.sub(
            rf'(<w:p\b[^>]*w14:paraId="{b_pid}"[^>]*><w:pPr>.*?<w:spacing\b)[^/>]*/>',
            r'\1 w:after="10" w:line="210" w:lineRule="auto"/>',
            doc_xml,
            flags=re.DOTALL
        )

    # Tighten References spacing [1] through [5]
    for ref_pid in ['5425ED53', '4E0E6756', '199F3472', '0BABC9F7', '586FC652']:
        doc_xml = re.sub(
            rf'(<w:p\b[^>]*w14:paraId="{ref_pid}"[^>]*><w:pPr>.*?<w:spacing\b)[^/>]*/>',
            r'\1 w:after="20" w:line="210" w:lineRule="auto"/>',
            doc_xml,
            flags=re.DOTALL
        )

    # Tighten Format Compliance paragraphs (paraId 5F2F4ABA, 625363BF)
    for fc_pid in ['5F2F4ABA', '625363BF']:
        doc_xml = re.sub(
            rf'(<w:p\b[^>]*w14:paraId="{fc_pid}"[^>]*>.*?<w:rPr>.*?<w:sz\b)[^/>]*/>',
            r'\1 w:val="20"/>',
            doc_xml,
            flags=re.DOTALL
        )
        doc_xml = re.sub(
            rf'(<w:p\b[^>]*w14:paraId="{fc_pid}"[^>]*><w:pPr>.*?<w:spacing\b)[^/>]*/>',
            r'\1 w:after="20" w:line="210" w:lineRule="auto"/>',
            doc_xml,
            flags=re.DOTALL
        )

    # -------------------------------------------------------------
    # Reference [6]
    # paraId 53181D77
    # -------------------------------------------------------------
    p_ref6 = (
        '<w:p w14:paraId="53181D77" w14:textId="77777777" w:rsidR="00A3252E" w:rsidRDefault="00C33BC6">'
        '<w:pPr><w:spacing w:after="40" w:line="220" w:lineRule="auto"/><w:ind w:left="420" w:hanging="420"/><w:jc w:val="both"/></w:pPr>'
        '<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr>'
        '<w:t>[6] G. Ratan Teja and Y. Lochan, "ReEcap: Modern Client-Side Workstation for Aditya University Student Portal," CodeForge BuildX 2026 Mini-Project Technical Report, Department of Computer Science and Engineering (Data Science), Aditya University, Nov. 2026. [Online]. Available: https://github.com/lupixele/ReEcap.git</w:t></w:r>'
        '</w:p>'
    )
    doc_xml = replace_p_by_paraid(doc_xml, '53181D77', p_ref6)

    # Save document.xml back
    file_map['word/document.xml'] = doc_xml.encode('utf-8')

    # Write out output docx
    temp_output = output_path + '.tmp'
    with zipfile.ZipFile(temp_output, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        for filename, data in file_map.items():
            zout.writestr(filename, data)

    # Safely replace output file
    if os.path.exists(output_path):
        os.remove(output_path)
    os.rename(temp_output, output_path)
    print(f"Successfully generated updated document: {output_path} ({os.path.getsize(output_path)} bytes)")

if __name__ == '__main__':
    update_report()
