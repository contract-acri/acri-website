#!/usr/bin/env python3
"""Builds the ACRI static site into ../public  (run: python3 build.py)"""
import base64, html, json, os, pathlib, datetime, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import layout_v5 as L

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT.parent / "public"
LOGOS = ROOT.parent / "logos"
SITE = "https://www.acriindia.org"
TODAY = datetime.date.today().isoformat()

# ------------------------------------------------------------------ assets
def b64(name):
    return "data:image/webp;base64," + base64.b64encode((LOGOS / f"{name}.webp").read_bytes()).decode()

LOGO_CLASSES = {
    "crest": "acri-emblem", "logo-acri": "acri-full", "logo-b2030": "b2030", "logo-ijelf": "ijelf",
    "logo-ijbmrs": "ijbmrs", "logo-anniv": "anniv", "logo-aair": "aair", "logo-pub": "publication",
    "logo-idea": "idea",
}

def build_css():
    css = (ROOT / "base.css").read_text()
    css += "\n/* ---- logos (base64) ---- */\n"
    for cls, f in LOGO_CLASSES.items():
        css += f'.{cls}{{background-image:url("{b64(f)}");background-position:center;background-repeat:no-repeat;background-size:contain}}\n'
    # crest keeps its smaller size inside the white circle
    css += ".brand .crest,.f-brand .crest{background-size:82%}\n"
    return css

# navigation, header and footer live in layout_v5.py

ORG_LD = {
    "@context": "https://schema.org", "@type": "ResearchOrganization",
    "name": "Ahmedabad Centre for Research and Innovation", "alternateName": "ACRI",
    "slogan": "Where Ideas Become Institutions", "foundingDate": "2024",
    "url": SITE + "/", "logo": SITE + "/assets/acri-logo.png", "email": "contact@acriindia.org",
    "address": {"@type": "PostalAddress", "addressLocality": "Ahmedabad", "addressRegion": "Gujarat", "addressCountry": "IN"},
    "description": "An independent, non-political, non-religious and non-partisan research and innovation institution based in Ahmedabad, India.",
    "subOrganization": [
        {"@type": "Organization", "name": "School of Business Management & Commerce", "url": "https://www.sbmc.edu.acriindia.org/"},
        {"@type": "Organization", "name": "School of Education & Human Development", "url": "https://www.sehd.edu.acriindia.org/"},
        {"@type": "Organization", "name": "School of Technology, Sustainability & Public Policy", "url": "https://www.stsp.edu.acriindia.org/"},
        {"@type": "Organization", "name": "School of Media & Civic Studies", "url": "https://www.smcs.edu.acriindia.org/"},
        {"@type": "Organization", "name": "Association of Indian Researchers", "url": "https://www.aair.acriindia.org/"},
        {"@type": "Organization", "name": "ACRI Publication"}
    ],
}

def layout(path, title, desc, body, *, index=True, crumbs=None, extra_head="", chrome=True, script=True):
    canonical = SITE + (path if path != "/" else "/")
    ld = [ORG_LD] if path == "/" else []
    if crumbs:
        items = [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"}]
        for i, (n, h) in enumerate(crumbs, 2):
            items.append({"@type": "ListItem", "position": i, "name": n, "item": SITE + h})
        ld.append({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items})
    ld_html = "".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ld)
    robots = "index, follow, max-image-preview:large" if index else "noindex, nofollow"
    full_title = title if path == "/" else f"{title} | ACRI — Ahmedabad Centre for Research and Innovation"
    head = f"""<!DOCTYPE html>
<html lang="en-IN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(full_title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{canonical}">
<meta name="theme-color" content="#0E2D52">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ahmedabad Centre for Research and Innovation">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{SITE}/assets/acri-share.png">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;600;700;800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/acri.css">
{ld_html}{extra_head}
</head>
<body>
"""
    if not chrome:
        return head + body + "\n</body>\n</html>\n"
    header = L.header(path)
    tail = L.footer() + "\n</body>\n</html>\n"
    return head + header + body + tail

phero = L.phero

def toc_page(sections, aside_extra=""):
    toc = "".join(f'<li><a href="#{i}">{html.escape(t)}</a></li>' for i, t, _ in sections)
    body = "".join(f'<section id="{i}"><h2>{html.escape(t)}</h2>{c}</section>' for i, t, c in sections)
    return f"""<section><div class="wrap page">
  <aside class="toc"><h4>On this page</h4><ul>{toc}</ul>{aside_extra}</aside>
  <div class="prose">{body}</div>
</div></section>"""

def ticks(items, no=False):
    return f'<ul class="ticks{" no" if no else ""}">' + "".join(f"<li>{i}</li>" for i in items) + "</ul>"

# ------------------------------------------------------------------ fallback content (replaced live from the Sheet)
news_cards = L.news_cards

SEED_SCHOOL = """<details class="sitem">
  <summary><div><h3>Apple Global School, Ahmedabad</h3><span class="loc">Ahmedabad &middot; Gujarat &middot; India</span></div><span class="plus" aria-hidden="true">+</span></summary>
  <div class="det">
    <dl><dt>Principal</dt><dd>Ms. Nivedita Chakravarti</dd><dt>School Research Coordinator</dt><dd>Ms. Ishita Pancholi</dd><dt>School Code</dt><dd>IN-GJ328810-AGS</dd></dl>
    <div class="addr"><b>Address</b><br>XCQ9+J8Q, Gibpura, Gujarat 380057</div>
  </div>
</details>"""

# ------------------------------------------------------------------ pages
PAGES = {}

def page(path, file, title, desc, body, **kw):
    PAGES[file] = (path, title, desc, body, kw)

