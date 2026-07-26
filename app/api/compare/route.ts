import { NextResponse } from "next/server";
import { listCompetitors } from "@/lib/db";

export const dynamic = "force-dynamic";

async function execDirect(sql: string) {
  const url = process.env.TURSO_DATABASE_URL!;
  const token = process.env.TURSO_AUTH_TOKEN!;
  const httpUrl = url.replace(/^libsql:\/\//, "https://");
  const res = await fetch(`${httpUrl}/v2/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: [] } },
        { type: "close" },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Turso error: ${res.status}`);
  const data = await res.json();
  return data.results?.[0]?.response?.result;
}

function rowsToObjects<T>(result: any): T[] {
  if (!result || !result.rows) return [];
  return result.rows.map((row: any) => {
    const obj: Record<string, unknown> = {};
    result.cols.forEach((col: any, i: number) => {
      const cell = row[i];
      obj[col.name] = cell?.type === "null" || cell?.value == null ? null : cell.value;
    });
    return obj as T;
  });
}

interface CompetitorData {
  name: string;
  features: string[];
  pricing: { amount: string; context: string }[];
  ctas: string[];
  headline: string | null;
  seoTitle: string | null;
}

export async function GET() {
  if (!process.env.TURSO_DATABASE_URL) {
    return NextResponse.json({ competitors: [], matrix: [] });
  }

  const comps = await listCompetitors();
  const data: CompetitorData[] = [];

  for (const comp of comps) {
    const r = await execDirect(
      `SELECT signals FROM snapshots
       WHERE competitor_id = ${comp.id} AND fetch_status = 'success'
       ORDER BY captured_at DESC LIMIT 1`
    );
    const row = rowsToObjects<{ signals: string }>(r)[0];
    let features: string[] = [];
    let pricing: { amount: string; context: string }[] = [];
    let ctas: string[] = [];
    let headline: string | null = null;
    let seoTitle: string | null = null;

    if (row) {
      try {
        const s = JSON.parse(row.signals);
        features = s.features || [];
        pricing = s.pricing || [];
        ctas = s.ctas || [];
        headline = s.headline || null;
        seoTitle = s.seoTitle || null;
      } catch {}
    }

    data.push({ name: comp.name, features, pricing, ctas, headline, seoTitle });
  }

  // Build comparison matrix
  const allFeatures = [...new Set(data.flatMap((d) => d.features))];
  const signalFields = ["headline", "seoTitle"];

  const matrix = data.map((a) => {
    const b = data.filter((x) => x.name !== a.name);
    const sharedFeatures = b.map((other) => ({
      competitor: other.name,
      shared: a.features.filter((f) => other.features.includes(f)),
      unique: a.features.filter((f) => !other.features.includes(f)),
      similarity: a.features.length + other.features.length > 0
        ? Math.round(
            (a.features.filter((f) => other.features.includes(f)).length * 2 /
              (a.features.length + other.features.length)) *
              100
          )
        : 0,
    }));

    return {
      name: a.name,
      features: a.features,
      pricingCount: a.pricing.length,
      ctaCount: a.ctas.length,
      headline: a.headline,
      seoTitle: a.seoTitle,
      comparison: sharedFeatures,
    };
  });

  return NextResponse.json({ competitors: data, matrix, allFeatures });
}
