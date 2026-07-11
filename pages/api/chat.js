// api/chat.js
// ───────────────────────────────────────────────────────────────────────────
// IMPORTANT — reconcile this with your EXISTING chat route before overwriting.
// If your current /api/chat already works for AI Search and image upload, you
// only need TWO things from this file:
//   1. `export const config = { maxDuration: 60 }`  (raises the timeout ceiling)
//   2. the `if (payload.stream) { ... }` streaming branch below
// Keep whatever API-key handling and headers your current route already uses.
// This full version is provided as a known-good reference / drop-in.
// ───────────────────────────────────────────────────────────────────────────

// Allow up to 60s (Hobby max). On Pro you can raise this to 300.
export const config = { maxDuration: 60 };

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
// Reconcile this with your existing env var name if it differs:
const API_KEY = process.env.ANTHROPIC_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!API_KEY) {
    return res.status(500).json({ error: "missing_api_key" });
  }

  let payload = req.body;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); } catch { payload = {}; }
  }

  const headers = {
    "content-type": "application/json",
    "x-api-key": API_KEY,
    "anthropic-version": "2023-06-01",
  };

  try {
    const upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    // ── STREAMING PATH ──────────────────────────────────────────────
    // When the client asks for stream:true (the analysis call), pipe the
    // Server-Sent Events straight through. This keeps the connection alive
    // for the whole generation, so it never trips the function timeout.
    if (payload.stream) {
      res.writeHead(upstream.status, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      });
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
        if (typeof res.flush === "function") res.flush();
      }
      res.end();
      return;
    }

    // ── NON-STREAMING PATH ──────────────────────────────────────────
    // Used by AI Search (with the web_search tool) and image upload.
    // Unchanged behaviour: return the full JSON body.
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: "upstream_error" });
  }
}