# ===== HOME =====
page("/", "index.html",
     "Ahmedabad Centre for Research and Innovation (ACRI) | Independent Research Institution, Ahmedabad",
     "The Ahmedabad Centre for Research and Innovation (ACRI) is an independent, non-partisan research and innovation institution in Ahmedabad, India: Schools of Thought, scholarly journals, and the Beyond 2030 and Beyond UN programmes.",
L.home_body())

# ===== ABOUT =====
C = [("About", "/about")]
page("/about", "about.html", "About ACRI",
     "About the Ahmedabad Centre for Research and Innovation (ACRI): an independent research and innovation institution in Ahmedabad, India. Vision, mission, institutional philosophy and governance.",
     phero("About ACRI", "An independent institution for <em>research and innovation</em>",
           "Established in 2024 in Ahmedabad, India, to strengthen research culture, advance knowledge, and contribute to academic discourse and public understanding.", C)
     + toc_page([
        ("overview", "About Us", "<p class='big'>The Ahmedabad Centre for Research and Innovation (ACRI) is an independent research and innovation institution based in Ahmedabad, India.</p><p>ACRI exists to strengthen research culture, advance knowledge, and contribute meaningfully to academic discourse and public understanding through integrity, rigour and intellectual openness. Its work spans research programmes, Schools of Thought, scholarly journals, student initiatives and public dialogue.</p>"),
        ("vision", "Vision", "<div class='callout'><h3>Our vision</h3><p>To build a credible, independent and enduring research and innovation institution that advances knowledge through integrity, rigour and intellectual openness, and contributes meaningfully to academic discourse and public understanding.</p></div>"),
        ("mission", "Mission", ticks(["Support high-quality, ethical and interdisciplinary research",
                                       "Provide reliable platforms for academic publishing and scholarly exchange",
                                       "Encourage evidence-based inquiry with institutional neutrality",
                                       "Build research capacity among students and early-career scholars",
                                       "Foster collaboration without ideological alignment"])),
        ("philosophy", "Institutional Philosophy", "<p>ACRI operates as a non-political, non-religious and non-partisan institution. It is not a degree-granting university: its Schools of Thought, Academy and student programmes complement formal education rather than replace it.</p><p>ACRI prioritises depth, quality and long-term institutional credibility over rapid expansion.</p>"),
        ("governance", "Governance &amp; Independence".replace("&amp;", "&"), "<p>ACRI follows a president-led executive structure designed to ensure clarity of responsibility and long-term continuity. Institutional roles reflect a commitment to academic service and institutional responsibility rather than personal or commercial gain.</p><p><a class='more' href='/governance'>Read the governance framework</a></p>"),
     ]), crumbs=C)

# ===== RESEARCH =====
C = [("Research", "/research")]
page("/research", "research.html", "Research & Innovation",
     "Research and innovation at ACRI: rigorous, ethical and interdisciplinary inquiry, applied research, policy and institutional design, scholarly exchange and capacity building.",
     phero("Research &amp; Innovation", "Rigorous inquiry, <em>intellectually open</em>",
           "An institutional platform for inquiry, dialogue and collaboration across disciplines, without ideological alignment or predetermined outcomes.", C)
     + toc_page([
        ("overview", "Overview", "<p class='big'>ACRI supports research and innovation that is rigorous, ethical and intellectually open.</p><p>The institution functions as a platform enabling inquiry, dialogue and collaboration across disciplines, without ideological alignment or predetermined outcomes.</p>"),
        ("programmes", "Flagship Programmes", "<div class='grid2 prog'><a class='b2030' href='/beyond-2030'><div class='top'><span class='logo logo-b2030' role='img' aria-label='Beyond 2030'></span></div><div class='txt'><span class='meta'>2026&ndash;2029</span><h3>Beyond 2030</h3><p>What should follow the SDGs, and on what evidence?</p></div></a><a class='bun' href='/beyond-un'><div class='top'>Beyond&nbsp;<span>UN</span></div><div class='txt'><span class='meta'>Initiative</span><h3>Beyond UN</h3><p>Legitimacy and cooperation beyond state-centric power.</p></div></a></div>"),
        ("research", "Research at ACRI", ticks(["Academic rigour grounded in transparent methodology", "Interdisciplinary openness across fields and approaches",
                                              "Institutional independence from partisan influence", "Evidence-based inquiry resistant to advocacy"])
                     + "<p>Research directions evolve in response to scholarly merit, institutional capacity and societal relevance.</p>"),
        ("innovation", "Innovation Approach", "<p>Innovation at ACRI is understood broadly and evaluated by intellectual soundness, practical relevance and ethical grounding.</p>"
                     + ticks(["Applied research", "Policy and institutional design", "Methodological innovation", "Research tools and frameworks"])),
        ("exchange", "Scholarly Exchange", "<p>ACRI encourages structured scholarly exchange through its <a href='/publishing'>journals and publications</a>, the <a href='https://www.aair.acriindia.org/'>Association of Indian Researchers</a>, research discussions and policy dialogue, while safeguarding editorial independence and academic freedom.</p>"),
        ("capacity", "Capacity Building", "<p>Capacity-building efforts focus on mentorship, ethical research practice and opportunities for scholarly engagement, complementing formal academic training. Schools take part through the <a href='/school-research-network'>School Research Network</a>.</p>"),
        ("restraint", "Institutional Restraint", "<p>ACRI deliberately avoids rapid expansion and programme inflation, reflecting a commitment to long-term credibility, sustainability and trust. Its research and innovation activities will remain shaped by institutional values, scholarly integrity and measured growth.</p>"),
     ]), crumbs=C)

