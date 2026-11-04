# New (university-style) layout pieces, imported by build.py
import html, json

W = "https://commons.wikimedia.org/wiki/Special:FilePath/"
WF = "https://commons.wikimedia.org/wiki/File:"
PHOTOS = {
    "stepwell": {"src": W + "0082423_Rudabai_Step_Well,_Adalaj_Gujarat_146.jpg?width=2400",
                 "alt": "Carved levels of the Adalaj (Rudabai) stepwell near Ahmedabad",
                 "credit": "Adalaj stepwell, Ms Sarah Welch, CC0", "link": WF + "0082423_Rudabai_Step_Well,_Adalaj_Gujarat_146.jpg"},
    "jali": {"src": W + "Carved_Mesh_of_Sidi_Saiyyed_Mosque_Ahmedabad_Gujarat_DSC001.jpg?width=2400",
             "alt": "The carved stone jali of the Sidi Saiyyed Mosque, Ahmedabad",
             "credit": "Sidi Saiyyed jali, Wikimedia Commons", "link": WF + "Carved_Mesh_of_Sidi_Saiyyed_Mosque_Ahmedabad_Gujarat_DSC001.jpg"},
    "interior": {"src": W + "Adalaj_Stepwell_Interior.jpg?width=2400",
                 "alt": "Interior of the Adalaj stepwell",
                 "credit": "Adalaj stepwell interior, Wikimedia Commons", "link": WF + "Adalaj_Stepwell_Interior.jpg"},
}
# default banner photo per page (replace any of them from /admin → Page banners)
PAGE_PHOTO = {"/about": "stepwell", "/research": "jali", "/beyond-2030": "jali", "/beyond-un": "stepwell",
              "/governance": "stepwell", "/structure": "interior", "/external-affairs": "jali",
              "/school-research-network": "interior", "/apply": "interior", "/school-network": "interior",
              "/thinkers-lab": "jali", "/publishing": "stepwell", "/news": "stepwell"}

def img(key, eager=False, w=None):
    p = PHOTOS[key]
    src = p["src"] if not w else p["src"].replace("width=2400", f"width={w}")
    return f'<img src="{html.escape(src)}" alt="{html.escape(p["alt"])}"{"" if eager else " loading=\"lazy\""} decoding="async">'

NAV = [
    ("About", "/about", "About ACRI", "An independent, non-partisan institution, established in Ahmedabad in 2024.",
     [("Who we are", "/about"), ("Governance", "/governance"), ("Institutional structure", "/structure"),
      ("External affairs", "/external-affairs"), ("News", "/news"), ("Trademark & IP", "/trademark")]),
    ("Research", "/research", "Research & innovation", "Rigorous, interdisciplinary and intellectually open inquiry.",
     [("Research at ACRI", "/research"), ("Beyond 2030", "/beyond-2030"), ("Beyond UN", "/beyond-un"),
      ("Association of Indian Researchers", "https://www.aair.acriindia.org/")]),
    ("Schools of Thought", "/#schools", "Schools of Thought", "Four schools, one standard of scholarship.",
     [("Business Management & Commerce", "https://www.sbmc.edu.acriindia.org/"), ("Education & Human Development", "https://www.sehd.edu.acriindia.org/"),
      ("Technology, Sustainability & Public Policy", "https://www.stsp.edu.acriindia.org/"), ("Media & Civic Studies", "https://www.smcs.edu.acriindia.org/")]),
    ("Publishing", "/publishing", "Publishing", "Journals and scholarly bodies with editorial independence.",
     [("Publishing at ACRI", "/publishing"), ("IJBMRS", "https://www.ijbmrs.org/"), ("IJELF", "https://www.ijelf.acriindia.org/"),
      ("AJESSS", "https://www.ajesss.acriindia.org/"), ("ACRI Publication", "/publishing#publication")]),
    ("Schools & students", "/school-research-network", "Schools & students", "Research capacity, built early.",
     [("School Research Network", "/school-research-network"), ("Apply to join", "/apply"), ("Member schools", "/school-network"),
      ("Thinkers Lab", "/thinkers-lab"), ("ACRI Academy", "https://www.academy.acriindia.org/")]),
]

def nav_html(path):
    out = []
    for label, href, h, p, kids in NAV:
        cur = ' aria-current="page"' if href == path or any(k[1] == path for k in kids) else ""
        lis = "".join(f'<li><a href="{u}">{html.escape(t)}</a></li>' for t, u in kids)
        out.append(f'<li><a href="{href}"{cur}>{html.escape(label)}</a><div class="drop"><div class="wrap"><div><h3>{html.escape(h)}</h3>'
                   f'<p>{html.escape(p)}</p></div><ul>{lis}</ul></div></div></li>')
    return "".join(out)

