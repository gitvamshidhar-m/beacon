import { NextResponse } from "next/server";
import { getPositioningData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getPositioningData();
  return NextResponse.json({ competitors: data });
}
