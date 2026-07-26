import { NextResponse } from "next/server";
import { getReactionData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getReactionData();
  return NextResponse.json({ reactions: data });
}
