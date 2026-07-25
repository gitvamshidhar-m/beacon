"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManualPastePanel } from "@/components/ManualPastePanel";

/**
 * The action row on the competitor detail page: "Snapshot now" button that
 * triggers Layer 1 auto-fetch, plus the Layer 2 manual-paste fallback that
 * appears when auto-fetch is blocked.
 */
export function SnapshotActions({
  competitorId,
  competitorUrl,
}: {
  competitorId: number;
  competitorUrl: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [result, setResult] = useState<
    | null
    | { kind: "success"; changed: boolean; message?: string }
    | { kind: "blocked"; message?: string }
    | { kind: "error"; message?: string }
  >(null);

  async function handleSnapshot() {
    setStatus("loading");
    setResult(null);
    try {
      const res = await fetch(`/api/competitors/${competitorId}/snapshot`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.status === "success") {
        setResult({
          kind: "success",
          changed: !!data.changed,
          message: data.changed
            ? "Snapshot saved — changes detected!"
            : "Snapshot saved — no changes since last time.",
        });
      } else if (data.status === "blocked") {
        setResult({
          kind: "blocked",
          message:
            data.message ||
            "This site blocked the automatic request. Paste the HTML manually below.",
        });
      } else {
        setResult({
          kind: "error",
          message:
            data.message || "Couldn’t reach the site. Try again or paste HTML.",
        });
      }
    } catch {
      setResult({
        kind: "error",
        message: "Network error — please try again.",
      });
    } finally {
      setStatus("idle");
      router.refresh();
    }
  }

  const competitorUrlProp = competitorUrl;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSnapshot} disabled={status === "loading"}>
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          Snapshot now
        </Button>

        <ManualPastePanel
          competitorId={competitorId}
          competitorUrl={competitorUrlProp}
          onSnapshoted={() => router.refresh()}
        />
      </div>

      {result?.kind === "success" && (
        <p className="flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> {result.message}
        </p>
      )}
      {result?.kind === "blocked" && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{result.message}</span>
        </div>
      )}
      {result?.kind === "error" && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> {result.message}
        </p>
      )}
    </div>
  );
}
