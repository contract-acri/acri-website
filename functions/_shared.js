// Shared helpers for ACRI Pages Functions

// Your Apps Script web app. Can be overridden in Cloudflare → Settings → Variables: APPS_SCRIPT_URL
export const DEFAULT_GAS =
  "https://script.google.com/macros/s/AKfycbztkvrzpVsd1snnxEN-hpMs_FlH6JGxmjngoytc_TOrUrfh24Oh3pRafBpWqKM2QIZH/exec";

export const gasUrl = env => (env && env.APPS_SCRIPT_URL) || DEFAULT_GAS;

const PUBLIC_TTL = 60; // seconds — Sheet edits reach the site within about a minute
let memo = { t: 0, data: null };

/** Public Sheet data (settings, news, schools), cached at the edge for PUBLIC_TTL. */
export async function getPublic(context) {
  const { env } = context;
  if (memo.data && Date.now() - memo.t < PUBLIC_TTL * 1000) return memo.data;

  const cache = typeof caches !== "undefined" ? caches.default : null;
  const key = new Request("https://acri-cache.internal/public-v1");
  let res = cache ? await cache.match(key) : null;

  if (!res) {
    const r = await fetch(gasUrl(env) + "?action=public", { redirect: "follow", cf: { cacheTtl: 0 } });
    if (!r.ok) throw new Error("Apps Script HTTP " + r.status);
    const text = await r.text();
    const parsed = JSON.parse(text);
    if (!parsed.ok) throw new Error(parsed.error || "Apps Script error");
    res = new Response(text, { headers: { "content-type": "application/json", "cache-control": `public, max-age=${PUBLIC_TTL}` } });
    if (cache) context.waitUntil(cache.put(key, res.clone()));
  }
  const data = await res.json();
  memo = { t: Date.now(), data };
  return data;
}

export const truthy = v => v === true || /^(true|yes|1|on)$/i.test(String(v == null ? "" : v).trim());

export const esc = s => String(s == null ? "" : s)
  .replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const safeUrl = u => (/^(https?:\/\/|\/|mailto:)/i.test(String(u || "").trim()) ? String(u).trim() : "");

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function fmtDate(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ""));
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : esc(d);
}

const TONES = ["g", "", "b"];
export function newsCard(n, i) {
  const link = safeUrl(n.link) || "/news";
  return `<a class="card ${TONES[i % 3]}" href="${esc(link)}"><div class="band"></div><div class="in">` +
    `<span class="meta">${esc(n.category || "News")}${n.date ? ` &middot; <time datetime="${esc(n.date)}">${fmtDate(n.date)}</time>` : ""}</span>` +
    `<h3>${esc(n.title)}</h3>${n.summary ? `<p>${esc(n.summary)}</p>` : ""}<span class="go">Read more &rarr;</span></div></a>`;
}

export function schoolItem(s) {
  const loc = [s.city, s.state, s.country].filter(Boolean).map(esc).join(" &middot; ");
  const rows = [["Principal", s.principal], ["School Research Coordinator", s.coordinator], ["School Code", s.code]]
    .filter(r => r[1]).map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join("");
  return `<details class="sitem"><summary><div><h3>${esc(s.name)}${s.city ? ", " + esc(s.city) : ""}</h3><span class="loc">${loc}</span></div>` +
    `<span class="plus" aria-hidden="true">+</span></summary><div class="det"><dl>${rows}</dl>` +
    (s.address ? `<div class="addr"><b>Address</b><br>${esc(s.address)}</div>` : "") + `</div></details>`;
}
