// api/chat.js — Vercel Serverless Function
// Proxy per Groq API (OpenAI-compatible) con risposta tradotta in formato Anthropic
// Variabile d'ambiente richiesta: GROQ_API_KEY

const GROQ_MODEL = "llama-3.3-70b-versatile";

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────────────────
  // Accetta richieste solo dal dominio TopHost (dove vive la PWA)
  res.setHeader("Access-Control-Allow-Origin", "https://www.psicologo-romanord.it");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight request (il browser la invia automaticamente prima della POST cross-origin)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Solo POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GROQ_API_KEY non configurata nelle variabili d'ambiente di Vercel."
    });
  }

  const { max_tokens, system, messages } = req.body;

  // Validazione minima
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Il campo 'messages' è obbligatorio." });
  }

  // Groq usa il formato OpenAI: system come primo messaggio con role "system"
  const groqMessages = [
    ...(system ? [{ role: "system", content: system }] : []),
    ...messages,
  ];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: max_tokens || 1200,
        messages: groqMessages,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Traduce errori Groq in formato leggibile dal frontend
      const errMsg = data?.error?.message || JSON.stringify(data).slice(0, 300);
      return res.status(response.status).json({ error: errMsg });
    }

    // Traduce risposta Groq → formato Anthropic atteso dal frontend
    // Frontend legge: data.content[0].text
    const text = data?.choices?.[0]?.message?.content || "";
    return res.status(200).json({
      content: [{ type: "text", text }],
    });

  } catch (err) {
    return res.status(502).json({
      error: "Errore di comunicazione con il servizio AI: " + err.message
    });
  }
}
