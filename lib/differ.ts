// ============================================================================
// Diff engine.
// ----------------------------------------------------------------------------
// Compares two snapshots' signals, produces per-field diffs with inline
// highlighting, and classifies the overall change (type + severity).
// ============================================================================

import { diffWords } from "diff";
import type {
  Change,
  ChangeType,
  FieldDiff,
  Severity,
  Signals,
  Snapshot,
  DiffPart,
} from "./types";

// ----------------------------------------------------------------------------
// Field metadata: how to read each signal field and how to classify it.
// ----------------------------------------------------------------------------

interface FieldSpec {
  field: keyof Signals;
  label: string;
  change_type: ChangeType;
  /** Whether the field is a scalar (string|null) or an array. */
  kind: "scalar" | "array";
}

const FIELD_SPECS: FieldSpec[] = [
  { field: "seoTitle", label: "SEO Title", change_type: "SEO", kind: "scalar" },
  { field: "metaDescription", label: "Meta Description", change_type: "SEO", kind: "scalar" },
  { field: "headline", label: "Headline (H1)", change_type: "Messaging", kind: "scalar" },
  { field: "subheadings", label: "Subheadings", change_type: "Messaging", kind: "array" },
  { field: "pricing", label: "Pricing", change_type: "Pricing", kind: "array" },
  { field: "features", label: "Features", change_type: "Feature", kind: "array" },
  { field: "ctas", label: "CTAs", change_type: "CTA", kind: "array" },
  { field: "navigation", label: "Navigation", change_type: "Navigation", kind: "array" },
];

const SEVERITY_BY_TYPE: Record<ChangeType, Severity> = {
  Pricing: "high",
  Messaging: "medium",
  CTA: "medium",
  Feature: "medium",
  Navigation: "low",
  SEO: "low",
  Mixed: "medium",
};

// ----------------------------------------------------------------------------
// Field stringification (arrays → comparable text).
// ----------------------------------------------------------------------------

function fieldToString(value: unknown, kind: "scalar" | "array"): string {
  if (kind === "scalar") return (value as string | null) ?? "";
  if (!Array.isArray(value)) return "";
  if (value.length === 0) return "";
  // For arrays of objects (pricing), use amount+context. Else join items.
  if (typeof value[0] === "object") {
    return (value as { amount: string; context: string }[])
      .map((p) => `${p.amount} — ${p.context}`)
      .join("\n");
  }
  return (value as string[]).join("\n");
}

// ----------------------------------------------------------------------------
// Core diff for a single field.
// ----------------------------------------------------------------------------

function diffField(
  spec: FieldSpec,
  before: Signals,
  after: Signals
): FieldDiff | null {
  const beforeStr = fieldToString(before[spec.field], spec.kind);
  const afterStr = fieldToString(after[spec.field], spec.kind);

  if (beforeStr === afterStr) return null; // no change

  // Word-level diff → highlight parts for the UI.
  const parts = diffWords(beforeStr, afterStr).map<DiffPart>((p) => ({
    value: p.value,
    added: p.added,
    removed: p.removed,
  }));

  return {
    field: spec.field as string,
    label: spec.label,
    change_type: spec.change_type,
    before: beforeStr,
    after: afterStr,
    parts,
  };
}

// ----------------------------------------------------------------------------
// Classify an aggregate change across multiple field diffs.
// ----------------------------------------------------------------------------

function classify(fieldDiffs: FieldDiff[]): {
  change_type: Change["change_type"];
  severity: Severity;
} {
  const types = new Set(fieldDiffs.map((d) => d.change_type));

  let change_type: Change["change_type"];
  if (types.size === 1) {
    change_type = [...types][0];
  } else {
    change_type = "Mixed";
  }

  // Severity = highest among the field types.
  const severity = [...types].reduce<Severity>(
    (max, t) => rankSeverity(SEVERITY_BY_TYPE[t]) > rankSeverity(max) ? SEVERITY_BY_TYPE[t] : max,
    "low"
  );

  return { change_type, severity };
}

function rankSeverity(s: Severity): number {
  return s === "high" ? 3 : s === "medium" ? 2 : 1;
}

// ----------------------------------------------------------------------------
// Public API.
// ----------------------------------------------------------------------------

/**
 * Compare two snapshots and produce a Change record (or null if identical).
 */
export function diffSnapshots(
  before: Snapshot,
  after: Snapshot
): Omit<Change, "id" | "detected_at"> | null {
  const fields: FieldDiff[] = [];

  for (const spec of FIELD_SPECS) {
    const d = diffField(spec, before.signals, after.signals);
    if (d) fields.push(d);
  }

  if (fields.length === 0) return null; // no meaningful change

  const { change_type, severity } = classify(fields);

  return {
    competitor_id: after.competitor_id,
    from_snapshot_id: before.id,
    to_snapshot_id: after.id,
    change_type,
    severity,
    fields,
  };
}

/** Re-export the field specs so the UI can render a full signal panel. */
export { FIELD_SPECS };
