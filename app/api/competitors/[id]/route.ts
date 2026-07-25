import { NextResponse } from "next/server";
import { getCompetitor, deleteCompetitor } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// GET /api/competitors/:id — single competitor
export async function GET(_request: Request, { params }: Params) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const competitor = await getCompetitor(id);
  if (!competitor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ competitor });
}

// DELETE /api/competitors/:id — remove competitor (cascades to snapshots/changes)
export async function DELETE(_request: Request, { params }: Params) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const competitor = await getCompetitor(id);
  if (!competitor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await deleteCompetitor(id);
  return NextResponse.json({ ok: true });
}
