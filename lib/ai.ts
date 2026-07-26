const GROQ_BASE = "https://api.groq.com/openai/v1";
const MODEL = "llama-3.3-70b-versatile";

async function groqChat(messages: { role: string; content: string }[]): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    let clean = text;
    try { clean = JSON.parse(text).error?.message || text; } catch {}
    throw new Error(`Groq error ${res.status}: ${clean}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function summarizeChange(change: {
  change_type: string;
  severity: string;
  fields: { label: string; before: string; after: string }[];
}): Promise<string> {
  const fieldsText = change.fields
    .map((f) => {
      const before = f.before ? f.before.slice(0, 200) : "(empty)";
      const after = f.after ? f.after.slice(0, 200) : "(empty)";
      return `- ${f.label}: "${before}" → "${after}"`;
    })
    .join("\n");

  const prompt = `You are a competitive intelligence analyst. Summarize the following website change in 1-2 plain-English sentences suitable for a Slack notification. Focus on what a marketing strategist would care about.

Change type: ${change.change_type}
Severity: ${change.severity}

Fields changed:
${fieldsText}

Write a concise, actionable summary:`;

  try {
    const summary = await groqChat([
      { role: "system", content: "You are a helpful competitive intelligence analyst." },
      { role: "user", content: prompt },
    ]);
    return summary;
  } catch {
    return "";
  }
}

export async function strategicChat(
  question: string,
  context: { competitor_name?: string; change_type?: string; severity?: string }[]
): Promise<string> {
  const contextText = context.length > 0
    ? `Recent changes:\n${context.map((c) => `- ${c.competitor_name || "Unknown"}: ${c.change_type || "Unknown"} change (${c.severity || "unknown"})`).join("\n")}`
    : "No recent changes available.";

  const prompt = `You are a competitive strategy advisor analyzing competitor website changes. Use the following recent change data to answer the question.

${contextText}

Question: ${question}

Provide a concise, data-driven strategic insight:`;

  try {
    const answer = await groqChat([
      { role: "system", content: "You are a competitive strategy advisor helping a product marketing team understand competitor moves." },
      { role: "user", content: prompt },
    ]);
    return answer;
  } catch {
    return "AI analysis is currently unavailable. Make sure GROQ_API_KEY is set.";
  }
}
