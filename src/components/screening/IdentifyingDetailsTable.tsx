"use client";

import { memo } from "react";
import { Stack, Table, Text } from "@mantine/core";
import { IDENTIFYING_DETAIL_ROWS } from "~/lib/screening/constants";
import type { ScreeningResult } from "~/types/screening";

type Props = {
  found: ScreeningResult["identifyingDetailsFound"];
  submitted: { name: string; dateOfBirth: string };
};


const Cell = memo(({ value, label }: { value: string | null; label: string }) => {
  if (value) return <>{value}</>;
  return (
    <Text c="dimmed" size="sm" span aria-label={label}>
      —
    </Text>
  );
});

Cell.displayName = "Cell";

// Pure presentational — keeps props so it stays reusable outside screening context
export const IdentifyingDetailsTable = memo(({ found, submitted }: Props) => (
  <Stack gap="xs">
    <Text fw={600} size="sm" id="details-table-label">
      Identifying Details
    </Text>
    <Table striped withTableBorder withColumnBorders fz="sm" aria-labelledby="details-table-label">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Field</Table.Th>
          <Table.Th>Found in Article</Table.Th>
          <Table.Th>Submitted</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {IDENTIFYING_DETAIL_ROWS.map(({ field, foundKey, ...rest }) => {
          const submittedValue =
            "useSubmittedName" in rest
              ? submitted.name
              : "useSubmittedDob" in rest
                ? submitted.dateOfBirth || null
                : null;
          return (
            <Table.Tr key={field}>
              <Table.Td c="dimmed">{field}</Table.Td>
              <Table.Td>
                <Cell value={found[foundKey]} label="not found" />
              </Table.Td>
              <Table.Td>
                <Cell value={submittedValue} label="not provided" />
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  </Stack>
));

IdentifyingDetailsTable.displayName = "IdentifyingDetailsTable";
