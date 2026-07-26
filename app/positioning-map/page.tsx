"use client";
import { useEffect, useState } from "react";
import { Radar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Competitor {
  competitor_name: string;
  features_count: number;
  pricing_count: number;
  headline_length: number;
  has_ai_keywords: boolean;
  category: string | null;
}

export default function PositioningMapPage() {
  const [data, setData] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/positioning-map")
      .then((r) => r.json())
      .then((d) => { setData(d.competitors); setLoading(false); });
  }, []);

  if (loading) return <div className="container py-8"><p className="text-muted-foreground">Loading...</p></div>;

  const maxFeatures = Math.max(...data.map((c) => c.features_count), 1);
  const maxPricing = Math.max(...data.map((c) => c.pricing_count), 1);

  const W = 700, H = 500, PAD = 60;
  const xScale = (v: number) => PAD + (v / maxFeatures) * (W - PAD * 2);
  const yScale = (v: number) => H - PAD - (v / maxPricing) * (H - PAD * 2);

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Positioning Map</h1>
        <p className="text-sm text-muted-foreground">
          Competitors plotted by feature count vs. pricing tiers. Blue dots = AI-focused.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-h-[500px]">
            {/* Axes */}
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="currentColor" className="text-border" />
            <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="currentColor" className="text-border" />

            {/* X-axis labels */}
            {[0, Math.round(maxFeatures / 2), maxFeatures].map((v) => (
              <text key={v} x={xScale(v)} y={H - PAD + 20} textAnchor="middle" className="fill-muted-foreground" fontSize="11">
                {v}
              </text>
            ))}
            <text x={W / 2} y={H - 5} textAnchor="middle" className="fill-muted-foreground" fontSize="12">
              Features
            </text>

            {/* Y-axis labels */}
            {[0, Math.round(maxPricing / 2), maxPricing].map((v) => (
              <text key={v} x={PAD - 10} y={yScale(v) + 4} textAnchor="end" className="fill-muted-foreground" fontSize="11">
                {v}
              </text>
            ))}
            <text x={12} y={H / 2} textAnchor="middle" className="fill-muted-foreground" fontSize="12" transform={`rotate(-90, 12, ${H / 2})`}>
              Pricing Tiers
            </text>

            {/* Grid lines */}
            {[0, Math.round(maxFeatures / 2), maxFeatures].map((v) => (
              <line key={v} x1={xScale(v)} y1={PAD} x2={xScale(v)} y2={H - PAD} stroke="currentColor" className="text-border/50" strokeDasharray="4" />
            ))}
            {[0, Math.round(maxPricing / 2), maxPricing].map((v) => (
              <line key={v} x1={PAD} y1={yScale(v)} x2={W - PAD} y2={yScale(v)} stroke="currentColor" className="text-border/50" strokeDasharray="4" />
            ))}

            {/* Dots */}
            {data.map((c, i) => (
              <g key={i}>
                <circle
                  cx={xScale(c.features_count)}
                  cy={yScale(c.pricing_count)}
                  r={c.has_ai_keywords ? 9 : 7}
                  fill={c.has_ai_keywords ? "#3b82f6" : "#6b7280"}
                  stroke="white"
                  strokeWidth="2"
                  className="transition-opacity hover:opacity-80"
                />
                <text
                  x={xScale(c.features_count) + 12}
                  y={yScale(c.pricing_count) + 4}
                  fontSize="10"
                  className="fill-foreground"
                >
                  {c.competitor_name}
                </text>
              </g>
            ))}
          </svg>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap gap-4">
        {data.map((c) => (
          <Card key={c.competitor_name} className="flex-1 min-w-[200px]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                {c.competitor_name}
                {c.has_ai_keywords && <span className="text-[10px] text-blue-500">AI</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-0.5">
              <p>Features: {c.features_count}</p>
              <p>Pricing tiers: {c.pricing_count}</p>
              <p>Category: {c.category || "—"}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
