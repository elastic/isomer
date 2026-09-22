/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IsomerRuntime } from '@elastic/isomer-runtime';
import type { AnyPrimitiveDefinition, Composition } from '@elastic/isomer-sdk';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { formatReport } from './report';
import { runEvals } from './run';
import { scoreAnswerability } from './score/answerability';
import { scorePayload } from './score/payload';
import { scorePrimitiveSelection } from './score/primitive_selection';
import { checkAttempt, parseGenerated, stripCodeFence } from './score/validity';
import type { EvalCase, EvalRuntime, Generate } from './types';

const composition = (types: readonly string[]): Composition =>
  ({
    type: 'view',
    title: 'Fixture',
    body: types.map((type) => ({ type })),
  }) as unknown as Composition;

const KNOWN = new Set(['stat', 'callout']);

const stubPrimitives = [
  { type: 'stat' },
  { type: 'callout' },
] as unknown as readonly AnyPrimitiveDefinition[];

/**
 * Accepts a composition whose body types are all known.
 *
 * A stub rather than a real runtime: this package's contract is that it drives
 * anything matching {@link EvalRuntime}, and the harness must be testable with
 * neither a pack nor a model.
 */
const stubRuntime: EvalRuntime = {
  primitives: stubPrimitives,
  getAuthoringContext: () => ({
    schema: { type: 'object' },
    primitives: [
      {
        type: 'stat',
        purpose: 'One number.',
        useWhen: ['a single figure answers it'],
        avoidWhen: [],
        example: { type: 'stat' },
      },
      {
        type: 'callout',
        purpose: 'A short notice.',
        useWhen: ['something needs attention'],
        avoidWhen: [],
        example: { type: 'callout' },
      },
    ],
  }),
  validate: (value) => {
    const { body } = value as { body?: Array<{ type: string }> };
    if (!Array.isArray(body)) {
      return {
        valid: false,
        errors: [{ path: 'body', message: 'is required' }],
      };
    }
    const bad = body.filter(({ type }) => !KNOWN.has(type));
    return {
      valid: bad.length === 0,
      errors: bad.map(({ type }) => ({
        path: 'body',
        message: `unknown node type "${type}"`,
      })),
    };
  },
  parse(value) {
    const result = this.validate(value as Composition);
    return result.valid
      ? { valid: true, errors: [], composition: value as Composition }
      : { valid: false, errors: result.errors };
  },
  surfaces: {
    text: {
      render: (value) =>
        ((value as { body?: Array<{ type: string }> }).body ?? [])
          .map(({ type }) => type)
          .join('\n'),
    },
  },
};

const corpus: readonly EvalCase[] = [
  { id: 'good', prompt: 'How many open items?', golden: composition(['stat']) },
  {
    id: 'invented',
    prompt: 'Show the queue',
    golden: composition(['stat']),
  },
];

const replaying =
  (byCase: Record<string, readonly string[]>): Generate =>
  ({ evalCase, attempt }) =>
    Promise.resolve(byCase[evalCase.id]?.[attempt] ?? '{}');

describe('EvalRuntime', () => {
  it('is satisfied by the runtime package', () => {
    expectTypeOf<IsomerRuntime>().toExtend<EvalRuntime>();
  });
});