def header(path):
    return f"""<a class="skip" href="#main">Skip to content</a>
<div class="announce" data-dyn="announcement" hidden></div>
<header class="head" id="head">
  <div class="wrap">
    <a class="lockup" href="/" aria-label="ACRI home"><span class="crest logo" role="img" aria-label="ACRI emblem"></span><span class="name">Ahmedabad Centre for<br>Research and Innovation<small>Where ideas become institutions</small></span></a>
    <nav aria-label="Main" style="display:contents"><ul class="menu" id="menu">{nav_html(path)}</ul></nav>
    <a class="apply" href="/apply">Apply</a>
    <button class="burger" type="button" aria-expanded="false" aria-controls="menu">Menu</button>
  </div>
</header>
<main id="main">
"""

def footer():
    credits = " &middot; ".join(f'<a href="{p["link"]}">{html.escape(p["credit"])}</a>' for p in PHOTOS.values())
    return f"""
</main>
<footer class="foot">
  <div class="wrap">
    <div class="top">
      <div><a class="lockup" href="/"><span class="crest logo"></span><span class="name">Ahmedabad Centre for<br>Research and Innovation</span></a>
        <address>Ahmedabad, Gujarat, India<br><a href="mailto:contact@acriindia.org">contact@acriindia.org</a></address>
        <span class="anniv logo logo-anniv" role="img" aria-label="Celebrating 2nd anniversary, 2024 to 2026"></span></div>
      <div><h4>About</h4><ul><li><a href="/about">About ACRI</a></li><li><a href="/governance">Governance</a></li><li><a href="/structure">Institutional structure</a></li><li><a href="/external-affairs">External affairs</a></li><li><a href="/news">News</a></li></ul></div>
      <div><h4>Research &amp; learning</h4><ul><li><a href="/research">Research &amp; innovation</a></li><li><a href="/beyond-2030">Beyond 2030</a></li><li><a href="/beyond-un">Beyond UN</a></li><li><a href="/publishing">Publishing</a></li><li><a href="/school-research-network">School Research Network</a></li><li><a href="/thinkers-lab">Thinkers Lab</a></li></ul></div>
      <div><h4>Contact</h4><ul><li><a href="mailto:office.president@acriindia.org">Office of the President</a></li><li><a href="mailto:office.secretariats@acriindia.org">Research Secretariats</a></li><li><a href="mailto:office.external-affairs@acriindia.org">External affairs</a></li><li><a href="https://www.acriverse.acriindia.org/">ACRIVERSE</a></li><li><a href="/sitemap">Sitemap</a></li><li><a href="/admin">Staff sign-in</a></li></ul></div>
    </div>
    <div class="bot"><span>&copy; <span class="yr">2026</span> Ahmedabad Centre for Research and Innovation &middot; Est. 2024</span><span>Ahmedabad Centre for Research and Innovation&trade; and ACRI&trade; are claimed trademarks &middot; <a href="/trademark">Trademark &amp; IP</a> &middot; <a href="/sitemap">Sitemap</a></span></div>
    <p class="credits">Photographs of Ahmedabad via Wikimedia Commons: {credits}</p>
  </div>
</footer>
<script src="/assets/acri.js" defer></script>
"""

def phero(kicker, title, lead, crumbs, badge=None):
    path = crumbs[-1][1] if crumbs else "/"
    key = PAGE_PHOTO.get(path)
    crumb_html = '<a href="/">Home</a>' + "".join(f' &rsaquo; <a href="{h}">{html.escape(n)}</a>' for n, h in crumbs[:-1]) + \
                 f' &rsaquo; <span>{html.escape(crumbs[-1][0])}</span>'
    photo = img(key, eager=True) if key else ""
    badge_html = f'<span class="badge logo {badge}" role="img" aria-label="{html.escape(crumbs[-1][0])} logo"></span>' if badge else ""
    return f"""<section class="phero">
  <div class="ph" data-hero="img">{photo}</div>
  <div class="hbox">
    <nav class="crumbs" aria-label="Breadcrumb">{crumb_html}</nav>
    <span class="kicker" data-hero="kicker">{kicker}</span>
    <h1 data-hero="title">{title}</h1>
    <p data-hero="lead">{lead}</p>
  </div>
  {badge_html}
  <div class="spacer"></div>
</section>"""

