import { listCompetitors, listRecentChanges, getCounts } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [counts, competitors, changes] = await Promise.all([
    getCounts().catch((e) => { console.error("getCounts error", e); return { competitors: 0, snapshots: 0, changes: 0 }; }),
    listCompetitors().catch((e) => { console.error("listCompetitors error", e); return []; }),
    listRecentChanges(10).catch((e) => { console.error("listRecentChanges error", e); return []; }),
  ]);

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Track strategic changes across your competitors.
          </p>
        </div>
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-5">
          <div className="text-2xl font-bold">{counts.competitors}</div>
          <div className="text-xs text-muted-foreground">Competitors</div>
        </div>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-5">
          <div className="text-2xl font-bold">{counts.snapshots}</div>
          <div className="text-xs text-muted-foreground">Snapshots</div>
        </div>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-5">
          <div className="text-2xl font-bold">{counts.changes}</div>
          <div className="text-xs text-muted-foreground">Changes</div>
        </div>
      </div>
      <p>Competitors: {competitors.length}</p>
      <p>Recent changes: {changes.length}</p>
    </div>
  );
}
