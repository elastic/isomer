/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { definePrimitive } from '../define/primitive_module';

import {
  primitiveConformanceCases,
  runPrimitiveInventoryConformance,
} from './conformance';

describe('primitive conformance suite', () => {
  // This package owns the primitive contract but ships no vocabulary, so the
  // suite it publishes is checked here for shape only. The behaviour it
  // asserts is exercised in each consumer primitive pack.
  it('publishes a conformance suite for vocabulary packs', () => {
    expect(primitiveConformanceCases.length).toBeGreaterThan(0);
    for (const { name, run } of primitiveConformanceCases) {
      expect(name).not.toBe('');
      expect(typeof run).toBe('function');
    }
  });

  it('rejects a catalog.example that is neither published nor parseable', () => {
    expect(() =>
      runPrimitiveInventoryConformance([
        definePrimitive({
          type: 'note',
          catalog: {
            type: 'note',
            purpose: '',
            useWhen: [],
            avoidWhen: [],
            example: { type: 'note' },
          },
          examples: [{ type: 'note', body: 'Hello' }],
          schema: z.object({
            type: z.literal('note'),
            body: z.string().min(1),
          }),
          renderers: {
            react: () => null,
            text: () => '',
            markdown: () => '',
          },
        }),
      ])
    ).toThrow(/catalog.example/);
  });
});
