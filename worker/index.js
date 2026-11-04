// Cloudflare Worker entry: serves the static site in /public and runs the same logic as the
// Pages Functions (maintenance mode, live Sheet content, /api bridge, /files media).
import { onRequest as middleware } from "../functions/_middleware.js";
import { onRequestGet as apiGet, onRequestPost as apiPost } from "../functions/api/index.js";
import { onRequestGet as filesGet } from "../functions/files/[[path]].js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const context = {
      request, env,
      waitUntil: p => ctx.waitUntil(p),
      next: () => env.ASSETS.fetch(request),
    };

    // send acriindia.org (no www) to the canonical www address
    if (url.hostname === "acriindia.org") {
      url.hostname = "www.acriindia.org";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      if (request.method === "GET" || request.method === "HEAD") return apiGet(context);
      if (request.method === "POST") return apiPost(context);
      return new Response("Method not allowed", { status: 405 });
    }
    if (url.pathname.startsWith("/files/")) {
      if (request.method === "GET" || request.method === "HEAD") return filesGet(context);
      return new Response("Method not allowed", { status: 405 });
    }
    return middleware(context);
  }
};
