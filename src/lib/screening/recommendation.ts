// Deterministic — derived from LLM output, never guessed by the model.
// False negatives (missed adverse matches) are the worst outcome in compliance,
// so we default to REVIEW whenever confidence is not HIGH.
export const deriveRecommendation = (
  isMatch: boolean,
  confidence: "HIGH" | "MEDIUM" | "LOW",
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | null,
): "DISCARD" | "REVIEW" | "ESCALATE" => {
  if (!isMatch && confidence === "HIGH") return "DISCARD";
  if (isMatch && sentiment === "NEGATIVE" && confidence !== "LOW") return "ESCALATE";
  // Confirmed match with positive/neutral sentiment: still a match — analyst must verify.
  // Silently discarding confirmed identities risks missing sanctions context.
  return "REVIEW";
};
