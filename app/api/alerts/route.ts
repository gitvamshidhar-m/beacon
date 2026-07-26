import { NextResponse } from "next/server";
import { listAlertRules, upsertAlertRule, deleteAlertRule } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rules = await listAlertRules();
  return NextResponse.json({ rules });
}

export async function POST(request: Request) {
  const body = await request.json();
  const id = await upsertAlertRule({
    id: body.id || undefined,
    competitor_id: body.competitor_id ?? null,
    change_type: body.change_type || "*",
    severity: body.severity || "medium",
    channel: body.channel || "slack",
    enabled: body.enabled ?? 1,
  });
  const rules = await listAlertRules();
  return NextResponse.json({ id, rules });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteAlertRule(id);
  return NextResponse.json({ done: true });
}
