"use client";
import { useEffect, useState } from "react";
import { Shield, TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
  changeTypeBreakdown: Record<string, number>;
  severityDistribution: Record<string, number>;
}

interface SwotEntry {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

interface Data {
  marketThreatLevel: string;
  competitors: CompetitorIntel[];
  swotAnalysis: Record<string, SwotEntry>;
  recentHighImpactChanges: { competitor_name: string; change_type: string; severity: string; detected_at: string }[];
}

const TYPE_COLORS: Record<string, string> = {
  Pricing: "bg-red-400", Messaging: "bg-blue-400", Feature: "bg-green-400",
  CTA: "bg-purple-400", SEO: "bg-yellow-400", Navigation: "bg-gray-400", Mixed: "bg-orange-400",
};
const SEV_COLORS: Record<string, string> = { high: "bg-red-400", medium: "bg-yellow-400", low: "bg-green-400" };

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "accelerating") return <TrendingUp className="h-4 w-4 text-red-500" />;
  if (trend === "decelerating") return <TrendingDown className="h-4 w-4 text-green-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function RiskBadge({ score }: { score: number }) {
  const color = score >= 70 ? "bg-red-100 text-red-700" : score >= 40 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{score}/100</span>;
}

function MiniBar({ data, colors }: { data: Record<string, number>; colors: Record<string, string> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return <div className="h-1.5 w-full rounded-full bg-muted" />;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className={`${colors[k] || "bg-muted"}`} style={{ width: `${(v / total) * 100}%` }} title={`${k}: ${v}`} />
      ))}
    </div>
  );
}

function SwotCard({ swot }: { swot: SwotEntry }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
      <div className="rounded border border-green-200 bg-green-50 p-2">
        <p className="font-semibold text-green-700 mb-1">Strengths</p>
        {swot.strengths?.map((s, i) => <p key={i} className="text-green-600">+ {s}</p>)}
        {(!swot.strengths || swot.strengths.length === 0) && <p className="text-green-400 italic">No data</p>}
      </div>
      <div className="rounded border border-red-200 bg-red-50 p-2">
        <p className="font-semibold text-red-700 mb-1">Weaknesses</p>
        {swot.weaknesses?.map((s, i) => <p key={i} className="text-red-600">- {s}</p>)}
        {(!swot.weaknesses || swot.weaknesses.length === 0) && <p className="text-red-400 italic">No data</p>}
      </div>
      <div className="rounded border border-blue-200 bg-blue-50 p-2">
        <p className="font-semibold text-blue-700 mb-1">Opportunities</p>
        {swot.opportunities?.map((s, i) => <p key={i} className="text-blue-600">→ {s}</p>)}
        {(!swot.opportunities || swot.opportunities.length === 0) && <p className="text-blue-400 italic">No data</p>}
      </div>
      <div className="rounded border border-orange-200 bg-orange-50 p-2">
        <p className="font-semibold text-orange-700 mb-1">Threats</p>
        {swot.threats?.map((s, i) => <p key={i} className="text-orange-600">! {s}</p>)}
        {(!swot.threats || swot.threats.length === 0) && <p className="text-orange-400 italic">No data</p>}
      </div>
    </div>
  );
}

export default function IntelligencePage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/intelligence")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="container py-8"><p className="text-muted-foreground">Analyzing competitive landscape...</p></div>;
  if (!data) return <div className="container py-8"><p className="text-muted-foreground">Failed to load intelligence data.</p></div>;

  const threatColor = data.marketThreatLevel === "high" ? "text-red-600" : data.marketThreatLevel === "medium" ? "text-yellow-600" : "text-green-600";

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Competitive Intelligence</h1>
        <p className="text-sm text-muted-foreground">Risk scores, change velocity, and AI-powered SWOT analysis.</p>
      </div>

      {/* Market Pulse */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Shield className={`h-8 w-8 ${threatColor}`} />
            <div>
              <p className="text-lg font-semibold">
                Market Threat Level: <span className={threatColor}>{data.marketThreatLevel.toUpperCase()}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Based on {data.competitors.length} competitors · {data.competitors.reduce((a, c) => a + c.changesLast30d, 0)} changes in last 30 days
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Competitor Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.competitors.map((comp) => {
          const swot = data.swotAnalysis?.[comp.name];
          const isExpanded = expanded[comp.name] || false;
          return (
            <Card key={comp.name} className={comp.riskScore >= 70 ? "ring-2 ring-red-200" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {comp.name}
                    <RiskBadge score={comp.riskScore} />
                  </CardTitle>
                  <TrendIcon trend={comp.trend} />
                </div>
                <CardDescription>
                  {comp.changesLast7d > 0 && <span className="font-medium">{comp.changesLast7d} changes this week · </span>}
                  {comp.changeVelocity} changes in 30d · {comp.highSeverityLast30d} high-severity
                  {comp.latestChange && <span> · Latest: {comp.latestChange}</span>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Change type & severity bars */}
                {comp.changesLast30d > 0 && (
                  <div className="mb-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Change types</span>
                      <span>{comp.changesLast30d} total</span>
                    </div>
                    <MiniBar data={comp.changeTypeBreakdown} colors={TYPE_COLORS} />
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                      <span>Severity</span>
                    </div>
                    <MiniBar data={comp.severityDistribution} colors={SEV_COLORS} />
                  </div>
                )}
                {/* Mini bar chart */}
                <div className="flex items-end gap-1 h-6 mb-2">
                  {Array.from({ length: Math.min(comp.changesLast30d, 20) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-t"
                      style={{
                        height: `${20 + Math.random() * 60}%`,
                        background: i < comp.changesLast7d ? "var(--destructive)" : "var(--muted-foreground)",
                        opacity: i < comp.changesLast7d ? 0.9 : 0.3,
                      }}
                    />
                  ))}
                </div>

                {swot && (
                  <>
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [comp.name]: !prev[comp.name] }))}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      SWOT Analysis
                    </button>
                    {isExpanded && <SwotCard swot={swot} />}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* High-impact changes */}
      {data.recentHighImpactChanges.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Recent High-Impact Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentHighImpactChanges.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded border p-2 text-sm">
                  <div>
                    <span className="font-medium">{c.competitor_name}</span>
                    <span className="text-muted-foreground ml-2">{c.change_type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700 font-medium">high</span>
                    {new Date(c.detected_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
