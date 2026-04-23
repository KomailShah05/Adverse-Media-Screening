"use client";

import { memo, useCallback } from "react";
import { Button, Stack, TextInput } from "@mantine/core";
import { useForm } from "react-hook-form";
import { useScreeningContext } from "~/context/ScreeningContext";
import type { FormValues } from "~/types/screening";

export const ScreeningForm = memo(() => {
  const { handleFormSubmit } = useScreeningContext();
  const form = useForm<FormValues>();

  const onSubmit = useCallback(
    (values: FormValues) => handleFormSubmit(values),
    [handleFormSubmit],
  );

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
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
        <Button type="submit" mt="xs" aria-label="Run screening">
          Run screening
        </Button>
      </Stack>
    </form>
  );
});

ScreeningForm.displayName = "ScreeningForm";
