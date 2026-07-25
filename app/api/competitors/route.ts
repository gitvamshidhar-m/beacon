import { NextResponse } from "next/server";
import { listCompetitors, createCompetitor } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/competitors — list all competitors
export async function GET() {
  const competitors = await listCompetitors();
  return NextResponse.json({ competitors });
}

// POST /api/competitors — create a competitor
export async function POST(request: Request) {
  let body: { name?: string; url?: string; category?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const name = body.name?.trim();
  let url = body.url?.trim();
  const category = body.category?.trim() || null;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Normalize URL: prepend https:// if scheme is missing.
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const competitor = await createCompetitor({ name, url, category });
  return NextResponse.json({ competitor }, { status: 201 });
}
