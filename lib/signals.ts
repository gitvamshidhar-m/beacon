// ============================================================================
// Signal extraction.
// ----------------------------------------------------------------------------
// Given raw HTML, use cheerio to pull out the structured marketing signals we
// track: SEO title, meta description, headline, subheadings, pricing, features,
// CTAs, and navigation. These become the per-snapshot "fingerprint" that the
// differ compares.
// ============================================================================

import * as cheerio from "cheerio";
import type { Signals, PriceItem } from "./types";

/** Normalize whitespace: collapse runs, trim. */
function clean(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\s+/g, " ").trim();
}

/** Pull a usable text label from an element (prefers direct text over nested). */
function elText($: cheerio.CheerioAPI, el: cheerio.AnyNode | undefined): string {
  if (!el) return "";
  return clean($(el).text());
}

/**
 * Extract structured signals from a page's HTML.
 *
 * NOTE: pricing and feature extraction is heuristic. It works well on standard
 * marketing-site layouts (SaaS pricing tables, feature bullet lists) but will
 * not catch every design. Rules can be refined over time.
 */
export function extractSignals(html: string): Signals {
  const $ = cheerio.load(html);

  // --- SEO ----------------------------------------------------------------
  const seoTitle = clean($("title").first().text()) || null;
  const metaDescription =
    clean($('meta[name="description"]').attr("content")) ||
    clean($('meta[property="og:description"]').attr("content")) ||
    null;

  // --- Headline -----------------------------------------------------------
  const headline = clean($("h1").first().text()) || null;

  // --- Subheadings (h2/h3) ------------------------------------------------
  const subheadings: string[] = [];
  $("h2, h3").each((_, el) => {
    const t = elText($, el);
    if (t && t.length <= 200 && !subheadings.includes(t)) {
      subheadings.push(t);
    }
  });

  // --- Pricing ------------------------------------------------------------
  const pricing = extractPricing($);

  // --- Features -----------------------------------------------------------
  const features = extractFeatures($);

  // --- CTAs ---------------------------------------------------------------
  const ctas = extractCtas($);

  // --- Navigation ---------------------------------------------------------
  const navigation = extractNav($);

  return {
    seoTitle,
    metaDescription,
    headline,
    subheadings,
    pricing,
    features,
    ctas,
    navigation,
  };
}

// ============================================================================
// Pricing extraction
// ----------------------------------------------------------------------------
// Look for currency amounts near pricing context. We scan elements whose text
// or nearby context suggests money (plan names, "/mo", "per month", "$").
// ============================================================================

const PRICE_REGEX = /(?:[$€£¥₹]\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?(?:USD|EUR|GBP|\/mo|\/month|\/yr|\/year))/i;

function extractPricing($: cheerio.CheerioAPI): PriceItem[] {
  const found: PriceItem[] = [];
  const seen = new Set<string>();

  // Candidate containers: anything with a class/id hinting at pricing.
  const pricingRoots = $(
    [
      "[class*='pricing' i]",
      "[id*='pricing' i]",
      "[class*='price' i]",
      "[id*='price' i]",
      "[data-plan]",
      "[class*='plan' i]",
    ].join(", ")
  );

  pricingRoots.each((_, root) => {
    // Within a pricing root, look at each "tier"-like block.
    const tiers = $(root).find(
      "[class*='tier' i], [class*='plan' i], [class*='card' i], li, article"
    );

    const scan = tiers.length ? tiers : $(root);

    scan.each((__, el) => {
      const text = clean($(el).text());
      const match = text.match(PRICE_REGEX);
      if (!match) return;
      const amount = match[0].trim();
      const context = text.slice(0, 80);
      const key = `${amount}|${context}`;
      if (seen.has(key)) return;
      seen.add(key);
      found.push({ amount, context });
    });
  });

  // Cap to keep signals compact.
  return found.slice(0, 30);
}

// ============================================================================
// Feature extraction
// ----------------------------------------------------------------------------
// Look for list items that live under a feature-ish heading.
// ============================================================================

const FEATURE_HEADING_RE = /(feature|what you get|includes?|capabilit|benefit|highlight)/i;

function extractFeatures($: cheerio.CheerioAPI): string[] {
  const features: string[] = [];
  const seen = new Set<string>();

  // Find headings that look feature-y, then grab the nearest list items.
  $("h2, h3, h4").each((_, h) => {
    const headingText = clean($(h).text());
    if (!FEATURE_HEADING_RE.test(headingText)) return;

    // Sibling or following list, within a small window.
    const group = $(h)
      .nextUntil("h2, h3, h4")
      .find("li")
      .addBack("li");

    group.each((__, li) => {
      const t = elText($, li);
      if (!t || t.length > 160) return;
      if (seen.has(t)) return;
      seen.add(t);
      features.push(t);
    });
  });

  return features.slice(0, 40);
}

// ============================================================================
// CTA extraction
// ----------------------------------------------------------------------------
// Action-oriented buttons / links.
// ============================================================================

const CTA_RE =
  /^(get started|start(?: your)? free|sign up|signup|sign in|log in|try|try free|book|demo|contact|buy|purchase|subscribe|download|learn more|join|request|get .* free)$/i;

function extractCtas($: cheerio.CheerioAPI): string[] {
  const ctas: string[] = [];
  const seen = new Set<string>();

  $("button, a[class*='btn' i], a[class*='button' i], a[class*='cta' i], input[type='submit']").each(
    (_, el) => {
      const t = elText($, el);
      if (!t) return;
      // Take anything that looks like a CTA, even if it's not in the regex list.
      const isKnown = CTA_RE.test(t);
      const looksClickable = t.length <= 40;
      if (!isKnown && !looksClickable) return;
      if (seen.has(t)) return;
      seen.add(t);
      ctas.push(t);
    }
  );

  return ctas.slice(0, 30);
}

// ============================================================================
// Navigation extraction
// ----------------------------------------------------------------------------

function extractNav($: cheerio.CheerioAPI): string[] {
  const nav: string[] = [];
  const seen = new Set<string>();

  $("nav a, header a, [class*='nav' i] a").each((_, a) => {
    const t = elText($, a);
    if (!t || t.length > 40) return;
    if (seen.has(t)) return;
    seen.add(t);
    nav.push(t);
  });

  return nav.slice(0, 30);
}

// ============================================================================
// Content hash — stable fingerprint of the *signal* payload (not raw HTML).
// Used to skip no-op diffs (snapshot changed visually but not in signals).
// ============================================================================

export function hashSignals(signals: Signals): string {
  // djb2 string hash — fast, good enough for change detection.
  const str = JSON.stringify(signals);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}
