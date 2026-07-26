import { NextResponse } from "next/server";
import { getDriftData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getDriftData();
  return NextResponse.json({ drift: data });
}
