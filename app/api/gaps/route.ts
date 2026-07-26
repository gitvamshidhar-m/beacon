import { NextResponse } from "next/server";
import { getGapAnalysis } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const gaps = await getGapAnalysis();
  return NextResponse.json({ gaps });
}
