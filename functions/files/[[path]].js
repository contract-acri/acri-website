// /files/<name> — serves images uploaded in /admin (stored in Google Drive) from your own domain,
// cached at Cloudflare's edge for a year (each upload gets a unique name, so it never goes stale).
import { getPublic } from "../_shared.js";

const YEAR = 31536000;

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const slug = decodeURIComponent(url.pathname.replace(/^\/files\//, ""));
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(slug)) return new Response("Not found", { status: 404 });

  const cache = typeof caches !== "undefined" ? caches.default : null;
  const key = new Request(url.origin + "/files/" + slug);
  if (cache) { const hit = await cache.match(key); if (hit) return hit; }

  let data, f;
  try {
    data = await getPublic(context);
    f = data.files[slug];
    if (!f) { data = await getPublic(context, { fresh: true }); f = data.files[slug]; } // just uploaded
  } catch (e) { return new Response("Backend unavailable", { status: 502 }); }
  if (!f) return new Response("Not found", { status: 404 });

  const sources = [
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(f.id)}`,
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(f.id)}&export=view`,
    `https://lh3.googleusercontent.com/d/${encodeURIComponent(f.id)}=w2400`
  ];
  for (const src of sources) {
    try {
      const r = await fetch(src, { redirect: "follow" });
      const ct = r.headers.get("content-type") || "";
      if (!r.ok || ct.includes("text/html")) continue;            // Drive sometimes answers with an HTML page
      const body = await r.arrayBuffer();
      const res = new Response(body, {
        headers: {
          "content-type": f.type || ct || "application/octet-stream",
          "cache-control": `public, max-age=${YEAR}, immutable`,
          "x-content-type-options": "nosniff"
        }
      });
      if (cache) context.waitUntil(cache.put(key, res.clone()));
      return res;
    } catch (e) { /* try next source */ }
  }
  return new Response("File temporarily unavailable", { status: 502, headers: { "cache-control": "no-store" } });
}
