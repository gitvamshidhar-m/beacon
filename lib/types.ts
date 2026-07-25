// ============================================================================
// Shared types — used across DB, engine, API, and UI layers.
// ============================================================================

/** A tracked competitor site. */
export interface Competitor {
  id: number;
  name: string;
  url: string;
  category: string | null;
  created_at: string;
}

/** A single point-in-time capture of a competitor's page. */
export interface Snapshot {
  id: number;
  competitor_id: number;
  captured_at: string;
  status_code: number | null;
  capture_method: CaptureMethod;
  fetch_status: FetchStatus;
  html: string;
  signals: Signals;
  content_hash: string;
}

export type CaptureMethod = "auto" | "manual";

/** Result of attempting to fetch a page. */
export type FetchStatus = "success" | "blocked" | "error";

/** Structured marketing signals extracted from a page via cheerio. */
export interface Signals {
  seoTitle: string | null;
  metaDescription: string | null;
  headline: string | null;
  /** Headings h2/h3 — capture messaging structure. */
  subheadings: string[];
  /** Currency amounts found near pricing context. */
  pricing: PriceItem[];
  /** Feature bullets / list items under feature-y headings. */
  features: string[];
  /** Action-oriented button/link labels. */
  ctas: string[];
  /** Primary navigation labels. */
  navigation: string[];
}

export interface PriceItem {
  amount: string;
  /** Surrounding text for context (e.g. "/mo", "Pro plan"). */
  context: string;
}

/** A detected difference between two snapshots. */
export interface Change {
  id: number;
  competitor_id: number;
  from_snapshot_id: number;
  to_snapshot_id: number;
  detected_at: string;
  /** Aggregate type — what kind of change overall. */
  change_type: ChangeType;
  severity: Severity;
  /** Per-field diffs that make up this change. */
  fields: FieldDiff[];
}

export type ChangeType =
  | "Pricing"
  | "Messaging"
  | "Feature"
  | "CTA"
  | "SEO"
  | "Navigation"
  | "Mixed";

export type Severity = "high" | "medium" | "low";

/** A diff for a single signal field. */
export interface FieldDiff {
  field: string;
  label: string;
  change_type: ChangeType;
  /** Before value (string form for scalar fields, JSON for arrays). */
  before: string;
  after: string;
  /** Inline word-level diff parts for highlighting in the UI. */
  parts: DiffPart[];
}

export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

// ============================================================================
// Engine return shapes (not persisted directly).
// ============================================================================

/** Result returned by the fetcher strategy router. */
export interface FetchResult {
  status: FetchStatus;
  html: string;
  statusCode: number | null;
  /** Human-readable reason when blocked/errored. */
  message?: string;
  /** Final URL after redirects, if different. */
  finalUrl?: string;
}
