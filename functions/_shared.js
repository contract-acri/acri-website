// Shared helpers for ACRI Pages Functions

// Your Apps Script web app. Override in Cloudflare → Settings → Variables: APPS_SCRIPT_URL
export const DEFAULT_GAS =
  "https://script.google.com/macros/s/AKfycbztkvrzpVsd1snnxEN-hpMs_FlH6JGxmjngoytc_TOrUrfh24Oh3pRafBpWqKM2QIZH/exec";
export const gasUrl = env => (env && env.APPS_SCRIPT_URL) || DEFAULT_GAS;
export const PRODUCTION_HOST = "www.acriindia.org";

const PUBLIC_TTL = 60; // seconds — Sheet edits reach the site within about a minute
let memo = { t: 0, data: null };

/** Public Sheet data (settings, news, schools, slides, pages, files), cached ~60 s. */
export async function getPublic(context, { fresh = false } = {}) {
  const { env } = context;
  if (!fresh && memo.data && Date.now() - memo.t < PUBLIC_TTL * 1000) return memo.data;

  const cache = typeof caches !== "undefined" ? caches.default : null;
  const key = new Request("https://acri-cache.internal/public-v2");
  let res = !fresh && cache ? await cache.match(key) : null;

  if (!res) {
    const r = await fetch(gasUrl(env) + "?action=public", { redirect: "follow" });
    if (!r.ok) throw new Error("Apps Script HTTP " + r.status);
    const text = await r.text();
    const parsed = JSON.parse(text);
    if (!parsed.ok) throw new Error(parsed.error || "Apps Script error");
    res = new Response(text, { headers: { "content-type": "application/json", "cache-control": `public, max-age=${PUBLIC_TTL}` } });
    if (cache && context.waitUntil) context.waitUntil(cache.put(key, res.clone()));
  }
  const data = await res.json();
  data.news = data.news || []; data.schools = data.schools || []; data.slides = data.slides || [];
  data.pages = data.pages || {}; data.files = data.files || {}; data.settings = data.settings || {};
  memo = { t: Date.now(), data };
  return data;
}

export const truthy = v => v === true || /^(true|yes|1|on)$/i.test(String(v == null ? "" : v).trim());
export const esc = s => String(s == null ? "" : s)
  .replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const safeUrl = u => (/^(https?:\/\/|\/|mailto:)/i.test(String(u || "").trim()) ? String(u).trim() : "");

/** Image field → URL. Accepts "my-photo-ab12c.jpg", "/files/my-photo-ab12c.jpg" or a full https URL. */
export function imgUrl(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (/^https:\/\//i.test(s)) return s;
  const slug = s.replace(/^\/?files\//, "").replace(/^\//, "");
  return /^[a-z0-9][a-z0-9._-]*$/i.test(slug) ? "/files/" + slug : "";
}
export function imgAlt(v, data, fallback) {
  const slug = String(v || "").replace(/^\/?files\//, "");
  return (data && data.files && data.files[slug] && data.files[slug].alt) || fallback || "";
}

const W = "https://commons.wikimedia.org/wiki/Special:FilePath/";
export const DEFAULT_PHOTOS = {
  research: { src: W + "Carved_Mesh_of_Sidi_Saiyyed_Mosque_Ahmedabad_Gujarat_DSC001.jpg?width=1600", alt: "Carved stone jali of the Sidi Saiyyed Mosque, Ahmedabad" },
  schools: { src: W + "Adalaj_Stepwell_Interior.jpg?width=1600", alt: "Interior of the Adalaj stepwell" },
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function fmtDate(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ""));
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : "";
}

export function newsCard(n, i, data) {
  const link = safeUrl(n.link) || "/news";
  let media = "";
  const src = imgUrl(n.image);
  const cat = String(n.category || "").toLowerCase();
  if (src) media = `<div class="ph"><img src="${esc(src)}" alt="${esc(imgAlt(n.image, data, n.title))}" loading="lazy" decoding="async"></div>`;
  else if (/research|programme/.test(cat)) media = `<div class="ph"><img src="${esc(DEFAULT_PHOTOS.research.src)}" alt="${esc(DEFAULT_PHOTOS.research.alt)}" loading="lazy" decoding="async"></div>`;
  else if (/school|student/.test(cat)) media = `<div class="ph"><img src="${esc(DEFAULT_PHOTOS.schools.src)}" alt="${esc(DEFAULT_PHOTOS.schools.alt)}" loading="lazy" decoding="async"></div>`;
  else media = `<div class="ph logo-ph"><span class="logo crest" role="img" aria-label="ACRI"></span></div>`;
  const date = fmtDate(n.date);
  return `<a class="ncard" href="${esc(link)}">${media}<span class="meta">${esc(n.category || "News")}${date ? ` &middot; <time datetime="${esc(n.date)}">${date}</time>` : ""}</span>` +
    `<h3>${esc(n.title)}</h3>${n.summary ? `<p>${esc(n.summary)}</p>` : ""}</a>`;
}

export function slideHtml(s, i, data) {
  const src = imgUrl(s.image);
  const tag = i === 0 ? "h1" : "h2";
  const link = safeUrl(s.link);
  return `<div class="slide${i === 0 ? " on" : ""}"><div class="ph">${src ? `<img src="${esc(src)}" alt="${esc(imgAlt(s.image, data, s.title))}"${i ? ' loading="lazy"' : ""} decoding="async">` : ""}</div><div class="shade"></div>` +
    `<div class="hbox">${s.kicker ? `<span class="kicker">${esc(s.kicker)}</span>` : ""}<${tag}>${esc(s.title)}</${tag}>${s.text ? `<p>${esc(s.text)}</p>` : ""}` +
    `${link ? `<a class="link" href="${esc(link)}">${esc(s.linkLabel || "Learn more")}</a>` : ""}</div></div>`;
}

export function schoolItem(s) {
  const loc = [s.city, s.state, s.country].filter(Boolean).map(esc).join(" &middot; ");
  const rows = [["Principal", s.principal], ["School Research Coordinator", s.coordinator], ["School Code", s.code]]
    .filter(r => r[1]).map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("");
  return `<details class="sitem"><summary><div><h3>${esc(s.name)}${s.city ? ", " + esc(s.city) : ""}</h3><span class="loc">${loc}</span></div>` +
    `<span class="plus" aria-hidden="true">+</span></summary><div class="det"><dl>${rows}</dl>` +
    (s.address ? `<div class="addr"><b>Address</b><br>${esc(s.address)}</div>` : "") + `</div></details>`;
}

export function normPath(p) {
  return "/" + String(p || "").replace(/\.html$/, "").replace(/^\/+|\/+$/g, "").replace(/^index$/, "");
}
