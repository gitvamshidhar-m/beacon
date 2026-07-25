import { NextResponse } from "next/server";
import { getCompetitor, listSnapshots } from "@/lib/db";

type Params = { params: { id: string } };

// GET /api/competitors/:id/snapshots — snapshot timeline for a competitor
export async function GET(_request: Request, { params }: Params) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  if (!(await getCompetitor(id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Strip the heavy `html` field from list responses — the diff view fetches
  // a single snapshot with html on demand.
  const snapshots = (await listSnapshots(id)).map(({ html, ...rest }) => rest);
  return NextResponse.json({ snapshots });
}
