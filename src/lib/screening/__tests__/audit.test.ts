import { describe, it, expect } from "vitest";
import { buildAuditText } from "../audit";
import { LLM_MODEL } from "../config";
import type { ScreeningResult } from "~/types/screening";

const BASE_RESULT: ScreeningResult = {
  isMatch: true,
  confidence: "HIGH",
  sentiment: "NEGATIVE",
  recommendation: "ESCALATE",
  matchReasoning: "The article clearly refers to the subject.",
  sentimentReasoning: "Multiple fraud allegations mentioned.",
  evidenceQuotes: ["was charged with fraud", "sentenced to 5 years"],
  entitiesFound: [
    {
      name: "John Doe",
      details: {
        fullName: "John Doe",
        dateOfBirth: "1980-01-01",
        age: "44",
        occupation: "Banker",
        location: "London",
        nationality: "British",
      },
    },
  ],
  identifyingDetailsFound: {
    fullName: "John Doe",
    dateOfBirth: "1980-01-01",
    age: "44",
    occupation: "Banker",
    location: "London",
    nationality: "British",
  },
  articleTitle: "Banker convicted of fraud",
  isPaywalled: false,
  processingTimeMs: 3500,
};

describe("buildAuditText", () => {
  it("includes the verdict, confidence, and match status", () => {
    const text = buildAuditText(BASE_RESULT, "https://example.com/article", "John Doe", "1980-01-01");
    expect(text).toContain("VERDICT      : ESCALATE");
    expect(text).toContain("Confidence   : HIGH");
    expect(text).toContain("Match        : YES");
  });

  it("includes the subject name and DOB when provided", () => {
    const text = buildAuditText(BASE_RESULT, "https://example.com/article", "John Doe", "1980-01-01");
    expect(text).toContain("John Doe");
    expect(text).toContain("DOB: 1980-01-01");
  });

  it("omits the DOB line when dateOfBirth is empty", () => {
    const text = buildAuditText(BASE_RESULT, "https://example.com/article", "Jane Smith", "");
    expect(text).toContain("Jane Smith");
    expect(text).not.toContain("DOB:");
  });

  it("includes the article URL", () => {
    const text = buildAuditText(BASE_RESULT, "https://example.com/article", "John Doe", "");
    expect(text).toContain("Article URL  : https://example.com/article");
  });

  it("includes the article title when present", () => {
    const text = buildAuditText(BASE_RESULT, "https://example.com/article", "John Doe", "");
    expect(text).toContain("Article Title: Banker convicted of fraud");
  });

  it("omits the article title line when articleTitle is empty", () => {
    const result = { ...BASE_RESULT, articleTitle: "" };
    const text = buildAuditText(result, "https://example.com/article", "John Doe", "");
    expect(text).not.toContain("Article Title:");
  });

  it("includes match and sentiment reasoning", () => {
    const text = buildAuditText(BASE_RESULT, "https://example.com/article", "John Doe", "");
    expect(text).toContain("MATCH REASONING:");
    expect(text).toContain("The article clearly refers to the subject.");
    expect(text).toContain("SENTIMENT REASONING:");
    expect(text).toContain("Multiple fraud allegations mentioned.");
  });

  it("omits sentiment reasoning when not present", () => {
    const result: ScreeningResult = { ...BASE_RESULT, sentimentReasoning: null };
    const text = buildAuditText(result, "https://example.com/article", "John Doe", "");
    expect(text).not.toContain("SENTIMENT REASONING:");
  });

  it("includes all evidence quotes with numbered labels", () => {
    const text = buildAuditText(BASE_RESULT, "https://example.com/article", "John Doe", "");
    expect(text).toContain('[1] "was charged with fraud"');
    expect(text).toContain('[2] "sentenced to 5 years"');
  });

  it("omits the evidence quotes section when list is empty", () => {
    const result: ScreeningResult = { ...BASE_RESULT, evidenceQuotes: [] };
    const text = buildAuditText(result, "https://example.com/article", "John Doe", "");
    expect(text).not.toContain("EVIDENCE QUOTES:");
  });

  it("includes all identifying details found", () => {
    const text = buildAuditText(BASE_RESULT, "https://example.com/article", "John Doe", "");
    expect(text).toContain("Name        : John Doe");
    expect(text).toContain("Date of Birth: 1980-01-01");
    expect(text).toContain("Occupation  : Banker");
    expect(text).toContain("Location    : London");
    expect(text).toContain("Nationality : British");
  });

  it("renders em-dash for null identifying detail fields", () => {
    const result: ScreeningResult = {
      ...BASE_RESULT,
      identifyingDetailsFound: {
        fullName: null,
        dateOfBirth: null,
        age: null,
        occupation: null,
        location: null,
        nationality: null,
      },
    };
    const text = buildAuditText(result, "https://example.com/article", "John Doe", "");
    expect(text).toContain("Name        : —");
    expect(text).toContain("Occupation  : —");
  });

  it("includes the model name from LLM_MODEL constant", () => {
    const text = buildAuditText(BASE_RESULT, "https://example.com/article", "John Doe", "");
    expect(text).toContain(`Model        : ${LLM_MODEL}`);
  });

  it("includes processing time in seconds", () => {
    const text = buildAuditText(BASE_RESULT, "https://example.com/article", "John Doe", "");
    expect(text).toContain("Processing   : 3.5s");
  });

  it("includes the header banner", () => {
    const text = buildAuditText(BASE_RESULT, "https://example.com/article", "John Doe", "");
    expect(text).toContain("ADVERSE MEDIA SCREENING DECISION");
  });
});
