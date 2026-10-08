/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment node

import React from 'react';
import { renderToString } from 'react-dom/server';
import type { IsomerRuntimeOptions } from '@elastic/isomer-runtime';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type {
  DefaultPackTypes,
  StyledRenderContext,
} from '@elastic/isomer-sdk';
import {
  definePrimitiveFor,
  definePrimitivePack,
  requiredString,
} from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import { z } from 'zod';

import type { CalloutNode } from '../fixtures/components_pack';
import {
  callout,
  componentsPack,
  divider,
  statGroup,
} from '../fixtures/components_pack';

import type { CheckResult } from './check';
import { checkStudio } from './check';
import { formatReport, summarizeReport } from './report';

interface NotePackTypes extends DefaultPackTypes {
  context: StyledRenderContext;
}

const definePrimitive = definePrimitiveFor<NotePackTypes>();

const noteSchema = z.object({
  type: z.literal('note'),
  text: requiredString(),
});

const iconless = definePrimitive<z.infer<typeof noteSchema>, typeof noteSchema>(
  {
    type: 'note',
    catalog: {
      type: 'note',
      purpose: 'A note with no icon.',
      useWhen: ['Never.'],
      avoidWhen: ['Always.'],
      example: { type: 'note', text: 'A note.' },
    },
    examples: [{ type: 'note', text: 'A note.' }],
    schema: noteSchema,
    renderers: {
      react: ({ text }) => <p>{text}</p>,
      text: ({ text }) => text,
      markdown: ({ text }) => md.paragraph(text),
    },
  }
);

const emptyCallout: CalloutNode = { type: 'callout', body: '' };

const brokenPack = definePrimitivePack({
  id: 'broken',
  primitives: [
    { ...callout, examples: [emptyCallout] },
    {
      ...statGroup,
      renderers: {
        ...statGroup.renderers,
        slack: () => {
          throw new Error('The table has no columns.');
        },
      },
    },
    divider,
    iconless,
  ],
});

type Packs = IsomerRuntimeOptions<unknown, StyledRenderContext>['packs'];

const runtimeOf = (packs: Packs) =>
  createIsomerRuntime<unknown, StyledRenderContext>({ packs });

const framedRuntime = createIsomerRuntime<
  unknown,
  StyledRenderContext,
  unknown
>({
  packs: [componentsPack],
  frames: {
    card: {
      defaultWidth: 320,
      theme: { light: undefined, dark: undefined },
      estimateHeight: () => 100,
      wrap: (_header, body) => <div>{body}</div>,
    },
  },
});

const find = (results: readonly CheckResult[], match: Partial<CheckResult>) =>
  results.filter((result) =>
    Object.entries(match).every(
      ([key, value]) => result[key as keyof CheckResult] === value
    )
  );

