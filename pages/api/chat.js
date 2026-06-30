export const config = {
  api: {
    bodyParser: true,
  },
  // Extend Vercel function timeout to 60 seconds
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: req.body.model || "claude-sonnet-4-6",
        max_tokens: req.body.max_tokens || 2000,
        ...(req.body.system ? { system: req.body.system } : {}),
        ...(req.body.tools ? { tools: req.body.tools } : {}),
        messages: req.body.messages,
      }),
    });

    const data = await response.json();

    // Forward Anthropic's status code so the frontend can detect errors
    return res.status(response.status).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
