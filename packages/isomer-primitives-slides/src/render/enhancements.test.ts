/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import type { StyleHandle } from '@elastic/distillate';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  type Composition,
  definePrimitive,
  definePrimitivePack,
  type PrimitiveNode,
  type PrimitiveRenderContext,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { slidesPack } from '../pack';
import { SLIDE_COPY } from '../primitives/slide_command';
import { copyScriptBody } from '../primitives/slide_command/copy';
import { example as commandExample } from '../primitives/slide_command/examples';

import { withEnhancements } from './enhancements';

interface CountNode extends PrimitiveNode {
  type: 'count';
}

const countScript = 'root.counted = (root.counted ?? 0) + 1;';

const countPrimitive = definePrimitive<CountNode>({
  type: 'count',
  catalog: {
    type: 'count',
    purpose: 'Counts its script runs.',
    useWhen: ['A second pack declares an enhancement.'],
    avoidWhen: ['Always.'],
    example: { type: 'count' },
  },
  examples: [{ type: 'count' }],
  schema: z.object({ type: z.literal('count') }),
  renderers: {
    react: (_node, { context }) =>
      createElement('output', {
        'data-enhancements': [
          ...((context as PrimitiveRenderContext | undefined)?.enhancements ??
            []),
        ].join(' '),
      }),
    text: () => '',
    markdown: () => '',
  },
});

const countAdapter = withEnhancements(
  {
    ownsHandle: ({ key }: StyleHandle) => key.startsWith('count.'),
    createCollector: () => ({}),
    createRenderContext: () => ({}),
    renderStyles: () => '',
  },
  ['count']
);

const countPack = definePrimitivePack({
  id: 'count',
  primitives: [countPrimitive],
  enhancements: [{ id: 'count', appliesTo: () => true, script: countScript }],
  styleAdapter: countAdapter,
});

const runtime = createIsomerRuntime({ packs: [slidesPack, countPack] });

const composition: Composition = {
  type: 'view',
  body: [
    { type: 'slideFrame', body: [commandExample] } as PrimitiveNode,
    { type: 'count' },
  ],
};

const occurrences = (text: string, part: string) => text.split(part).length - 1;

describe('withEnhancements across two packs', () => {
  const { js, body } = runtime.surfaces.html.render(composition, {
    enhancements: [SLIDE_COPY, 'count'],
    scripts: 'host',
  });

  it('emits each pack’s script once', () => {
    expect(occurrences(js, copyScriptBody)).toBe(1);
    expect(occurrences(js, countScript)).toBe(1);
  });

  it('still tells every renderer each resolved enhancement', () => {
    expect(body).toMatch(/data-enhancements="[^"]*\bslideCopy\b[^"]*"/);
    expect(body).toMatch(/data-enhancements="[^"]*\bcount\b[^"]*"/);
  });
});
