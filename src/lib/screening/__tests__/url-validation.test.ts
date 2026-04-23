import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";
import { validateArticleUrl } from "../url-validation";

const expectBadRequest = (fn: () => unknown, message?: string) => {
  try {
    fn();
    expect.fail("Expected TRPCError to be thrown");
  } catch (err) {
    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("BAD_REQUEST");
    if (message) expect((err as TRPCError).message).toContain(message);
  }
};

describe("validateArticleUrl", () => {
  // ── Valid URLs ────────────────────────────────────────────────────────────
  describe("valid URLs", () => {
    it("accepts a normal HTTPS URL and returns a URL object", () => {
      const result = validateArticleUrl("https://www.bbc.com/news/article-123");
      expect(result).toBeInstanceOf(URL);
      expect(result.hostname).toBe("www.bbc.com");
    });

    it("accepts HTTPS URLs with paths, query strings, and fragments", () => {
      expect(() =>
        validateArticleUrl("https://example.com/path?q=foo&bar=1#section"),
      ).not.toThrow();
    });
  });

  // ── Protocol enforcement ─────────────────────────────────────────────────
  describe("protocol enforcement", () => {
    it("rejects plain HTTP", () => {
      expectBadRequest(() => validateArticleUrl("http://example.com/article"), "HTTPS");
    });

    it("rejects ftp://", () => {
      expectBadRequest(() => validateArticleUrl("ftp://example.com/file"), "HTTPS");
    });

    it("rejects file:// URIs", () => {
      expectBadRequest(() => validateArticleUrl("file:///etc/passwd"), "HTTPS");
    });
  });

  // ── Malformed URLs ────────────────────────────────────────────────────────
  describe("malformed URLs", () => {
    it("rejects a bare string with no protocol", () => {
      expectBadRequest(() => validateArticleUrl("not-a-url"), "Invalid URL");
    });

    it("rejects an empty string", () => {
      expectBadRequest(() => validateArticleUrl(""), "Invalid URL");
    });

    it("rejects a URL with no hostname", () => {
      expectBadRequest(() => validateArticleUrl("https://"), "Invalid URL");
    });
  });

  // ── SSRF: private / loopback ranges ──────────────────────────────────────
  describe("SSRF protection — blocked hostnames", () => {
    it("blocks localhost", () => {
      expectBadRequest(() => validateArticleUrl("https://localhost/secret"), "restricted");
    });

    it("blocks 127.0.0.1", () => {
      expectBadRequest(() => validateArticleUrl("https://127.0.0.1/admin"), "restricted");
    });

    it("blocks 127.x.x.x loopback range", () => {
      expectBadRequest(() => validateArticleUrl("https://127.0.0.2/"), "restricted");
    });

    it("blocks RFC-1918 10.x.x.x", () => {
      expectBadRequest(() => validateArticleUrl("https://10.0.0.1/internal"), "restricted");
    });

    it("blocks RFC-1918 192.168.x.x", () => {
      expectBadRequest(() => validateArticleUrl("https://192.168.1.1/router"), "restricted");
    });

    it("blocks RFC-1918 172.16.x.x – 172.31.x.x", () => {
      expectBadRequest(() => validateArticleUrl("https://172.16.0.1/"), "restricted");
      expectBadRequest(() => validateArticleUrl("https://172.31.255.255/"), "restricted");
    });

    it("does NOT block 172.15.x.x (just outside the private range)", () => {
      expect(() => validateArticleUrl("https://172.15.0.1/")).not.toThrow();
    });

    it("does NOT block 172.32.x.x (just outside the private range)", () => {
      expect(() => validateArticleUrl("https://172.32.0.1/")).not.toThrow();
    });

    it("blocks link-local 169.254.x.x (cloud metadata endpoint range)", () => {
      expectBadRequest(() => validateArticleUrl("https://169.254.169.254/latest/meta-data/"), "restricted");
    });

    it("blocks ::1 IPv6 loopback", () => {
      expectBadRequest(() => validateArticleUrl("https://[::1]/"), "restricted");
    });

    it("blocks 0.0.0.0", () => {
      expectBadRequest(() => validateArticleUrl("https://0.0.0.0/"), "restricted");
    });
  });
});