# fallback news (replaced live from the Sheet)
SEED_NEWS = [
    ("Research", "Beyond 2030 begins its Documentation phase", "The programme is building a country-wise archival record of official SDG statements.", "/beyond-2030", "jali"),
    ("Publishing", "IJBMRS publishes Volume 2", "The International Journal of Business and Management Research Studies releases its second volume.", "https://www.ijbmrs.org/", "logo-ijbmrs"),
    ("Schools", "Apple Global School joins the School Research Network", "Students engage with ACRI's governed research programmes.", "/school-network", "interior"),
]
def news_cards(items=SEED_NEWS):
    out = ""
    for cat, title, summ, link, media in items:
        m = f'<div class="ph">{img(media, w=1600)}</div>' if media in PHOTOS else \
            f'<div class="ph logo-ph"><span class="logo {media}" role="img" aria-label="{html.escape(title)}"></span></div>'
        out += f'<a class="ncard" href="{link}">{m}<span class="meta">{cat}</span><h3>{html.escape(title)}</h3><p>{html.escape(summ)}</p></a>'
    return out

SLIDES = [
    ("stepwell", "Ahmedabad Centre for Research and Innovation", "Where ideas become institutions.",
     "An independent research and innovation institution in Ahmedabad, built for the long horizon.", "Discover ACRI", "/about"),
    ("jali", "Flagship research programme", "What comes after the Sustainable Development Goals?",
     "Beyond 2030 is building the evidence base for the next global development agenda.", "Explore Beyond 2030", "/beyond-2030"),
    ("interior", "School Research Network", "Bring research thinking into your school.",
     "Students observe, document and inquire inside ACRI's governed research programmes.", "Apply for your school", "/apply"),
]
def slides_html():
    out = ""
    for i, (k, kick, t, p, ll, l) in enumerate(SLIDES):
        tag = "h1" if i == 0 else "h2"
        out += (f'<div class="slide{" on" if i == 0 else ""}"><div class="ph">{img(k, eager=(i == 0))}</div><div class="shade"></div>'
                f'<div class="hbox"><span class="kicker">{kick}</span><{tag}>{t}</{tag}><p>{p}</p><a class="link" href="{l}">{ll}</a></div></div>')
    return out

