"use client";

import { memo } from "react";
import { Group, Loader, Stack, Text } from "@mantine/core";
import type { ProgressStep, StepStatus } from "~/types/screening";

// Pure presentational component — keeps props so it stays reusable outside screening context
const StepIcon = memo(({ status }: { status: StepStatus }) => {
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
});

StepIcon.displayName = "StepIcon";

export const ProgressView = memo(({ steps }: { steps: ProgressStep[] }) => (
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
));

ProgressView.displayName = "ProgressView";
