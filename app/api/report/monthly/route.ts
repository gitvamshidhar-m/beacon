import { NextResponse } from "next/server";
import { getMonthlyReport } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await getMonthlyReport();
  return NextResponse.json({ report });
}
