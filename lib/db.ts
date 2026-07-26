// ============================================================================
// Database layer — Turso (libSQL)
// ----------------------------------------------------------------------------
// Connects to Turso when TURSO_DATABASE_URL env var is set.
// During builds (no env var), functions return empty data gracefully.
// ============================================================================

import type { Snapshot, Signals, Change } from "./types";

// Minimal SQLite-compatible client using only fetch().
// Uses Turso's HTTP API (HRANA v2 protocol). No native modules needed.

let _migrated = false;

async function ensureMigrated() {
  if (_migrated) return;
  _migrated = true;
  await migrate();
}

interface TursoRow {
  cells: { type: string; value: string | number | null }[];
}

interface TursoResult {
  cols: { name: string; decltype: string | null }[];
  rows: { type: string; value: string | null }[][];
  affected_row_count: number;
  last_insert_rowid: string | null;
}

interface TursoResponse {
  results: {
    type: string;
    response: { type: string; result: TursoResult };
  }[];
}

async function exec(sql: string, args: (string | number | null)[] = []): Promise<TursoResult> {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !token) throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");

  // During build, API routes may be pre-rendered but Turso isn't reachable.
  // Return empty results so the build doesn't fail.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return { cols: [], rows: [], affected_row_count: 0, last_insert_rowid: null };
  }

  await ensureMigrated();

  // Convert libsql:// URL to https://
  const httpUrl = url.replace(/^libsql:\/\//, "https://");

  const body = JSON.stringify({
    requests: [
      {
        type: "execute",
        stmt: {
          sql,
          args: args.map((a) =>
            a === null
              ? { type: "null" }
              : typeof a === "number"
              ? { type: "integer", value: String(a) }
              : { type: "text", value: a }
          ),
        },
      },
      { type: "close" },
    ],
  });

  const res = await fetch(`${httpUrl}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Turso HTTP error: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as TursoResponse;
  const result = data.results?.[0]?.response?.result;
  if (!result) {
    throw new Error("Unexpected Turso response format");
  }
  return result;
}

function rowsToObjects<T>(result: TursoResult): T[] {
  return result.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    result.cols.forEach((col, i) => {
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

// ============================================================================
// Schema
// ============================================================================

export async function migrate() {
  await exec(
    `CREATE TABLE IF NOT EXISTS competitors (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      url           TEXT    NOT NULL,
      category      TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )`
  );
  await exec(
    `CREATE TABLE IF NOT EXISTS snapshots (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      competitor_id   INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
      captured_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      status_code     INTEGER,
      capture_method  TEXT    NOT NULL DEFAULT 'auto',
      fetch_status    TEXT    NOT NULL DEFAULT 'success',
      html            TEXT    NOT NULL DEFAULT '',
      signals         TEXT    NOT NULL DEFAULT '{}',
      content_hash    TEXT    NOT NULL DEFAULT ''
    )`
  );
  await exec(
    `CREATE TABLE IF NOT EXISTS changes (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      competitor_id      INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
      from_snapshot_id   INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
      to_snapshot_id     INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
      detected_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      change_type        TEXT    NOT NULL,
      severity           TEXT    NOT NULL,
      fields             TEXT    NOT NULL DEFAULT '[]'
    )`
  );
  try {
    await exec(
      `CREATE INDEX IF NOT EXISTS idx_snapshots_competitor
        ON snapshots(competitor_id, captured_at DESC)`
    );
    await exec(
      `CREATE INDEX IF NOT EXISTS idx_changes_competitor
        ON changes(competitor_id, detected_at DESC)`
    );
  } catch {
    // Indexes may already exist — ignore.
  }

  // Alert rules for notification subscriptions
  await exec(
    `CREATE TABLE IF NOT EXISTS alert_rules (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      competitor_id   INTEGER REFERENCES competitors(id) ON DELETE CASCADE,
      change_type     TEXT    NOT NULL DEFAULT '*',
      severity        TEXT    NOT NULL DEFAULT 'medium',
      channel         TEXT    NOT NULL DEFAULT 'slack',
      enabled         INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    )`
  );
}

// ============================================================================
// Helpers
// ============================================================================

interface SnapshotRow {
  id: number;
  competitor_id: number;
  captured_at: string;
  status_code: number | null;
  capture_method: string;
  fetch_status: string;
  html: string;
  signals: string;
  content_hash: string;
}

function mapSnapshot(row: SnapshotRow): Snapshot {
  return {
    id: row.id,
    competitor_id: row.competitor_id,
    captured_at: row.captured_at,
    status_code: row.status_code,
    capture_method: row.capture_method as Snapshot["capture_method"],
    fetch_status: row.fetch_status as Snapshot["fetch_status"],
    html: row.html,
    signals: JSON.parse(row.signals) as Signals,
    content_hash: row.content_hash,
  };
}

interface ChangeRow {
  id: number;
  competitor_id: number;
  from_snapshot_id: number;
  to_snapshot_id: number;
  detected_at: string;
  change_type: string;
  severity: string;
  fields: string;
}

export function mapChange(row: ChangeRow): Change {
  return {
    id: row.id,
    competitor_id: row.competitor_id,
    from_snapshot_id: row.from_snapshot_id,
    to_snapshot_id: row.to_snapshot_id,
    detected_at: row.detected_at,
    change_type: row.change_type as Change["change_type"],
    severity: row.severity as Change["severity"],
    fields: JSON.parse(row.fields) as Change["fields"],
  };
}

// ============================================================================
// Competitors
// ============================================================================

export interface CompetitorRow {
  id: number;
  name: string;
  url: string;
  category: string | null;
  created_at: string;
}

export async function listCompetitors(): Promise<CompetitorRow[]> {
  if (!process.env.TURSO_DATABASE_URL) return [];
  const r = await execDirect(
    "SELECT id, name, url, category, created_at FROM competitors ORDER BY created_at DESC"
  );
  return rowsToObjects<CompetitorRow>(r);
}

/** Direct Turso call that bypasses ensureMigrated() — avoids a pipeline
 *  interaction bug on Vercel cold starts where migration calls interfere
 *  with subsequent SELECT queries. */
async function execDirect(sql: string): Promise<TursoResult> {
  const url = process.env.TURSO_DATABASE_URL!;
  const token = process.env.TURSO_AUTH_TOKEN!;
  if (!url || !token) throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
  const httpUrl = url.replace(/^libsql:\/\//, "https://");
  const res = await fetch(`${httpUrl}/v2/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: [] } },
        { type: "close" },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Turso error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const result = data.results?.[0]?.response?.result;
  if (!result) throw new Error("Unexpected Turso response");
  return result as TursoResult;
}

