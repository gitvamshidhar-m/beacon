"use client";
import { useEffect, useState } from "react";
import { GitCompare, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface CompData {
  name: string;
  features: string[];
  pricingCount: number;
  ctaCount: number;
  headline: string | null;
  seoTitle: string | null;
  comparison: {
    competitor: string;
    shared: string[];
    unique: string[];
    similarity: number;
  }[];
}

interface Data {
  competitors: { name: string; features: string[]; pricing: any[]; ctas: string[]; headline: string | null; seoTitle: string | null }[];
  matrix: CompData[];
  allFeatures: string[];
}

export default function ComparePage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/compare")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="container py-8"><p className="text-muted-foreground">Loading comparison data...</p></div>;
  if (!data || data.matrix.length === 0) return <div className="container py-8"><p className="text-muted-foreground">No competitors to compare.</p></div>;

  const active = selected ? data.matrix.find((m) => m.name === selected)! : data.matrix[0];

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Feature Comparison Matrix</h1>
        <p className="text-sm text-muted-foreground">Compare feature overlap and similarity scores across competitors.</p>
      </div>

      {/* Competitor selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {data.matrix.map((m) => (
          <button
            key={m.name}
            onClick={() => setSelected(m.name)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              active.name === m.name ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* Comparison cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {active.comparison.map((comp) => (
          <Card key={comp.competitor}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GitCompare className="h-4 w-4 text-muted-foreground" />
                  vs {comp.competitor}
                </CardTitle>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  comp.similarity >= 50 ? "bg-green-100 text-green-700" : comp.similarity >= 20 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                }`}>
                  {comp.similarity}% match
                </span>
              </div>
              <CardDescription>
                {comp.shared.length} shared features · {comp.unique.length} unique
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              {comp.shared.length > 0 && (
                <div>
                  <p className="font-medium text-green-600 mb-1">Shared features</p>
                  <div className="flex flex-wrap gap-1">
                    {comp.shared.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-0.5 rounded bg-green-50 px-1.5 py-0.5 text-green-700">
                        <Check className="h-3 w-3" /> {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {comp.unique.length > 0 && (
                <div>
                  <p className="font-medium text-blue-600 mb-1">{active.name} only</p>
                  <div className="flex flex-wrap gap-1">
                    {comp.unique.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {comp.shared.length === 0 && comp.unique.length === 0 && (
                <p className="text-muted-foreground italic">No feature data available for comparison.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Feature presence matrix */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Feature Presence Matrix</CardTitle>
          <CardDescription>All features across all competitors.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left pr-4 pb-2 font-medium">Feature</th>
                {data.matrix.map((m) => (
                  <th key={m.name} className={`text-center pb-2 font-medium ${active.name === m.name ? "text-primary" : ""}`}>
                    {m.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.allFeatures.map((feat, i) => (
                <tr key={i} className="border-t">
                  <td className="pr-4 py-1.5 text-muted-foreground">{feat}</td>
                  {data.matrix.map((m) => {
                    const has = m.features.includes(feat);
                    return (
                      <td key={m.name} className="text-center py-1.5">
                        {has ? <Check className="inline h-3.5 w-3.5 text-green-500" /> : <X className="inline h-3.5 w-3.5 text-red-300" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Quick overview table */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Quick Overview</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left pr-4 pb-2 font-medium">Competitor</th>
                <th className="text-center pr-4 pb-2 font-medium">Features</th>
                <th className="text-center pr-4 pb-2 font-medium">Pricing Tiers</th>
                <th className="text-center pr-4 pb-2 font-medium">CTAs</th>
                <th className="text-left pb-2 font-medium">Headline</th>
              </tr>
            </thead>
            <tbody>
              {data.matrix.map((m) => (
                <tr key={m.name} className="border-t">
                  <td className="pr-4 py-1.5 font-medium">{m.name}</td>
                  <td className="text-center pr-4 py-1.5">{m.features.length}</td>
                  <td className="text-center pr-4 py-1.5">{m.pricingCount}</td>
                  <td className="text-center pr-4 py-1.5">{m.ctaCount}</td>
                  <td className="py-1.5 text-muted-foreground max-w-[200px] truncate">{m.headline || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
