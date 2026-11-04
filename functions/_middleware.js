// Runs in front of every page on www.acriindia.org.
// 1) Maintenance mode from the Google Sheet (Settings → MAINTENANCE_MODE)
// 2) Writes Sheet content (news, member schools, announcement) into the HTML on the server,
//    so Google indexes it as real page text.
import { getPublic, truthy, esc, safeUrl, newsCard, schoolItem } from "./_shared.js";

const EXEMPT = [/^\/admin/, /^\/api\//, /^\/api$/, /^\/assets\//, /^\/robots\.txt$/, /^\/sitemap\.xml$/, /^\/maintenance/, /^\/favicon/];

class Dyn {
  constructor(data) { this.d = data; }
  element(el) {
    const kind = el.getAttribute("data-dyn");
    const { news = [], schools = [], settings = {} } = this.d;
    let html = null;
    if (kind === "news-latest" && news.length) html = news.slice(0, 3).map(newsCard).join("");
    if (kind === "news-all") html = news.length ? news.map(newsCard).join("") : '<p class="empty">No announcements yet.</p>';
    if (kind === "schools" && schools.length) html = schools.map(schoolItem).join("");
    if (kind === "announcement") {
      const t = String(settings.ANNOUNCEMENT_TEXT || "").trim();
      if (t) {
        const l = safeUrl(settings.ANNOUNCEMENT_LINK);
        html = l ? `<a href="${esc(l)}">${esc(t)} &rarr;</a>` : esc(t);
        el.removeAttribute("hidden");
      }
    }
    if (html !== null) el.setInnerContent(html, { html: true });
    el.setAttribute("data-ssr", "1");
  }
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method !== "GET" && request.method !== "HEAD") return next();
  if (EXEMPT.some(r => r.test(path))) return next();

  let data = null;
  try { data = await getPublic(context); } catch (e) { /* Sheet unreachable: serve static fallback */ }

  if (data && truthy(data.settings && data.settings.MAINTENANCE_MODE)) {
    const page = await env.ASSETS.fetch(new URL("/maintenance", url));
    let html = await page.text();
    const msg = (data.settings.MAINTENANCE_MESSAGE || "We are making improvements to the ACRI website. Please check back shortly.");
    html = html.replace(/<!--MSG-->[\s\S]*?<!--\/MSG-->/, esc(msg));
    return new Response(html, {
      status: 503,
      headers: { "content-type": "text/html;charset=UTF-8", "retry-after": "3600", "cache-control": "no-store", "x-robots-tag": "noindex" }
    });
  }

  const res = await next();
  const type = res.headers.get("content-type") || "";
  if (!data || !type.includes("text/html")) return res;

  const out = new HTMLRewriter().on("[data-dyn]", new Dyn(data)).transform(res);
  const headers = new Headers(out.headers);
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  return new Response(out.body, { status: out.status, headers });
}
