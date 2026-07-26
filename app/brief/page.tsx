"use client";
import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChangeTypeBadge, SeverityBadge } from "@/components/SeverityBadge";
import { formatDate } from "@/lib/utils";

interface BriefChange {
  competitor_name: string;
  change_type: string;
  severity: string;
  detected_at: string;
  summary: string;
}

interface Brief {
  period: { from: string; to: string };
  total_changes: number;
  changes: BriefChange[];
}

export default function WeeklyBriefPage() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState("");

  useEffect(() => {
    fetch("/api/report/weekly")
      .then((r) => r.json())
      .then((d) => {
        setBrief(d);
        setLoading(false);
        // Try AI summary
        if (d.total_changes > 0) {
          fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: `Summarize this week's competitive activity in 2-3 sentences: ${d.changes.map((c: BriefChange) => c.summary).join(". ")}` }),
          })
            .then((r) => r.json())
            .then((r) => setAiSummary(r.answer || ""))
            .catch(() => {});
        }
      });
  }, []);

  if (loading) return <div className="container py-8"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Weekly Brief</h1>
          <p className="text-sm text-muted-foreground">
            {brief?.period.from ? `${formatDate(brief.period.from)} — ${formatDate(brief.period.to)}` : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Download className="mr-1 h-4 w-4" /> Export
        </Button>
      </div>

      {brief?.total_changes === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No changes detected this week.</p>
          </CardContent>
        </Card>
      )}

      {aiSummary && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <p className="text-sm leading-relaxed">{aiSummary}</p>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex gap-4">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold text-center">{brief?.total_changes || 0}</CardTitle>
            <CardDescription className="text-center">Changes this week</CardDescription>
          </CardHeader>
        </Card>
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold text-center">
              {brief?.changes.filter((c) => c.severity === "high").length || 0}
            </CardTitle>
            <CardDescription className="text-center">High severity</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-3">
        {brief?.changes.map((ch, i) => (
          <Card key={i}>
            <CardContent className="flex flex-wrap items-center gap-3 py-4">
              <span className="font-medium text-sm min-w-[120px]">{ch.competitor_name}</span>
              <ChangeTypeBadge type={ch.change_type} />
              <SeverityBadge severity={ch.severity} />
              <span className="ml-auto text-xs text-muted-foreground">{formatDate(ch.detected_at)}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