describe('runEvals', () => {
  it('scores a corpus with no model and no credentials', async () => {
    const report = await runEvals({
      runtime: stubRuntime,
      corpus,
      generate: replaying({
        good: [JSON.stringify(composition(['stat']))],
        invented: [JSON.stringify(composition(['sparkline']))],
      }),
    });

    expect(report.totals.cases).toBe(2);
    expect(report.totals.parsed).toBe(2);
    expect(report.totals.valid).toBe(1);
    expect(report.totals.answerability).toBeUndefined();
  });

  it('credits a retry that fixes its own validation errors', async () => {
    const report = await runEvals({
      runtime: stubRuntime,
      corpus: [corpus[1]!],
      generate: replaying({
        invented: [
          JSON.stringify(composition(['sparkline'])),
          JSON.stringify(composition(['stat'])),
        ],
      }),
    });

    expect(report.totals.valid).toBe(0);
    expect(report.totals.validAfterRetry).toBe(1);
  });

  it('hands the retry the previous errors', async () => {
    const seen: Array<readonly string[] | undefined> = [];
    await runEvals({
      runtime: stubRuntime,
      corpus: [corpus[1]!],
      generate: ({ attempt, previousErrors }) => {
        seen.push(previousErrors);
        return Promise.resolve(
          JSON.stringify(composition(attempt === 0 ? ['sparkline'] : ['stat']))
        );
      },
    });

    expect(seen[0]).toBeUndefined();
    expect(seen[1]).toEqual(['body unknown node type "sparkline"']);
  });

  it('does not retry when the first attempt is already valid', async () => {
    let calls = 0;
    await runEvals({
      runtime: stubRuntime,
      corpus: [corpus[0]!],
      generate: () => {
        calls += 1;
        return Promise.resolve(JSON.stringify(composition(['stat'])));
      },
    });

    expect(calls).toBe(1);
  });

  it('never retries when retryOnInvalid is false', async () => {
    let calls = 0;
    const report = await runEvals({
      runtime: stubRuntime,
      corpus: [corpus[1]!],
      retryOnInvalid: false,
      generate: () => {
        calls += 1;
        return Promise.resolve(JSON.stringify(composition(['sparkline'])));
      },
    });

    expect(calls).toBe(1);
    expect(report.totals.validAfterRetry).toBe(0);
  });

  it('retries a value that parses but fails validation, not only a parse failure', async () => {
    // Duplicate-id-shaped failure, stood in for by an unknown type: the stub
    // runtime's `validate` is what rejects it, not `parse`/JSON.parse.
    const report = await runEvals({
      runtime: stubRuntime,
      corpus: [corpus[1]!],
      generate: replaying({
        invented: [
          JSON.stringify(composition(['sparkline'])),
          JSON.stringify(composition(['stat'])),
        ],
      }),
    });

    expect(report.results[0]?.validity.validAfterRetry).toBe(true);
  });

  it('reports invented node types', async () => {
    const report = await runEvals({
      runtime: stubRuntime,
      corpus: [corpus[1]!],
      generate: replaying({
        invented: [JSON.stringify(composition(['sparkline']))],
      }),
    });

    expect(report.results[0]?.payload.unknownTypes).toEqual(['sparkline']);
  });

  it('scores answerability only when a judge is supplied', async () => {
    const report = await runEvals({
      runtime: stubRuntime,
      corpus: [corpus[0]!],
      generate: replaying({ good: [JSON.stringify(composition(['stat']))] }),
      judge: ({ rendered }) =>
        Promise.resolve(rendered.includes('stat') ? 'yes' : 'no'),
    });

    expect(report.totals.answerability).toEqual({ yes: 1, partial: 0, no: 0 });
  });

  it('survives output that is not JSON', async () => {
    const report = await runEvals({
      runtime: stubRuntime,
      corpus: [corpus[0]!],
      generate: () => Promise.resolve('I cannot help with that.'),
    });

    expect(report.totals.parsed).toBe(0);
    expect(report.results[0]?.validity.valid).toBe(false);
  });

  it('builds the prompt for the profile it is given', async () => {
    const prompts: string[] = [];
    await runEvals({
      runtime: stubRuntime,
      corpus: [corpus[0]!],
      profile: 'compose-from-primitives',
      generate: ({ prompt }) => {
        prompts.push(prompt);
        return Promise.resolve(JSON.stringify(composition(['stat'])));
      },
    });

    expect(prompts[0]).toContain('You compose views from scratch');
  });

  it('includes a rules section only when rules are given', async () => {
    const prompts: string[] = [];
    await runEvals({
      runtime: stubRuntime,
      corpus: [corpus[0]!],
      rules: 'Never invent a metric.',
      generate: ({ prompt }) => {
        prompts.push(prompt);
        return Promise.resolve(JSON.stringify(composition(['stat'])));
      },
    });

    expect(prompts[0]).toContain('Never invent a metric.');
  });

  it('runs cases at the requested concurrency', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const manyCases: readonly EvalCase[] = Array.from(
      { length: 4 },
      (_, index) => ({ id: `case-${index}`, prompt: 'p' })
    );

    await runEvals({
      runtime: stubRuntime,
      corpus: manyCases,
      concurrency: 4,
      generate: async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await Promise.resolve();
        inFlight -= 1;
        return JSON.stringify(composition(['stat']));
      },
    });

    expect(maxInFlight).toBeGreaterThan(1);
  });
});

describe('scorePrimitiveSelection', () => {
  it('scores an exact match as 1', () => {
    const score = scorePrimitiveSelection(
      composition(['stat', 'callout']),
      composition(['stat', 'callout'])
    );
    expect(score.f1).toBe(1);
  });

  // A set would score this 1.0; the multiset is what notices that three stats
  // were asked for and one was given.
  it('counts repeats rather than deduplicating', () => {
    const score = scorePrimitiveSelection(
      composition(['stat']),
      composition(['stat', 'stat', 'stat'])
    );
    expect(score.recall).toBeCloseTo(1 / 3);
    expect(score.missing).toEqual(['stat', 'stat']);
  });

  it('names what was used and what was wanted', () => {
    const score = scorePrimitiveSelection(
      composition(['callout']),
      composition(['stat'])
    );
    expect(score.f1).toBe(0);
    expect(score.extra).toEqual(['callout']);
    expect(score.missing).toEqual(['stat']);
  });
});

