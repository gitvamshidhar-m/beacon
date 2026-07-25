import { NextResponse } from "next/server";
import {
  getCompetitor,
  getLatestSnapshot,
  insertSnapshot,
  insertChange,
} from "@/lib/db";
import { fromHtml } from "@/lib/fetcher";
import { extractSignals, hashSignals } from "@/lib/signals";
import { diffSnapshots } from "@/lib/differ";

type Params = { params: { id: string } };

/**
 * POST /api/competitors/:id/manual
 * Body: { "html": "<the page's full HTML>" }
 *
 * Layer 2 fallback: accept HTML the user pasted manually (because auto-fetch
 * was blocked), run it through the exact same signal-extraction + diff
 * pipeline. Lets the user capture ANY site, even bot-protected ones.
 */
export async function POST(request: Request, { params }: Params) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const competitor = await getCompetitor(id);
  if (!competitor) {
    return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
  }

  let body: { html?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = fromHtml(body.html ?? "");
  if (result.status !== "success") {
    return NextResponse.json(
      { status: "error", message: result.message },
      { status: 400 }
    );
  }

  // Capture prior snapshot BEFORE inserting (see auto-snapshot route).
  const priorSnapshot = await getLatestSnapshot(id);

  const signals = extractSignals(result.html);
  const contentHash = hashSignals(signals);

  const snapshotId = await insertSnapshot({
    competitor_id: id,
    status_code: null, // user-pasted; no HTTP status applies
    capture_method: "manual",
    fetch_status: "success",
    html: result.html,
    signals,
    content_hash: contentHash,
  });

  let change: ReturnType<typeof diffSnapshots> = null;
  if (priorSnapshot) {
    const candidate = diffSnapshots(priorSnapshot, {
      id: snapshotId,
      competitor_id: id,
      captured_at: new Date().toISOString(),
      status_code: null,
      capture_method: "manual",
      fetch_status: "success",
      html: result.html,
      signals,
      content_hash: contentHash,
    });
    if (candidate) {
      await insertChange(candidate);
      change = candidate;
    }
  }

  return NextResponse.json({
    status: "success",
    snapshot_id: snapshotId,
    content_hash: contentHash,
    changed: !!change,
    change,
    // Surface any "this looks like a challenge page" warning from fromHtml.
    warning: result.message,
  });
}