def home_body():
    return f"""
<section class="hero" aria-roledescription="carousel" aria-label="Featured">
  <div class="frame" data-dyn="slides">{slides_html()}</div>
  <div class="dots" id="dots"></div>
</section>

<section class="intro">
  <div class="wrap">
    <p class="lead rv">The Ahmedabad Centre for Research and Innovation exists to strengthen research culture and advance knowledge through <em>integrity, rigour and intellectual openness,</em> independent of politics, religion and party.</p>
    <div class="facts rv"><div><b>2024</b><span>Founded in Ahmedabad</span></div><div><b>4</b><span>Schools of Thought</span></div><div><b>3</b><span>Scholarly journals</span></div><div><b>2</b><span>Flagship programmes</span></div></div>
  </div>
</section>

<section id="news">
  <div class="wrap">
    <div class="shead"><div><span class="kicker">News</span><h2>From the Centre</h2></div><a class="link" href="/news">All news</a></div>
    <div class="news-grid" data-dyn="news-latest">{news_cards()}</div>
  </div>
</section>

<section class="quote">
  <div class="ph">{img("stepwell")}</div>
  <div class="wrap"><blockquote class="rv">Ideas begin with individuals. They endure through institutions built to outlast the people who start them.</blockquote><cite>The ACRI conviction</cite></div>
</section>

<section>
  <div class="wrap">
    <div class="shead"><div><span class="kicker">Explore</span><h2>What we do</h2></div><a class="link" href="/about">About ACRI</a></div>
    <div class="tiles">
      <div class="tile rv"><span class="kicker">Research</span><h3>Research &amp; innovation</h3><p>Rigorous, interdisciplinary inquiry grounded in transparent methodology, without ideological alignment or predetermined outcomes.</p><a class="link" href="/research">Research at ACRI</a></div>
      <div class="tile b rv"><span class="kicker">Publishing</span><h3>Journals &amp; scholarly bodies</h3><p>IJBMRS, IJELF, AJESSS, ACRI Publication and the Association of Indian Researchers.</p><a class="link" href="/publishing">Publishing at ACRI</a></div>
      <div class="tile g rv"><span class="kicker">Schools &amp; students</span><h3>Research capacity, early</h3><p>The School Research Network and Thinkers Lab bring governed research and dialogue to students.</p><a class="link" href="/school-research-network">For schools</a></div>
    </div>
  </div>
</section>

<section style="padding-top:0" id="research">
  <div class="wrap">
    <div class="shead"><div><span class="kicker">Flagship programmes</span><h2>Questions larger than a policy cycle</h2></div><a class="link" href="/research">All research</a></div>
    <div class="prow rv">
      <div class="pvis b2030"><span class="logo logo-b2030" role="img" aria-label="Beyond 2030 Project"></span></div>
      <div class="ptxt"><span class="kicker">Research programme &middot; 2026&ndash;2029</span><h3>Beyond 2030</h3><p>If the Sustainable Development Goals end in 2030, what should follow, and on what evidence should it be built?</p>
        <div class="phases"><span class="now">2026 &middot; Documentation</span><span>2027 &middot; Aggregation</span><span>2028 &middot; Gap analysis</span><span>2029 &middot; Post-2030</span></div>
        <a class="link" href="/beyond-2030">Explore the programme</a></div>
    </div>
    <div class="prow flip rv">
      <div class="pvis bun"><div>Beyond&nbsp;<span>UN</span></div><svg viewBox="0 0 200 200" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width="2"><circle cx="100" cy="100" r="96"/><ellipse cx="100" cy="100" rx="45" ry="96"/><line x1="4" y1="100" x2="196" y2="100"/><path d="M14 55h172M14 145h172"/></g></svg></div>
      <div class="ptxt"><span class="kicker">Governance initiative</span><h3>Beyond UN</h3><p>A people-centric experiment in global governance, exploring legitimacy, ethics and cooperation beyond state-centric power. It does not replace the United Nations; it builds what the UN cannot.</p><a class="link" href="/beyond-un">Explore the initiative</a></div>
    </div>
  </div>
</section>

<section class="schools" id="schools">
  <div class="wrap">
    <div class="shead"><div><span class="kicker">Schools of Thought</span><h2>Four schools, one standard of scholarship</h2></div><a class="link" href="https://www.schools.acriindia.org/">All schools</a></div>
    <div class="sgrid">
      <a href="https://www.sbmc.edu.acriindia.org/"><span class="code">SBMC</span><h3>School of Business Management &amp; Commerce</h3><span class="link">Visit</span></a>
      <a href="https://www.sehd.edu.acriindia.org/"><span class="code">SEHD</span><h3>School of Education &amp; Human Development</h3><span class="link">Visit</span></a>
      <a href="https://www.stsp.edu.acriindia.org/"><span class="code">STPP</span><h3>School of Technology, Sustainability &amp; Public Policy</h3><span class="link">Visit</span></a>
      <a href="https://www.smcs.edu.acriindia.org/"><span class="code">SMCS</span><h3>School of Media &amp; Civic Studies</h3><span class="link">Visit</span></a>
    </div>
  </div>
</section>

<section id="publishing">
  <div class="wrap">
    <div class="shead"><div><span class="kicker">Across ACRI</span><h2>Journals, bodies and initiatives</h2></div><a class="link" href="/publishing">Publishing at ACRI</a></div>
    <div class="jstrip">
      <a href="https://www.ijbmrs.org/"><span class="logo logo-ijbmrs" role="img" aria-label="IJBMRS"></span><span>Business &amp; Management Research</span></a>
      <a href="https://www.ijelf.acriindia.org/"><span class="logo logo-ijelf" role="img" aria-label="IJELF"></span><span>Education &amp; Learning Futures</span></a>
      <a href="https://www.ajesss.acriindia.org/"><span class="word">AJESSS</span><span>Energy, Sustainability &amp; Smart Systems</span></a>
      <a href="https://www.aair.acriindia.org/"><span class="logo logo-aair" role="img" aria-label="AAIR"></span><span>Association of Indian Researchers</span></a>
      <a href="/publishing#publication"><span class="logo logo-pub" role="img" aria-label="ACRI Publication"></span><span>ACRI Publication</span></a>
      <a href="/thinkers-lab"><span class="logo logo-idea" role="img" aria-label="ACRI Thinkers Lab"></span><span>ACRI Thinkers Lab</span></a>
    </div>
  </div>
</section>

<section class="band">
  <div class="ph">{img("jali")}</div>
  <div class="wrap"><div><h2>Is your school ready to join the School Research Network?</h2><p>Applications are reviewed by the Office of Research Secretariats.</p></div><a class="btn" href="/apply">Apply online</a></div>
</section>
"""
