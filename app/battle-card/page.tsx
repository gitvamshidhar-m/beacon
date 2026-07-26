"use client";
import { useEffect, useState } from "react";
import { Sword, ExternalLink, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Competitor {
  id: number;
  name: string;
  url: string;
  category: string | null;
}

interface Signals {
  seoTitle: string | null;
  metaDescription: string | null;
  headline: string | null;
  subheadings: string[];
  pricing: { amount: string; context: string }[];
  features: string[];
  ctas: string[];
  navigation: string[];
}

export default function BattleCardPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [signals, setSignals] = useState<Record<number, Signals | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/competitors")
      .then((r) => r.json())
      .then(async (d: { competitors: Competitor[] }) => {
        setCompetitors(d.competitors);
        const sigs: Record<number, Signals | null> = {};
        await Promise.all(
          d.competitors.map(async (c) => {
            try {
              const res = await fetch(`/api/competitors/${c.id}/snapshots`);
              const data = await res.json();
              const snaps = data.snapshots || data;
              if (snaps.length > 0 && snaps[0].signals) {
                sigs[c.id] = snaps[0].signals;
              } else {
                sigs[c.id] = null;
              }
            } catch {
              sigs[c.id] = null;
            }
          })
        );
        setSignals(sigs);
        setLoading(false);
      });
  }, []);

  const signalFields = [
    { key: "seoTitle" as const, label: "SEO Title" },
    { key: "headline" as const, label: "Headline" },
    { key: "ctas" as const, label: "CTAs" },
    { key: "pricing" as const, label: "Pricing" },
    { key: "features" as const, label: "Features" },
    { key: "navigation" as const, label: "Navigation" },
  ];

  if (loading) {
    return <div className="container py-8"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Battle Card</h1>
        <p className="text-sm text-muted-foreground">
          Side-by-side comparison of all tracked competitors&apos; current positioning.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="sticky left-0 z-10 min-w-[120px] bg-muted/50 px-4 py-3 text-left font-medium">
                Signal
              </th>
              {competitors.map((c) => (
                <th key={c.id} className="min-w-[200px] px-4 py-3 text-left font-medium">
                  <div className="flex items-center gap-1.5">
                    {c.name}
                    {c.category && <Badge variant="muted" className="text-[10px]">{c.category}</Badge>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {signalFields.map((field) => (
              <tr key={field.key} className="border-b last:border-0">
                <td className="sticky left-0 z-10 bg-background px-4 py-3 font-medium">
                  {field.label}
                </td>
                {competitors.map((c) => {
                  const sig = signals[c.id];
                  let value = "";
                  let present = false;
                  if (sig) {
                    const v = sig[field.key];
                    if (v != null) {
                      present = true;
                      if (Array.isArray(v)) {
                        value = v.map((item) =>
                          typeof item === "object" ? `${(item as any).amount} ${(item as any).context || ""}` : item
                        ).join("\n");
                      } else {
                        value = String(v);
                      }
                    }
                  }
                  return (
                    <td key={c.id} className="px-4 py-3 align-top">
                      {present ? (
                        <div className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          <span className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                            {value.slice(0, 200)}
                            {value.length > 200 ? "..." : ""}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground/50">
                          <X className="h-4 w-4" />
                          <span className="text-xs italic">Not captured</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {competitors.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sword className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Add competitors to generate a battle card.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
