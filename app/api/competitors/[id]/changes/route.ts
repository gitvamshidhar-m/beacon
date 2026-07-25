import { NextResponse } from "next/server";
import { getCompetitor, listChanges } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// GET /api/competitors/:id/changes — detected changes for a competitor
export async function GET(_request: Request, { params }: Params) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  if (!(await getCompetitor(id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const changes = await listChanges(id);
  return NextResponse.json({ changes });
}
