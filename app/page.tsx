import Link from "next/link";
import { Plus, Radar as RadarIcon, Users, Camera, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChangeTypeBadge,
  SeverityBadge,
} from "@/components/SeverityBadge";
import {
  listCompetitors,
  listRecentChanges,
  getCounts,
} from "@/lib/db";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const counts = await getCounts().catch(() => ({ competitors: 0, snapshots: 0, changes: 0 }));
  const competitors = await listCompetitors().catch(() => []);
  const changes = await listRecentChanges(10).catch(() => []);

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Track strategic changes across your competitors.
          </p>
        </div>
        <Button asChild>
          <Link href="/competitors/new">
            <Plus className="h-4 w-4" /> Add competitor
          </Link>
        </Button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{counts.competitors}</div>
              <div className="text-xs text-muted-foreground">Competitors</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{counts.snapshots}</div>
              <div className="text-xs text-muted-foreground">Snapshots</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{counts.changes}</div>
              <div className="text-xs text-muted-foreground">Detected changes</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tracked competitors</CardTitle>
          </CardHeader>
          <CardContent>
            {competitors.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <RadarIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No competitors yet</p>
                  <p className="text-sm text-muted-foreground">
                    Add your first competitor to start tracking changes.
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href="/competitors/new">
                    <Plus className="h-4 w-4" /> Add competitor
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {competitors.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/competitors/${c.id}`}
                      className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.name}</span>
                          {c.category && (
                            <Badge variant="muted">{c.category}</Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.url}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {timeAgo(c.created_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent changes</CardTitle>
          </CardHeader>
          <CardContent>
            {changes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No changes detected yet</p>
                  <p className="text-sm text-muted-foreground">
                    Take a snapshot of a competitor to establish a baseline.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {changes.map((ch) => (
                  <li key={ch.id}>
                    <Link
                      href={`/competitors/${ch.competitor_id}/changes/${ch.id}`}
                      className="block rounded-md border p-3 transition-colors hover:bg-accent"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-medium">{ch.competitor_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(ch.detected_at)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <ChangeTypeBadge type={ch.change_type} />
                        <SeverityBadge severity={ch.severity} />
                        <span className="text-xs text-muted-foreground">
                          {ch.fields.length} field{ch.fields.length === 1 ? "" : "s"} changed
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
