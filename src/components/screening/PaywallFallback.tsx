"use client";

import { memo, useCallback, useState } from "react";
import { Alert, Button, Group, Stack, Text, Textarea } from "@mantine/core";
import { useFocusEffect } from "~/hooks/useFocusEffect";
import { useScreeningContext } from "~/context/ScreeningContext";

export const PaywallFallback = memo(() => {
  const { state, isAnalysisPending, handleManualTextSubmit } = useScreeningContext();
  const [text, setText] = useState("");

  // Focuses this container when the paywall view becomes active,
  // restores previous focus (e.g. the submit button) when it deactivates
  const containerRef = useFocusEffect<HTMLDivElement>(state.view === "paywall");

  const onTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.currentTarget.value),
    [],
  );

  const onSubmit = useCallback(() => handleManualTextSubmit(text), [handleManualTextSubmit, text]);

  if (state.view !== "paywall") return null;
  const { url, name, dateOfBirth } = state;

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
        onChange={onTextChange}
        aria-label="Paste article text for manual screening"
      />
      <Group>
        <Button
          onClick={onSubmit}
          loading={isAnalysisPending}
          disabled={text.trim().length < 50}
          aria-label={isAnalysisPending ? "Analysing pasted text, please wait" : "Analyse pasted text"}
        >
          Analyse pasted text
        </Button>
      </Group>
    </Stack>
  );
});

PaywallFallback.displayName = "PaywallFallback";
