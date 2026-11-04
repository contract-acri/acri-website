// /api — the only bridge between the website and the Apps Script backend.
// GET  /api?action=public   → public Sheet data (cached ~60s)
// POST /api {action:...}    → school application + admin actions (never cached)
import { getPublic, gasUrl } from "../_shared.js";

const JSON_HEADERS = { "content-type": "application/json;charset=UTF-8" };
const ALLOWED = new Set(["apply", "admin.login", "admin.logout", "admin.data", "admin.updateApplication",
  "admin.saveNews", "admin.deleteNews", "admin.saveSchool", "admin.saveSettings"]);

export async function onRequestGet(context) {
  const action = new URL(context.request.url).searchParams.get("action") || "public";
  if (action !== "public") return new Response(JSON.stringify({ ok: false, error: "Unknown action" }), { status: 400, headers: JSON_HEADERS });
  try {
    const data = await getPublic(context);
    return new Response(JSON.stringify(data), { headers: { ...JSON_HEADERS, "cache-control": "public, max-age=60" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "Backend unavailable" }), { status: 502, headers: JSON_HEADERS });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), { status: 403, headers: JSON_HEADERS });
  }
  const raw = await request.text();
  if (raw.length > 30000) return new Response(JSON.stringify({ ok: false, error: "Request too large" }), { status: 413, headers: JSON_HEADERS });

  let body;
  try { body = JSON.parse(raw); } catch { return new Response(JSON.stringify({ ok: false, error: "Invalid request" }), { status: 400, headers: JSON_HEADERS }); }
  if (!ALLOWED.has(body.action)) return new Response(JSON.stringify({ ok: false, error: "Unknown action" }), { status: 400, headers: JSON_HEADERS });

  body._ip = request.headers.get("cf-connecting-ip") || "";   // used for rate-limiting applications

  try {
    // Apps Script answers POST with a 302 to googleusercontent.com; following it returns the JSON.
    const r = await fetch(gasUrl(env), {
      method: "POST", redirect: "follow",
      headers: { "content-type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body)
    });
    const text = await r.text();
    JSON.parse(text); // make sure we only ever pass JSON back
    return new Response(text, { headers: { ...JSON_HEADERS, "cache-control": "no-store" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "The server could not be reached. Please try again." }), { status: 502, headers: JSON_HEADERS });
  }
}
