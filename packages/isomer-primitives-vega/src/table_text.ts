/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The node's `data` as text, through the charts pack's `dataTable` resolver,
// so formats, `display` strings and missing values read as in a `dataTable`.

import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import type {
  Cell,
  ChartData,
  DataTableNode,
} from '@elastic/isomer-primitives-charts/schema';

/** Column labels and formatted rows, in `data` order; empty columns left out. */
export interface TextTable {
  readonly columns: readonly { id: string; label: string }[];
  readonly rows: readonly (readonly string[])[];
}

/** `data` formatted, as a `dataTable` of it shows it. */
export const formatTable = (data: ChartData): TextTable => {
  const node: DataTableNode = { type: 'dataTable', data };
  const { table } = resolveChart(node, { scheme: 'light' });
  const shown = table.columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => !column.empty);
  return {
    columns: shown.map(({ column: { id, label } }) => ({ id, label })),
    rows: table.rows.map(({ cells }) =>
      shown.map(({ index }) => cells[index] ?? '')
    ),
  };
};

/** `values` of one column, formatted as that column formats them. */
export const formatColumnValues = (
  data: ChartData,
  columnId: string,
  values: readonly Cell[]
): string[] => {
  const column = data.columns.find(({ id }) => id === columnId);
  if (!column) {
    return values.map(String);
  }
  const node: DataTableNode = {
    type: 'dataTable',
    data: { columns: [column], rows: values.map((value) => [value]) },
  };
  const { table } = resolveChart(node, { scheme: 'light' });
  return table.rows.map(({ cells }) => cells[0] ?? '');
};
