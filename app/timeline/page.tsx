"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { History, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChangeTypeBadge, SeverityBadge } from "@/components/SeverityBadge";
import { timeAgo } from "@/lib/utils";

interface Change {
  id: number;
  competitor_id: number;
  competitor_name: string;
  competitor_url: string;
  change_type: string;
  severity: string;
  detected_at: string;
  fields: { label: string; change_type: string }[];
}

export default function TimelinePage() {
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/changes?limit=100")
      .then((r) => r.json())
      .then((d) => { setChanges(d.changes); setLoading(false); });
  }, []);

  if (loading) {
    return <div className="container py-8"><p className="text-muted-foreground">Loading...</p></div>;
  }

  // Group by date
  const groups: Record<string, Change[]> = {};
  for (const ch of changes) {
    const day = ch.detected_at?.slice(0, 10) || "unknown";
    if (!groups[day]) groups[day] = [];
    groups[day].push(ch);
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Change Timeline</h1>
        <p className="text-sm text-muted-foreground">
          A chronological view of every detected competitor change.
        </p>
      </div>

      {changes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No changes detected yet.</p>
          </CardContent>
        </Card>
      )}

      <div className="relative space-y-8">
        {Object.entries(groups).map(([day, dayChanges]) => (
          <div key={day}>
            <div className="sticky top-20 z-10 mb-4 rounded-md bg-muted/80 px-3 py-1.5 text-sm font-medium backdrop-blur">
              {new Date(day + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>

            <div className="relative ml-4 space-y-4 pl-6 before:absolute before:left-0 before:top-2 before:h-[calc(100%-8px)] before:w-px before:bg-border">
              {dayChanges.map((ch) => (
                <div key={ch.id} className="relative">
                  <div className="absolute -left-[26px] mt-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />

                  <Card className="transition-shadow hover:shadow-sm">
                    <CardContent className="flex flex-wrap items-center gap-3 py-4">
                      <Link
                        href={`/competitors/${ch.competitor_id}`}
                        className="flex items-center gap-1.5 font-medium hover:underline"
                      >
                        {ch.competitor_name}
                        <ExternalLink className="h-3 w-3" />
                      </Link>

                      <ChangeTypeBadge type={ch.change_type} />
                      <SeverityBadge severity={ch.severity} />

                      <div className="flex flex-wrap gap-1">
                        {(ch.fields || []).slice(0, 5).map((f, i) => (
                          <Badge key={i} variant="muted" className="text-[10px]">
                            {f.label}
                          </Badge>
                        ))}
                        {(ch.fields || []).length > 5 && (
                          <Badge variant="muted" className="text-[10px]">
                            +{ch.fields.length - 5} more
                          </Badge>
                        )}
                      </div>

                      <span className="ml-auto text-xs text-muted-foreground">
                        {timeAgo(ch.detected_at)}
                      </span>

                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/competitors/${ch.competitor_id}/changes/${ch.id}`}>
                          View diff
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
