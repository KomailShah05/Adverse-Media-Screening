import type { RouterOutputs } from "~/trpc/react";

export type ScreeningResult = RouterOutputs["screening"]["analyseArticle"];

export type FormValues = {
  url: string;
  name: string;
  dateOfBirth: string;
};

export type AppState =
  | { view: "form" }
  | { view: "scraping"; url: string; name: string; dateOfBirth: string }
  | { view: "analysing"; url: string; name: string; dateOfBirth: string; scrapeDurationMs: number | null }
  | { view: "paywall"; url: string; name: string; dateOfBirth: string }
  | { view: "result"; result: ScreeningResult; url: string; name: string; dateOfBirth: string };

export type StepStatus = "pending" | "active" | "done";

export type ProgressStep = {
  label: string;
  status: StepStatus;
  durationMs?: number;
  elapsedMs?: number;
};
