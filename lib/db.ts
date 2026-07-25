import { createClient, type Client } from "@libsql/client";
import type { Snapshot, Signals, Change } from "./types";

// ============================================================================
// Connection — Turso (libSQL)
// ----------------------------------------------------------------------------
// For local dev, set TURSO_DATABASE_URL to a local file:
//   TURSO_DATABASE_URL=file:./data/beacon.db
// For production (Vercel), use a Turso database:
//   TURSO_DATABASE_URL=libsql://your-db.turso.io
//   TURSO_AUTH_TOKEN=your-token
// ============================================================================

let _db: Client | null = null;

function getDb(): Client {
  if (_db) return _db;
  _db = createClient({
    url: process.env.TURSO_DATABASE_URL || ":memory:",
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });
  return _db;
}

// ============================================================================
// Schema
// ============================================================================

export async function migrate() {
  const db = getDb();
  await db.batch([
    `CREATE TABLE IF NOT EXISTS competitors (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      url           TEXT    NOT NULL,
      category      TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )`,
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
    )`,
    `CREATE TABLE IF NOT EXISTS changes (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      competitor_id      INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
      from_snapshot_id   INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
      to_snapshot_id     INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
      detected_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      change_type        TEXT    NOT NULL,
      severity           TEXT    NOT NULL,
      fields             TEXT    NOT NULL DEFAULT '[]'
    )`,
    `CREATE INDEX IF NOT EXISTS idx_snapshots_competitor
      ON snapshots(competitor_id, captured_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_changes_competitor
      ON changes(competitor_id, detected_at DESC)`,
  ]);
}

// Auto-migrate on first import (cold start).
let _migrated = false;
async function ensureMigrated() {
  if (!_migrated) {
    await migrate();
    _migrated = true;
  }
}

// ============================================================================
// Row types + mappers
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
  await ensureMigrated();
  const db = getDb();
  const result = await db.execute(
    `SELECT id, name, url, category, created_at
     FROM competitors ORDER BY created_at DESC`
  );
  return result.rows as unknown as CompetitorRow[];
}

export async function getCompetitor(id: number): Promise<CompetitorRow | undefined> {
  await ensureMigrated();
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id, name, url, category, created_at
          FROM competitors WHERE id = ?`,
    args: [id],
  });
  return result.rows[0] as unknown as CompetitorRow | undefined;
}

export async function createCompetitor(input: {
  name: string;
  url: string;
  category?: string | null;
}): Promise<CompetitorRow> {
  await ensureMigrated();
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO competitors (name, url, category) VALUES (?, ?, ?)`,
    args: [input.name, input.url, input.category ?? null],
  });
  const result = await db.execute("SELECT last_insert_rowid() AS id");
  const id = Number(result.rows[0].id);
  return (await getCompetitor(id))!;
}

export async function deleteCompetitor(id: number): Promise<void> {
  await ensureMigrated();
  const db = getDb();
  await db.execute({ sql: `DELETE FROM competitors WHERE id = ?`, args: [id] });
}

// ============================================================================
// Snapshots
// ============================================================================

export async function listSnapshots(competitorId: number): Promise<Snapshot[]> {
  await ensureMigrated();
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM snapshots
          WHERE competitor_id = ? ORDER BY captured_at DESC`,
    args: [competitorId],
  });
  return (result.rows as unknown as SnapshotRow[]).map(mapSnapshot);
}

export async function getSnapshot(id: number): Promise<Snapshot | undefined> {
  await ensureMigrated();
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM snapshots WHERE id = ?`,
    args: [id],
  });
  const row = result.rows[0] as unknown as SnapshotRow | undefined;
  return row ? mapSnapshot(row) : undefined;
}

export async function getLatestSnapshot(competitorId: number): Promise<Snapshot | undefined> {
  await ensureMigrated();
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM snapshots
          WHERE competitor_id = ? AND fetch_status = 'success'
          ORDER BY captured_at DESC LIMIT 1`,
    args: [competitorId],
  });
  const row = result.rows[0] as unknown as SnapshotRow | undefined;
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
  await ensureMigrated();
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO snapshots
           (competitor_id, status_code, capture_method, fetch_status, html, signals, content_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.competitor_id,
      input.status_code,
      input.capture_method,
      input.fetch_status,
      input.html,
      JSON.stringify(input.signals),
      input.content_hash,
    ],
  });
  const result = await db.execute("SELECT last_insert_rowid() AS id");
  return Number(result.rows[0].id);
}

// ============================================================================
// Changes
// ============================================================================

export async function listChanges(competitorId: number): Promise<Change[]> {
  await ensureMigrated();
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM changes
          WHERE competitor_id = ? ORDER BY detected_at DESC`,
    args: [competitorId],
  });
  return (result.rows as unknown as ChangeRow[]).map(mapChange);
}

export async function listRecentChanges(limit = 20): Promise<(Change & {
  competitor_name: string;
  competitor_url: string;
})[]> {
  await ensureMigrated();
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT c.*, comp.name AS competitor_name, comp.url AS competitor_url
          FROM changes c
          JOIN competitors comp ON comp.id = c.competitor_id
          ORDER BY c.detected_at DESC
          LIMIT ?`,
    args: [limit],
  });
  return (result.rows as unknown as (ChangeRow & {
    competitor_name: string;
    competitor_url: string;
  })[]).map((r) => ({
    ...mapChange(r),
    competitor_name: r.competitor_name,
    competitor_url: r.competitor_url,
  }));
}

export async function getChange(id: number): Promise<(Change & {
  competitor_name: string;
  competitor_url: string;
}) | undefined> {
  await ensureMigrated();
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT c.*, comp.name AS competitor_name, comp.url AS competitor_url
          FROM changes c
          JOIN competitors comp ON comp.id = c.competitor_id
          WHERE c.id = ?`,
    args: [id],
  });
  const row = result.rows[0] as unknown as (ChangeRow & {
    competitor_name: string;
    competitor_url: string;
  }) | undefined;
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
  await ensureMigrated();
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO changes
           (competitor_id, from_snapshot_id, to_snapshot_id, change_type, severity, fields)
         VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      input.competitor_id,
      input.from_snapshot_id,
      input.to_snapshot_id,
      input.change_type,
      input.severity,
      JSON.stringify(input.fields),
    ],
  });
  const result = await db.execute("SELECT last_insert_rowid() AS id");
  return Number(result.rows[0].id);
}

// ============================================================================
// Aggregate counts
// ============================================================================

export async function getCounts(): Promise<{
  competitors: number;
  snapshots: number;
  changes: number;
}> {
  await ensureMigrated();
  const db = getDb();
  const result = await db.execute(
    `SELECT (SELECT COUNT(*) FROM competitors) AS competitors,
            (SELECT COUNT(*) FROM snapshots)   AS snapshots,
            (SELECT COUNT(*) FROM changes)     AS changes`
  );
  const row = result.rows[0];
  return {
    competitors: Number(row.competitors),
    snapshots: Number(row.snapshots),
    changes: Number(row.changes),
  };
}
