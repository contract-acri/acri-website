/* ACRI site script: menu, live Sheet content (fallback when not server-rendered), school application */
(function () {
  "use strict";
  const API = "/api";

  /* ---------- menu ---------- */
  const burger = document.querySelector(".burger");
  if (burger) burger.addEventListener("click", () => {
    const m = document.getElementById("mast");
    const open = m.classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
    burger.textContent = open ? "Close" : "Menu";
  });
  document.querySelectorAll(".yr").forEach(e => e.textContent = new Date().getFullYear());

  /* ---------- render helpers (mirror functions/_render.js) ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = u => /^(https?:\/\/|\/|mailto:)/i.test(String(u || "").trim()) ? String(u).trim() : "";
  const fmtDate = d => { const t = new Date(d); return isNaN(t) ? esc(d) : t.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); };
  const tones = ["g", "", "b"];
  const newsCard = (n, i) => {
    const link = safeUrl(n.link) || "/news";
    return `<a class="card ${tones[i % 3]}" href="${esc(link)}"><div class="band"></div><div class="in">` +
      `<span class="meta">${esc(n.category || "News")}${n.date ? " &middot; <time datetime=\"" + esc(n.date) + "\">" + fmtDate(n.date) + "</time>" : ""}</span>` +
      `<h3>${esc(n.title)}</h3>${n.summary ? "<p>" + esc(n.summary) + "</p>" : ""}<span class="go">Read more &rarr;</span></div></a>`;
  };
  const schoolItem = s => {
    const loc = [s.city, s.state, s.country].filter(Boolean).map(esc).join(" &middot; ");
    const rows = [["Principal", s.principal], ["School Research Coordinator", s.coordinator], ["School Code", s.code]]
      .filter(r => r[1]).map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("");
    return `<details class="sitem"><summary><div><h3>${esc(s.name)}${s.city ? ", " + esc(s.city) : ""}</h3><span class="loc">${loc}</span></div>` +
      `<span class="plus" aria-hidden="true">+</span></summary><div class="det"><dl>${rows}</dl>` +
      (s.address ? `<div class="addr"><b>Address</b><br>${esc(s.address)}</div>` : "") + `</div></details>`;
  };

  function apply(data) {
    document.querySelectorAll("[data-dyn]").forEach(el => {
      if (el.hasAttribute("data-ssr")) return;              // already filled on the server
      const kind = el.getAttribute("data-dyn");
      if (kind === "news-latest" && data.news.length) el.innerHTML = data.news.slice(0, 3).map(newsCard).join("");
      if (kind === "news-all") el.innerHTML = data.news.length ? data.news.map(newsCard).join("") : '<p class="empty">No announcements yet.</p>';
      if (kind === "schools" && data.schools.length) el.innerHTML = data.schools.map(schoolItem).join("");
      if (kind === "announcement") {
        const t = String(data.settings.ANNOUNCEMENT_TEXT || "").trim();
        if (t) { const l = safeUrl(data.settings.ANNOUNCEMENT_LINK); el.innerHTML = l ? `<a href="${esc(l)}">${esc(t)} &rarr;</a>` : esc(t); el.hidden = false; }
      }
    });
  }
  const pending = [...document.querySelectorAll("[data-dyn]")].some(e => !e.hasAttribute("data-ssr"));
  if (pending) fetch(API + "?action=public").then(r => r.json()).then(d => d && d.ok && apply(d)).catch(() => {});

  /* ---------- school application ---------- */
  const form = document.getElementById("apply-form");
  if (form) form.addEventListener("submit", async ev => {
    ev.preventDefault();
    const msg = document.getElementById("apply-msg"), btn = document.getElementById("apply-btn");
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
      document.getElementById("apply-ref").textContent = d.id;
      const done = document.getElementById("apply-done"); done.hidden = false;
      done.scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      show(e.message || "Something went wrong. Please try again, or write to office.secretariats@acriindia.org.");
    } finally {
      btn.disabled = false; btn.textContent = "Submit application";
    }
  });
})();
