"use client";

import {
  Alert,
  Badge,
  Blockquote,
  Button,
  CopyButton,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
  VisuallyHidden,
} from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { api, type RouterOutputs } from "~/trpc/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScreeningResult = RouterOutputs["screening"]["analyseArticle"];

type FormValues = {
  url: string;
  name: string;
  dateOfBirth: string;
};

type AppState =
  | { view: "form" }
  | { view: "scraping" }
  | { view: "analysing"; scrapeDurationMs: number | null } // null = paywall bypass
  | { view: "paywall"; url: string; name: string; dateOfBirth: string }
  | { view: "result"; result: ScreeningResult; url: string; name: string; dateOfBirth: string };

// ─── Config ───────────────────────────────────────────────────────────────────

const VERDICT_CONFIG = {
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

const CONFIDENCE_COLORS: Record<string, string> = {
  HIGH: "blue",
  MEDIUM: "orange",
  LOW: "gray",
};

const SENTIMENT_COLORS: Record<string, string> = {
  NEGATIVE: "red",
  POSITIVE: "green",
  NEUTRAL: "gray",
};

// ─── Audit Text Generator ─────────────────────────────────────────────────────

function buildAuditText(
  result: ScreeningResult,
  url: string,
  name: string,
  dateOfBirth: string,
): string {
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
}

// ─── Progress View ────────────────────────────────────────────────────────────

type StepStatus = "pending" | "active" | "done";

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "active") return <Loader size="xs" aria-hidden="true" />;
  if (status === "done")
    return (
      <Text c="green" fw={700} size="sm" w={16} aria-hidden="true">
        ✓
      </Text>
    );
  return (
    <Text c="dimmed" size="sm" w={16} aria-hidden="true">
      ○
    </Text>
  );
}

function ProgressView({
  steps,
}: {
  steps: Array<{
    label: string;
    status: StepStatus;
    durationMs?: number;
    elapsedMs?: number;
  }>;
}) {
  return (
    <Stack gap="sm" py="md" role="status" aria-label="Screening in progress">
      <Text fw={600} size="sm">
        Running screening…
      </Text>
      {steps.map((step, i) => (
        <Group key={i} gap="xs" align="center">
          <StepIcon status={step.status} />
          <Text
            size="sm"
            c={step.status === "pending" ? "dimmed" : undefined}
            aria-label={`${step.label}: ${step.status}`}
          >
            {step.label}
          </Text>
          {step.status === "active" && step.elapsedMs !== undefined && (
            <Text size="xs" c="dimmed">
              — {(step.elapsedMs / 1000).toFixed(1)}s
            </Text>
          )}
          {step.status === "done" && step.durationMs !== undefined && (
            <Text size="xs" c="green">
              — {(step.durationMs / 1000).toFixed(1)}s
            </Text>
          )}
        </Group>
      ))}
    </Stack>
  );
}

// ─── Paywall Fallback ─────────────────────────────────────────────────────────

