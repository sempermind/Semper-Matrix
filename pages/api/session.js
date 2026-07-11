// api/session.js
// Saves and loads a rep's Matrix session by resume code.
// Storage: Upstash Redis (the "KV" integration in the Vercel Marketplace).
// Provisioning the store auto-injects the env vars below — no code change needed.
// If the store isn't set up yet, this returns 503 and the app quietly falls back
// to this-device localStorage, so nothing breaks while you're setting it up.

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Sessions expire after 90 days of no updates — keeps the free tier tidy.
// Every save resets the clock, so an actively-used Matrix never expires.
const TTL_SECONDS = 60 * 60 * 24 * 90;

// Cap stored payload size (defensive — a Matrix session is a few KB at most).
const MAX_BYTES = 512 * 1024;

async function redis(command) {
  const resp = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!resp.ok) throw new Error(`redis ${resp.status}`);
  return resp.json();
}

function validCode(code) {
  return typeof code === "string" && /^SEMPER-[A-Z0-9]{4,8}$/.test(code.toUpperCase());
}

export default async function handler(req, res) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    // Storage not provisioned yet — app falls back to local save.
    return res.status(503).json({ error: "storage_not_configured" });
  }

  try {
    if (req.method === "GET") {
      const code = (req.query.code || "").toString().toUpperCase();
      if (!validCode(code)) return res.status(400).json({ error: "bad_code" });
      const out = await redis(["GET", `matrix:${code}`]);
      if (!out || out.result == null) return res.status(404).json({ error: "not_found" });
      let session;
      try { session = JSON.parse(out.result); } catch { return res.status(500).json({ error: "corrupt" }); }
      return res.status(200).json({ session });
    }

    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
      const { code, session } = body || {};
      if (!validCode(code)) return res.status(400).json({ error: "bad_code" });
      if (!session || typeof session !== "object") return res.status(400).json({ error: "missing_session" });

      const payload = JSON.stringify(session);
      if (payload.length > MAX_BYTES) return res.status(413).json({ error: "too_large" });

      const key = `matrix:${code.toUpperCase()}`;
      await redis(["SET", key, payload]);
      await redis(["EXPIRE", key, TTL_SECONDS]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method_not_allowed" });
  } catch (e) {
    return res.status(500).json({ error: "server_error" });
  }
}
