import { NextResponse } from "next/server";
import { listRecentChanges } from "@/lib/db";
import { strategicChat } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json({ suggestions: "Set GROQ_API_KEY to enable AI strategy suggestions." });
  }

  const recent = await listRecentChanges(20);
  if (recent.length === 0) {
    return NextResponse.json({ suggestions: "No recent changes to analyze. Take some snapshots first." });
  }

  const context = recent.map((c) => ({
    competitor_name: c.competitor_name,
    change_type: c.change_type,
    severity: c.severity,
  }));

  const question = "Based on these competitor moves, what counter-strategies should I consider? Give 3 specific, actionable recommendations for a marketing strategist.";
  const answer = await strategicChat(question, context);
  return NextResponse.json({ suggestions: answer });
}
