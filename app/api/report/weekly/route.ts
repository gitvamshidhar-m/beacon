import { NextResponse } from "next/server";
import { getWeeklyBrief } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const brief = await getWeeklyBrief();
  return NextResponse.json(brief);
}
