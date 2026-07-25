// ============================================================================
// Fetcher strategy router.
// ----------------------------------------------------------------------------
// Single entry point the snapshot API uses. Tries Layer 1 (auto fetch); if
// blocked, returns a structured result so the UI can prompt for Layer 2
// (manual HTML paste). Manual paste comes back in through `fromHtml()`.
// ============================================================================

import { autoFetch } from "./auto-fetch";
import { detectBlock } from "./bot-detection";
import type { FetchResult } from "../types";

export { autoFetch };
export { detectBlock };

/**
 * Attempt to auto-fetch a URL. Does NOT fall back to manual automatically —
 * that's a UI decision. The returned `status` tells the caller what to do:
 *   - "success" → proceed to extract signals
 *   - "blocked" → ask the user to paste HTML (Layer 2)
 *   - "error"   → network/DNS failure, ask user to retry or paste
 */
export async function fetchPage(url: string): Promise<FetchResult> {
  // Light validation up front.
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      status: "error",
      html: "",
      statusCode: null,
      message: "Invalid URL",
    };
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return {
      status: "error",
      html: "",
      statusCode: null,
      message: "URL must be http or https",
    };
  }

  return autoFetch(url);
}

/**
 * Layer 2 — accept HTML the user pasted manually and validate it.
 * Even user-pasted content can be a challenge page by accident, so we still
 * run detection and warn (but we do NOT reject — the user is in control).
 */
export function fromHtml(html: string): FetchResult {
  const trimmed = html.trim();
  if (trimmed.length === 0) {
    return {
      status: "error",
      html: "",
      statusCode: null,
      message: "Pasted HTML is empty",
    };
  }

  const detection = detectBlock(trimmed, null);
  return {
    status: "success",
    html: trimmed,
    statusCode: null,
    // Attach the warning if it looks like a challenge page — UI can show it.
    message: detection.blocked
      ? `Heads up: this looks like a challenge page (${detection.reason}). Paste the real page HTML instead.`
      : undefined,
  };
}
