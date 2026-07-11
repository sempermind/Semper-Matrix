// pages/api/chat.js
// Plain, non-streaming proxy to the Anthropic API.
// Works with the parallel-split analysis in index.jsx, and with AI Search
// and image upload (unchanged behaviour). No streaming, no special setup.

// Raise the timeout ceiling as a safety margin (Hobby max is 60s).
export const config = { maxDuration: 60 };

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// Checks the common env var names so it works whatever yours is called.
// Set ONE of these in Vercel -> Project -> Settings -> Environment Variables.
const API_KEY =
  process.env.ANTHROPIC_API_KEY ||
  process.env.CLAUDE_API_KEY ||
  process.env.ANTHROPIC_KEY ||
  process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!API_KEY) {
    return res.status(500).json({ error: "missing_api_key", hint: "Set ANTHROPIC_API_KEY in Vercel env vars." });
  }

  let payload = req.body;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); } catch { payload = {}; }
  }
  // The front end never needs streaming here; strip it if present.
  if (payload && payload.stream) delete payload.stream;

  try {
    const upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: "upstream_error" });
  }
}
