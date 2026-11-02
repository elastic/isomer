/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlResponseSchema, isBoundedJson, queryPlanSchema } from './schema';
import type { LensResponseResult, LoweringDiagnostic } from './types';

/** Project a complete response by field name, never response position or display label. */
export const readResponse = (
  query: unknown,
  input: unknown
): LensResponseResult => {
  if (!isBoundedJson(query) || !isBoundedJson(input)) {
    return {
      status: 'invalid',
      diagnostics: [
        {
          code: 'lens.response.invalid-json',
          message: 'Expected bounded, finite JSON query and response',
          path: [],
        },
      ],
    };
  }
  const parsedQuery = queryPlanSchema.safeParse(
    JSON.parse(JSON.stringify(query))
  );
  if (!parsedQuery.success) {
    return {
      status: 'invalid',
      diagnostics: parsedQuery.error.issues.map(({ message, path }) => ({
        code: 'lens.response.invalid-query',
        message,
        path: [
          'query',
          ...path.map((entry) =>
            typeof entry === 'symbol' ? String(entry) : entry
          ),
        ],
      })),
    };
  }
  const parsed = esqlResponseSchema.safeParse(
    JSON.parse(JSON.stringify(input))
  );
  if (!parsed.success) {
    return {
      status: 'invalid',
      diagnostics: parsed.error.issues.map(({ message, path }) => ({
        code: 'lens.response.invalid-shape',
        message,
        path: path.map((entry) =>
          typeof entry === 'symbol' ? String(entry) : entry
        ),
      })),
    };
  }
  const {
    columns,
    values,
    is_partial: isPartial,
    is_running: isRunning,
  } = parsed.data;
  const diagnostics: LoweringDiagnostic[] = [];
  if (isPartial || isRunning) {
    diagnostics.push({
      code: 'lens.response.incomplete',
      message: 'Partial or running responses cannot be projected',
      path: [],
    });
  }
  const positions = new Map<string, number>();
  for (const [index, column] of columns.entries()) {
    if (positions.has(column.name)) {
      diagnostics.push({
        code: 'lens.response.duplicate-column',
        message: `Ambiguous ES|QL column "${column.name}"`,
        path: ['columns', index],
      });
    }
    positions.set(column.name, index);
  }
  for (const { fieldName } of parsedQuery.data.columns) {
    if (!positions.has(fieldName)) {
      diagnostics.push({
        code: 'lens.response.missing-column',
        message: `Missing ES|QL column "${fieldName}"`,
        path: ['columns'],
      });
    }
  }
  for (const [index, row] of values.entries()) {
    if (row.length !== columns.length) {
      diagnostics.push({
        code: 'lens.response.row-width',
        message: 'Row width does not match response columns',
        path: ['values', index],
      });
    }
  }
  if (diagnostics.length) {
    return { status: 'invalid', diagnostics };
  }
  const projected = parsedQuery.data.columns.map((lens) => {
    const index = positions.get(lens.fieldName);
    const column = index === undefined ? undefined : columns[index];
    if (index === undefined || !column) {
      throw new Error('Validated response column is missing');
    }
    return { lens, index, responseType: column.type };
  });
  return {
    status: 'ready',
    table: {
      layerId: parsedQuery.data.layerId,
      columns: projected.map(({ lens, responseType }) => ({
        lens,
        responseType,
      })),
      rows: values.map((row) =>
        projected.map(({ index }) => {
          const value = row[index];
          if (value === undefined) {
            throw new Error('Validated response cell is missing');
          }
          return value;
        })
      ),
    },
  };
};
