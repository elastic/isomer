/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Text shared by the two report formatters. */

export const percent = (part: number, whole: number): string =>
  whole === 0 ? '—' : `${Math.round((part / whole) * 100)}%`;

export const rounded = (value: number | undefined, digits = 0): string =>
  value === undefined ? '—' : value.toFixed(digits);

/** `label value` rows with the values aligned in one column. */
export const alignRows = (rows: readonly (readonly [string, string])[]) => {
  const width = Math.max(...rows.map(([label]) => label.length)) + 1;
  return rows.map(([label, value]) => `${label.padEnd(width)}${value}`);
};
