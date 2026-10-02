/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  definePrimitive,
  definePrimitivePack,
  unresolvedBodyNodeSchema,
  z,
} from '@elastic/isomer-sdk';
import { describe, expect, it, vi } from 'vitest';

import { runEvals } from './run';
import { checkAttempt, parseGenerated, scorePayload } from './score';
import type { EvalCase } from './types';

const note = definePrimitive({
  type: 'note',
  schema: z.object({ type: z.literal('note'), text: z.string() }),
  catalog: {
    type: 'note',
    purpose: 'A note.',
    useWhen: ['A short answer.'],
    avoidWhen: [],
    example: { type: 'note', text: 'Ready' },
  },
  examples: [{ type: 'note', text: 'Ready' }],
  renderers: {
    react: () => null,
    text: ({ text }) => text,
    markdown: ({ text }) => text,
  },
});

const group = definePrimitive({
  type: 'group',
  schema: z.object({
    type: z.literal('group'),
    items: z.array(unresolvedBodyNodeSchema),
  }),
  catalog: {
    type: 'group',
    purpose: 'A group of notes.',
    useWhen: ['Several notes.'],
    avoidWhen: [],
    example: { type: 'group', items: [] },
  },
  examples: [{ type: 'group', items: [] }],
  children: ({ items }) =>
    items.map((node, index) => ({ node, path: `items[${index}]` })),
  renderers: { react: () => null, text: () => '', markdown: () => '' },
});

const runtime = createIsomerRuntime({
  packs: [definePrimitivePack({ id: 'test', primitives: [note, group] })],
});
const golden = {
  type: 'view' as const,
  body: [{ type: 'note', text: 'Ready' }],
};
const corpus: EvalCase[] = [{ id: 'notes', prompt: 'Is it ready?', golden }];
const valid = JSON.stringify(golden);
const duplicateIds = JSON.stringify({
  type: 'view',
  body: [
    { type: 'note', text: 'One', id: 'dup' },
    { type: 'note', text: 'Two', id: 'dup' },
  ],
});
const knownTypes = new Set(['note', 'group']);

describe('runEvals with a real runtime', () => {
  it.each([undefined, null, 42, {}])(
    'reports a malformed container with items %j even when its retry succeeds',
    async (items) => {
      const raw = JSON.stringify({
        type: 'view',
        body: [
          { type: 'group', items },
          { type: 'invented' },
          { type: 'group', items: [{ type: 'nested-invention' }] },
        ],
      });
      const judge = vi.fn(() => Promise.resolve('yes' as const));
      const report = await runEvals({
        runtime,
        corpus,
        generate: ({ attempt }) => Promise.resolve(attempt === 0 ? raw : valid),
        judge,
      });

      expect(report.totals).toMatchObject({
        cases: 1,
        valid: 0,
        validAfterRetry: 1,
        meanSelectionF1: 1,
        answerability: { yes: 1, partial: 0, no: 0 },
      });
      expect(report.results[0]?.payload).toMatchObject({
        rawBytes: Buffer.byteLength(raw),
        sanitizedBytes: 0,
        unknownTypes: ['invented', 'nested-invention'],
      });
      expect(judge).toHaveBeenCalledExactlyOnceWith({
        evalCase: corpus[0],
        rendered: 'Ready',
      });
    }
  );

  it.each([
    ['invalid first attempt without retry', duplicateIds, false],
    ['invalid first attempt and retry', duplicateIds, true],
    ['unparseable first attempt and invalid retry', 'not JSON', true],
  ])(
    'skips judgment for %s and completes the corpus',
    async (_, first, retryOnInvalid) => {
      const judge = vi.fn(() => Promise.resolve('yes' as const));
      const report = await runEvals({
        runtime,
        corpus: [...corpus, { id: 'good', prompt: 'Give a note.', golden }],
        retryOnInvalid,
        generate: ({ evalCase, attempt }) =>
          Promise.resolve(
            evalCase.id === 'good'
              ? valid
              : attempt === 0
                ? first
                : duplicateIds
          ),
        judge,
      });

      expect(report.results[0]?.validity).toMatchObject({
        valid: false,
        validAfterRetry: false,
        composition: undefined,
      });
      expect(report.results[0]?.selection).toBeUndefined();
      expect(report.results[0]?.answerability).toBeUndefined();
      expect(report.totals).toMatchObject({
        cases: 2,
        valid: 1,
        validAfterRetry: 1,
        answerability: { yes: 1, partial: 0, no: 0 },
      });
      expect(judge).toHaveBeenCalledTimes(1);
    }
  );

  it('judges the valid retry of a semantic failure', async () => {
    const report = await runEvals({
      runtime,
      corpus,
      generate: ({ attempt }) =>
        Promise.resolve(attempt === 0 ? duplicateIds : valid),
      judge: ({ rendered }) =>
        Promise.resolve(rendered === 'Ready' ? 'yes' : 'no'),
    });
    expect(report.totals).toMatchObject({
      valid: 0,
      validAfterRetry: 1,
      answerability: { yes: 1, partial: 0, no: 0 },
    });
    expect(report.results[0]?.validity.composition).toEqual(golden);
  });
});

describe('raw payload traversal', () => {
  it('does not recurse on the call stack after the input budget refuses a deep tree', () => {
    const depth = 10_000;
    const raw = `{"type":"view","body":[${'{"type":"group","items":['.repeat(depth)}{"type":"invented"}${']}'.repeat(depth)}]}`;
    const attempt = checkAttempt(runtime, parseGenerated(raw));
    expect(attempt.parsed && attempt.check.valid).toBe(false);
    expect(scorePayload(runtime, attempt, knownTypes).unknownTypes).toEqual([
      'invented',
    ]);
  });
});
