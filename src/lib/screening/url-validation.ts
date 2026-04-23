import { TRPCError } from "@trpc/server";

// Blocks RFC-1918 private ranges, loopback, and cloud metadata endpoints.
// NOTE: regex-only — does not defend against DNS rebinding or encoded IPs.
export const BLOCKED_HOSTNAMES =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1|0\.0\.0\.0)/;

export const validateArticleUrl = (raw: string): URL => {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid URL format." });
  }

  if (parsed.protocol !== "https:") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only HTTPS URLs are supported.",
    });
  }

  // Node's URL parser wraps IPv6 addresses in brackets: "[::1]" — strip them before matching
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTNAMES.test(hostname)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "URL points to a restricted network address.",
    });
  }

  return parsed;
};
