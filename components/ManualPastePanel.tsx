"use client";

import { useState } from "react";
import { ClipboardPaste, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/**
 * Layer 2 fallback panel — shown when auto-fetch is blocked.
 * The user pastes the competitor page's HTML manually; we send it through
 * the same signal-extraction + diff pipeline.
 */
export function ManualPastePanel({
  competitorId,
  competitorUrl,
  onSnapshoted,
}: {
  competitorId: number;
  competitorUrl: string;
  /** Called after a successful manual snapshot so the parent can refresh. */
  onSnapshoted: () => void;
}) {
  const [html, setHtml] = useState("");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch(`/api/competitors/${competitorId}/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        setStatus("error");
        setMessage(data.message || "Failed to save snapshot.");
        return;
      }
      setStatus("done");
      setMessage(
        data.changed
          ? "Snapshot saved — changes detected!"
          : "Snapshot saved — no changes since the last one."
      );
      setHtml("");
      onSnapshoted();
    } catch {
      setStatus("error");
      setMessage("Network error — please try again.");
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ClipboardPaste className="h-4 w-4" /> Paste HTML manually
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Manual HTML paste (fallback)
          </h4>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            Auto-fetch didn&apos;t work for this site. Open{" "}
            <a
              href={competitorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {competitorUrl}
            </a>{" "}
            in your browser, view the page source (Ctrl+U) or copy from
            DevTools, and paste the full HTML below.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Close
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="html-paste" className="sr-only">
          Page HTML
        </Label>
        <Textarea
          id="html-paste"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          placeholder="<html>… paste the full page HTML here …</html>"
          className="min-h-[160px] font-mono text-xs"
          disabled={status === "loading"}
        />
      </div>

      {status === "done" && (
        <p className="mt-2 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" /> {message}
        </p>
      )}
      {status === "error" && (
        <p className="mt-2 text-xs text-destructive">{message}</p>
      )}

      <div className="mt-3 flex justify-end">
        <Button type="submit" size="sm" disabled={status === "loading" || !html.trim()}>
          {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
          Save manual snapshot
        </Button>
      </div>
    </form>
  );
}
