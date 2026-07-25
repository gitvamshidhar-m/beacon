import { Badge } from "@/components/ui/badge";
import type { ChangeType, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Badge color by change category. */
export function ChangeTypeBadge({
  type,
  className,
}: {
  type: ChangeType;
  className?: string;
}) {
  const color: Record<ChangeType, string> = {
    Pricing: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    Messaging: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    Feature: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    CTA: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300",
    SEO: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    Navigation: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
    Mixed: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  };
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-medium", color[type], className)}
    >
      {type}
    </Badge>
  );
}

/** Badge by severity level. */
export function SeverityBadge({ severity }: { severity: Severity }) {
  const label = severity.charAt(0).toUpperCase() + severity.slice(1);
  return (
    <Badge
      variant={severity === "high" ? "high" : severity === "medium" ? "medium" : "low"}
    >
      {label}
    </Badge>
  );
}
