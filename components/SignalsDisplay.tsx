import type { Signals } from "@/lib/types";

export function SignalsDisplay({ signals }: { signals: Signals }) {
  const items: { label: string; value: string | string[] | null }[] = [
    { label: "SEO Title", value: signals.seoTitle },
    { label: "Meta Description", value: signals.metaDescription },
    { label: "Headline", value: signals.headline },
    { label: "Subheadings", value: signals.subheadings },
    { label: "Pricing", value: signals.pricing.length ? signals.pricing.map((p) => `${p.amount} (${p.context})`) : null },
    { label: "Features", value: signals.features },
    { label: "CTAs", value: signals.ctas },
    { label: "Navigation", value: signals.navigation },
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
          {!item.value || (Array.isArray(item.value) && item.value.length === 0) ? (
            <p className="text-sm italic text-muted-foreground/60">Not found</p>
          ) : Array.isArray(item.value) ? (
            <ul className="list-inside list-disc text-sm">
              {item.value.map((v, i) => (
                <li key={i} className="truncate">{v}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">{item.value}</p>
          )}
        </div>
      ))}
    </div>
  );
}
