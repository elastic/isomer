/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Every custom check states its rule in a description the agent-facing JSON Schema keeps.

import {
  authoringSchemaSubset,
  buildAuthoringJsonSchema,
  NAVIGATION_HREF_RULE,
  unresolvedBodyNodeSchema,
  type z,
} from '@elastic/isomer-sdk';
import { customChecksOf } from '@elastic/isomer-sdk/testing';
import { describe, expect, it } from 'vitest';

import { rulesOf } from './cross_field';
import { navigationHrefSchema } from './links';
import { contractDefinitions } from './schema.fixtures';

const members = new Map(
  contractDefinitions.map(({ type, schema, schemaFor }) => [
    type,
    schemaFor ? schemaFor(unresolvedBodyNodeSchema) : schema,
  ])
);
const memberSchemas = new Set<unknown>(members.values());

const customChecks = (root: z.ZodType): object[] =>
  customChecksOf(root, { skip: (schema) => memberSchemas.has(schema) });

const navigationHrefChecks = new Set(customChecksOf(navigationHrefSchema));

const rulesFor = (check: object): readonly string[] => {
  const rules = rulesOf(check);
  if (rules) {
    return rules;
  }
  if (navigationHrefChecks.has(check)) {
    return [NAVIGATION_HREF_RULE];
  }
  throw new Error('Custom check has no stated rule metadata.');
};

const descriptions = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(descriptions);
  }
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  return Object.entries(value).flatMap(([key, entry]) =>
    key === 'description' && typeof entry === 'string'
      ? [entry]
      : descriptions(entry)
  );
};

const authoring = buildAuthoringJsonSchema(contractDefinitions);

const rows = [...members].map(([type, schema]) => ({
  type,
  checks: customChecks(schema as z.ZodType),
}));

describe('stated rules', () => {
  it('finds the checks it guards', () => {
    expect(rows.find(({ type }) => type === 'metric')?.checks.length).toBe(6);
  });

  it.each(rows)(
    '$type states each custom check in its authoring schema',
    ({ type, checks }) => {
      const stated = descriptions(authoringSchemaSubset(authoring, [type]));
      for (const check of checks) {
        for (const rule of rulesFor(check)) {
          expect(
            stated.some((description) =>
              description.toLowerCase().includes(rule.toLowerCase())
            ),
            `${type}: ${rule}`
          ).toBe(true);
        }
      }
    }
  );

  it('does not treat an unregistered custom check as a URL check', () => {
    const check = customChecksOf(navigationHrefSchema.refine(() => true)).find(
      (candidate) => !navigationHrefChecks.has(candidate) && !rulesOf(candidate)
    );
    if (!check) {
      throw new Error('Expected custom checks on the chart link schema.');
    }
    expect(() => rulesFor(check)).toThrow(
      'Custom check has no stated rule metadata.'
    );
  });
});
