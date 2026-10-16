/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildAuthoringJsonSchema,
  definePrimitive,
  definePrimitivePack,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createIsomerRuntime } from './index';

vi.mock('@elastic/isomer-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@elastic/isomer-sdk')>();
  return {
    ...actual,
    buildAuthoringJsonSchema: vi.fn(actual.buildAuthoringJsonSchema),
  };
});

interface NoteNode extends PrimitiveNode {
  type: 'note';
  text: string;
}

const pack = definePrimitivePack({
  id: 'test',
  surfaces: [],
  primitives: [
    definePrimitive<NoteNode>({
      type: 'note',
      catalog: {
        type: 'note',
        purpose: 'Render a compact note.',
        useWhen: ['A runtime needs a minimal text node.'],
        avoidWhen: [],
        example: { type: 'note', text: 'Hello' },
      },
      examples: [{ type: 'note', text: 'Hello' }],
      schema: z.object({ type: z.literal('note'), text: z.string().min(1) }),
      renderers: {
        react: (node) => node.text,
        text: (node) => node.text,
        markdown: (node) => md.paragraph(node.text),
      },
    }),
  ],
});

const composition = {
  type: 'view' as const,
  body: [{ type: 'note' as const, text: 'Hello' }],
};

describe('getAuthoringContext', () => {
  beforeEach(() => {
    vi.mocked(buildAuthoringJsonSchema).mockClear();
  });

  it('builds nothing for a runtime that only validates and renders', () => {
    const runtime = createIsomerRuntime({ packs: [pack] });

    expect(runtime.validate(composition).errors).toEqual([]);
    expect(runtime.surfaces.text.render(composition)).toContain('Hello');
    expect(buildAuthoringJsonSchema).not.toHaveBeenCalled();
  });

  it('builds the schema on the first call and reuses it after', () => {
    const runtime = createIsomerRuntime({ packs: [pack] });

    runtime.getAuthoringContext().describePrimitives(['note']);
    const first = runtime.getAuthoringContext();
    const second = runtime.getAuthoringContext();

    expect(second.schema).toBe(first.schema);
    expect(second.declarations).toBe(first.declarations);
    expect(buildAuthoringJsonSchema).toHaveBeenCalledTimes(1);
  });
});
