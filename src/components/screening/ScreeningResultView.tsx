"use client";

import { memo, useDeferredValue } from "react";
import {
  Alert,
  Badge,
  Blockquote,
  Button,
  CopyButton,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { buildAuditText } from "~/lib/screening/audit";
import { CONFIDENCE_COLORS, SENTIMENT_COLORS, VERDICT_CONFIG } from "~/lib/screening/config";
import { useFocusEffect } from "~/hooks/useFocusEffect";
import { useScreeningContext } from "~/context/ScreeningContext";
import { IdentifyingDetailsTable } from "./IdentifyingDetailsTable";

export const ScreeningResultView = memo(() => {
  const { state, handleReset } = useScreeningContext();

  // Focuses this container when results appear, restores prior focus on reset
  const containerRef = useFocusEffect<HTMLDivElement>(state.view === "result");

  // Defer the result render so view transitions stay responsive
  const deferredState = useDeferredValue(state);

  if (deferredState.view !== "result") return null;
  const { result, url, name, dateOfBirth } = deferredState;

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

      <IdentifyingDetailsTable found={result.identifyingDetailsFound} submitted={{ name, dateOfBirth }} />

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
                aria-label={copied ? "Audit summary copied to clipboard" : "Copy full audit summary to clipboard"}
              >
                {copied ? "Copied!" : "Copy audit summary"}
              </Button>
            </Tooltip>
          )}
        </CopyButton>
        <Button variant="subtle" color="gray" onClick={handleReset}>
          Screen another article
        </Button>
      </Group>
    </Stack>
  );
});

ScreeningResultView.displayName = "ScreeningResultView";
