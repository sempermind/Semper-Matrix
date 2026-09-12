// pages/api/session.js — Field Trainer opportunity store
// ─────────────────────────────────────────────────────────────────────────────
// The Field Trainer's own project has no working store wired to /api/session,
// which is why reopen-by-code failed here while it works in the Matrix tool.
// Rather than stand up a second store, this route forwards every save and
// reopen to the Matrix tool's already-working /api/session. That's a plain
// server-to-server call — no CORS, nothing to configure, and the Matrix tool
// is not touched. A code saved in the Field Trainer lands in the same store the
// Matrix tool uses, so it reopens in both apps.
//
// The front end (index.jsx) needs NO changes — it still calls /api/session on
// this same origin exactly as before.
//
// ▼▼▼ THE ONLY LINE TO CHECK ▼▼▼
// This must be the address of your WORKING Matrix app's session endpoint.
// If your Matrix tool lives somewhere other than semper-matrix.vercel.app,
// change this one line to match it.
const MATRIX_API = "https://semper-matrix.vercel.app/api/session";
// ▲▲▲ ───────────────────────── ▲▲▲

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const code = (req.query.code || "").toString();
      if (!code) return res.status(400).json({ session: null, error: "missing code" });

      const r = await fetch(`${MATRIX_API}?code=${encodeURIComponent(code)}`);
      const data = await r.json().catch(() => ({ session: null }));
      // Pass the session straight back in the shape the front end expects.
      return res.status(200).json({ session: data.session ?? null });
    }

    if (req.method === "POST") {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const { code, session } = body;
      if (!code || !session) {
        return res.status(400).json({ ok: false, error: "missing code or session" });
      }

      const r = await fetch(MATRIX_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, session }),
      });
      if (!r.ok) return res.status(502).json({ ok: false, error: "upstream save failed" });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "method not allowed" });
  } catch (e) {
    // Degrade gracefully so the app falls back to device-local storage instead
    // of throwing at the rep.
    if (req.method === "GET") return res.status(200).json({ session: null });
    return res.status(500).json({ ok: false, error: "proxy error" });
  }
}
