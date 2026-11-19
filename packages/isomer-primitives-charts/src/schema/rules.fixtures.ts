/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'vitest';

import { nodeSchemaOf } from './schema.fixtures';

export const containing = (text: string): string =>
  expect.stringContaining(text) as string;

export const issuesOf = (type: string, node: unknown) => {
  const result = nodeSchemaOf(type).safeParse(node);
  return result.success
    ? []
    : result.error.issues.map(({ path, message }) => ({
        path: path.join('.'),
        message,
      }));
};

export const expectRule = (
  type: string,
  node: unknown,
  rule: string,
  path: string
) => {
  expect(issuesOf(type, node)).toContainEqual({
    path,
    message: containing(rule),
  });
};

export const BANDS_RANGE_SENTENCE = 'A `bandsRange` needs `colors.bands`.';

export const number = (id: string) => ({
  id,
  label: id,
  type: 'number',
  role: 'metric',
});
export const string = (id: string) => ({
  id,
  label: id,
  type: 'string',
  role: 'dimension',
});
export const date = (id: string) => ({
  id,
  label: id,
  type: 'date',
  role: 'dimension',
});

export const metric = (overrides: Record<string, unknown> = {}) => ({
  type: 'metric',
  data: { columns: [number('v')], rows: [[1]] },
  value: { column: 'v' },
  ...overrides,
});
