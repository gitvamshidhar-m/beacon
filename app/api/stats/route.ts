import { NextResponse } from "next/server";
import { getCounts } from "@/lib/db";

// GET /api/stats — aggregate counts for the dashboard header cards
export async function GET() {
  const counts = await getCounts();
  return NextResponse.json(counts);
}
