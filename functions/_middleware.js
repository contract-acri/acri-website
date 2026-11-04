// Runs in front of every page.
// 1) Maintenance mode from the Google Sheet (Settings → MAINTENANCE_MODE)
// 2) Writes Sheet content into the HTML on the server (home slides, page banners, news, member schools,
//    announcement bar) so Google indexes it as real page text.
// 3) Any host other than www.acriindia.org (e.g. acriindia.org.in, *.pages.dev) is marked noindex.
import { getPublic, truthy, esc, safeUrl, newsCard, slideHtml, schoolItem, imgUrl, imgAlt, normPath, PRODUCTION_HOST } from "./_shared.js";

const EXEMPT = [/^\/admin/, /^\/api(\/|$)/, /^\/assets\//, /^\/files\//, /^\/robots\.txt$/, /^\/sitemap\.xml$/, /^\/maintenance/, /^\/favicon/];

class Dyn {
  constructor(data, path) { this.d = data; this.path = path; }
  element(el) {
    const kind = el.getAttribute("data-dyn");
    const { news, schools, settings, slides } = this.d;
    let html = null;
    if (kind === "news-latest" && news.length) html = news.slice(0, 3).map((n, i) => newsCard(n, i, this.d)).join("");
    if (kind === "news-all") html = news.length ? news.map((n, i) => newsCard(n, i, this.d)).join("") : '<p class="empty">No announcements yet.</p>';
    if (kind === "schools" && schools.length) html = schools.map(schoolItem).join("");
    if (kind === "slides" && slides.length) html = slides.map((s, i) => slideHtml(s, i, this.d)).join("");
    if (kind === "announcement") {
      const t = String(settings.ANNOUNCEMENT_TEXT || "").trim();
      if (t) {
        const l = safeUrl(settings.ANNOUNCEMENT_LINK);
        html = l ? `<a href="${esc(l)}">${esc(t)}</a>` : esc(t);
        el.removeAttribute("hidden");
      }
    }
    if (html !== null) el.setInnerContent(html, { html: true });
    el.setAttribute("data-ssr", "1");
  }
}

// Page banner overrides from the "Pages" tab
class Hero {
  constructor(page, data) { this.p = page; this.d = data; }
  element(el) {
    const part = el.getAttribute("data-hero");
    const p = this.p;
    if (part === "img" && p.image) {
      const src = imgUrl(p.image);
      if (src) el.setInnerContent(`<img src="${esc(src)}" alt="${esc(imgAlt(p.image, this.d, p.title))}" decoding="async">` +
        (p.credit ? `<span class="credit">${esc(p.credit)}</span>` : ""), { html: true });
    }
    if (part === "kicker" && p.kicker) el.setInnerContent(p.kicker);
    if (part === "title" && p.title) el.setInnerContent(p.title);
    if (part === "lead" && p.lead) el.setInnerContent(p.lead);
  }
}

function markTest(res, url) {
  if (url.hostname === PRODUCTION_HOST) return res;
  const h = new Headers(res.headers);
  h.set("x-robots-tag", "noindex, nofollow");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  return markTest(await handle(context, url), url);
}

async function handle(context, url) {
  const { request, next, env } = context;
  const path = url.pathname;
  if (request.method !== "GET" && request.method !== "HEAD") return next();
  if (EXEMPT.some(r => r.test(path))) return next();

  let data = null;
  try { data = await getPublic(context); } catch (e) { /* Sheet unreachable: serve the static page */ }

  if (data && truthy(data.settings.MAINTENANCE_MODE)) {
    const page = await env.ASSETS.fetch(new URL("/maintenance", url));
    let html = await page.text();
    const msg = data.settings.MAINTENANCE_MESSAGE || "We are making improvements to the ACRI website. Please check back shortly.";
    html = html.replace(/<!--MSG-->[\s\S]*?<!--\/MSG-->/, esc(msg));
    return new Response(html, {
      status: 503,
      headers: { "content-type": "text/html;charset=UTF-8", "retry-after": "3600", "cache-control": "no-store", "x-robots-tag": "noindex" }
    });
  }

  const res = await next();
  const type = res.headers.get("content-type") || "";
  if (!data || !type.includes("text/html")) return res;

  let rw = new HTMLRewriter().on("[data-dyn]", new Dyn(data, path));
  const page = data.pages[normPath(path)];
  if (page) rw = rw.on("[data-hero]", new Hero(page, data));
  const out = rw.transform(res);
  const headers = new Headers(out.headers);
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  return new Response(out.body, { status: out.status, headers });
}
