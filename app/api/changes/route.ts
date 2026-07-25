import { NextResponse } from "next/server";
import { listRecentChanges } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/changes?limit=20 — recent changes across all competitors (dashboard feed)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "20");
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 100
      ? Math.floor(limitRaw)
      : 20;

  const changes = await listRecentChanges(limit);
  return NextResponse.json({ changes });
}
