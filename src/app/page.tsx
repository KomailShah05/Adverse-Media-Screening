"use client";

import { memo } from "react";
import { Stack, Text, Title, VisuallyHidden } from "@mantine/core";
import { ScreeningProvider, useScreeningContext } from "~/context/ScreeningContext";
import { PaywallFallback } from "~/components/screening/PaywallFallback";
import { ProgressView } from "~/components/screening/ProgressView";
import { ScreeningErrorAlert } from "~/components/screening/ScreeningErrorAlert";
import { ScreeningForm } from "~/components/screening/ScreeningForm";
import { ScreeningResultView } from "~/components/screening/ScreeningResultView";

const ScreeningContent = memo(() => {
  const { state, liveMessage, isInProgress, progressSteps } = useScreeningContext();

  return (
    <Stack p="xl" maw={680} mx="auto" gap="lg">
      {/* ARIA live region — announces view transitions to screen readers */}
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

      {/* Self-contained: owns its own focus lifecycle via useFocusEffect */}
      <ScreeningErrorAlert />

      {state.view === "form" && <ScreeningForm />}

      {isInProgress && <ProgressView steps={progressSteps} />}

      {/* Always in tree — return null internally when inactive */}
      <PaywallFallback />
      <ScreeningResultView />
    </Stack>
  );
});

ScreeningContent.displayName = "ScreeningContent";

const Home = () => (
  <ScreeningProvider>
    <ScreeningContent />
  </ScreeningProvider>
);

export default Home;
