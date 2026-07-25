import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// GET /api/snapshots/:id — full snapshot INCLUDING html (for the visual diff).
// The list endpoint omits html to keep payloads small; this one returns it.
export async function GET(_request: Request, { params }: Params) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const snapshot = await getSnapshot(id);
  if (!snapshot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ snapshot });
}
