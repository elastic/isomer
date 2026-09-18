/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';
import { z, type ZodType } from 'zod';

import type {
  AnyPrimitiveDefinition,
  PrimitiveNode,
} from '../define/primitive_module';
import {
  definePrimitive,
  unresolvedBodyNodeSchema,
} from '../define/primitive_module';

import {
  buildCompositionSchemaFromDefinitions,
  resolveVocabulary,
} from './composition_schema';

// These tests exist for cross-composition isolation, which only breaks when two
// compositions with *different* inventories both parse: `z.lazy` resolves its
// getter once per instance and memoizes, so any union shared across
// compositions freezes on whichever parsed first.

const renderers = {
  react: () => null,
  text: () => '',
  markdown: () => '',
};

// `TNode` explicitly, because `examples: []` gives inference nothing to work
// from and `TNode['type']` collapses to `never`.
const define = definePrimitive<PrimitiveNode>;

/** A leaf whose only job is to exist in one inventory and not the other. */
const leaf = (type: string): AnyPrimitiveDefinition =>
  define({
    type,
    catalog: { type, purpose: '', useWhen: [], avoidWhen: [], example: {} },
    examples: [],
    schema: z.object({ type: z.literal(type) }),
    renderers,
  });

/** A container that nests the composition's own body-node union. */
const container: AnyPrimitiveDefinition = define({
  type: 'holder',
  catalog: {
    type: 'holder',
    purpose: '',
    useWhen: [],
    avoidWhen: [],
    example: {},
  },
  examples: [],
  schema: z.object({
    type: z.literal('holder'),
    child: unresolvedBodyNodeSchema,
  }),
  schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
    z.object({ type: z.literal('holder'), child: bodyNodeSchema }),
  renderers,
});

const accepts = (schema: ZodType<unknown>, child: string): boolean =>
  schema.safeParse({ type: 'holder', child: { type: child } }).success;

describe('resolveVocabulary', () => {
  it('binds a container to the inventory it was composed with', () => {
    const withAlpha = resolveVocabulary([container, leaf('alpha')]);
    const withBeta = resolveVocabulary([container, leaf('beta')]);

    expect(accepts(withAlpha.bodyNodeSchema, 'alpha')).toBe(true);
    expect(accepts(withAlpha.bodyNodeSchema, 'beta')).toBe(false);
    expect(accepts(withBeta.bodyNodeSchema, 'beta')).toBe(true);
    expect(accepts(withBeta.bodyNodeSchema, 'alpha')).toBe(false);
  });

  // Both orders run: a shared instance would let the first parse win, so only
  // one of the two directions fails.
  it('is unaffected by which composition parses first', () => {
    const first = resolveVocabulary([container, leaf('alpha')]);
    const second = resolveVocabulary([container, leaf('beta')]);

    expect(accepts(second.bodyNodeSchema, 'beta')).toBe(true);
    expect(accepts(first.bodyNodeSchema, 'alpha')).toBe(true);
    expect(accepts(second.bodyNodeSchema, 'alpha')).toBe(false);
  });

  it('reports the member instance that landed in the union', () => {
    const { members } = resolveVocabulary([container, leaf('alpha')]);

    // Not `container.schema`: a container's member is built by `schemaFor`, and
    // the JSON Schema id registry is keyed on identity, so handing it the
    // standalone instance leaves the one in the union unnamed.
    expect(members.get('holder')).not.toBe(container.schema);
    expect(members.get('alpha')).toBeDefined();
  });

  it('rejects an empty inventory', () => {
    expect(() => resolveVocabulary([])).toThrow(
      /at least one primitive is required/
    );
  });
});

describe('composition version', () => {
  const schema = buildCompositionSchemaFromDefinitions([leaf('note')]);

  it('accepts a missing version and leaves it absent', () => {
    const parsed = schema.parse({
      type: 'view',
      body: [{ type: 'note' }],
    });
    expect('version' in parsed).toBe(false);
  });

  it('accepts version 1', () => {
    const parsed = schema.parse({
      type: 'view',
      version: 1,
      body: [{ type: 'note' }],
    });
    expect(parsed.version).toBe(1);
  });

  it('rejects an unknown version', () => {
    expect(
      schema.safeParse({
        type: 'view',
        version: 2,
        body: [{ type: 'note' }],
      }).success
    ).toBe(false);
  });
});
