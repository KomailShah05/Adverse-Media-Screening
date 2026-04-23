"use client";

import { memo } from "react";
import { Alert } from "@mantine/core";
import { useFocusEffect } from "~/hooks/useFocusEffect";
import { useScreeningContext } from "~/context/ScreeningContext";

export const ScreeningErrorAlert = memo(() => {
  const { errorMessage, setErrorMessage } = useScreeningContext();

  // Focuses this container when an error appears, restores prior focus when it clears
  const containerRef = useFocusEffect<HTMLDivElement>(!!errorMessage);

  if (!errorMessage) return null;

  return (
    <div ref={containerRef} tabIndex={-1} style={{ outline: "none" }}>
      <Alert
        color="red"
        title="Screening failed"
        onClose={() => setErrorMessage(null)}
        withCloseButton
      >
        {errorMessage}
      </Alert>
    </div>
  );
});

ScreeningErrorAlert.displayName = "ScreeningErrorAlert";