# ===== BEYOND 2030 =====
C = [("Research", "/research"), ("Beyond 2030", "/beyond-2030")]
page("/beyond-2030", "beyond-2030.html", "Beyond 2030 — ACRI Flagship Research Programme",
     "Beyond 2030 is ACRI's flagship four-year research programme (2026–2029) examining what development frameworks should follow the Sustainable Development Goals after 2030.",
     phero("Flagship Research Programme", "Beyond 2030",
           "Establishing the foundation for the next global development agenda through slow, rigorous and archival research. Patient &middot; Descriptive &middot; Conceptual &middot; Long-horizon.", C, badge="logo-b2030")
     + toc_page([
        ("question", "Core Question", "<p class='big'>If the Sustainable Development Goals formally end in 2030, what kinds of development frameworks might follow, and on what evidence should they be built?</p>"),
        ("positioning", "Institutional Positioning", "<p>Beyond 2030 is ACRI's inaugural flagship research programme, designed to establish the Centre as a long-horizon institution committed to rigorous documentation, conceptual clarity and intellectual continuity beyond policy cycles.</p>"),
        ("timeline", "A Four-Year Programme by Design", "<div class='timeline'><div class='now'><b>2026 &middot; Current</b><h3>Documentation</h3><p>Country-wise archival record of official SDG statements.</p></div><div><b>2027</b><h3>Aggregation</h3><p>Global and regional pattern identification.</p></div><div><b>2028</b><h3>Gap Analysis</h3><p>Conceptual gaps and emerging issues.</p></div><div><b>2029</b><h3>Post-2030 Thinking</h3><p>Speculative frameworks beyond the SDGs.</p></div></div>"),
        ("not", "What This Programme Is Not", ticks(["Not SDG performance monitoring", "Not ranking or scoring countries", "Not advocacy or activism", "Not implementation or policy advice"], no=True)),
        ("schools", "Participation by Schools", "<p>Beyond 2030 is the default programme for school-level engagement under the <a href='/school-research-network'>ACRI School Research Network</a>.</p><p>Office for the Post-2030 Development Research Programme: <a href='mailto:office.post2030@acriindia.org'>office.post2030@acriindia.org</a></p>"),
     ]), crumbs=C)

# ===== BEYOND UN =====
C = [("Research", "/research"), ("Beyond UN", "/beyond-un")]
page("/beyond-un", "beyond-un.html", "Beyond UN — An ACRI Flagship Initiative",
     "Beyond UN is a people-centric, experimental global governance initiative incubated by ACRI, exploring legitimacy, ethics and cooperation beyond state-centric power structures.",
     phero("Flagship Initiative", "Beyond <em>UN</em>",
           "A people-centric, experimental global governance initiative exploring legitimacy, ethics and cooperation beyond state-centric power structures.", C)
     + toc_page([
        ("vision", "Vision &amp; Mission".replace("&amp;", "&"), "<p class='big'>A future of global governance where legitimacy is derived from ethical authority, inclusive participation and collective responsibility, not power or privilege.</p><p>Incubated by ACRI, Beyond UN operates as an independent, non-state platform for research, deliberation and norm creation.</p>"),
        ("problem", "The Problem", ticks(["Decision-making dominated by veto power", "Legitimacy constrained by state politics", "Slow responses to global crises", "Institutions rooted in a mid-20th-century world order"])),
        ("idea", "The Idea", "<div class='callout'><h3>Beyond UN does not replace the United Nations.</h3><p>It builds what the UN cannot.</p></div>"),
        ("is", "What Beyond UN Is", ticks(["A platform for post-state global governance thinking", "A space for norm creation before power", "A bridge between ideas, ethics and action", "A legitimacy-building initiative beyond formal treaties"])),
        ("isnot", "What Beyond UN Is Not", ticks(["Not anti-UN", "Not a world government", "Not a Model UN simulation", "Not a state-led forum"], no=True)),
        ("how", "How We Work", ticks(["Independent research and policy labs", "Global fellowships and expert cohorts", "Parallel assemblies and deliberative forums", "Public frameworks and non-binding outputs"])),
        ("role", "ACRI's Role", "<p>ACRI provides institutional stewardship, ethical oversight and long-term continuity to Beyond UN, while safeguarding intellectual independence and openness to global participation.</p>"),
     ]), crumbs=C)

# ===== GOVERNANCE =====
C = [("About", "/about"), ("Governance", "/governance")]
page("/governance", "governance.html", "Governance",
     "ACRI's governance framework: president-led executive leadership, oversight, conflict-of-interest disclosure, records and continuity, and independence from political, religious and partisan influence.",
     phero("Governance", "Structure <em>&amp; continuity</em>",
           "A governance framework designed to ensure institutional clarity, independence and long-term responsibility.", C)
     + toc_page([
        ("overview", "Overview", "<p class='big'>ACRI follows a governance framework designed to ensure institutional clarity, independence and long-term continuity.</p>"),
        ("philosophy", "Governance Philosophy", ticks(["Clear accountability and executive responsibility", "Independence from political, religious and partisan influence",
                                                      "Separation between executive governance and academic activity", "Institutional continuity over individual presence", "Restraint in formalisation and expansion"])),
        ("executive", "Executive Leadership", "<p>ACRI follows a president-led executive structure. The President serves as the executive head of the institution and holds responsibility for institutional direction, continuity, appointments, representation and safeguarding independence. The President is supported by a Vice President and a Provost. <a href='/structure'>See the institutional structure</a>.</p>"),
        ("oversight", "Oversight", "<p>Institutional oversight bodies provide custodial support in exceptional circumstances, without engaging in day-to-day management or academic decision-making. Academic matters are considered by the Academic Council.</p>"),
        ("roles", "Executive &amp; Programmatic Roles".replace("&amp;", "&"), "<p>Executive and programmatic roles are appointed based on institutional need, with defined scopes, fixed terms and service-oriented responsibilities.</p>"),
        ("coi", "Independence &amp; Conflict of Interest".replace("&amp;", "&"), "<p>A disclosure-based approach governs conflicts of interest, requiring transparency, integrity and recusal where appropriate.</p>"),
        ("records", "Records &amp; Continuity".replace("&amp;", "&"), "<p>Internal records are maintained to support continuity, accountability and legal compliance.</p>"),
        ("legal", "Legal Status", "<p>ACRI is pursuing formal incorporation as a not-for-profit entity, in compliance with applicable statutory requirements. Updates will be published on this website.</p>"),
     ]), crumbs=C)

