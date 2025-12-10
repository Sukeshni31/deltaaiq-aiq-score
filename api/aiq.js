// api/aiq.js
// Vercel serverless function to compute AIQ using OpenAI

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const { company, industry, region, size } = req.body || {};

    if (!company || typeof company !== "string") {
      return res.status(400).json({ error: "company is required" });
    }

    const prompt = `
You are an AI transformation consultant.
For the company described below, estimate its AI maturity (AIQ score) and return a strict JSON object.

Company: ${company}
Industry: ${industry || "unknown"}
Region: ${region || "unknown"}
Size: ${size || "unknown"}

AIQ is on a 0–100 scale.

Return ONLY valid JSON with this exact structure and nothing else:

{
  "aiqScore": number,                 // 0-100
  "industryAverage": number,          // 0-100
  "leadersAverage": number,           // 0-100
  "summary": string,                  // 2-3 sentence executive summary
  "strengths": [string, ...],         // 3-5 bullet strengths
  "gaps": [string, ...],              // 3-5 bullet gaps
  "roadmap": [string, ...],           // 4-7 actions for next 90 days
  "pillars": [
    {
      "name": "AI Talent & Skills",
      "score": number,
      "comment": string
    },
    {
      "name": "Data & Infrastructure",
      "score": number,
      "comment": string
    },
    {
      "name": "Automation & Operations",
      "score": number,
      "comment": string
    },
    {
      "name": "AI in Products & CX",
      "score": number,
      "comment": string
    },
    {
      "name": "Governance & Risk",
      "score": number,
      "comment": string
    }
  ]
}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "You are a strict JSON generator for AI maturity (AIQ) assessments. Never include commentary outside of JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);
      return res.status(500).json({
        error: data.error?.message || "OpenAI API error"
      });
    }

    const content = data.choices?.[0]?.message?.content || "";
    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("Failed to parse JSON from OpenAI:", content);
      return res.status(500).json({ error: "Invalid JSON from OpenAI" });
    }

    // Basic sanity defaults
    const result = {
      aiqScore: parsed.aiqScore ?? 45,
      industryAverage: parsed.industryAverage ?? 52,
      leadersAverage: parsed.leadersAverage ?? 78,
      summary: parsed.summary ?? "",
      strengths: parsed.strengths ?? [],
      gaps: parsed.gaps ?? [],
      roadmap: parsed.roadmap ?? [],
      pillars: parsed.pillars ?? []
    };

    return res.status(200).json(result);
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
