/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { formatAgentReport } from './agent_report';
import { runAgentEvals } from './agent_run';
import type { AgentEvalTool, AgentStep, AgentStepResult } from './agent_types';
import type { EvalCase, EvalRuntime } from './types';

const KNOWN = new Set(['frame', 'stat', 'callout']);

const typesIn = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.flatMap(typesIn)
    : typeof value === 'object' && value !== null
      ? [
          ...(typeof (value as { type?: unknown }).type === 'string'
            ? [(value as { type: string }).type]
            : []),
          ...Object.values(value).flatMap(typesIn),
        ]
      : [];

/** `frame` holds nodes in `body`; the others are leaves. */
const stubPrimitives = [
  {
    type: 'frame',
    children: ({ body }: { body: unknown[] }) =>
      body.map((node, index) => ({ node, path: `body[${index}]` })),
  },
  { type: 'stat' },
  { type: 'callout' },
] as unknown as EvalRuntime['primitives'];

/** Accepts a view whose nested node types are all known. */
const stubRuntime: EvalRuntime = {
  primitives: stubPrimitives,
  getAuthoringContext: () => ({
    schema: {},
    primitives: [...KNOWN].map((type) => ({
      type,
      purpose: '',
      useWhen: [],
      avoidWhen: [],
      example: { type },
    })),
  }),
  parse: (value) => ({
    valid: true,
    errors: [],
    composition: value as Composition,
  }),
  validate: (value) => {
    const { body } = (value ?? {}) as { body?: unknown };
    if (!Array.isArray(body)) {
      return {
        valid: false,
        errors: [{ path: 'body', message: 'is required' }],
        composition: value,
      };
    }
    const bad = typesIn(body).filter((type) => !KNOWN.has(type));
    return {
      valid: bad.length === 0,
      errors: bad.map((type) => ({
        path: 'body',
        message: `unknown "${type}"`,
      })),
      composition: value,
    };
  },
  surfaces: { text: { render: () => '' } },
};

const tools: AgentEvalTool[] = [
  {
    name: 'guide',
    description: 'The guide.',
    inputSchema: z.object({}),
    handler: () =>
      Promise.resolve({ content: [{ type: 'text', text: 'Use stat.' }] }),
  },
  {
    name: 'describe',
    description: 'Describe types.',
    inputSchema: z.object({ types: z.array(z.string()).min(1) }),
    handler: (input) =>
      Promise.resolve({
        content: [
          {
            type: 'text',
            text: `about ${(input as { types: string[] }).types.join(', ')}`,
          },
        ],
      }),
  },
  {
    name: 'broken',
    description: 'Always throws.',
    inputSchema: z.object({}),
    handler: () => Promise.reject(new Error('offline')),
  },
];

const answer = (body: unknown[]): string =>
  JSON.stringify({ type: 'view', body });

const call = (name: string, args: Record<string, unknown> = {}, id = name) => ({
  id,
  name,
  args,
});

/** Replays one scripted turn per call, then the last turn forever. */
const scripted = (turns: readonly AgentStepResult[]): AgentStep => {
  let index = 0;
  return () => Promise.resolve(turns[Math.min(index++, turns.length - 1)]!);
};

const corpus: EvalCase[] = [
  { id: 'one', prompt: 'How many?', expected: ['stat'] },
];

