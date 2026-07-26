import { NextResponse } from "next/server";
import {
  listCompetitors,
  getLatestSnapshot,
  insertSnapshot,
  insertChange,
} from "@/lib/db";
import { fetchPage } from "@/lib/fetcher";
import { extractSignals, hashSignals } from "@/lib/signals";
import { diffSnapshots } from "@/lib/differ";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dbUrl = !!process.env.TURSO_DATABASE_URL;
    const dbToken = !!process.env.TURSO_AUTH_TOKEN;

    const competitors = await listCompetitors();

    return NextResponse.json({
      dbUrl,
      dbToken,
      competitorsCount: competitors.length,
      competitors: competitors.map((c) => ({ id: c.id, name: c.name })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), stack: (err as Error).stack },
      { status: 500 }
    );
  }
}
