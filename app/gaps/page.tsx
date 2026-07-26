"use client";
import { useEffect, useState } from "react";
import { Search, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GapRow {
  field: string;
  label: string;
  coverage: { competitor_name: string; present: boolean; value: string }[];
}

export default function GapsPage() {
  const [gaps, setGaps] = useState<GapRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gaps")
      .then((r) => r.json())
      .then((d) => { setGaps(d.gaps); setLoading(false); });
  }, []);

  if (loading) {
    return <div className="container py-8"><p className="text-muted-foreground">Loading...</p></div>;
  }

  const allNames = gaps.length > 0 ? gaps[0].coverage.map((c) => c.competitor_name) : [];

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Content Gap Analysis</h1>
        <p className="text-sm text-muted-foreground">
          See which signals each competitor publishes — and where you have opportunities.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left font-medium">
                Signal
              </th>
              {allNames.map((name) => (
                <th key={name} className="px-4 py-3 text-left font-medium">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gaps.map((row) => (
              <tr key={row.field} className="border-b last:border-0">
                <td className="sticky left-0 z-10 bg-background px-4 py-3 font-medium">
                  {row.label}
                </td>
                {row.coverage.map((c) => (
                  <td key={c.competitor_name} className="px-4 py-3">
                    {c.present ? (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs text-muted-foreground line-clamp-2">{c.value}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground/50">
                        <X className="h-4 w-4" />
                        <Badge variant="muted" className="text-[10px]">Missing</Badge>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {gaps.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              No data yet. Take some snapshots first.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
