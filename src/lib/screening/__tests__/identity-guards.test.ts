import { describe, expect, it } from "vitest";
import { applyDeterministicIdentityGuards } from "../identity-guards";

const BASE_RESULT = {
  isMatch: true,
  confidence: "HIGH" as const,
  matchReasoning:
    "The article age aligns with the submitted birth year, so this appears to be a match.",
  sentiment: "NEGATIVE" as const,
  sentimentReasoning: "The article describes adverse conduct.",
  identifyingDetailsFound: {
    fullName: "Elizabeth A. Holmes",
    dateOfBirth: null,
    age: "38",
    occupation: "Founder and CEO of Theranos",
    location: "Woodside, Calif.",
  },
};

describe("applyDeterministicIdentityGuards", () => {
  it("downgrades confidence when submitted DOB conflicts with article age", () => {
    const result = applyDeterministicIdentityGuards(
      BASE_RESULT,
      "Elizabeth Holmes",
      "1999-01-01",
      "Elizabeth Holmes sentenced",
      "Friday, November 18, 2022. Holmes, 38, of Woodside, Calif., founded Theranos.",
    );

    expect(result.confidence).toBe("LOW");
    expect(result.matchReasoning).toContain('possible match indicators for "Elizabeth Holmes"');
    expect(result.matchReasoning).toContain('name "Elizabeth A. Holmes"');
    expect(result.matchReasoning).toContain("submitted DOB (1999-01-01) implies age 22-23");
    expect(result.matchReasoning).toContain("article reports age 38");
    expect(result.matchReasoning).toContain("cannot be treated as a confirmed match");
    expect(result.matchReasoning).not.toContain("Deterministic identity guard");
    expect(result.matchReasoning).not.toContain("original match reasoning was overridden");
    expect(result.matchReasoning).not.toContain("aligns with the submitted birth year");
  });

  it("keeps confidence when submitted DOB is compatible with article age", () => {
    const result = applyDeterministicIdentityGuards(
      BASE_RESULT,
      "Elizabeth Holmes",
      "1984-02-03",
      "Elizabeth Holmes sentenced",
      "Friday, November 18, 2022. Holmes, 38, of Woodside, Calif., founded Theranos.",
    );

    expect(result.confidence).toBe("HIGH");
    expect(result.matchReasoning).toContain("aligns with the submitted birth year");
    expect(result.matchReasoning).not.toContain("Deterministic identity guard");
  });

  it("does not change no-match results", () => {
    const result = applyDeterministicIdentityGuards(
      { ...BASE_RESULT, isMatch: false },
      "Elizabeth Holmes",
      "1999-01-01",
      "Elizabeth Holmes sentenced",
      "Friday, November 18, 2022. Holmes, 38, of Woodside, Calif., founded Theranos.",
    );

    expect(result.confidence).toBe("HIGH");
  });

  it("uses current age as a fallback when no article date is available and reported age is impossible", () => {
    const result = applyDeterministicIdentityGuards(
      BASE_RESULT,
      "Elizabeth Holmes",
      "1999-01-01",
      "Elizabeth Holmes sentenced",
      "Holmes, 38, of Woodside, Calif., founded Theranos.",
    );

    expect(result.confidence).toBe("LOW");
    expect(result.matchReasoning).toContain("cannot be older than");
    expect(result.matchReasoning).toContain("article reports age 38");
  });

  it("treats organization names as non-person subjects for individual screening", () => {
    const result = applyDeterministicIdentityGuards(
      {
        ...BASE_RESULT,
        matchReasoning: "The article explicitly refers to Apple Inc.",
        identifyingDetailsFound: {
          fullName: "Apple Inc",
          dateOfBirth: null,
          age: null,
          occupation: null,
          location: "Cupertino, California",
        },
      },
      "Apple Inc",
      null,
      "Justice Department Sues Apple",
      "The complaint alleges Apple illegally maintains a monopoly over smartphones.",
    );

    expect(result.isMatch).toBe(false);
    expect(result.confidence).toBe("HIGH");
    expect(result.sentiment).toBeNull();
    expect(result.sentimentReasoning).toBeNull();
    expect(result.matchReasoning).toContain("appears to be an organization rather than an individual");
    expect(result.matchReasoning).toContain('corporate designator "Inc"');
    expect(result.matchReasoning).toContain("should not be treated as a matched person case");
  });
});