describe('scorePayload', () => {
  const attemptFor = (runtime: EvalRuntime, value: unknown) =>
    checkAttempt(runtime, parseGenerated(JSON.stringify(value)));

  it('scores sanitized size against the golden, not raw size', () => {
    // The stub's `parse` drops unknown properties, the way a real schema
    // parse would, so raw and sanitized sizes genuinely differ here.
    const golden = composition(['stat']);
    const sanitizingRuntime: EvalRuntime = {
      ...stubRuntime,
      parse: (value) => ({
        valid: true,
        errors: [],
        composition: {
          type: 'view',
          body: ((value as { body: Array<{ type: string }> }).body ?? []).map(
            ({ type }) => ({ type })
          ),
        } as unknown as Composition,
      }),
    };
    const score = scorePayload(
      sanitizingRuntime,
      attemptFor(sanitizingRuntime, {
        type: 'view',
        body: [{ type: 'stat', extra: 'x'.repeat(100) }],
      }),
      KNOWN,
      golden
    );

    expect(score.rawBytes).toBeGreaterThan(score.sanitizedBytes);
    expect(score.sizeVsGolden).toBeCloseTo(
      score.sanitizedBytes / Buffer.byteLength(JSON.stringify(golden), 'utf8')
    );
  });

  it('measures the output as sent, code fence included', () => {
    const raw = '```json\n{"type":"view","body":[{"type":"stat"}]}\n```';
    const score = scorePayload(
      stubRuntime,
      checkAttempt(stubRuntime, parseGenerated(raw)),
      KNOWN
    );

    expect(score.rawBytes).toBe(Buffer.byteLength(raw, 'utf8'));
  });

  it('measures output that is not JSON by its own bytes', () => {
    const raw = 'I cannot help with that.';
    const score = scorePayload(
      stubRuntime,
      checkAttempt(stubRuntime, parseGenerated(raw)),
      KNOWN
    );

    expect(score.rawBytes).toBe(Buffer.byteLength(raw, 'utf8'));
    expect(score.sanitizedBytes).toBe(0);
    expect(score.unknownTypes).toEqual([]);
  });

  it('does not flag a data field named type as an invented node', () => {
    const score = scorePayload(
      stubRuntime,
      attemptFor(stubRuntime, {
        type: 'view',
        body: [{ type: 'stat', series: [{ type: 'bar' }] }],
      }),
      KNOWN
    );

    expect(score.unknownTypes).toEqual([]);
  });

  it('flags a genuinely unknown top-level node type', () => {
    const score = scorePayload(
      stubRuntime,
      attemptFor(stubRuntime, { type: 'view', body: [{ type: 'sparkline' }] }),
      KNOWN
    );

    expect(score.unknownTypes).toEqual(['sparkline']);
  });
});

describe('scoreAnswerability', () => {
  it('renders through the text surface and asks the judge', async () => {
    const evalCase: EvalCase = { id: 'a', prompt: 'How many?' };
    const seen: string[] = [];
    const score = await scoreAnswerability(
      stubRuntime,
      ({ rendered }) => {
        seen.push(rendered);
        return Promise.resolve('partial');
      },
      evalCase,
      composition(['stat'])
    );

    expect(seen).toEqual(['stat']);
    expect(score).toEqual({ verdict: 'partial' });
  });
});

describe('parsing model output', () => {
  it('unwraps a fenced block', () => {
    expect(stripCodeFence('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it('unwraps a fenced block with no trailing newline before the fence', () => {
    expect(stripCodeFence('```json\n{"a":1}```')).toBe('{"a":1}');
  });

  it('leaves bare JSON alone', () => {
    expect(parseGenerated('{"a":1}')).toEqual({
      parsed: true,
      raw: '{"a":1}',
      value: { a: 1 },
    });
  });
});

describe('formatReport', () => {
  it('lists invalid cases and invented types', async () => {
    const report = await runEvals({
      runtime: stubRuntime,
      corpus: [corpus[1]!],
      generate: replaying({
        invented: [JSON.stringify(composition(['sparkline']))],
      }),
    });

    const text = formatReport(report);
    expect(text).toContain('invented: body unknown node type "sparkline"');
    expect(text).toContain('invented: sparkline');
  });
});
