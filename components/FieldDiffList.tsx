import type { FieldDiff } from "@/lib/types";
import { ChangeTypeBadge } from "@/components/SeverityBadge";
import { cn } from "@/lib/utils";

/**
 * Renders each changed field with inline word-level highlighting: removed text
 * in red strikethrough, added text in green. Cleaner than full before/after
 * dumps for the structured signal fields.
 */
export function FieldDiffList({ fields }: { fields: FieldDiff[] }) {
  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.field} className="rounded-md border p-4">
          <div className="mb-2 flex items-center gap-2">
            <ChangeTypeBadge type={f.change_type} />
            <h4 className="text-sm font-semibold">{f.label}</h4>
          </div>

          {/* Inline highlighted diff */}
          <div className="rounded bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
            {f.parts.map((part, i) => (
              <span
                key={i}
                className={cn(
                  part.added &&
                    "bg-emerald-200/70 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200 no-underline",
                  part.removed &&
                    "bg-red-200/70 text-red-900 line-through dark:bg-red-900/50 dark:text-red-200"
                )}
              >
                {part.value}
              </span>
            ))}
          </div>

          {/* Plain before/after for clarity on scalars */}
          {(f.before || f.after) && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                  Before
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                  {f.before || <em>(empty)</em>}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  After
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                  {f.after || <em>(empty)</em>}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
