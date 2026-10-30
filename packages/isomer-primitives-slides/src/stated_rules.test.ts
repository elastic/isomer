/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Every custom check in the pack states its rule in a description the agent-facing JSON Schema keeps.

import {
  authoringSchemaSubset,
  buildAuthoringJsonSchema,
  unresolvedBodyNodeSchema,
  z,
} from '@elastic/isomer-sdk';
import { customChecksOf } from '@elastic/isomer-sdk/testing';
import { describe, expect, it } from 'vitest';

import { crossSuperRefine, rulesOf } from './primitives/cross_field';
import { slideDeckPrimitives } from './registry';

/** Each primitive's schema with its child slots unresolved, so the walk stops at nested primitives. */
const members = new Map(
  slideDeckPrimitives.map(({ type, schema, schemaFor }) => [
    type,
    schemaFor ? schemaFor(unresolvedBodyNodeSchema) : schema,
  ])
);
const memberSchemas = new Set<unknown>(members.values());

/** Every custom check reachable from `root`, stopping at other primitives, which are checked on their own. */
const customChecks = (root: z.ZodType): object[] =>
  customChecksOf(root, { skip: (schema) => memberSchemas.has(schema) });

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

const authoring = buildAuthoringJsonSchema(slideDeckPrimitives);

const rows = [...members].map(([type, schema]) => ({
  type,
  checks: customChecks(schema),
}));

describe('stated rules', () => {
  it('finds the checks it guards', () => {
    expect(rows.find(({ type }) => type === 'slideCode')?.checks.length).toBe(
      6
    );
  });

  it.each(rows)(
    '$type states each custom check in its authoring schema',
    ({ type, checks }) => {
      const stated = descriptions(authoringSchemaSubset(authoring, [type]));
      for (const check of checks) {
        const rules = rulesOf(check);
        expect(
          rules,
          `${type} has a check made without cross_field`
        ).toBeDefined();
        for (const rule of rules ?? []) {
          expect(
            stated.some((description) => description.includes(rule)),
            `${type}: ${rule}`
          ).toBe(true);
        }
      }
    }
  );
});

describe('crossSuperRefine', () => {
  const fields = z.object({ a: z.string(), b: z.number() });

  it('is a custom check the walk finds, with its rules, that runs after a field fails', () => {
    const schema = fields.check(
      crossSuperRefine<z.infer<typeof fields>>(
        ({ a }, context) => {
          if (a === 'x') {
            context.addIssue({ code: 'custom', message: 'no x', path: ['a'] });
          }
        },
        ['`a` is never x']
      )
    );
    const [check] = customChecks(schema);
    expect(check && rulesOf(check)).toEqual(['`a` is never x']);
    const { error } = schema.safeParse({ a: 'x', b: 'one' });
    expect(error?.issues.map(({ message }) => message)).toContain('no x');
  });

  it('leaves a bare `superRefine` for the walk to refuse', () => {
    const [check] = customChecks(fields.superRefine(() => undefined));
    expect(check).toBeDefined();
    expect(check && rulesOf(check)).toBeUndefined();
  });
});