export async function getCompetitor(id: number): Promise<CompetitorRow | undefined> {
  if (!process.env.TURSO_DATABASE_URL) return undefined;
  const r = await exec(
    `SELECT id, name, url, category, created_at
     FROM competitors WHERE id = ?`,
    [id]
  );
  return rowsToObjects<CompetitorRow>(r)[0];
}

export async function createCompetitor(input: {
  name: string;
  url: string;
  category?: string | null;
}): Promise<CompetitorRow> {
  const r = await exec(
    `INSERT INTO competitors (name, url, category) VALUES (?, ?, ?)`,
    [input.name, input.url, input.category ?? null]
  );
  return (await getCompetitor(Number(r.last_insert_rowid)))!;
}

export async function deleteCompetitor(id: number): Promise<void> {
  await exec(`DELETE FROM competitors WHERE id = ?`, [id]);
}

// ============================================================================
// Snapshots
// ============================================================================

export async function listSnapshots(competitorId: number): Promise<Snapshot[]> {
  if (!process.env.TURSO_DATABASE_URL) return [];
  const id = Number(competitorId);
  // Inline the id to avoid Turso integer parameter binding issues
  const r = await exec(
    `SELECT * FROM snapshots
     WHERE competitor_id = ${id} ORDER BY captured_at DESC`
  );
  return rowsToObjects<SnapshotRow>(r).map(mapSnapshot);
}

export async function getSnapshot(id: number): Promise<Snapshot | undefined> {
  if (!process.env.TURSO_DATABASE_URL) return undefined;
  const r = await exec(`SELECT * FROM snapshots WHERE id = ?`, [id]);
  const row = rowsToObjects<SnapshotRow>(r)[0];
  return row ? mapSnapshot(row) : undefined;
}

export async function getLatestSnapshot(competitorId: number): Promise<Snapshot | undefined> {
  if (!process.env.TURSO_DATABASE_URL) return undefined;
  const id = Number(competitorId);
  const r = await exec(
    `SELECT * FROM snapshots
     WHERE competitor_id = ${id} AND fetch_status = 'success'
     ORDER BY captured_at DESC LIMIT 1`
  );
  const row = rowsToObjects<SnapshotRow>(r)[0];
  return row ? mapSnapshot(row) : undefined;
}

