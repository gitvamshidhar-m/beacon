import { NextResponse } from "next/server";
import { listRecentChanges } from "@/lib/db";
import { strategicChat } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json({ answer: "GROQ_API_KEY not set. Add it in Vercel env vars." });
  }

  const body = await request.json();
  const question = body.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  const recent = await listRecentChanges(50);
  const context = recent.map((c) => ({
    competitor_name: c.competitor_name,
    change_type: c.change_type,
    severity: c.severity,
  }));

  const answer = await strategicChat(question, context);
  return NextResponse.json({ answer });
}
