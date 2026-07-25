import Link from "next/link";
import { BellOff } from "lucide-react";
import {
  ChangeTypeBadge,
  SeverityBadge,
} from "@/components/SeverityBadge";
import { timeAgo } from "@/lib/utils";
import type { Change } from "@/lib/types";

/**
 * List of detected changes for a competitor. Each links to the full diff view.
 */
export function ChangeFeed({
  competitorId,
  changes,
}: {
  competitorId: number;
  changes: Change[];
}) {
  if (changes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <BellOff className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="font-medium text-sm">No changes detected yet</p>
        <p className="text-xs text-muted-foreground max-w-[220px]">
          Take another snapshot later to start spotting what shifts.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {changes.map((ch) => (
        <li key={ch.id}>
          <Link
            href={`/competitors/${competitorId}/changes/${ch.id}`}
            className="block rounded-md border p-3 transition-colors hover:bg-accent"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <ChangeTypeBadge type={ch.change_type} />
                <SeverityBadge severity={ch.severity} />
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {timeAgo(ch.detected_at)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {ch.fields.length} field{ch.fields.length === 1 ? "" : "s"} changed:{" "}
              {ch.fields.map((f) => f.label).join(", ")}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
