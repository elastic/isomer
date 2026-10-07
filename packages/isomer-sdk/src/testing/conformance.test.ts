/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ValidationError } from '../composition/validation_error';
import {
  definePrimitive,
  type PrimitiveDefinition,
  validateWithSchema,
} from '../define/primitive_module';
import { createPrimitiveDispatcher } from '../render/primitive_dispatch';

import {
  examplesFromDefinitions,
  primitiveConformanceCases,
  type PrimitiveConformanceHarness,
  runPrimitiveInventoryConformance,
} from './conformance';
import { fixtureDefinitions, type FixtureNode } from './sdk.fixtures';

interface NoteNode {
  type: 'note';
  body: string;
}

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
            markdown: () => [],
          },
        }),
      ])
    ).toThrow(/catalog.example/);
  });

  const noteWith = (examples: PrimitiveDefinition<NoteNode>['examples']) =>
    definePrimitive({
      type: 'note',
      catalog: {
        type: 'note',
        purpose: '',
        useWhen: [],
        avoidWhen: [],
        example: { type: 'note', body: 'Hello' },
      },
      examples,
      schema: z.object({ type: z.literal('note'), body: z.string() }),
      renderers: {
        react: () => null,
        text: () => '',
        markdown: () => [],
      },
    });

  it('matches catalog.example against a named example', () => {
    expect(() =>
      runPrimitiveInventoryConformance([
        noteWith([{ name: 'Greeting', node: { type: 'note', body: 'Hello' } }]),
      ])
    ).not.toThrow();
  });

  it('rejects two examples with one name', () => {
    expect(() =>
      runPrimitiveInventoryConformance([
        noteWith([
          { name: 'Greeting', node: { type: 'note', body: 'Hello' } },
          { name: 'Greeting', node: { type: 'note', body: 'Hi' } },
        ]),
      ])
    ).toThrow('note has two examples named "Greeting"');
  });

  it('rejects a blank example name', () => {
    expect(() =>
      runPrimitiveInventoryConformance([
        noteWith([{ name: ' ', node: { type: 'note', body: 'Hello' } }]),
      ])
    ).toThrow('note example names must be non-empty');
  });

  it('names a failing example by its name', () => {
    const definition = noteWith([
      { type: 'note', body: 'Hello' },
      { name: 'Greeting', node: { type: 'note', body: 'Hi' } },
    ]);
    const rows = examplesFromDefinitions([definition]);
    expect(rows.map(({ exampleName }) => exampleName)).toEqual([
      undefined,
      'Greeting',
    ]);
    const [validates] = primitiveConformanceCases;
    const harness = {
      validateNode: () => [{ path: '', message: 'is wrong' }],
    } as unknown as PrimitiveConformanceHarness;
    expect(() => validates!.run(rows[1]!, harness)).toThrow(
      'Failing example: `note` definition, examples[1] ("Greeting").'
    );
  });

  it('compares a published example through its checked copy', () => {
    const published = new Proxy(
      { type: 'note', body: 'Hello' },
      {
        get: (target, key): unknown => {
          if (key === 'body') {
            throw new Error('read past the checked copy');
          }
          return Reflect.get(target, key);
        },
      }
    );
    expect(() =>
      runPrimitiveInventoryConformance([
        definePrimitive({
          type: 'note',
          catalog: {
            type: 'note',
            purpose: '',
            useWhen: [],
            avoidWhen: [],
            example: { type: 'note', body: 'Hello' },
          },
          examples: [published],
          schema: z.object({ type: z.literal('note'), body: z.string() }),
          renderers: {
            react: () => null,
            text: () => '',
            markdown: () => [],
          },
        }),
      ])
    ).not.toThrow();
  });
});

describe('direct schema calls on a chain deeper than the call stack', () => {
  let deep: FixtureNode = { type: 'note', body: 'a' };
  for (let level = 0; level < 100_000; level += 1) {
    deep = { type: 'stack', items: [deep] };
  }
  const stack = fixtureDefinitions.find(({ type }) => type === 'stack')!;

  it('parses one level through a primitive’s own schema', () => {
    const errors: ValidationError[] = [];
    validateWithSchema(stack.schema, deep, 'body[0]', errors);
    createPrimitiveDispatcher(fixtureDefinitions).validate(
      deep,
      'body[0]',
      errors
    );
    expect(errors).toEqual([]);
  });

  it('refuses a catalog.example past the input budget before reading it', () => {
    expect(() =>
      runPrimitiveInventoryConformance(
        fixtureDefinitions.map((definition) =>
          definition === stack
            ? { ...stack, catalog: { ...stack.catalog, example: deep } }
            : definition
        )
      )
    ).toThrow(
      'stack catalog.example must be within the input budget: input nests deeper than 64 levels'
    );
  });
});
