import { NextResponse } from "next/server";
import { fetchPage } from "@/lib/fetcher";
import { extractSignals, hashSignals } from "@/lib/signals";
import { diffSnapshots } from "@/lib/differ";
import type { Snapshot } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function turso(sql: string, args: (string | number | null)[] = []) {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");

  const httpUrl = url.replace(/^libsql:\/\//, "https://");

  const stmt: any = { sql };
  if (args.length > 0) {
    stmt.args = args.map((a) =>
      a === null
        ? { type: "null" }
        : typeof a === "number"
          ? { type: "integer", value: String(a) }
          : { type: "text", value: a }
    );
  } else {
    stmt.args = [];
  }

  const res = await fetch(`${httpUrl}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt },
        { type: "close" },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Turso error: ${res.status} ${await res.text()}`);

  const data = await res.json();
  const result = data.results?.[0]?.response?.result;
  if (!result) throw new Error("Unexpected Turso response format");
  return result;
}

function rows<T>(result: any): T[] {
  return result.rows.map((row: any[]) => {
    const obj: Record<string, unknown> = {};
    result.cols.forEach((col: any, i: number) => {
      const cell = row[i];
      obj[col.name] =
        cell?.type === "null" || cell?.value == null
          ? null
          : cell?.type === "integer"
            ? Number(cell.value)
            : cell?.value;
    });
    return obj as T;
  });
}

async function listCompetitors() {
  const r = await turso("SELECT id, name, url, category, created_at FROM competitors ORDER BY created_at DESC");
  return rows<{ id: number; name: string; url: string; category: string | null; created_at: string }>(r);
}

async function getLatestSnapshot(competitorId: number) {
  const r = await turso(`SELECT * FROM snapshots WHERE competitor_id = ${competitorId} ORDER BY captured_at DESC LIMIT 1`);
  const items = rows<any>(r);
  if (items.length === 0) return undefined;
  return {
    id: items[0].id,
    competitor_id: items[0].competitor_id,
    captured_at: items[0].captured_at,
    status_code: items[0].status_code,
    capture_method: items[0].capture_method,
    fetch_status: items[0].fetch_status,
    html: items[0].html,
    signals: JSON.parse(items[0].signals || "{}"),
    content_hash: items[0].content_hash,
  };
}

async function insertSnapshot(input: {
  competitor_id: number;
  status_code: number | null;
  capture_method: string;
  fetch_status: string;
  html: string;
  signals: any;
  content_hash: string;
}) {
  const r = await turso(
    `INSERT INTO snapshots (competitor_id, captured_at, status_code, capture_method, fetch_status, html, signals, content_hash)
     VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?)`,
    [
      input.competitor_id,
      input.status_code,
      input.capture_method,
      input.fetch_status,
      input.html,
      JSON.stringify(input.signals),
      input.content_hash,
    ]
  );
  return Number(r.last_insert_rowid);
}

async function insertChange(input: {
  competitor_id: number;
  from_snapshot_id: number;
  to_snapshot_id: number;
  change_type: string;
  severity: string;
  fields: any;
}) {
  const r = await turso(
    `INSERT INTO changes (competitor_id, from_snapshot_id, to_snapshot_id, change_type, severity, fields)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.competitor_id,
      input.from_snapshot_id,
      input.to_snapshot_id,
      input.change_type,
      input.severity,
      JSON.stringify(input.fields),
    ]
  );
  return Number(r.last_insert_rowid);
}

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

        const fetchResult = await fetchPage(comp.url);
        if (fetchResult.status !== "success") {
          results.push({ id: comp.id, name: comp.name, status: fetchResult.status });
          continue;
        }

        const signals = extractSignals(fetchResult.html);
        const contentHash = hashSignals(signals);

        const snapshotId = await insertSnapshot({
          competitor_id: comp.id,
          status_code: fetchResult.statusCode,
          capture_method: "auto",
          fetch_status: "success",
          html: fetchResult.html,
          signals,
          content_hash: contentHash,
        });

        let changed = false;
        if (priorSnapshot) {
          const candidate = diffSnapshots(priorSnapshot, {
            id: snapshotId,
            competitor_id: comp.id,
            captured_at: new Date().toISOString(),
            status_code: fetchResult.statusCode,
            capture_method: "auto",
            fetch_status: "success",
            html: fetchResult.html,
            signals,
            content_hash: contentHash,
          });
          if (candidate) {
            await insertChange(candidate);
            changed = true;
          }
        }

        results.push({ id: comp.id, name: comp.name, status: "success", changed });
      } catch (e) {
        results.push({ id: comp.id, name: comp.name, status: "error", changed: false });
      }
    }

    const res = NextResponse.json({ done: true, total: competitors.length, results });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err) {
    return NextResponse.json({ error: String(err), stack: (err as Error).stack }, { status: 500 });
  }
}