# ===== STRUCTURE =====
def unit(title, rows):
    lis = "".join(f'<li><span>{html.escape(n)}</span><a href="mailto:{e}">{e}</a></li>' for n, e in rows)
    return f'<div class="unit"><h3>{html.escape(title)}</h3><ul>{lis}</ul></div>'
C = [("About", "/about"), ("Institutional Structure", "/structure")]
page("/structure", "structure.html", "Institutional Structure & Offices",
     "ACRI's institutional structure: executive leadership, the Research, Innovation and Student Affairs directorates, central offices and administration, with official contact addresses.",
     phero("Institutional Structure", "Offices <em>&amp; directorates</em>",
           "ACRI operates through a structured institutional framework ensuring clarity of responsibility and continuity. Official contact addresses for each office are listed below.", C)
     + f"""<section><div class="wrap">
  <div class="sec-head"><div><div class="kicker">Executive Leadership</div><h2>Office of the President</h2></div></div>
  <div class="dir">{unit("President", [("President", "president@acriindia.org"), ("Office of the President", "office.president@acriindia.org")])}
  {unit("Vice President", [("Vice President", "vice-president@acriindia.org")])}
  {unit("Provost", [("Provost", "provost@acriindia.org")])}</div>
</div></section>
<section class="stone"><div class="wrap">
  <div class="sec-head"><div><div class="kicker">Directorates</div><h2>Research, Innovation &amp; Students</h2></div></div>
  <div class="dir">{unit("Research Directorate", [("Director of Research", "director.research@acriindia.org"), ("Office of Research", "office.research@acriindia.org"), ("Research Secretariats", "office.secretariats@acriindia.org"), ("Post-2030 Research", "office.post2030@acriindia.org")])}
  {unit("Innovation Directorate", [("Director of Innovation", "director.innovation@acriindia.org"), ("Office of Innovation", "office.innovation@acriindia.org"), ("Future Work", "office.future@acriindia.org")])}
  {unit("Student Affairs", [("Director of Students", "director.students@acriindia.org"), ("Learning Futures", "office.learning@acriindia.org")])}</div>
</div></section>
<section><div class="wrap">
  <div class="sec-head"><div><div class="kicker">Central Offices &amp; Administration</div><h2>Institutional services</h2></div></div>
  <div class="dir">{unit("Central Offices", [("External Affairs", "office.external-affairs@acriindia.org"), ("Leadership", "office.leadership@acriindia.org"), ("Information Systems", "office.is@acriindia.org"), ("Finance & Grants", "office.finance@acriindia.org")])}
  {unit("Administration", [("Academic Council", "academic.council@acriindia.org"), ("HR Desk", "hr.desk@acriindia.org"), ("Elections Office", "elections.office@acriindia.org"), ("Disciplinary Committee", "idc@acriindia.org"), ("Board of Management", "bom@acriindia.org")])}
  {unit("Professional Development & Academy", [("Office of Professional Development", "office@pd.acriindia.org"), ("ACRI Academy", "academy@pd.acriindia.org"), ("Controller of Examinations", "controller.examination@pd.acriindia.org")])}</div>
</div></section>""", crumbs=C)

# ===== EXTERNAL AFFAIRS =====
C = [("About", "/about"), ("Office of External Affairs", "/external-affairs")]
page("/external-affairs", "external-affairs.html", "Office of External Affairs",
     "The Office of External Affairs (OEA) is ACRI's central authority for external relations, international engagement and official communications with governments, multilateral institutions and academic bodies.",
     phero("Central Office", "Office of <em>External Affairs</em>",
           "The central institutional authority for ACRI's external relations, international engagement and official communications.", C)
     + toc_page([
        ("role", "Mandate and Institutional Role", "<p class='big'>The Office of External Affairs (OEA) coordinates, oversees and regulates ACRI's external interactions.</p><p>This includes the issuance of official statements, notices and institutional communications on matters of international relevance. The Office is the primary interface between ACRI and governments, multilateral institutions, academic bodies, journals and other external stakeholders, safeguarding the integrity, consistency and authenticity of ACRI's external positions.</p>"),
        ("scope", "External Engagement Scope", ticks(["Governments and public authorities", "Multilateral institutions", "Academic and research bodies", "Scholarly journals and publishers", "International organisations", "External institutional stakeholders"])),
        ("oversight", "Governance and Oversight", "<p>OEA operates under the authority of the President of ACRI within clearly defined institutional protocols. External engagement undertaken by ACRI offices, centres or affiliates is expected to conform to OEA guidelines to ensure clarity of representation and institutional coherence.</p>"),
        ("comms", "Official Communications", "<p>All official external communications of ACRI, including institutional statements, formal notices and clarifications, are issued or routed through established and verifiable ACRI platforms, with accuracy, restraint, attribution and alignment with international law and multilateral frameworks.</p>"),
        ("principles", "Principles Guiding External Engagement", ticks(["Respect for international law and multilateral frameworks", "Institutional neutrality and non-alignment", "Peaceful dialogue and responsible exchange of knowledge", "Accuracy, restraint and accountability in communication", "Clear attribution and procedural integrity"])),
        ("verify", "Verification and Reference", "<p>This website is the official reference point for verifying ACRI's external mandate, communication protocols and institutional authority.</p><div class='note'>Official correspondence: <a href='mailto:office.external-affairs@acriindia.org'>office.external-affairs@acriindia.org</a> &middot; General: <a href='mailto:contact@acriindia.org'>contact@acriindia.org</a></div>"),
     ]), crumbs=C)

