/* ACRI site script: menu, carousel, live Sheet content (fallback when not server-rendered), forms */
(function () {
  "use strict";
  const API = "/api";
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  /* ---------- menu ---------- */
  const burger = $(".burger");
  if (burger) burger.addEventListener("click", () => {
    const open = $("#head").classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
    burger.textContent = open ? "Close" : "Menu";
  });
  $$(".yr").forEach(e => e.textContent = new Date().getFullYear());

  /* ---------- helpers (mirror functions/_shared.js) ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = u => /^(https?:\/\/|\/|mailto:)/i.test(String(u || "").trim()) ? String(u).trim() : "";
  const imgUrl = v => { const s = String(v || "").trim(); if (!s) return ""; if (/^https:\/\//i.test(s)) return s;
    const slug = s.replace(/^\/?files\//, "").replace(/^\//, ""); return /^[a-z0-9][a-z0-9._-]*$/i.test(slug) ? "/files/" + slug : ""; };
  const imgAlt = (v, d, f) => { const k = String(v || "").replace(/^\/?files\//, ""); return (d.files && d.files[k] && d.files[k].alt) || f || ""; };
  const M = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const fmtDate = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || "")); return m ? `${+m[3]} ${M[+m[2] - 1]} ${m[1]}` : ""; };
  const W = "https://commons.wikimedia.org/wiki/Special:FilePath/";
  const DEF = { research: [W + "Carved_Mesh_of_Sidi_Saiyyed_Mosque_Ahmedabad_Gujarat_DSC001.jpg?width=1600", "Carved stone jali of the Sidi Saiyyed Mosque, Ahmedabad"],
                schools: [W + "Adalaj_Stepwell_Interior.jpg?width=1600", "Interior of the Adalaj stepwell"] };

  const newsCard = (n, i, d) => {
    const src = imgUrl(n.image), cat = String(n.category || "").toLowerCase(), date = fmtDate(n.date);
    let media;
    if (src) media = `<div class="ph"><img src="${esc(src)}" alt="${esc(imgAlt(n.image, d, n.title))}" loading="lazy"></div>`;
    else if (/research|programme/.test(cat)) media = `<div class="ph"><img src="${DEF.research[0]}" alt="${DEF.research[1]}" loading="lazy"></div>`;
    else if (/school|student/.test(cat)) media = `<div class="ph"><img src="${DEF.schools[0]}" alt="${DEF.schools[1]}" loading="lazy"></div>`;
    else media = `<div class="ph logo-ph"><span class="logo crest" role="img" aria-label="ACRI"></span></div>`;
    return `<a class="ncard" href="${esc(safeUrl(n.link) || "/news")}">${media}<span class="meta">${esc(n.category || "News")}${date ? ` &middot; <time datetime="${esc(n.date)}">${date}</time>` : ""}</span><h3>${esc(n.title)}</h3>${n.summary ? `<p>${esc(n.summary)}</p>` : ""}</a>`;
  };
  const slideHtml = (s, i, d) => {
    const src = imgUrl(s.image), tag = i ? "h2" : "h1", link = safeUrl(s.link);
    return `<div class="slide${i ? "" : " on"}"><div class="ph">${src ? `<img src="${esc(src)}" alt="${esc(imgAlt(s.image, d, s.title))}">` : ""}</div><div class="shade"></div><div class="hbox">${s.kicker ? `<span class="kicker">${esc(s.kicker)}</span>` : ""}<${tag}>${esc(s.title)}</${tag}>${s.text ? `<p>${esc(s.text)}</p>` : ""}${link ? `<a class="link" href="${esc(link)}">${esc(s.linkLabel || "Learn more")}</a>` : ""}</div></div>`;
  };
  const schoolItem = s => {
    const loc = [s.city, s.state, s.country].filter(Boolean).map(esc).join(" &middot; ");
    const rows = [["Principal", s.principal], ["School Research Coordinator", s.coordinator], ["School Code", s.code]].filter(r => r[1]).map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("");
    return `<details class="sitem"><summary><div><h3>${esc(s.name)}${s.city ? ", " + esc(s.city) : ""}</h3><span class="loc">${loc}</span></div><span class="plus" aria-hidden="true">+</span></summary><div class="det"><dl>${rows}</dl>${s.address ? `<div class="addr"><b>Address</b><br>${esc(s.address)}</div>` : ""}</div></details>`;
  };

  /* ---------- carousel ---------- */
  let timer;
  function carousel() {
    const frame = $(".hero .frame"), dots = $("#dots");
    if (!frame || !dots) return;
    const slides = $$(".slide", frame);
    clearTimeout(timer);
    dots.innerHTML = slides.length > 1 ? slides.map((_, k) => `<button type="button" aria-label="Slide ${k + 1}"${k ? "" : ' class="on"'}></button>`).join("") : "";
    const btns = $$("button", dots);
    let i = Math.max(0, slides.findIndex(s => s.classList.contains("on")));
    const go = n => {
      slides[i].classList.remove("on"); btns[i] && btns[i].classList.remove("on");
      i = (n + slides.length) % slides.length;
      slides[i].classList.add("on"); btns[i] && btns[i].classList.add("on");
      clearTimeout(timer); if (!reduce && slides.length > 1) timer = setTimeout(() => go(i + 1), 8000);
    };
    btns.forEach((b, k) => b.onclick = () => go(k));
    if (!reduce && slides.length > 1) timer = setTimeout(() => go(i + 1), 8000);
  }
  carousel();

  /* ---------- live content when the server didn't render it (e.g. local preview) ---------- */
  function apply(d) {
    $$("[data-dyn]").forEach(el => {
      if (el.hasAttribute("data-ssr")) return;
      const k = el.getAttribute("data-dyn");
      if (k === "news-latest" && d.news.length) el.innerHTML = d.news.slice(0, 3).map((n, i) => newsCard(n, i, d)).join("");
      if (k === "news-all") el.innerHTML = d.news.length ? d.news.map((n, i) => newsCard(n, i, d)).join("") : '<p class="empty">No announcements yet.</p>';
      if (k === "schools" && d.schools.length) el.innerHTML = d.schools.map(schoolItem).join("");
      if (k === "slides" && d.slides && d.slides.length) { el.innerHTML = d.slides.map((s, i) => slideHtml(s, i, d)).join(""); carousel(); }
      if (k === "announcement") {
        const t = String(d.settings.ANNOUNCEMENT_TEXT || "").trim();
        if (t) { const l = safeUrl(d.settings.ANNOUNCEMENT_LINK); el.innerHTML = l ? `<a href="${esc(l)}">${esc(t)}</a>` : esc(t); el.hidden = false; }
      }
    });
    const path = "/" + location.pathname.replace(/\.html$/, "").replace(/^\/+|\/+$/g, "").replace(/^index$/, "");
    const p = d.pages && d.pages[path];
    if (p && !$("[data-dyn][data-ssr]")) {
      const src = imgUrl(p.image), im = $('[data-hero="img"]');
      if (src && im) im.innerHTML = `<img src="${esc(src)}" alt="${esc(imgAlt(p.image, d, p.title))}">${p.credit ? `<span class="credit">${esc(p.credit)}</span>` : ""}`;
      [["kicker", p.kicker], ["title", p.title], ["lead", p.lead]].forEach(([k, v]) => { const e = $(`[data-hero="${k}"]`); if (v && e) e.textContent = v; });
    }
  }
  if ($$("[data-dyn]").some(e => !e.hasAttribute("data-ssr")))
    fetch(API + "?action=public").then(r => r.json()).then(d => d && d.ok && apply(Object.assign({ news: [], schools: [], slides: [], pages: {}, files: {}, settings: {} }, d))).catch(() => {});

  /* ---------- broken image → keep the navy panel ---------- */
  document.addEventListener("error", e => { if (e.target.tagName === "IMG" && e.target.closest(".ph")) e.target.remove(); }, true);

  /* ---------- reveal ---------- */
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
    $$(".rv").forEach(el => io.observe(el));
    setTimeout(() => $$(".rv").forEach(el => el.classList.add("in")), 3000);
  } else $$(".rv").forEach(el => el.classList.add("in"));

  /* ---------- table of contents highlight ---------- */
  const toc = $$(".toc a");
  if (toc.length && "IntersectionObserver" in window) {
    const map = new Map(toc.map(a => [a.getAttribute("href").slice(1), a]));
    const io2 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { toc.forEach(a => a.classList.remove("on")); const a = map.get(e.target.id); a && a.classList.add("on"); } }), { rootMargin: "-30% 0px -60% 0px" });
    $$(".prose > section[id]").forEach(s => io2.observe(s));
  }

  /* ---------- school application ---------- */
  const form = $("#apply-form");
  if (form) form.addEventListener("submit", async ev => {
    ev.preventDefault();
    const msg = $("#apply-msg"), btn = $("#apply-btn");
    const show = t => { msg.textContent = t; msg.classList.add("show"); msg.scrollIntoView({ behavior: "smooth", block: "center" }); };
    msg.classList.remove("show");
    if (!form.checkValidity()) {
      const bad = form.querySelector(":invalid");
      show(bad && bad.id === "agree" ? "Please confirm the declaration to continue." : "Please complete all required fields (marked *).");
      if (bad) bad.focus();
      return;
    }
    const body = { action: "apply" };
    new FormData(form).forEach((v, k) => body[k] = String(v).trim());
    btn.disabled = true; btn.textContent = "Submitting…";
    try {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "Submission failed.");
      form.hidden = true;
      $("#apply-ref").textContent = d.id;
      const done = $("#apply-done"); done.hidden = false; done.scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      show(e.message || "Something went wrong. Please try again, or write to office.secretariats@acriindia.org.");
    } finally { btn.disabled = false; btn.textContent = "Submit application"; }
  });
})();
