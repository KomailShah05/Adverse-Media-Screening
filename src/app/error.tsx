"use client";

import { useEffect } from "react";
import { Alert, Button, Stack, Text } from "@mantine/core";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <Stack p="xl" maw={600} mx="auto" mt="xl">
      <Alert color="red" title="Something went wrong">
        <Stack gap="sm">
          <Text size="sm">
            An unexpected error occurred. You can try to recover or reload the page.
          </Text>
          {error.digest && (
            <Text size="xs" c="dimmed">
              Error ID: {error.digest}
            </Text>
          )}
          <Button variant="outline" color="red" size="xs" w="fit-content" onClick={reset}>
            Try again
          </Button>
        </Stack>
      </Alert>
    </Stack>
  );
}
