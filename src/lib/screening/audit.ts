import type { ScreeningResult } from "~/types/screening";

export const buildAuditText = (
  result: ScreeningResult,
  url: string,
  name: string,
  dateOfBirth: string,
): string => {
  const timestamp = new Date().toUTCString();
  const d = result.identifyingDetailsFound;

  const lines: string[] = [
    "ADVERSE MEDIA SCREENING DECISION",
    "=".repeat(44),
    `Timestamp    : ${timestamp}`,
    `Subject      : ${name}${dateOfBirth ? ` | DOB: ${dateOfBirth}` : ""}`,
    `Article URL  : ${url}`,
    ...(result.articleTitle ? [`Article Title: ${result.articleTitle}`] : []),
    "",
    `VERDICT      : ${result.recommendation}`,
    `Confidence   : ${result.confidence}`,
    `Match        : ${result.isMatch ? "YES" : "NO"}`,
    ...(result.sentiment ? [`Sentiment    : ${result.sentiment}`] : []),
    "",
    "MATCH REASONING:",
    result.matchReasoning,
    "",
    ...(result.sentimentReasoning
      ? ["SENTIMENT REASONING:", result.sentimentReasoning, ""]
      : []),
    "IDENTIFYING DETAILS FOUND IN ARTICLE:",
    `  Name        : ${d.fullName ?? "—"}`,
    `  Date of Birth: ${d.dateOfBirth ?? "—"}`,
    `  Age         : ${d.age ?? "—"}`,
    `  Occupation  : ${d.occupation ?? "—"}`,
    `  Location    : ${d.location ?? "—"}`,
    `  Nationality : ${d.nationality ?? "—"}`,
    "",
    ...(result.evidenceQuotes.length > 0
      ? [
          "EVIDENCE QUOTES:",
          ...result.evidenceQuotes.map((q, i) => `[${i + 1}] "${q}"`),
          "",
        ]
      : []),
    `Model        : gpt-4o`,
    `Processing   : ${(result.processingTimeMs / 1000).toFixed(1)}s`,
  ];

  return lines.join("\n");
};
