import { NextResponse } from "next/server";
import { getChange } from "@/lib/db";
import { summarizeChange } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json({ summary: null, reason: "GROQ_API_KEY not set" });
  }

  const body = await request.json();
  const changeId = Number(body.changeId);
  if (!changeId) {
    return NextResponse.json({ error: "Missing changeId" }, { status: 400 });
  }

  const change = await getChange(changeId);
  if (!change) {
    return NextResponse.json({ error: "Change not found" }, { status: 404 });
  }

  const summary = await summarizeChange(change);
  return NextResponse.json({ summary, change_id: changeId });
}
