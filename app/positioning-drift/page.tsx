"use client";
import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface DriftComp {
  competitor_name: string;
  snapshots: { captured_at: string; headline: string; seo_title: string }[];
}

export default function DriftPage() {
  const [data, setData] = useState<DriftComp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/positioning-drift")
      .then((r) => r.json())
      .then((d) => { setData(d.drift); setLoading(false); });
  }, []);

  if (loading) return <div className="container py-8"><p className="text-muted-foreground">Loading...</p></div>;

  const aiKeywords = ["ai", "artificial intelligence", "machine learning", "llm", "gpt", "copilot", "intelligent", "automated"];

  function countKeywords(text: string): number {
    const lower = text.toLowerCase();
    return aiKeywords.filter((kw) => lower.includes(kw)).length;
  }

  function extractKeywords(text: string): string[] {
    const lower = text.toLowerCase();
    return aiKeywords.filter((kw) => lower.includes(kw));
  }

  return (
    <div className="container max-6xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Positioning Drift</h1>
        <p className="text-sm text-muted-foreground">
          Track how competitor messaging evolves over time — keyword shifts, headline changes, and positioning trends.
        </p>
      </div>

      <div className="space-y-6">
        {data.map((comp) => {
          const snapshotsWithKeywords = comp.snapshots.filter((s) => countKeywords(s.headline + " " + s.seo_title) > 0);
          const hasDrift = snapshotsWithKeywords.length > 0 || comp.snapshots.length > 1;

          return (
            <Card key={comp.competitor_name}>
              <CardHeader>
                <CardTitle className="text-lg">{comp.competitor_name}</CardTitle>
                <CardDescription>
                  {comp.snapshots.length} snapshot{comp.snapshots.length === 1 ? "" : "s"} captured
                </CardDescription>
              </CardHeader>
              <CardContent>
                {comp.snapshots.length === 0 && (
                  <p className="text-sm text-muted-foreground">No snapshots yet.</p>
                )}

                {comp.snapshots.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 pr-4 font-medium text-muted-foreground">Date</th>
                          <th className="pb-2 pr-4 font-medium text-muted-foreground">Headline</th>
                          <th className="pb-2 pr-4 font-medium text-muted-foreground">SEO Title</th>
                          <th className="pb-2 font-medium text-muted-foreground">Keywords</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comp.snapshots.map((s, i) => {
                          const headlineKeywords = extractKeywords(s.headline);
                          const seoKeywords = extractKeywords(s.seo_title);
                          const allKws = [...new Set([...headlineKeywords, ...seoKeywords])];
                          return (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                                {formatDate(s.captured_at)}
                              </td>
                              <td className="py-2 pr-4 max-w-[250px] truncate">
                                {s.headline || <span className="italic text-muted-foreground">—</span>}
                              </td>
                              <td className="py-2 pr-4 max-w-[250px] truncate">
                                {s.seo_title || <span className="italic text-muted-foreground">—</span>}
                              </td>
                              <td className="py-2">
                                {allKws.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {allKws.map((kw) => (
                                      <span key={kw} className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                        {kw}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {comp.snapshots.length >= 2 && (() => {
                  const first = comp.snapshots[0];
                  const last = comp.snapshots[comp.snapshots.length - 1];
                  const firstKws = extractKeywords(first.headline + " " + first.seo_title);
                  const lastKws = extractKeywords(last.headline + " " + last.seo_title);
                  const gained = lastKws.filter((kw) => !firstKws.includes(kw));
                  const lost = firstKws.filter((kw) => !lastKws.includes(kw));
                  if (gained.length === 0 && lost.length === 0) return null;
                  return (
                    <div className="mt-3 rounded-md bg-muted/50 p-3 text-xs space-y-1">
                      {gained.length > 0 && (
                        <p className="text-emerald-600 dark:text-emerald-400">
                          + Gained keywords: {gained.join(", ")}
                        </p>
                      )}
                      {lost.length > 0 && (
                        <p className="text-red-600 dark:text-red-400">
                          - Lost keywords: {lost.join(", ")}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