# ===== SCHOOL RESEARCH NETWORK =====
C = [("Students & Schools", "/school-research-network"), ("School Research Network", "/school-research-network")]
page("/school-research-network", "school-research-network.html", "ACRI School Research Network",
     "The ACRI School Research Network lets schools engage with ACRI's governed research programmes, giving students early exposure to research thinking, documentation and inquiry. Apply online.",
     phero("For Schools", "School Research <em>Network</em>",
           "A structured institutional network through which schools engage with ACRI's research ecosystem, enabling early exposure to research thinking, documentation and inquiry, without instruction, evaluation or performance pressure.", C[1:])
     + toc_page([
        ("how", "How the Network Operates", "<div class='steps'><div><h3>Participating School</h3><p>Identifies interested students and appoints a School Research Coordinator to liaise with ACRI.</p></div><div><h3>Office of Research Secretariats</h3><p>Coordinates student research engagement, documentation, reporting and procedural support.</p></div><div><h3>Director of Students</h3><p>Oversees student safeguarding, welfare, ethical compliance and conduct during research engagement.</p></div><div><h3>Director of Research</h3><p>Provides academic oversight, ensures rigour and aligns student involvement with approved ACRI programmes.</p></div></div>"),
        ("enables", "What the Network Enables", "<p>Student research engagement takes place strictly within defined ACRI research programmes. Students do not undertake independent projects in isolation; they participate in observation, documentation and guided inquiry linked to ongoing institutional research.</p><p>The default programme for school-level engagement is <a href='/beyond-2030'>Beyond 2030</a>, run by the Office for the Post-2030 Development Research Programme. Alternative themes may be proposed formally and are subject to internal review and approval.</p>"),
        ("is", "What This Is", ticks(["Early exposure to research culture", "Structured, governed student engagement", "Documentation and inquiry-based participation", "Institutionally supervised involvement"])),
        ("isnot", "What This Is Not", ticks(["No competitions or rankings", "No certificates or credentials", "No testing or performance assessment", "No independent unsupervised projects"], no=True)),
        ("join", "Joining the Network", "<p>Participation is based on institutional alignment, seriousness of engagement and adherence to ACRI's research governance framework. Schools apply online; the Office of Research Secretariats reviews every application and writes to the School Research Coordinator.</p><div class='ctas'><a class='btn primary' href='/apply'>Apply to join the network</a><a class='btn ghost' href='/school-network'>View member schools</a></div><div class='note'>The ACRI School Research Network is a non-degree, non-certification, non-evaluative institutional initiative. Participation does not constitute academic credit, training or formal research qualification. Questions: <a href='mailto:office.secretariats@acriindia.org'>office.secretariats@acriindia.org</a></div>"),
     ]), crumbs=C[1:])

