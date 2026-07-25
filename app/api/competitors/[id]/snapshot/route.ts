import { NextResponse } from "next/server";
import {
  getCompetitor,
  getLatestSnapshot,
  insertSnapshot,

export const dynamic = "force-dynamic";
  insertChange,
} from "@/lib/db";
import { fetchPage } from "@/lib/fetcher";
import { extractSignals, hashSignals } from "@/lib/signals";
import { diffSnapshots } from "@/lib/differ";

type Params = { params: { id: string } };

/**
 * POST /api/competitors/:id/snapshot
 *
 * Triggers a Layer 1 auto-fetch of the competitor URL, extracts signals,
 * stores the snapshot, and (if there was a prior snapshot) computes a diff.
 *
 * Possible outcomes:
 *   - status:"success"   → snapshot stored, diff attached if anything changed
 *   - status:"blocked"   → site refused the bot; UI should offer manual paste
 *   - status:"error"     → network / DNS / invalid URL
 */
export async function POST(_request: Request, { params }: Params) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const competitor = await getCompetitor(id);
  if (!competitor) {
    return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
  }

  const result = await fetchPage(competitor.url);

  // Blocked or errored — record the attempt but don't treat as a real snapshot.
  if (result.status !== "success") {
    // Still log the attempt as a snapshot so the timeline shows we tried.
    const snapshotId = await insertSnapshot({
      competitor_id: id,
      status_code: result.statusCode,
      capture_method: "auto",
      fetch_status: result.status,
      html: result.html,
      signals: {
        seoTitle: null,
        metaDescription: null,
        headline: null,
        subheadings: [],
        pricing: [],
        features: [],
        ctas: [],
        navigation: [],
      },
      content_hash: "",
    });

    return NextResponse.json({
      status: result.status,
      message: result.message,
      snapshot_id: snapshotId,
      // Tell the UI a manual paste is available as fallback.
      manual_fallback: result.status === "blocked",
    });
  }

  // Capture the previous snapshot BEFORE inserting the new one — otherwise
  // getLatestSnapshot would return the one we're about to create.
  const priorSnapshot = await getLatestSnapshot(id);

  // Success — extract signals and persist.
  const signals = extractSignals(result.html);
  const contentHash = hashSignals(signals);

  const snapshotId = await insertSnapshot({
    competitor_id: id,
    status_code: result.statusCode,
    capture_method: "auto",
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
      status_code: result.statusCode,
      capture_method: "auto",
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
  });
}
