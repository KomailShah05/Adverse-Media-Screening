"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { api } from "~/trpc/react";
import { useElapsedTimer } from "~/hooks/useElapsedTimer";
import type { AppState, FormValues, ProgressStep, StepStatus } from "~/types/screening";

export const useScreening = () => {
  const [state, setState] = useState<AppState>({ view: "form" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const [, startTransition] = useTransition();

  // Always-current state snapshot — safe to read inside async mutation callbacks
  // where the closure would otherwise capture stale state
  const stateRef = useRef(state);
  stateRef.current = state;

  // Guard: prevents setState calls after the component unmounts
  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const scrapeStartRef = useRef<number>(0);
  const analyseElapsedMs = useElapsedTimer(state.view === "analysing");

  // Single consolidated view-transition effect.
  // Returns a cleanup that clears the live message before the next transition fires,
  // preventing stale announcements from lingering in the ARIA live region.
  useEffect(() => {
    switch (state.view) {
      case "result":
        setLiveMessage(
          `Screening complete. Verdict: ${state.result.recommendation}. ` +
            `Confidence: ${state.result.confidence}. ` +
            `${state.result.isMatch ? "Match found." : "No match found."}`,
        );
        break;
      case "paywall":
        setLiveMessage("Article could not be extracted. Please paste the article text to continue.");
        break;
      case "scraping":
        setLiveMessage("Fetching article. Please wait.");
        break;
      case "analysing":
        setLiveMessage("Analysing article with GPT-4o. Please wait.");
        break;
      default:
        setLiveMessage("");
    }

    return () => setLiveMessage("");
  }, [state.view]); // eslint-disable-line react-hooks/exhaustive-deps

  // Error announcements are independent of view transitions
  useEffect(() => {
    if (!errorMessage) return;
    setLiveMessage(`Error: ${errorMessage}`);
  }, [errorMessage]);

  // analyseArticle defined first — scrapeArticle.onSuccess calls it
  const analyseArticle = api.screening.analyseArticle.useMutation({
    onSuccess: (data) => {
      if (!isMountedRef.current) return;
      const current = stateRef.current;
      if (current.view !== "analysing") return;

      setErrorMessage(null);
      startTransition(() => {
        setState({
          view: "result",
          result: data,
          url: current.url,
          name: current.name,
          dateOfBirth: current.dateOfBirth,
        });
      });
    },
    onError: (err) => {
      if (!isMountedRef.current) return;
      startTransition(() => {
        setState({ view: "form" });
        setErrorMessage(err.message ?? "Screening analysis failed. Please try again.");
      });
    },
  });

  const scrapeArticle = api.screening.scrapeArticle.useMutation({
    onSuccess: (data) => {
      if (!isMountedRef.current) return;
      const current = stateRef.current;
      if (current.view !== "scraping") return;

      const elapsed = Date.now() - scrapeStartRef.current;
      const { url, name, dateOfBirth } = current;

      setErrorMessage(null);

      // isPaywalled branch: transition to paywall, no further mutation
      if (data.isPaywalled) {
        startTransition(() => setState({ view: "paywall", url, name, dateOfBirth }));
        return;
      }

      // Normal branch: transition then fire the analysis mutation.
      // mutate() is intentionally outside the setState updater — side effects
      // inside updaters run twice in React StrictMode.
      startTransition(() =>
        setState({ view: "analysing", url, name, dateOfBirth, scrapeDurationMs: elapsed }),
      );
      analyseArticle.mutate({ articleText: data.text, articleTitle: data.title, name, dateOfBirth });
    },
    onError: (err) => {
      if (!isMountedRef.current) return;
      startTransition(() => {
        setState({ view: "form" });
        setErrorMessage(err.message ?? "Could not fetch the article. Please check the URL.");
      });
    },
  });

  // Reset in-flight mutations on unmount so stale callbacks can't fire
  useEffect(() => {
    return () => {
      scrapeArticle.reset();
      analyseArticle.reset();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormSubmit = useCallback(
    (values: FormValues) => {
      startTransition(() => {
        setErrorMessage(null);
        setState({ view: "scraping", url: values.url, name: values.name, dateOfBirth: values.dateOfBirth });
      });
      scrapeStartRef.current = Date.now();
      scrapeArticle.mutate({ url: values.url });
    },
    [scrapeArticle.mutate], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleManualTextSubmit = useCallback(
    (manualText: string) => {
      const current = stateRef.current;
      if (current.view !== "paywall") return;

      const { url, name, dateOfBirth } = current;
      startTransition(() =>
        setState({ view: "analysing", url, name, dateOfBirth, scrapeDurationMs: null }),
      );
      analyseArticle.mutate({
        articleText: manualText.trim(),
        articleTitle: "",
        name,
        dateOfBirth,
      });
    },
    [analyseArticle.mutate], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleReset = useCallback(() => {
    startTransition(() => {
      setState({ view: "form" });
      setErrorMessage(null);
      setLiveMessage("");
    });
    scrapeArticle.reset();
    analyseArticle.reset();
  }, [scrapeArticle.reset, analyseArticle.reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const progressSteps = useMemo((): ProgressStep[] => {
    if (state.view === "scraping") {
      return [
        { label: "Fetching article from URL", status: "active" as StepStatus },
        { label: "Analysing with GPT-4o", status: "pending" as StepStatus },
      ];
    }
    if (state.view === "analysing") {
      return [
        ...(state.scrapeDurationMs !== null
          ? [{ label: "Article fetched", status: "done" as StepStatus, durationMs: state.scrapeDurationMs }]
          : []),
        { label: "Analysing with GPT-4o", status: "active" as StepStatus, elapsedMs: analyseElapsedMs },
      ];
    }
    return [];
  }, [state, analyseElapsedMs]);

  const isInProgress = useMemo(
    () => state.view === "scraping" || state.view === "analysing",
    [state.view],
  );

  const clearError = useCallback(() => setErrorMessage(null), []);

  return useMemo(
    () => ({
      state,
      errorMessage,
      clearError,
      liveMessage,
      isInProgress,
      isAnalysisPending: analyseArticle.isPending,
      progressSteps,
      handleFormSubmit,
      handleManualTextSubmit,
      handleReset,
    }),
    [
      state,
      errorMessage,
      clearError,
      liveMessage,
      isInProgress,
      analyseArticle.isPending,
      progressSteps,
      handleFormSubmit,
      handleManualTextSubmit,
      handleReset,
    ],
  );
};
