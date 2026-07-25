import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChangeTypeBadge,
  SeverityBadge,
} from "@/components/SeverityBadge";
import { VisualDiff } from "@/components/VisualDiff";
import { FieldDiffList } from "@/components/FieldDiffList";
import { getChange, getSnapshot, listChanges } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ChangeDetailPage({
  params,
}: {
  params: { id: string; changeId: string };
}) {
  const competitorId = Number(params.id);
  const changeId = Number(params.changeId);
  if (!Number.isInteger(competitorId) || !Number.isInteger(changeId)) notFound();

  const change = (await getChange(changeId))!;
  if (!change || change.competitor_id !== competitorId) notFound();

  const [fromSnapshot, toSnapshot, allChanges] = await Promise.all([
    getSnapshot(change.from_snapshot_id),
    getSnapshot(change.to_snapshot_id),
    listChanges(competitorId),
  ]);

  const idx = allChanges.findIndex((c) => c.id === changeId);
  const prevChange = idx < allChanges.length - 1 ? allChanges[idx + 1] : null;
  const nextChange = idx > 0 ? allChanges[idx - 1] : null;

  return (
    <div className="container max-w-6xl py-8">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/competitors/${competitorId}`}>
            <ArrowLeft className="h-4 w-4" /> Back to competitor
          </Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-muted-foreground">Change</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/competitors/${competitorId}`}
              className="text-xl font-bold hover:underline"
            >
              {change.competitor_name}
            </Link>
            <ChangeTypeBadge type={change.change_type} />
            <SeverityBadge severity={change.severity} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Detected {formatDate(change.detected_at)}
          </p>
        </div>

        {/* Prev / Next */}
        <div className="flex items-center gap-2">
          {prevChange && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/competitors/${competitorId}/changes/${prevChange.id}`}>
                <ArrowLeft className="h-3.5 w-3.5" /> Previous
              </Link>
            </Button>
          )}
          {nextChange && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/competitors/${competitorId}/changes/${nextChange.id}`}>
                Next <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Field-level structured diffs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Signal changes</CardTitle>
            <CardDescription>
              {change.fields.length} marketing signal
              {change.fields.length === 1 ? "" : "s"} changed between snapshots.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldDiffList fields={change.fields} />
          </CardContent>
        </Card>

        {/* 2. Full visual page diff */}
        {fromSnapshot && toSnapshot && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="h-5 w-5" /> Visual page comparison
              </CardTitle>
              <CardDescription>
                The rendered page before and after the change. Relative URLs
                resolve against the competitor&apos;s site.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VisualDiff
                beforeHtml={fromSnapshot.html}
                afterHtml={toSnapshot.html}
                baseUrl={change.competitor_url}
              />
            </CardContent>
          </Card>
        )}

        {/* Snapshot metadata */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Before snapshot</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>ID: {change.from_snapshot_id}</p>
              <p>
                Time:{" "}
                {fromSnapshot ? formatDate(fromSnapshot.captured_at) : "—"}
              </p>
              <p>
                Method:{" "}
                {fromSnapshot ? fromSnapshot.capture_method : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">After snapshot</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>ID: {change.to_snapshot_id}</p>
              <p>
                Time:{" "}
                {toSnapshot ? formatDate(toSnapshot.captured_at) : "—"}
              </p>
              <p>
                Method:{" "}
                {toSnapshot ? toSnapshot.capture_method : "—"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