export async function insertSnapshot(input: {
  competitor_id: number;
  status_code: number | null;
  capture_method: "auto" | "manual";
  fetch_status: "success" | "blocked" | "error";
  html: string;
  signals: Signals;
  content_hash: string;
}): Promise<number> {
  const r = await exec(
    `INSERT INTO snapshots
       (competitor_id, status_code, capture_method, fetch_status, html, signals, content_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
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

// ============================================================================
// Changes
// ============================================================================

export async function listChanges(competitorId: number): Promise<Change[]> {
  if (!process.env.TURSO_DATABASE_URL) return [];
  const id = Number(competitorId);
  const r = await exec(
    `SELECT * FROM changes
     WHERE competitor_id = ${id} ORDER BY detected_at DESC`
  );
  return rowsToObjects<ChangeRow>(r).map(mapChange);
}

export async function listRecentChanges(limit = 20): Promise<(Change & {
  competitor_name: string;
  competitor_url: string;
})[]> {
  if (!process.env.TURSO_DATABASE_URL) return [];
  const r = await exec(
    `SELECT c.*, comp.name AS competitor_name, comp.url AS competitor_url
     FROM changes c
     JOIN competitors comp ON comp.id = c.competitor_id
     ORDER BY c.detected_at DESC
     LIMIT ?`,
    [limit]
  );
  return rowsToObjects<ChangeRow & { competitor_name: string; competitor_url: string }>(r).map(
    (r) => ({ ...mapChange(r), competitor_name: r.competitor_name, competitor_url: r.competitor_url })
  );
}

export async function getChange(id: number): Promise<(Change & {
  competitor_name: string;
  competitor_url: string;
}) | undefined> {
  if (!process.env.TURSO_DATABASE_URL) return undefined;
  const r = await exec(
    `SELECT c.*, comp.name AS competitor_name, comp.url AS competitor_url
     FROM changes c
     JOIN competitors comp ON comp.id = c.competitor_id
     WHERE c.id = ?`,
    [id]
  );
  const row = rowsToObjects<ChangeRow & { competitor_name: string; competitor_url: string }>(r)[0];
  return row
    ? { ...mapChange(row), competitor_name: row.competitor_name, competitor_url: row.competitor_url }
    : undefined;
}

export async function insertChange(input: {
  competitor_id: number;
  from_snapshot_id: number;
  to_snapshot_id: number;
  change_type: Change["change_type"];
  severity: Change["severity"];
  fields: Change["fields"];
}): Promise<number> {
  const r = await exec(
    `INSERT INTO changes
       (competitor_id, from_snapshot_id, to_snapshot_id, change_type, severity, fields)
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

// ============================================================================
// Alert rules
// ============================================================================

export interface AlertRule {
  id: number;
  competitor_id: number | null;
  change_type: string;
  severity: string;
  channel: string;
  enabled: number;
  created_at: string;
  competitor_name?: string;
}

export async function listAlertRules(): Promise<AlertRule[]> {
  if (!process.env.TURSO_DATABASE_URL) return [];
  const r = await exec(
    `SELECT r.*, c.name AS competitor_name
     FROM alert_rules r
     LEFT JOIN competitors c ON c.id = r.competitor_id
     ORDER BY r.created_at DESC`
  );
  return rowsToObjects<AlertRule>(r);
}

export async function getAlertRule(id: number): Promise<AlertRule | undefined> {
  if (!process.env.TURSO_DATABASE_URL) return undefined;
  const r = await exec(`SELECT * FROM alert_rules WHERE id = ?`, [id]);
  return rowsToObjects<AlertRule>(r)[0];
}

export async function upsertAlertRule(input: {
  id?: number;
  competitor_id: number | null;
  change_type: string;
  severity: string;
  channel: string;
  enabled: number;
}): Promise<number> {
  if (!process.env.TURSO_DATABASE_URL) throw new Error("No database configured");
  if (input.id) {
    await exec(
      `UPDATE alert_rules SET competitor_id=?, change_type=?, severity=?, channel=?, enabled=? WHERE id=?`,
      [input.competitor_id, input.change_type, input.severity, input.channel, input.enabled, input.id]
    );
    return input.id;
  }
  const r = await exec(
    `INSERT INTO alert_rules (competitor_id, change_type, severity, channel, enabled)
     VALUES (?, ?, ?, ?, ?)`,
    [input.competitor_id, input.change_type, input.severity, input.channel, input.enabled]
  );
  return Number(r.last_insert_rowid);
}

export async function deleteAlertRule(id: number): Promise<void> {
  await exec(`DELETE FROM alert_rules WHERE id = ?`, [id]);
}

// ============================================================================
// Monthly trend report
// ============================================================================

export async function getMonthlyReport(): Promise<{
  month: string;
  total_changes: number;
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  by_competitor: { name: string; count: number }[];
}[]> {
  if (!process.env.TURSO_DATABASE_URL) return [];
  const r = await exec(
    `SELECT
       strftime('%Y-%m', detected_at) AS month,
       change_type,
       severity,
       c.name AS comp_name
     FROM changes ch
     JOIN competitors c ON c.id = ch.competitor_id
     WHERE detected_at >= datetime('now', '-6 months')
     ORDER BY month DESC`
  );
  const rows = rowsToObjects<{ month: string; change_type: string; severity: string; comp_name: string }>(r);
  const map = new Map<string, { month: string; total_changes: number; by_type: Record<string, number>; by_severity: Record<string, number>; by_competitor: Map<string, number> }>();
  for (const row of rows) {
    if (!map.has(row.month)) map.set(row.month, { month: row.month, total_changes: 0, by_type: {}, by_severity: {}, by_competitor: new Map() });
    const m = map.get(row.month)!;
    m.total_changes++;
    m.by_type[row.change_type] = (m.by_type[row.change_type] || 0) + 1;
    m.by_severity[row.severity] = (m.by_severity[row.severity] || 0) + 1;
    m.by_competitor.set(row.comp_name, (m.by_competitor.get(row.comp_name) || 0) + 1);
  }
  return Array.from(map.values()).map((m) => ({
    ...m,
    by_competitor: Array.from(m.by_competitor.entries()).map(([name, count]) => ({ name, count })),
  }));
}

// ============================================================================
// Content gap analysis
// ============================================================================

export async function getGapAnalysis(): Promise<{
  field: string;
  label: string;
  coverage: { competitor_name: string; present: boolean; value: string }[];
}[]> {
  if (!process.env.TURSO_DATABASE_URL) return [];
  const comps = await listCompetitors();
  const fields = ["seoTitle", "headline", "pricing", "features", "ctas"] as const;
  const fieldLabels: Record<string, string> = { seoTitle: "SEO Title", headline: "Headline", pricing: "Pricing", features: "Features", ctas: "CTAs" };

  const result: { field: string; label: string; coverage: { competitor_name: string; present: boolean; value: string }[] }[] = [];

  for (const field of fields) {
    const coverage: { competitor_name: string; present: boolean; value: string }[] = [];
    for (const comp of comps) {
      const r = await execDirect(
        `SELECT signals FROM snapshots
         WHERE competitor_id = ${comp.id} AND fetch_status = 'success'
         ORDER BY captured_at DESC LIMIT 1`
      );
      const row = rowsToObjects<{ signals: string }>(r)[0];
      let present = false;
      let value = "";
      if (row) {
        try {
          const signals = JSON.parse(row.signals);
          const v = signals[field];
          if (v) {
            present = true;
            value = Array.isArray(v) ? v.slice(0, 3).join(", ") : String(v).slice(0, 80);
          }
        } catch {}
      }
      coverage.push({ competitor_name: comp.name, present, value });
    }
    result.push({ field, label: fieldLabels[field] || field, coverage });
  }
  return result;
}

// ============================================================================
// Aggregate counts
// ============================================================================

export async function getCounts(): Promise<{
  competitors: number;
  snapshots: number;
  changes: number;
}> {
  if (!process.env.TURSO_DATABASE_URL) return { competitors: 0, snapshots: 0, changes: 0 };
  const comp = await exec("SELECT COUNT(*) FROM competitors");
  const snap = await exec("SELECT COUNT(*) FROM snapshots");
  const ch = await exec("SELECT COUNT(*) FROM changes");
  const c = rowsToObjects<{ [k: string]: number }>(comp);
  const s = rowsToObjects<{ [k: string]: number }>(snap);
  const h = rowsToObjects<{ [k: string]: number }>(ch);
  return {
    competitors: c[0] ? Object.values(c[0])[0] : 0,
    snapshots: s[0] ? Object.values(s[0])[0] : 0,
    changes: h[0] ? Object.values(h[0])[0] : 0,
  };
}
