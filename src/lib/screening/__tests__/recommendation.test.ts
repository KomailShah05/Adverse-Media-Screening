import { describe, it, expect } from "vitest";
import { deriveRecommendation } from "../recommendation";

describe("deriveRecommendation", () => {
  // ── DISCARD cases ────────────────────────────────────────────────────────
  describe("DISCARD", () => {
    it("returns DISCARD when no match at HIGH confidence", () => {
      expect(deriveRecommendation(false, "HIGH", null)).toBe("DISCARD");
    });

    it("returns DISCARD when no match at HIGH confidence with any sentiment", () => {
      // sentiment is irrelevant when isMatch is false
      expect(deriveRecommendation(false, "HIGH", "NEGATIVE")).toBe("DISCARD");
      expect(deriveRecommendation(false, "HIGH", "POSITIVE")).toBe("DISCARD");
      expect(deriveRecommendation(false, "HIGH", "NEUTRAL")).toBe("DISCARD");
    });
  });

  // ── ESCALATE cases ───────────────────────────────────────────────────────
  describe("ESCALATE", () => {
    it("returns ESCALATE for a HIGH confidence negative match", () => {
      expect(deriveRecommendation(true, "HIGH", "NEGATIVE")).toBe("ESCALATE");
    });

    it("returns ESCALATE for a MEDIUM confidence negative match", () => {
      expect(deriveRecommendation(true, "MEDIUM", "NEGATIVE")).toBe("ESCALATE");
    });

    it("does NOT escalate a LOW confidence negative match (too uncertain)", () => {
      expect(deriveRecommendation(true, "LOW", "NEGATIVE")).toBe("REVIEW");
    });
  });

  // ── REVIEW cases ─────────────────────────────────────────────────────────
  describe("REVIEW", () => {
    it("returns REVIEW when no match but confidence is not HIGH", () => {
      expect(deriveRecommendation(false, "MEDIUM", null)).toBe("REVIEW");
      expect(deriveRecommendation(false, "LOW", null)).toBe("REVIEW");
    });

    it("returns REVIEW for a confirmed POSITIVE match (analyst must verify identity)", () => {
      expect(deriveRecommendation(true, "HIGH", "POSITIVE")).toBe("REVIEW");
      expect(deriveRecommendation(true, "MEDIUM", "POSITIVE")).toBe("REVIEW");
      expect(deriveRecommendation(true, "LOW", "POSITIVE")).toBe("REVIEW");
    });

    it("returns REVIEW for a confirmed NEUTRAL match", () => {
      expect(deriveRecommendation(true, "HIGH", "NEUTRAL")).toBe("REVIEW");
      expect(deriveRecommendation(true, "MEDIUM", "NEUTRAL")).toBe("REVIEW");
      expect(deriveRecommendation(true, "LOW", "NEUTRAL")).toBe("REVIEW");
    });

    it("returns REVIEW for a match with null sentiment (e.g. no match found by model but isMatch=true edge case)", () => {
      expect(deriveRecommendation(true, "HIGH", null)).toBe("REVIEW");
      expect(deriveRecommendation(true, "MEDIUM", null)).toBe("REVIEW");
    });

    it("returns REVIEW for LOW confidence negative match — uncertainty prevents escalation", () => {
      expect(deriveRecommendation(true, "LOW", "NEGATIVE")).toBe("REVIEW");
    });
  });

  // ── Conservative bias check ───────────────────────────────────────────────
  it("never returns DISCARD when isMatch is true", () => {
    const confidences = ["HIGH", "MEDIUM", "LOW"] as const;
    const sentiments = ["POSITIVE", "NEGATIVE", "NEUTRAL", null] as const;
    for (const confidence of confidences) {
      for (const sentiment of sentiments) {
        expect(deriveRecommendation(true, confidence, sentiment)).not.toBe("DISCARD");
      }
    }
  });
});
