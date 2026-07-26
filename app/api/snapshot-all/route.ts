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
export const runtime = "nodejs";

export async function GET() {
  try {
    const competitors = await listCompetitors();

    const results: {
      id: number;
      name: string;
      status: string;
      changed?: boolean;
    }[] = [];

    for (const comp of competitors) {
      try {
        const priorSnapshot = await getLatestSnapshot(comp.id);

        const result = await fetchPage(comp.url);
        if (result.status !== "success") {
          results.push({
            id: comp.id,
            name: comp.name,
            status: result.status,
          });
          continue;
        }

        const signals = extractSignals(result.html);
        const contentHash = hashSignals(signals);

        const snapshotId = await insertSnapshot({
          competitor_id: comp.id,
          status_code: result.statusCode,
          capture_method: "auto",
          fetch_status: "success",
          html: result.html,
          signals,
          content_hash: contentHash,
        });

        let changed = false;
        if (priorSnapshot) {
          const candidate = diffSnapshots(priorSnapshot, {
            id: snapshotId,
            competitor_id: comp.id,
            captured_at: new Date().toISOString(),
            status_code: result.statusCode,
            capture_method: "auto",
            fetch_status: "success",
            html: result.html,
            signals,
            content_hash: contentHash,
          });
          if (candidate) {
            await insertChange(candidate);
            changed = true;
          }
        }

        results.push({
          id: comp.id,
          name: comp.name,
          status: "success",
          changed,
        });
      } catch (e) {
        results.push({
          id: comp.id,
          name: comp.name,
          status: "error",
          changed: false,
        });
      }
    }

    const res = NextResponse.json({
      done: true,
      total: competitors.length,
      results,
      ts: Date.now(),
    });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: String(err), stack: (err as Error).stack },
      { status: 500 }
    );
  }
}
