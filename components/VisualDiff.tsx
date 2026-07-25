"use client";

import { useMemo } from "react";

/**
 * Full visual page diff — renders the "before" and "after" HTML side by side
 * in sandboxed iframes.
 *
 * Why iframes? The fetched pages include their own CSS/JS that would collide
 * with our dashboard if injected directly. srcdoc + sandbox isolates them.
 *
 * Why inject a <base>? So relative asset URLs (CSS, images, fonts) in the
 * captured HTML resolve against the competitor's origin and actually load.
 */
export function VisualDiff({
  beforeHtml,
  afterHtml,
  baseUrl,
}: {
  beforeHtml: string;
  afterHtml: string;
  /** The origin to resolve relative URLs against (e.g. https://acme.com). */
  baseUrl?: string;
}) {
  const beforeSrcDoc = useMemo(
    () => injectBase(beforeHtml, baseUrl),
    [beforeHtml, baseUrl]
  );
  const afterSrcDoc = useMemo(
    () => injectBase(afterHtml, baseUrl),
    [afterHtml, baseUrl]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FramePane label="Before" tone="muted" srcDoc={beforeSrcDoc} />
      <FramePane label="After" tone="primary" srcDoc={afterSrcDoc} />
    </div>
  );
}

function FramePane({
  label,
  srcDoc,
  tone,
}: {
  label: string;
  srcDoc: string;
  tone: "muted" | "primary";
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div
        className={
          "flex items-center justify-between border-b px-3 py-1.5 text-xs font-medium " +
          (tone === "primary"
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground")
        }
      >
        <span>{label}</span>
        <span className="font-mono text-[10px] opacity-70">
          {srcDoc.length.toLocaleString()} chars
        </span>
      </div>
      <iframe
        title={label}
        srcDoc={srcDoc}
        sandbox="allow-same-origin"
        className="h-[500px] w-full bg-white"
      />
    </div>
  );
}

/**
 * Inject a <base href> into the HTML so relative asset URLs resolve against
 * the captured site's origin. Inserted right after <head> (or prepended).
 */
function injectBase(html: string, baseUrl?: string): string {
  if (!baseUrl) return html;
  const baseTag = `<base href="${escapeAttr(baseUrl)}">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${baseTag}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(
      /<html[^>]*>/i,
      (m) => `${m}<head>${baseTag}</head>`
    );
  }
  return `${baseTag}${html}`;
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}
