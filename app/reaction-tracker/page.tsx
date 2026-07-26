"use client";
import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangeTypeBadge } from "@/components/SeverityBadge";
import { timeAgo } from "@/lib/utils";

interface ReactionGroup {
  change_type: string;
  events: { competitor_name: string; detected_at: string }[];
}

export default function ReactionTrackerPage() {
  const [groups, setGroups] = useState<ReactionGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reaction-tracker")
      .then((r) => r.json())
      .then((d) => { setGroups(d.reactions); setLoading(false); });
  }, []);

  if (loading) return <div className="container py-8"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reaction Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Who moved first? Who followed? Tracks the timing of similar changes across competitors.
        </p>
      </div>

      {groups.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Not enough change data yet to track reactions.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {groups.map((group) => (
          <Card key={group.change_type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                <ChangeTypeBadge type={group.change_type} />
                <span className="ml-2 text-sm text-muted-foreground font-normal">
                  {group.events.length} event{group.events.length === 1 ? "" : "s"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative ml-3 space-y-3 pl-5 before:absolute before:left-[5px] before:top-1 before:h-[calc(100%-8px)] before:w-px before:bg-border">
                {group.events.map((evt, i) => {
                  const prevTime = i > 0 ? new Date(group.events[i - 1].detected_at).getTime() : null;
                  const currTime = new Date(evt.detected_at).getTime();
                  const gap = prevTime ? Math.round((currTime - prevTime) / 3600000) : null;
                  return (
                    <div key={i} className="relative">
                      <div className="absolute -left-[21px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">{evt.competitor_name}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo(evt.detected_at)}</span>
                        {gap !== null && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            {gap}h after previous
                          </span>
                        )}
                        {i === 0 && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            First mover
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
