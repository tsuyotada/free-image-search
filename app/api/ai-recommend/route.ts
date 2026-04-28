export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 503 }
    )
  }

  let prompt: string
  try {
    const body = await req.json()
    prompt = (body.prompt ?? "").trim()
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!prompt) {
    return Response.json({ error: "prompt is required" }, { status: 400 })
  }

  const system = `You are a stock photo search expert.
The user may write in Japanese or English. First, extract the following elements from their description:
- Intended use (e.g. website, SNS, presentation, flyer)
- Subject or object (what is in the frame)
- Setting or background (where it takes place)
- Mood or atmosphere (e.g. calm, energetic, luxurious, cozy)
- Color or lighting (e.g. warm light, golden hour, soft natural light, dark tone)

Then generate 3 to 5 short English search queries for stock photo sites.
Each query must focus on a DIFFERENT angle — do not overlap:
- One query focused on the subject or object
- One query focused on the scene or setting
- One query focused on mood or atmosphere
- One query focused on color or lighting (if relevant)
- One optional query for lifestyle or use-case context

Return ONLY valid JSON in this exact format: {"queries": ["query1", "query2", "query3"]}
Rules:
- Each query must be 2-5 words, in English
- Queries must not be too similar to each other
- No inappropriate content
- No explanations outside the JSON`

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      max_tokens: 200,
      temperature: 0.7,
    }),
  })

  if (!openaiRes.ok) {
    const err = await openaiRes.text()
    console.error("OpenAI error:", err)
    return Response.json({ error: "AI service error" }, { status: 502 })
  }

  const openaiData = await openaiRes.json()
  const content = openaiData.choices?.[0]?.message?.content ?? "{}"

  let queries: string[]
  try {
    const parsed = JSON.parse(content)
    queries = Array.isArray(parsed.queries)
      ? parsed.queries.filter((q: unknown) => typeof q === "string").slice(0, 5)
      : []
  } catch {
    return Response.json({ error: "Failed to parse AI response" }, { status: 502 })
  }

  if (queries.length === 0) {
    return Response.json({ error: "AI returned no queries" }, { status: 502 })
  }

  return Response.json({ queries })
}
