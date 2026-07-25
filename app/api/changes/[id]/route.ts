import { NextResponse } from "next/server";
import { getChange } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// GET /api/changes/:id — single change record with field diffs
export async function GET(_request: Request, { params }: Params) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const change = await getChange(id);
  if (!change) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ change });
}