function PaywallFallback({
  url,
  name,
  dateOfBirth,
  onSubmit,
  isPending,
  containerRef,
}: {
  url: string;
  name: string;
  dateOfBirth: string;
  onSubmit: (text: string) => void;
  isPending: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [text, setText] = useState("");

  return (
    <Stack gap="md" ref={containerRef} tabIndex={-1} style={{ outline: "none" }}>
      <Alert color="yellow" title="Article could not be extracted automatically">
        The article at this URL appears to be behind a paywall or requires JavaScript to render.
        Paste the article text below to continue the screening.
      </Alert>
      <Group gap="xs" wrap="wrap">
        <Text size="sm" c="dimmed">
          Subject: <strong>{name}</strong>
          {dateOfBirth ? ` | DOB: ${dateOfBirth}` : ""}
        </Text>
        <Text size="sm" c="dimmed">
          URL: <strong>{url}</strong>
        </Text>
      </Group>
      <Textarea
        label="Article text"
        description="Paste the full article text here"
        placeholder="Paste article content..."
        minRows={8}
        autosize
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        aria-label="Paste article text for manual screening"
      />
      <Group>
        <Button
          onClick={() => onSubmit(text)}
          loading={isPending}
          disabled={text.trim().length < 50}
          aria-label={isPending ? "Analysing pasted text, please wait" : "Analyse pasted text"}
        >
          Analyse pasted text
        </Button>
      </Group>
    </Stack>
  );
}

// ─── Identifying Details Table ────────────────────────────────────────────────

function IdentifyingDetailsTable({
  found,
  submitted,
}: {
  found: ScreeningResult["identifyingDetailsFound"];
  submitted: { name: string; dateOfBirth: string };
}) {
  const rows = [
    { field: "Full Name", articleValue: found.fullName, submittedValue: submitted.name },
    {
      field: "Date of Birth",
      articleValue: found.dateOfBirth,
      submittedValue: submitted.dateOfBirth || null,
    },
    { field: "Age", articleValue: found.age, submittedValue: null },
    { field: "Occupation", articleValue: found.occupation, submittedValue: null },
    { field: "Location", articleValue: found.location, submittedValue: null },
    { field: "Nationality", articleValue: found.nationality, submittedValue: null },
  ];

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm" id="details-table-label">
        Identifying Details
      </Text>
      <Table
        striped
        withTableBorder
        withColumnBorders
        fz="sm"
        aria-labelledby="details-table-label"
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Field</Table.Th>
            <Table.Th>Found in Article</Table.Th>
            <Table.Th>Submitted</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map(({ field, articleValue, submittedValue }) => (
            <Table.Tr key={field}>
              <Table.Td c="dimmed">{field}</Table.Td>
              <Table.Td>
                {articleValue ?? (
                  <Text c="dimmed" size="sm" span aria-label="not found">
                    —
                  </Text>
                )}
              </Table.Td>
              <Table.Td>
                {submittedValue ?? (
                  <Text c="dimmed" size="sm" span aria-label="not provided">
                    —
                  </Text>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

// ─── Result View ──────────────────────────────────────────────────────────────

function ScreeningResultView({
  result,
  url,
  name,
  dateOfBirth,
  onReset,
  containerRef,
}: {
  result: ScreeningResult;
  url: string;
  name: string;
  dateOfBirth: string;
  onReset: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const verdict = VERDICT_CONFIG[result.recommendation];
  const auditText = buildAuditText(result, url, name, dateOfBirth);

  return (
    <Stack gap="lg" ref={containerRef} tabIndex={-1} style={{ outline: "none" }}>
      <Alert
        color={verdict.color}
        title={verdict.label}
        styles={{ title: { fontSize: "1rem", fontWeight: 700 } }}
      >
        {verdict.description}
      </Alert>

      <Group gap="xs" wrap="wrap">
        <Badge color={CONFIDENCE_COLORS[result.confidence]} variant="light" size="lg">
          Confidence: {result.confidence}
        </Badge>
        {result.sentiment && (
          <Badge color={SENTIMENT_COLORS[result.sentiment]} variant="light" size="lg">
            Sentiment: {result.sentiment}
          </Badge>
        )}
        <Badge color="gray" variant="outline" size="lg">
          {(result.processingTimeMs / 1000).toFixed(1)}s
        </Badge>
      </Group>

      {result.articleTitle && (
        <Text size="sm" c="dimmed">
          Article: <strong>{result.articleTitle}</strong>
        </Text>
      )}

      <Divider />

      <Stack gap="xs">
        <Text fw={600} size="sm" id="match-reasoning-label">
          Match Reasoning
        </Text>
        <Paper withBorder p="sm" radius="sm" aria-labelledby="match-reasoning-label">
          <Text size="sm">{result.matchReasoning}</Text>
        </Paper>
      </Stack>

      {result.sentimentReasoning && (
        <Stack gap="xs">
          <Text fw={600} size="sm" id="sentiment-reasoning-label">
            Sentiment Reasoning
          </Text>
          <Paper withBorder p="sm" radius="sm" aria-labelledby="sentiment-reasoning-label">
            <Text size="sm">{result.sentimentReasoning}</Text>
          </Paper>
        </Stack>
      )}

      <IdentifyingDetailsTable
        found={result.identifyingDetailsFound}
        submitted={{ name, dateOfBirth }}
      />

      {result.evidenceQuotes.length > 0 && (
        <Stack gap="xs">
          <Text fw={600} size="sm">
            Evidence Quotes
          </Text>
          {result.evidenceQuotes.map((quote, i) => (
            <Blockquote key={i} color="blue" cite={`— Article, quote ${i + 1}`} p="sm">
              {quote}
            </Blockquote>
          ))}
        </Stack>
      )}

      <Divider />

      <Group>
        <CopyButton value={auditText} timeout={2000}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? "Copied to clipboard" : "Copy full audit summary"}>
              <Button
                variant={copied ? "filled" : "outline"}
                color={copied ? "green" : "blue"}
                onClick={copy}
                aria-label={
                  copied ? "Audit summary copied to clipboard" : "Copy full audit summary to clipboard"
                }
              >
                {copied ? "Copied!" : "Copy audit summary"}
              </Button>
            </Tooltip>
          )}
        </CopyButton>
        <Button variant="subtle" color="gray" onClick={onReset}>
          Screen another article
        </Button>
      </Group>
    </Stack>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [state, setState] = useState<AppState>({ view: "form" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  // Live elapsed counter for the analysing step
  const [analyseElapsedMs, setAnalyseElapsedMs] = useState(0);
  const analyseStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tracks how long the scrape step took so it can be shown in the progress view
  const scrapeStartRef = useRef<number>(0);

  const form = useForm<FormValues>();

  const resultRef = useRef<HTMLDivElement>(null);
  const paywallRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Start / stop the elapsed timer based on current view
  useEffect(() => {
    if (state.view === "analysing") {
      analyseStartRef.current = Date.now();
      setAnalyseElapsedMs(0);
      timerRef.current = setInterval(() => {
        setAnalyseElapsedMs(Date.now() - analyseStartRef.current);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.view]);

  // Focus management + live region updates
  useEffect(() => {
    if (state.view === "result") {
      setLiveMessage(
        `Screening complete. Verdict: ${state.result.recommendation}. ` +
          `Confidence: ${state.result.confidence}. ` +
          `${state.result.isMatch ? "Match found." : "No match found."}`,
      );
      resultRef.current?.focus();
    }
  }, [state.view]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.view === "paywall") {
      setLiveMessage("Article could not be extracted. Please paste the article text to continue.");
      paywallRef.current?.focus();
    }
  }, [state.view]);

  useEffect(() => {
    if (state.view === "scraping") setLiveMessage("Fetching article. Please wait.");
    if (state.view === "analysing") setLiveMessage("Analysing article with GPT-4o. Please wait.");
  }, [state.view]);

  useEffect(() => {
    if (errorMessage) {
      setLiveMessage(`Error: ${errorMessage}`);
      errorRef.current?.focus();
    }
  }, [errorMessage]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  // Defined first so scrapeArticle.onSuccess can call analyseArticle.mutate
  const analyseArticle = api.screening.analyseArticle.useMutation({
    onSuccess: (data) => {
      setErrorMessage(null);
      const { url, name, dateOfBirth } = form.getValues();
      setState({ view: "result", result: data, url, name, dateOfBirth });
    },
    onError: (err) => {
      setState({ view: "form" });
      setErrorMessage(err.message ?? "Screening analysis failed. Please try again.");
    },
  });

  const scrapeArticle = api.screening.scrapeArticle.useMutation({
    onSuccess: (data) => {
      setErrorMessage(null);
      const elapsed = Date.now() - scrapeStartRef.current;

      const { url, name, dateOfBirth } = form.getValues();

      if (data.isPaywalled) {
        setState({ view: "paywall", url, name, dateOfBirth });
        return;
      }

      setState({ view: "analysing", scrapeDurationMs: elapsed });
      analyseArticle.mutate({
        articleText: data.text,
        articleTitle: data.title,
        name,
        dateOfBirth,
      });
    },
    onError: (err) => {
      setState({ view: "form" });
      setErrorMessage(err.message ?? "Could not fetch the article. Please check the URL.");
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleFormSubmit(values: FormValues) {
    setErrorMessage(null);
    setState({ view: "scraping" });
    scrapeStartRef.current = Date.now();
    scrapeArticle.mutate({ url: values.url });
  }

  function handleManualTextSubmit(manualText: string) {
    if (state.view !== "paywall") return;
    setState({ view: "analysing", scrapeDurationMs: null });
    analyseArticle.mutate({
      articleText: manualText.trim(),
      articleTitle: "",
      name: state.name,
      dateOfBirth: state.dateOfBirth,
    });
  }

  function handleReset() {
    setState({ view: "form" });
    setErrorMessage(null);
    setLiveMessage("");
    setAnalyseElapsedMs(0);
    form.reset();
  }

  // ── Progress steps ─────────────────────────────────────────────────────────

  const progressSteps = (() => {
    if (state.view === "scraping") {
      return [
        { label: "Fetching article from URL", status: "active" as StepStatus, elapsedMs: undefined },
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
  })();

  // ── Render ─────────────────────────────────────────────────────────────────

  const isInProgress = state.view === "scraping" || state.view === "analysing";

  return (
    <Stack p="xl" maw={680} mx="auto" gap="lg">
      <VisuallyHidden>
        <div aria-live="assertive" aria-atomic="true">
          {liveMessage}
        </div>
      </VisuallyHidden>

      <Stack gap={4}>
        <Title order={1} size="h2">
          Adverse Media Screening
        </Title>
        <Text c="dimmed" size="sm">
          Enter the subject&apos;s details and a news article URL to assess for adverse media.
        </Text>
      </Stack>

      {errorMessage && (
        <div ref={errorRef} tabIndex={-1} style={{ outline: "none" }}>
          <Alert
            color="red"
            title="Screening failed"
            onClose={() => setErrorMessage(null)}
            withCloseButton
          >
            {errorMessage}
          </Alert>
        </div>
      )}

      {state.view === "form" && (
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          noValidate
          aria-label="Adverse media screening form"
        >
          <Stack gap="sm">
            <TextInput
              {...form.register("url", { required: "Article URL is required" })}
              label="Article URL"
              description="Full URL of the news article to screen"
              placeholder="https://example.com/article"
              type="url"
              required
              autoComplete="url"
              error={form.formState.errors.url?.message}
            />
            <TextInput
              {...form.register("name", { required: "Subject name is required" })}
              label="Subject full name"
              description="Full name of the individual to screen"
              placeholder="Jane Smith"
              required
              autoComplete="name"
              error={form.formState.errors.name?.message}
            />
            <TextInput
              type="date"
              {...form.register("dateOfBirth")}
              label="Date of birth"
              description="Optional — improves match accuracy"
              autoComplete="bday"
            />
            <Button
              type="submit"
              mt="xs"
              aria-label="Run screening"
            >
              Run screening
            </Button>
          </Stack>
        </form>
      )}

      {isInProgress && <ProgressView steps={progressSteps} />}

      {state.view === "paywall" && (
        <PaywallFallback
          url={state.url}
          name={state.name}
          dateOfBirth={state.dateOfBirth}
          onSubmit={handleManualTextSubmit}
          isPending={analyseArticle.isPending}
          containerRef={paywallRef}
        />
      )}

      {state.view === "result" && (
        <ScreeningResultView
          result={state.result}
          url={state.url}
          name={state.name}
          dateOfBirth={state.dateOfBirth}
          onReset={handleReset}
          containerRef={resultRef}
        />
      )}
    </Stack>
  );
}