describe('checkStudio', () => {
  it('passes every example of a sound pack on every surface it renders natively', async () => {
    const report = await checkStudio(
      { title: 'Components', runtime: runtimeOf([componentsPack]) },
      { renderToString }
    );
    expect(report.failed).toBe(0);
    expect(report.passed).toBeGreaterThan(0);
    expect(report.title).toBe('Components');
    expect(
      find(report.results, { primitive: 'health', check: 'slack' })[0]
    ).toMatchObject({
      status: 'skipped',
      message: '`health` has no slack renderer.',
    });
  });

  it('fails bad props, a throwing renderer, and a missing icon, and skips what bad props block', async () => {
    const { results, failed } = await checkStudio(
      { runtime: runtimeOf([brokenPack]) },
      { renderToString }
    );

    expect(find(results, { primitive: 'callout', check: 'props' })).toEqual([
      expect.objectContaining({ status: 'failed' }),
    ]);
    expect(
      find(results, { primitive: 'callout', status: 'skipped' }).map(
        ({ check }) => check
      )
    ).toEqual(['react', 'html', 'slack', 'markdown', 'text']);

    expect(
      find(results, { primitive: 'statGroup', status: 'failed' }).map(
        ({ example, check, message }) => ({ example, check, message })
      )
    ).toEqual(
      ['Example 1', 'Example 2'].map((example) => ({
        example,
        check: 'slack',
        message: 'The table has no columns.',
      }))
    );

    expect(find(results, { primitive: 'note', check: 'icon' })).toEqual([
      {
        primitive: 'note',
        check: 'icon',
        status: 'failed',
        message: '`note` has no icon.',
      },
    ]);
    expect(find(results, { primitive: 'divider', status: 'failed' })).toEqual(
      []
    );
    expect(failed).toBe(4);
  });

  it('fails an example the composer rejects and checks the rest', async () => {
    const { results } = await checkStudio(
      {
        runtime: runtimeOf([componentsPack]),
        compose: (nodes, { theme }) => {
          if (nodes.some(({ type }) => type === 'callout')) {
            throw new Error('No callouts here.');
          }
          return { type: 'view', body: [...nodes], theme };
        },
      },
      { renderToString, surfaces: ['html'] }
    );

    const callouts = find(results, { primitive: 'callout', check: 'props' });
    expect(callouts.length).toBeGreaterThan(0);
    expect(
      callouts.every(
        ({ status, message }) =>
          status === 'failed' &&
          message === '`compose` threw: No callouts here.'
      )
    ).toBe(true);
    expect(
      find(results, { primitive: 'callout', check: 'html' }).map(
        ({ example, status }) => ({ example, status })
      )
    ).toEqual(callouts.map(({ example }) => ({ example, status: 'skipped' })));
    expect(
      find(results, { primitive: 'divider', check: 'html', status: 'passed' })
    ).not.toHaveLength(0);
  });

  it('fails the png check when the snapshot surface refuses a composition, as for a slide without its frame', async () => {
    const refusal =
      'a snapshot render needs a "slideFrame" root, got "callout"; wrap slide content in a frame';
    const { results } = await checkStudio(
      { runtime: framedRuntime },
      {
        renderToString,
        surfaces: ['html'],
        rasterizePng: () => Promise.reject(new Error(refusal)),
      }
    );
    const png = find(results, { check: 'png' });
    expect(png.length).toBeGreaterThan(0);
    expect(
      png.every(
        ({ status, message }) => status === 'failed' && message === refusal
      )
    ).toBe(true);
  });

  it('skips the png check when the runtime has no snapshot surface', async () => {
    const { results } = await checkStudio(
      { runtime: runtimeOf([componentsPack]) },
      {
        renderToString,
        surfaces: ['html'],
        rasterizePng: () => Promise.resolve(),
      }
    );
    const png = find(results, { check: 'png' });
    expect(png.length).toBeGreaterThan(0);
    expect(
      png.every(
        ({ status, message }) =>
          status === 'skipped' &&
          message === 'The runtime has no snapshot surface.'
      )
    ).toBe(true);
  });

  it('renders only the surfaces asked for', async () => {
    const { results } = await checkStudio(
      { runtime: runtimeOf([componentsPack]) },
      { renderToString, surfaces: ['text', 'snapshot'] }
    );
    expect(new Set(results.map(({ check }) => check))).toEqual(
      new Set(['icon', 'props', 'text'])
    );
  });
});

describe('formatReport', () => {
  const report = {
    title: 'Pack & co',
    passed: 1,
    failed: 1,
    skipped: 1,
    results: [
      { primitive: 'callout', check: 'icon', status: 'passed' },
      {
        primitive: 'callout',
        example: 'Example 1',
        check: 'slack',
        status: 'failed',
        message: 'Too <long>.',
      },
      {
        primitive: 'divider',
        example: 'Example 1',
        check: 'png',
        status: 'skipped',
        message: 'No snapshot.',
      },
    ],
  } satisfies Parameters<typeof formatReport>[0];

  it('writes JUnit with a suite per primitive and escaped text', () => {
    const xml = formatReport(report, 'junit');
    expect(xml).toContain(
      '<testsuites name="Pack &amp; co" tests="3" failures="1" skipped="1">'
    );
    expect(xml).toContain(
      '<testsuite name="callout" tests="2" failures="1" skipped="0">'
    );
    expect(xml).toContain(
      '<failure message="Too &lt;long&gt;.">Too &lt;long&gt;.</failure>'
    );
    expect(xml).toContain('<skipped message="No snapshot." />');
  });

  it('writes JSON that parses back to the report', () => {
    expect(JSON.parse(formatReport(report, 'json'))).toEqual(report);
  });

  it('summarizes failures and counts', () => {
    const summary = summarizeReport(report);
    expect(summary).toContain('✗ callout › Example 1 › slack\n  Too <long>.');
    expect(summary).toContain('Pack & co: 1 passed, 1 failed, 1 skipped.');
  });
});
