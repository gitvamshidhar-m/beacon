import { NextResponse } from "next/server";
import {
  getCompetitor,
  getLatestSnapshot,
  insertSnapshot,
  insertChange,
  listAlertRules,
} from "@/lib/db";
import { fromHtml } from "@/lib/fetcher";
import { extractSignals, hashSignals } from "@/lib/signals";
import { diffSnapshots } from "@/lib/differ";
import {
  sendSlackNotification,
  formatChangeNotification,
  shouldNotify,
} from "@/lib/notifications";
import { summarizeChange } from "@/lib/ai";

export const dynamic = "force-dynamic";

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

  if (change) {
    try {
      const rules = await listAlertRules();
      const relevant = rules.filter(
        (r) => !r.competitor_id || r.competitor_id === id
      );
      if (shouldNotify(change.change_type, change.severity, relevant)) {
        const webhook = process.env.SLACK_WEBHOOK_URL;
        if (webhook) {
          let summary = "";
          if (process.env.GROQ_API_KEY) {
            try {
              summary = await summarizeChange(change);
            } catch {}
          }
          const msg = formatChangeNotification({
            competitor_name: competitor.name,
            competitor_url: competitor.url,
            change_type: change.change_type,
            severity: change.severity,
            detected_at: new Date().toISOString(),
            fields: change.fields,
          }) + (summary ? `\n   🤖 ${summary}` : "");
          await sendSlackNotification(webhook, msg);
        }
      }
    } catch {
      // best-effort
    }
  }

  return NextResponse.json({
    status: "success",
    snapshot_id: snapshotId,
    content_hash: contentHash,
    changed: !!change,
    change,
    warning: result.message,
  });
}
