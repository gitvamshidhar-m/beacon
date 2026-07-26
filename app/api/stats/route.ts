import { NextResponse } from "next/server";
import { getCounts, listCompetitors } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const counts = await getCounts();
  const competitors = await listCompetitors();
  return NextResponse.json({
    counts,
    list: competitors.map((c) => ({ id: c.id, name: c.name })),
  });
}
