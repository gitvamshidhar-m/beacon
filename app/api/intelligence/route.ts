import { NextResponse } from "next/server";
import { listCompetitors, listRecentChanges } from "@/lib/db";
import { strategicChat } from "@/lib/ai";

export const dynamic = "force-dynamic";

interface CompetitorIntel {
  name: string;
  riskScore: number;
  changeVelocity: number;
  trend: "accelerating" | "decelerating" | "stable";
  latestChange: string | null;
  latestChangeSeverity: string | null;
  changesLast7d: number;
  changesLast30d: number;
  highSeverityLast30d: number;
}

export async function GET() {
  const competitors = await listCompetitors();
  const recentChanges = await listRecentChanges(100);

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

  const intel: CompetitorIntel[] = competitors.map((comp) => {
    const compChanges = recentChanges.filter((c) => c.competitor_name === comp.name);
    const changesLast7d = compChanges.filter((c) => c.detected_at >= daysAgo(7)).length;
    const changesLast30d = compChanges.filter((c) => c.detected_at >= daysAgo(30)).length;
    const changesLast60d = compChanges.filter((c) => c.detected_at >= daysAgo(60)).length;
    const highSeverityLast30d = compChanges.filter((c) => c.detected_at >= daysAgo(30) && c.severity === "high").length;
    const latest = compChanges[0] || null;

    let riskScore = 20;
    riskScore += Math.min(changesLast30d * 5, 30);
    if (highSeverityLast30d > 0) riskScore += 15;
    if (changesLast7d > 0) riskScore += 10;
    riskScore = Math.min(riskScore, 100);

    const velocity30 = changesLast30d;
    const velocity60 = changesLast60d - changesLast30d;
    const trend: "accelerating" | "decelerating" | "stable" =
      velocity30 > velocity60 + 1 ? "accelerating"
      : velocity30 < velocity60 - 1 ? "decelerating"
      : "stable";

    return {
      name: comp.name,
      riskScore,
      changeVelocity: changesLast30d,
      trend,
      latestChange: latest ? `${latest.change_type} (${latest.severity})` : null,
      latestChangeSeverity: latest?.severity || null,
      changesLast7d,
      changesLast30d,
      highSeverityLast30d,
    };
  });

  const sorted = intel.sort((a, b) => b.riskScore - a.riskScore);
  const overallThreat = sorted.length === 0 ? "low"
    : sorted.some((c) => c.riskScore >= 70) ? "high"
    : sorted.some((c) => c.riskScore >= 40) ? "medium"
    : "low";

  let swotAnalysis: Record<string, { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] }> = {};

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && recentChanges.length > 0) {
    try {
      const context = recentChanges.slice(0, 30).map((c) => ({
        competitor_name: c.competitor_name,
        change_type: c.change_type,
        severity: c.severity,
      }));
      const swotContext = sorted.map((c) =>
        `${c.name}: ${c.changesLast30d} changes in 30d, risk ${c.riskScore}/100, trend ${c.trend}, ${c.highSeverityLast30d} high-severity`
      ).join("\n");
      const question = `Given this competitive landscape data, perform a SWOT analysis for each competitor. Focus on:
- Strengths: What advantages do they have based on their changes?
- Weaknesses: Where are they vulnerable based on lack of changes or negative patterns?
- Opportunities: What market gaps or trends can we exploit?
- Threats: What aggressive moves should we watch out for?

Competitors:
${swotContext}

Recent change data:
${context.map((c) => `- ${c.competitor_name}: ${c.change_type} (${c.severity})`).join("\n")}

Provide a structured SWOT for each competitor. Format as JSON with competitor names as keys.`;
      const answer = await strategicChat(question, context);
      try {
        const parsed = JSON.parse(answer);
        swotAnalysis = parsed;
      } catch {
        swotAnalysis = { _raw: { strengths: [answer], weaknesses: [], opportunities: [], threats: [] } } as any;
      }
    } catch {}
  }

  const highImpact = recentChanges.filter((c) => c.severity === "high").slice(0, 10);

  return NextResponse.json({
    marketThreatLevel: overallThreat,
    competitors: sorted,
    swotAnalysis,
    recentHighImpactChanges: highImpact,
  });
}
