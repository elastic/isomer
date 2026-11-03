/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonValue } from '../json';
import type { LensColumn, LensTable } from '../schema';

const NUMERIC_TYPES = new Set([
  'byte',
  'short',
  'integer',
  'long',
  'unsigned_long',
  'float',
  'half_float',
  'scaled_float',
  'double',
  'counter_integer',
  'counter_long',
  'counter_double',
  'number',
]);

export interface BoundColumn {
  index: number;
  lens: LensColumn;
  /** Lens's display name: the custom label, otherwise the field name. */
  label: string;
  /** The response's type for the column. */
  type: string;
  numeric: boolean;
}

/** Looks a Lens accessor up by column ID, never by position or label. */
export const column = (
  table: LensTable,
  columnId: string | undefined
): BoundColumn | undefined => {
  if (columnId === undefined) {
    return undefined;
  }
  const index = table.columns.findIndex(
    ({ lens }) => lens.columnId === columnId
  );
  const found = table.columns[index];
  if (!found) {
    return undefined;
  }
  const { lens, type } = found;
  const savedType =
    typeof lens.meta?.type === 'string' ? lens.meta.type : undefined;
  return {
    index,
    lens,
    label: lens.customLabel ? (lens.label ?? lens.fieldName) : lens.fieldName,
    type,
    numeric: NUMERIC_TYPES.has(savedType ?? type),
  };
};

export const cell = (
  row: readonly JsonValue[],
  bound: BoundColumn | undefined
): JsonValue | undefined => (bound ? row[bound.index] : undefined);
