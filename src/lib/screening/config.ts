export const LLM_MODEL = "gpt-4o" as const;

export const VERDICT_CONFIG = {
  ESCALATE: {
    color: "red",
    label: "ESCALATE — Adverse Match Found",
    description:
      "This article is likely about the subject and contains adverse information. Manual review is required before proceeding.",
  },
  REVIEW: {
    color: "yellow",
    label: "REVIEW — Uncertain Match",
    description:
      "Confidence is insufficient to automatically discard. An analyst must review this article before proceeding.",
  },
  DISCARD: {
    color: "green",
    label: "DISCARD — No Adverse Match",
    description:
      "This article is not about the subject, or contains no adverse information. No further action required.",
  },
} as const;

export const CONFIDENCE_COLORS: Record<string, string> = {
  HIGH: "blue",
  MEDIUM: "orange",
  LOW: "gray",
};

export const SENTIMENT_COLORS: Record<string, string> = {
  NEGATIVE: "red",
  POSITIVE: "green",
  NEUTRAL: "gray",
};
