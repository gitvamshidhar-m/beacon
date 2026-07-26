import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteCompetitorButton } from "@/components/DeleteCompetitorButton";
import { SnapshotActions } from "@/components/SnapshotActions";
import { ChangeFeed } from "@/components/ChangeFeed";
import { SignalsDisplay } from "@/components/SignalsDisplay";
import {
  getCompetitor,
  listSnapshots,
  listChanges,
} from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CompetitorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const competitor = (await getCompetitor(id))!;
  if (!competitor) notFound();

  const snapshots = await listSnapshots(id);
  const changes = await listChanges(id);

  const lastSuccess = snapshots.find((s) => s.fetch_status === "success");

  return (
    <div className="container max-w-5xl py-8">
      {/* Breadcrumb */}
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </Button>

      {/* Header card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-2xl">{competitor.name}</CardTitle>
                {competitor.category && (
                  <Badge variant="muted">{competitor.category}</Badge>
                )}
              </div>
              <CardDescription className="mt-1 flex items-center gap-1">
                <a
                  href={competitor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  {competitor.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </CardDescription>
              {lastSuccess && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Last successful snapshot:{" "}
                  {formatDate(lastSuccess.captured_at)}
                </p>
              )}
            </div>
            <DeleteCompetitorButton
              competitorId={competitor.id}
              competitorName={competitor.name}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Action row */}
      <div className="mb-6">
        <SnapshotActions competitorId={competitor.id} competitorUrl={competitor.url} />
      </div>

      {/* Signals from latest snapshot */}
      {lastSuccess && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Extracted signals</CardTitle>
            <CardDescription>
              Marketing signals detected in the latest successful snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignalsDisplay signals={lastSuccess.signals} />
          </CardContent>
        </Card>
      )}

      {/* Layout grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detected changes</CardTitle>
            <CardDescription>
              Strategic shifts Beacon has spotted over time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangeFeed competitorId={competitor.id} changes={changes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Snapshot timeline</CardTitle>
            <CardDescription>
              Each capture of this site, newest first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshots.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No snapshots yet. Take one above to establish a baseline.
              </div>
            ) : (
              <ul className="relative space-y-4 border-l border-border pl-4">
                {snapshots.map((s) => (
                  <li key={s.id} className="relative">
                    <span
                      className={
                        "absolute -left-[1.4rem] top-1 flex h-3 w-3 items-center justify-center rounded-full ring-2 ring-background " +
                        (s.fetch_status === "success"
                          ? "bg-primary"
                          : s.fetch_status === "blocked"
                          ? "bg-amber-500"
                          : "bg-destructive")
                      }
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">
                            {s.fetch_status === "success"
                              ? s.capture_method === "auto"
                                ? "Auto snapshot"
                                : "Manual snapshot"
                              : s.fetch_status === "blocked"
                              ? "Blocked"
                              : "Fetch failed"}
                          </span>
                          {s.status_code != null && (
                            <Badge variant="muted" className="text-[10px]">
                              HTTP {s.status_code}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(s.captured_at)}
                        </p>
                      </div>
                    </div>
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