# ===== APPLY =====
STATES = ["Gujarat", "Maharashtra", "Rajasthan", "Madhya Pradesh", "Delhi", "Karnataka", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal", "Other"]
C = [("School Research Network", "/school-research-network"), ("Apply", "/apply")]
page("/apply", "apply.html", "Apply to the ACRI School Research Network",
     "Online application for schools to join the ACRI School Research Network. Submit your school's details and statement of interest to the Office of Research Secretariats.",
     phero("Application", "Apply to join the <em>network</em>",
           "Complete this form on behalf of your school. You will receive a reference number by email, and the Office of Research Secretariats will review your application.", C)
     + f"""<section><div class="wrap" style="max-width:920px">
  <div id="apply-done" class="success" hidden>
    <div class="kicker">Application received</div>
    <h2>Thank you.</h2>
    <p>Your reference number is</p>
    <div class="ref" id="apply-ref">SRN-</div>
    <p>A confirmation has been emailed to the coordinator. Please quote this reference in any correspondence.</p>
    <div class="ctas" style="justify-content:center"><a class="btn navy" href="/school-research-network">Back to the network</a></div>
  </div>
  <form class="form" id="apply-form" novalidate>
    <div class="msg err" id="apply-msg" role="alert"></div>
    <fieldset><legend>School</legend><div class="fgrid">
      <div class="field full"><label for="schoolName">School name <i>*</i></label><input id="schoolName" name="schoolName" required maxlength="200" autocomplete="organization"></div>
      <div class="field"><label for="board">Board / curriculum</label><select id="board" name="board"><option value="">Select</option><option>CBSE</option><option>ICSE / ISC</option><option>IB</option><option>Cambridge (CAIE)</option><option>State Board</option><option>Other</option></select></div>
      <div class="field"><label for="website">School website</label><input id="website" name="website" type="url" placeholder="https://"></div>
      <div class="field"><label for="city">City <i>*</i></label><input id="city" name="city" required maxlength="100"></div>
      <div class="field"><label for="state">State <i>*</i></label><select id="state" name="state" required><option value="">Select</option>{"".join(f"<option>{s}</option>" for s in STATES)}</select></div>
      <div class="field full"><label for="address">Full address</label><textarea id="address" name="address" style="min-height:90px" maxlength="500"></textarea></div>
      <div class="field"><label for="principalName">Principal's name <i>*</i></label><input id="principalName" name="principalName" required maxlength="150"></div>
      <div class="field"><label for="country">Country</label><input id="country" name="country" value="India" maxlength="100"></div>
    </div></fieldset>
    <fieldset><legend>School Research Coordinator</legend><div class="fgrid">
      <div class="field"><label for="coordinatorName">Full name <i>*</i></label><input id="coordinatorName" name="coordinatorName" required maxlength="150" autocomplete="name"></div>
      <div class="field"><label for="coordinatorDesignation">Designation</label><input id="coordinatorDesignation" name="coordinatorDesignation" maxlength="150" placeholder="e.g. Head of Research, Teacher"></div>
      <div class="field"><label for="coordinatorEmail">Email <i>*</i></label><input id="coordinatorEmail" name="coordinatorEmail" type="email" required maxlength="200" autocomplete="email"><div class="hint">All correspondence goes to this address.</div></div>
      <div class="field"><label for="coordinatorPhone">Phone <i>*</i></label><input id="coordinatorPhone" name="coordinatorPhone" type="tel" required maxlength="40" autocomplete="tel"></div>
    </div></fieldset>
    <fieldset><legend>Engagement</legend><div class="fgrid">
      <div class="field"><label for="students">Approx. students interested</label><input id="students" name="students" type="number" min="1" max="5000"></div>
      <div class="field"><label for="programme">Preferred programme</label><select id="programme" name="programme"><option>Beyond 2030 (default)</option><option>Propose an alternative theme</option></select></div>
      <div class="field full"><label for="statement">Statement of interest <i>*</i></label><textarea id="statement" name="statement" required maxlength="3000" placeholder="Why does your school wish to join, and how will students take part?"></textarea></div>
      <div class="field full"><label class="check"><input type="checkbox" id="agree" required> <span>I confirm I am authorised by the school to apply, and that the school will follow ACRI's research governance and student-safeguarding framework.</span></label></div>
    </div></fieldset>
    <div class="hp" aria-hidden="true"><label for="company_website">Leave empty</label><input id="company_website" name="company_website" tabindex="-1" autocomplete="off"></div>
    <div><button class="btn primary" type="submit" id="apply-btn">Submit application</button></div>
  </form>
</div></section>""", crumbs=C)

# ===== SCHOOL NETWORK =====
C = [("School Research Network", "/school-research-network"), ("Our School Network", "/school-network")]
page("/school-network", "school-network.html", "Our School Network",
     "Schools that are members of the ACRI School Research Network, listed for reference and verification, with school codes and research coordinators.",
     phero("Members", "Our School <em>Network</em>",
           "Schools formally participating in institutionally governed research exposure under ACRI's approved research programmes. Profiles are listed for reference and verification.", C)
     + f"""<section><div class="wrap" style="max-width:1000px">
  <div class="slist" data-dyn="schools">{SEED_SCHOOL}</div>
  <div class="note" style="margin-top:2rem">Inclusion in the ACRI School Research Network reflects formal institutional coordination and does not imply certification, ranking or endorsement of academic performance. This list is updated as schools formally join.</div>
  <div class="ctas"><a class="btn primary" href="/apply">Apply for your school</a></div>
</div></section>""", crumbs=C)

# ===== THINKERS LAB =====
C = [("Students & Schools", "/school-research-network"), ("ACRI Thinkers Lab", "/thinkers-lab")]
page("/thinkers-lab", "thinkers-lab.html", "ACRI Thinkers Lab",
     "ACRI Thinkers Lab is a student forum for reading, dialogue, argumentation and independent thinking, operating under ACRI's Office of the Director of Students.",
     phero("Office of the Director of Students", "ACRI <em>Thinkers Lab</em>",
           "An institutional platform for student dialogue, inquiry and independent thinking.", C[1:], badge="logo-idea")
     + toc_page([
        ("what", "What is ACRI Thinkers Lab?", "<p class='big'>A student-oriented intellectual forum that cultivates habits of reading, discussion, argumentation and reflective thinking beyond formal instruction.</p><p>The Lab does not function as a teaching programme and does not promote ideological positions or advocacy. The emphasis is on disciplined conversation grounded in evidence, clarity of thought and openness to differing viewpoints.</p><div class='callout'><h3>Core orientation</h3><p>Dialogue before debate &middot; Inquiry before opinion &middot; Reason before rhetoric &middot; Openness before alignment</p></div>"),
        ("objectives", "Objectives", ticks(["Encourage independent and critical thinking among students", "Foster a culture of reading, dialogue and inquiry", "Develop skills of articulation, listening and reasoned disagreement", "Provide a neutral space for engagement with ideas and public issues", "Support intellectual maturity and civic responsibility"])),
        ("activities", "Activities &amp; Formats".replace("&amp;", "&"), ticks(["Reading circles and text-based discussions", "Guided group dialogues", "Structured debates and issue discussions", "Guest conversations with scholars and practitioners", "Writing, reflection and idea-exchange sessions"]) + "<div class='note'>Activities are discussion-based and exploratory. They do not lead to certification, academic credit or formal assessment.</div>"),
        ("who", "Who Can Participate?", ticks(["Open to students associated with ACRI initiatives", "Participation based on interest and seriousness of engagement", "No disciplinary or ideological restrictions", "Participants maintain respectful conduct and intellectual openness"])),
        ("context", "Institutional Context", "<p>ACRI Thinkers Lab operates under the Office of the Director of Students and aligns with ACRI's philosophy of integrity, rigour and intellectual openness. Contact: <a href='mailto:director.students@acriindia.org'>director.students@acriindia.org</a></p>"),
     ]), crumbs=C[1:])

# ===== PUBLISHING =====
C = [("Publishing", "/publishing")]
page("/publishing", "publishing.html", "Publishing & Scholarly Bodies",
     "ACRI's scholarly journals (IJBMRS, IJELF, AJESSS), ACRI Publication and the Association of Indian Researchers (AAIR): platforms for academic publishing and scholarly exchange.",
     phero("Publishing &amp; Scholarship", "Journals, publication <em>&amp; researchers</em>",
           "Reliable platforms for academic publishing and scholarly exchange, with editorial independence and academic freedom.", C)
     + """<section><div class="wrap">
  <div class="sec-head"><div><div class="kicker">Scholarly Journals</div><h2>ACRI Group of Journals</h2></div></div>
  <div class="grid3">
    <a class="lcard" href="https://www.ijbmrs.org/"><div class="art"><span class="logo logo-ijbmrs" role="img" aria-label="IJBMRS logo"></span></div><div class="in"><span class="meta">ISSN 3139-115X &middot; SBMC</span><h3>International Journal of Business and Management Research Studies</h3><p>Business, management and commerce research, aligned with the School of Business Management &amp; Commerce.</p><span class="go">www.ijbmrs.org &rarr;</span></div></a>
    <a class="lcard" href="https://www.ijelf.acriindia.org/"><div class="art"><span class="logo logo-ijelf" role="img" aria-label="IJELF logo"></span></div><div class="in"><span class="meta">SEHD</span><h3>International Journal of Education and Learning Futures</h3><p>Education, learning and human development research, aligned with the School of Education &amp; Human Development.</p><span class="go">Visit IJELF &rarr;</span></div></a>
    <a class="lcard" href="https://www.ajesss.acriindia.org/"><div class="art word">AJESSS</div><div class="in"><span class="meta">Energy &amp; Sustainability</span><h3>Journal of Energy, Sustainability &amp; Smart Systems</h3><p>Research on energy, sustainability and smart systems.</p><span class="go">Visit AJESSS &rarr;</span></div></a>
  </div>
</div></section>
<section class="stone" id="publication"><div class="wrap">
  <div class="feature"><span class="logo logo-pub" role="img" aria-label="ACRI Publication logo"></span><div><span class="meta">Est. 2026</span><h3>ACRI Publication</h3><p>ACRI's publishing house, guided by the principle of advancing knowledge collectively. ACRI Publication's website is coming soon.</p></div></div>
  <div class="feature" id="aair"><span class="logo logo-aair" role="img" aria-label="Association of Indian Researchers logo" style="aspect-ratio:1"></span><div><span class="meta">Est. 2026 &middot; An endeavour of ACRI</span><h3>Association of Indian Researchers (AAIR)</h3><p>A national association bringing together researchers to strengthen research culture, collaboration and scholarly exchange across India.</p><div class="ctas" style="margin-top:1rem"><a class="btn navy" href="https://www.aair.acriindia.org/">Visit AAIR</a></div></div></div>
</div></section>""", crumbs=C)

# ===== NEWS =====
C = [("News", "/news")]
page("/news", "news.html", "News & Announcements",
     "Latest news and announcements from the Ahmedabad Centre for Research and Innovation: research programmes, publications, schools and institutional updates.",
     phero("News &amp; Announcements", "From the <em>Centre</em>", "Updates on ACRI's research, publishing, schools and institutional life.", C)
     + f"""<section><div class="wrap"><div class="news-all" data-dyn="news-all">{news_cards()}</div></div></section>""", crumbs=C)

# ===== TRADEMARK =====
C = [("Trademark & IP", "/trademark")]
page("/trademark", "trademark.html", "Trademark & Intellectual Property",
     "Trademark and intellectual property notice for Ahmedabad Centre for Research and Innovation™ (ACRI™): ownership, permitted and restricted use, and copyright.",
     phero("Legal", "Trademark <em>&amp; intellectual property</em>", "Ownership, permitted use and restrictions concerning the ACRI name, marks and website content.", C)
     + toc_page([
        ("ownership", "Ownership", "<p>The names <b>Ahmedabad Centre for Research and Innovation&trade;</b> and <b>ACRI&trade;</b> are proprietary identifiers associated with the activities, publications, programmes, services, initiatives and digital platforms of Ahmedabad Centre for Research and Innovation.</p><p>Unless otherwise stated, all trademark rights and interests in the names &ldquo;Ahmedabad Centre for Research and Innovation&rdquo; and &ldquo;ACRI&rdquo; are claimed by Shah Fenil Pritesh.</p>"),
        ("status", "Trademark Status", "<p>Ahmedabad Centre for Research and Innovation&trade; (ACRI&trade;) is claimed as a trademark. The use of the &trade; symbol indicates a claim of trademark rights and does not imply that the mark is registered.</p><p>Any trademark application, registration or related status shall be determined solely by reference to the records of the relevant trademark authority.</p>"),
        ("permitted", "Permitted Use", "<p>References to Ahmedabad Centre for Research and Innovation (ACRI) for academic, educational, journalistic, informational, scholarly or descriptive purposes are permitted, provided such use:</p>" + ticks(["Does not imply endorsement, sponsorship, accreditation or affiliation where none exists;", "Does not create a likelihood of confusion regarding identity or authority;", "Does not misrepresent any relationship with ACRI or its officers, centres, schools, programmes or initiatives."])),
        ("restricted", "Restricted Use", "<p>Without prior written authorisation, no individual or organisation may:</p>" + ticks(["Represent itself as ACRI or as an official unit, centre, school, office, programme, project or affiliate of ACRI;", "Use the ACRI name, acronym, branding, insignia, logos or identifiers in a manner likely to cause confusion;", "Use ACRI marks in connection with misleading, deceptive, competing or unauthorised activities;", "Register or operate domain names, social media accounts, publications, organisations or business identifiers that falsely suggest an association with ACRI."], no=True)),
        ("copyright", "Copyright", "<p>Unless otherwise stated, original content published on this website is protected by applicable copyright laws. Copyright in specific works may belong to Ahmedabad Centre for Research and Innovation, individual authors, contributors, licensors or other rights holders as indicated.</p>"),
        ("contact", "Contact", "<p>For enquiries concerning trademarks, branding, licensing, copyright, intellectual property or authorised use of ACRI identifiers, please contact <a href='mailto:office.president@acriindia.org'>office.president@acriindia.org</a>.</p>"),
     ]), crumbs=C)

# ===== SITEMAP (human) =====
SITEMAP_GROUPS = [
    ("The Centre", [("/", "Home", "Ahmedabad Centre for Research and Innovation"), ("/about", "About ACRI", "Vision, mission and philosophy"),
                    ("/governance", "Governance", "Framework and independence"), ("/structure", "Institutional Structure", "Offices and contacts"),
                    ("/external-affairs", "Office of External Affairs", "Official communications"), ("/news", "News & Announcements", "Latest updates")]),
    ("Research & Publishing", [("/research", "Research & Innovation", "Approach and principles"), ("/beyond-2030", "Beyond 2030", "Flagship research programme"),
                               ("/beyond-un", "Beyond UN", "Global governance initiative"), ("/publishing", "Publishing & Scholarly Bodies", "Journals, ACRI Publication, AAIR")]),
    ("Students & Schools", [("/school-research-network", "School Research Network", "How it works"), ("/apply", "Apply to Join", "Online school application"),
                            ("/school-network", "Our School Network", "Member schools"), ("/thinkers-lab", "ACRI Thinkers Lab", "Student dialogue forum"),
                            ("/trademark", "Trademark & IP", "Legal notice"), ("/sitemap", "Sitemap", "This page")]),
]
EXTERNAL = [("https://www.sbmc.edu.acriindia.org/", "School of Business Management & Commerce"), ("https://www.sehd.edu.acriindia.org/", "School of Education & Human Development"),
            ("https://www.stsp.edu.acriindia.org/", "School of Technology, Sustainability & Public Policy"), ("https://www.smcs.edu.acriindia.org/", "School of Media & Civic Studies"),
            ("https://www.ijbmrs.org/", "IJBMRS"), ("https://www.ijelf.acriindia.org/", "IJELF"), ("https://www.ajesss.acriindia.org/", "AJESSS"),
            ("https://www.aair.acriindia.org/", "Association of Indian Researchers"), ("https://www.academy.acriindia.org/", "ACRI Academy"),
            ("https://www.acriverse.acriindia.org/", "ACRIVERSE")]
smap = "".join(f'<div><h2>{g}</h2><ul>' + "".join(f'<li><a href="{h}">{html.escape(t)}</a><small>{html.escape(s)}</small></li>' for h, t, s in items) + "</ul></div>" for g, items in SITEMAP_GROUPS)
smap_ext = '<div><h2>Across ACRI</h2><ul>' + "".join(f'<li><a href="{h}">{html.escape(t)}</a><small>{h.replace("https://", "").rstrip("/")}</small></li>' for h, t in EXTERNAL) + "</ul></div>"
C = [("Sitemap", "/sitemap")]
page("/sitemap", "sitemap.html", "Sitemap", "A complete list of pages on the Ahmedabad Centre for Research and Innovation (ACRI) website and its schools, journals and initiatives.",
     phero("Sitemap", "Every page, <em>in one place</em>", "All pages of www.acriindia.org, with links to ACRI's schools, journals and initiatives.", C)
     + f'<section><div class="wrap"><div class="smap">{smap}</div><div class="smap" style="margin-top:3rem;grid-template-columns:1fr">{smap_ext}</div></div></section>', crumbs=C)

# ===== 404 =====
page("/404", "404.html", "Page not found", "The page you were looking for could not be found.",
     phero("Error 404", "Page not <em>found</em>", "The page may have moved. Try the sitemap, or return to the home page.", [("Not found", "/404")])
     + '<section><div class="wrap"><div class="ctas"><a class="btn navy" href="/">Home</a><a class="btn ghost" href="/sitemap">Sitemap</a></div></div></section>', index=False)

# ------------------------------------------------------------------ write
def main():
    (OUT / "assets").mkdir(parents=True, exist_ok=True)
    (OUT / "assets" / "acri.css").write_text(build_css())
    (OUT / "assets" / "acri.js").write_text((ROOT / "acri.js").read_text())
    for file, (path, title, desc, body, kw) in PAGES.items():
        index = kw.pop("index", True)
        crumbs = kw.pop("crumbs", None)
        (OUT / file).write_text(layout(path, title, desc, body, index=index, crumbs=crumbs))
        kw["index"], kw["crumbs"] = index, crumbs
    # standalone pages
    (OUT / "maintenance.html").write_text((ROOT / "maintenance.html").read_text())
    admin = (ROOT / "admin.html").read_text()
    (OUT / "admin.html").write_text(layout("/admin", "Admin", "ACRI website administration.", admin, index=False, chrome=False))
    # sitemap.xml + robots
    urls = [p for f, (p, *_r) in PAGES.items() if p not in ("/404",)]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u in urls:
        pr = "1.0" if u == "/" else ("0.8" if u in ("/about", "/research", "/school-research-network", "/apply", "/beyond-2030") else "0.6")
        xml += f"  <url><loc>{SITE}{u}</loc><lastmod>{TODAY}</lastmod><priority>{pr}</priority></url>\n"
    xml += "</urlset>\n"
    (OUT / "sitemap.xml").write_text(xml)
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: {SITE}/sitemap.xml\n")
    (OUT / "_headers").write_text((ROOT / "_headers").read_text())
    print("built", len(PAGES) + 2, "pages into", OUT)

if __name__ == "__main__":
    main()
