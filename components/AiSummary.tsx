"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

export function AiSummary({ changeId }: { changeId: number }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changeId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setSummary(d.summary || null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [changeId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Generating AI summary...
      </div>
    );
  }

  if (!summary) {
    return <p className="text-sm text-muted-foreground italic">AI summary unavailable.</p>;
  }

  return (
    <div className="flex items-start gap-2 text-sm leading-relaxed">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{summary}</span>
    </div>
  );
}