describe('runAgentEvals', () => {
  it('runs tool calls until the model answers, then scores the answer', async () => {
    const seen: unknown[] = [];
    const turns = [
      {
        text: '',
        toolCalls: [call('guide')],
        usage: { inputTokens: 100, outputTokens: 10, cachedInputTokens: 40 },
      },
      {
        text: '',
        toolCalls: [call('describe', { types: ['stat'] })],
        usage: { inputTokens: 150, outputTokens: 20 },
      },
      {
        text: `\`\`\`json\n${answer([{ type: 'frame', body: [{ type: 'stat' }] }])}\n\`\`\``,
        toolCalls: [],
        usage: { inputTokens: 200, outputTokens: 30 },
      },
    ];
    const step = scripted(turns);
    const report = await runAgentEvals({
      runtime: stubRuntime,
      tools,
      corpus,
      step: (request) => {
        seen.push(structuredClone(request.messages));
        return step(request);
      },
    });
    const [result] = report.results;
    expect(result).toMatchObject({
      finished: true,
      turns: 3,
      parsed: true,
      valid: true,
      usage: { inputTokens: 450, outputTokens: 60, cachedInputTokens: 40 },
      toolResultBytes: 'Use stat.'.length + 'about stat'.length,
      expected: { hit: true, used: ['frame', 'stat'] },
    });
    expect(result?.calls.map(({ name }) => name)).toEqual([
      'guide',
      'describe',
    ]);
    expect(seen[2]).toEqual([
      { role: 'user', text: 'How many?' },
      { role: 'assistant', text: '', toolCalls: [call('guide')] },
      {
        role: 'tool',
        results: [
          { id: 'guide', name: 'guide', text: 'Use stat.', isError: false },
        ],
      },
      {
        role: 'assistant',
        text: '',
        toolCalls: [call('describe', { types: ['stat'] })],
      },
      {
        role: 'tool',
        results: [
          {
            id: 'describe',
            name: 'describe',
            text: 'about stat',
            isError: false,
          },
        ],
      },
    ]);
  });

  it('hands the model each tool as JSON Schema, without the dialect', async () => {
    let specs: unknown;
    await runAgentEvals({
      runtime: stubRuntime,
      tools,
      corpus,
      step: ({ tools: offered }) => {
        specs = offered;
        return Promise.resolve({ text: answer([]), toolCalls: [] });
      },
    });
    expect(specs).toContainEqual({
      name: 'describe',
      description: 'Describe types.',
      parameters: expect.objectContaining({
        type: 'object',
        required: ['types'],
      }) as unknown,
    });
    expect(JSON.stringify(specs)).not.toContain('$schema');
  });

  it('answers an unknown tool, refused input, or a throwing handler as a failed result', async () => {
    const report = await runAgentEvals({
      runtime: stubRuntime,
      tools,
      corpus,
      step: scripted([
        {
          text: '',
          toolCalls: [
            call('nope', {}, 'a'),
            call('describe', { types: [] }, 'b'),
            call('broken', {}, 'c'),
          ],
        },
        { text: answer([{ type: 'stat' }]), toolCalls: [] },
      ]),
    });
    const [result] = report.results;
    expect(result?.calls.map(({ isError }) => isError)).toEqual([
      true,
      true,
      true,
    ]);
    expect(result?.valid).toBe(true);
  });

  it('scores a run that never answers as unfinished', async () => {
    const report = await runAgentEvals({
      runtime: stubRuntime,
      tools,
      corpus,
      maxTurns: 2,
      step: scripted([{ text: '', toolCalls: [call('guide')] }]),
    });
    expect(report.results[0]).toMatchObject({
      finished: false,
      turns: 2,
      valid: false,
      errors: ['no answer within 2 turns'],
    });
  });

  it('records what a throwing step threw and stops', async () => {
    const report = await runAgentEvals({
      runtime: stubRuntime,
      tools,
      corpus,
      step: () => Promise.reject(new Error('rate limited')),
    });
    expect(report.results[0]).toMatchObject({
      finished: false,
      error: 'rate limited',
      errors: ['rate limited'],
      turns: 0,
    });
  });

  it('applies the frame rule to the answer', async () => {
    const report = await runAgentEvals({
      runtime: stubRuntime,
      tools,
      corpus,
      frame: {
        validateBody: (body) => (body.length === 1 ? [] : ['one frame']),
      },
      step: scripted([
        { text: answer([{ type: 'stat' }, { type: 'stat' }]), toolCalls: [] },
      ]),
    });
    expect(report.results[0]).toMatchObject({
      valid: false,
      errors: ['one frame'],
      expected: { hit: true },
    });
  });

  it('repeats each case and totals the runs', async () => {
    const report = await runAgentEvals({
      runtime: stubRuntime,
      tools,
      corpus: [
        ...corpus,
        { id: 'two', prompt: 'Note it.', expected: ['callout'] },
      ],
      repeat: 2,
      concurrency: 3,
      step: ({ messages }) =>
        Promise.resolve(
          messages.length === 1
            ? { text: '', toolCalls: [call('guide')] }
            : { text: answer([{ type: 'stat' }]), toolCalls: [] }
        ),
    });
    expect(report.results.map(({ caseId, run }) => `${caseId}#${run}`)).toEqual(
      ['one#0', 'one#1', 'two#0', 'two#1']
    );
    expect(report.totals).toMatchObject({
      runs: 4,
      finished: 4,
      valid: 4,
      expectedHits: 2,
      expectedRuns: 4,
      meanTurns: 2,
      callsPerRun: { guide: 1 },
    });
    const text = formatAgentReport(report);
    expect(text).toContain('expected primitive     2 of 4 (50%)');
    expect(text).toContain('two #0: used stat');
  });

  it('advertises a tool by what it accepts, so transforms and defaults are offered', async () => {
    let specs: unknown;
    await runAgentEvals({
      runtime: stubRuntime,
      tools: [
        {
          name: 'search',
          description: 'Search.',
          inputSchema: z.object({
            query: z.string().transform((value) => value.trim()),
            limit: z.number().default(10),
          }),
          handler: () => Promise.resolve({ content: [] }),
        },
      ],
      corpus,
      step: ({ tools: offered }) => {
        specs = offered;
        return Promise.resolve({ text: answer([]), toolCalls: [] });
      },
    });
    expect(specs).toEqual([
      expect.objectContaining({
        parameters: expect.objectContaining({ required: ['query'] }) as unknown,
      }),
    ]);
  });

  it('checks async refinements as a tool result rather than failing the run', async () => {
    const report = await runAgentEvals({
      runtime: stubRuntime,
      tools: [
        {
          name: 'lookup',
          description: 'Look up.',
          inputSchema: z
            .object({ id: z.string() })
            .refine(({ id }) => Promise.resolve(id !== 'missing')),
          handler: () =>
            Promise.resolve({ content: [{ type: 'text', text: 'found' }] }),
        },
      ],
      corpus,
      step: scripted([
        {
          text: '',
          toolCalls: [
            call('lookup', { id: 'missing' }, 'a'),
            call('lookup', { id: 'there' }, 'b'),
          ],
        },
        { text: answer([{ type: 'stat' }]), toolCalls: [] },
      ]),
    });
    expect(report.results[0]?.calls.map(({ isError }) => isError)).toEqual([
      true,
      false,
    ]);
  });

  it('totals calls to tools named like object prototype keys', async () => {
    const report = await runAgentEvals({
      runtime: stubRuntime,
      tools,
      corpus,
      step: scripted([
        {
          text: '',
          toolCalls: [call('constructor', {}, 'a'), call('__proto__', {}, 'b')],
        },
        { text: answer([{ type: 'stat' }]), toolCalls: [] },
      ]),
    });
    expect(Object.entries(report.totals.callsPerRun)).toEqual([
      ['constructor', 1],
      ['__proto__', 1],
    ]);
    expect(() => formatAgentReport(report)).not.toThrow();
  });

  it('counts only node positions, not data fields named `type`', async () => {
    const report = await runAgentEvals({
      runtime: stubRuntime,
      tools,
      corpus: [{ id: 'one', prompt: 'Note it.', expected: ['callout'] }],
      step: scripted([
        {
          text: answer([{ type: 'stat', data: { type: 'callout' } }]),
          toolCalls: [],
        },
      ]),
    });
    expect(report.results[0]?.expected).toEqual({ hit: false, used: ['stat'] });
  });

  it('scores an arbitrarily deep answer without overflowing', async () => {
    const depth = 20_000;
    const text = `{"type":"view","body":[${'{"type":"frame","body":['.repeat(depth)}{"type":"stat"}${']}'.repeat(depth)}]}`;
    const report = await runAgentEvals({
      runtime: {
        ...stubRuntime,
        validate: () => ({
          valid: false,
          errors: [{ path: '', message: 'too deep' }],
          composition: undefined,
        }),
      },
      tools,
      corpus,
      step: () => Promise.resolve({ text, toolCalls: [] }),
    });
    expect(report.results[0]).toMatchObject({
      valid: false,
      errors: ['too deep'],
      expected: { hit: true },
    });
  });
});
