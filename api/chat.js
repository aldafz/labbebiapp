// api/chat.js — Vercel Serverless Function
// Proxy per l'API Anthropic Messages (Claude)
// Variabile d'ambiente richiesta: ANTHROPIC_API_KEY

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY non configurata nelle variabili d'ambiente di Vercel."
    });
  }

  const { model, max_tokens, system, messages } = req.body;

  // Validazione minima
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Il campo 'messages' è obbligatorio." });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-20250514",
        max_tokens: max_tokens || 1200,
        system: system || "",
        messages,
      }),
    });

    const data = await response.json();

    // Passa lo status code di Anthropic al client
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(502).json({
      error: "Errore di comunicazione con il servizio AI: " + err.message
    });
  }
}
