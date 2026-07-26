import { NextResponse } from "next/server";
import { getCounts } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Replicate exec for debugging
async function rawExec(sql: string) {
  const url = process.env.TURSO_DATABASE_URL!;
  const token = process.env.TURSO_AUTH_TOKEN!;
  const httpUrl = url.replace(/^libsql:\/\//, "https://");
  const res = await fetch(`${httpUrl}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: [] } },
        { type: "close" },
      ],
    }),
  });
  return res.ok ? ((await res.json()) as any) : { error: res.status };
}

export async function GET() {
  try {
    const counts = await getCounts();
    const raw = await rawExec(
      "SELECT id, name, url, category, created_at FROM competitors ORDER BY created_at DESC"
    );

    const res = NextResponse.json({ counts, raw, ts: Date.now() });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: String(err), stack: (err as Error).stack },
      { status: 500 }
    );
  }
}
