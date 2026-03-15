export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, system, max_tokens } = req.body;

    // Convert Anthropic format → OpenAI/Groq format
    const groqMessages = [];
    if (system) groqMessages.push({ role: "system", content: system });
    groqMessages.push(...messages);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        max_tokens: max_tokens || 1000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Errore Groq" });
    }

    // Convert Groq response → Anthropic format (so the app doesn't change)
    res.status(200).json({
      content: [{ type: "text", text: data.choices?.[0]?.message?.content || "" }]
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
