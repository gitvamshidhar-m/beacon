// ============================================================================
// Bot-protection / challenge-page detection.
// ----------------------------------------------------------------------------
// Given the response body and status code from an HTTP fetch, decide whether
// the page we got back is the *real* page or a bot-challenge interstitial
// (Cloudflare "Just a moment...", DataDome, etc.). This drives the Layer 2
// manual-paste fallback.
// ============================================================================

export interface DetectionResult {
  blocked: boolean;
  /** Which protection layer we think we hit, for transparency in the UI. */
  reason?: string;
}

/** Lowercased needle substrings that strongly indicate a challenge page. */
const CHALLENGE_MARKERS: string[] = [
  // Cloudflare
  "just a moment...",
  "checking your browser before accessing",
  "cf-browser-verification",
  "cf-challenge-running",
  "ray id", // cloudflare footer — weak alone, strong with small body
  "/cdn-cgi/challenge-platform",
  // DataDome
  "datadome",
  "please verify you are a human",
  // PerimeterX / HUMAN
  "px-captcha",
  "press & hold to confirm you are a human",
  // Akamai BMP
  "access denied" /* akamai often returns this title */,
  "reference #", // akamai error reference
  // Generic
  "are you a robot",
  "bot protection",
  "incapsula incident",
  "_incapsula_resource",
];

/** Title-text markers (paired with very short bodies). */
const BLOCKED_TITLES = [
  "attention required! | cloudflare",
  "403 forbidden",
  "access denied",
];

/**
 * Inspect a fetched response and decide if it looks like a bot block.
 *
 * Heuristics, in order of confidence:
 *  1. Explicit block status codes (403, 429, 503).
 *  2. Known challenge-page markers in the HTML.
 *  3. Suspiciously small body paired with a blocked-looking <title>.
 */
export function detectBlock(
  html: string,
  statusCode: number | null
): DetectionResult {
  if (statusCode && [401, 403, 429, 503].includes(statusCode)) {
    return {
      blocked: true,
      reason: `HTTP ${statusCode} — site refused the request`,
    };
  }

  const lower = html.toLowerCase();

  for (const marker of CHALLENGE_MARKERS) {
    if (lower.includes(marker)) {
      return {
        blocked: true,
        reason: `Challenge page detected ("${trim(marker)}")`,
      };
    }
  }

  // Small body + blocked-looking title → very likely a block page.
  if (html.length < 2000) {
    const titleMatch = lower.match(/<title[^>]*>([^<]*)<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : "";
    for (const t of BLOCKED_TITLES) {
      if (title.includes(t)) {
        return {
          blocked: true,
          reason: `Blocked landing page ("${trim(title)}")`,
        };
      }
    }
  }

  return { blocked: false };
}

function trim(s: string): string {
  return s.length > 48 ? `${s.slice(0, 48)}…` : s;
}
