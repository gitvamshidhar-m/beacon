// ============================================================================
// Layer 1 — automated polite fetch.
// ----------------------------------------------------------------------------
// Strategy: realistic browser headers + native fetch (Node 18+). Detects
// bot walls and reports them so the caller can fall back to manual HTML
// paste (Layer 2).
// ============================================================================

import { detectBlock } from "./bot-detection";
import type { FetchResult } from "../types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 5;

/**
 * Fetch a URL with browser-like headers and block detection.
 * Never throws — always returns a FetchResult.
 */
export async function autoFetch(
  url: string,
  opts: { timeoutMs?: number } = {}
): Promise<FetchResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let body = "";
  let statusCode: number | null = null;
  let finalUrl: string | undefined;

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9," +
          "image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        Referer: "https://www.google.com/",
        "sec-ch-ua":
          '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
      },
    });

    body = await res.text();
    statusCode = res.status;
    finalUrl = res.url;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: "error",
      html: "",
      statusCode,
      message: `Fetch failed: ${message}`,
    };
  } finally {
    clearTimeout(timer);
  }

  if (!body || body.trim().length === 0) {
    return {
      status: "error",
      html: "",
      statusCode,
      message: "Empty response body",
    };
  }

  const detection = detectBlock(body, statusCode);
  if (detection.blocked) {
    return {
      status: "blocked",
      html: body,
      statusCode,
      message: detection.reason,
      finalUrl,
    };
  }

  return {
    status: "success",
    html: body,
    statusCode,
    finalUrl,
  };
}
