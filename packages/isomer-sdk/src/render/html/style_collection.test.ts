/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { Composition } from '../../composition/composition';
import {
  definePrimitive,
  type PrimitiveNode,
} from '../../define/primitive_module';
import { createPrimitiveDispatcher } from '../primitive_dispatch';

import type { HTMLStyleAdapter } from './envelope';
import { createHTMLStyleCollection } from './style_collection';

interface LeafNode extends PrimitiveNode {
  type: 'leaf';
  text: string;
}

const leaf = definePrimitive<LeafNode>({
  type: 'leaf',
  catalog: {
    type: 'leaf',
    purpose: 'leaf',
    useWhen: [],
    avoidWhen: [],
    example: { type: 'leaf', text: 'a' },
  },
  examples: [{ type: 'leaf', text: 'a' }],
  schema: z.object({ type: z.literal('leaf'), text: z.string() }),
  renderers: {
    react: (node) => createElement('p', null, node.text),
    text: (node) => node.text,
    markdown: (node) => node.text,
  },
});

const dispatcher = createPrimitiveDispatcher<LeafNode>([leaf]);
const composition: Composition<LeafNode> = {
  type: 'view',
  body: [{ type: 'leaf', text: 'a' }],
};

const adapter = (
  overrides: Partial<HTMLStyleAdapter<LeafNode, { rules: string[] }>> = {}
): HTMLStyleAdapter<LeafNode, { rules: string[] }> => ({
  createCollector: () => ({ rules: [] }),
  createRenderContext: () => ({}),
  renderStyles: ({ rules }) => rules.join(''),
  ...overrides,
});

describe('createHTMLStyleCollection', () => {
  it('returns the wrapper the style adapter resolved, so the host draws the one the CSS targets', () => {
    const { wrapper } = createHTMLStyleCollection(composition, {
      dispatcher,
      styleAdapter: adapter({
        resolveOptions: (_composition, options) => ({
          ...options,
          fluid: true,
          framed: false,
          theme: 'dark',
        }),
      }),
    });
    expect(wrapper).toEqual({ framed: false, fluid: true, theme: 'dark' });
  });

  it('defaults the wrapper as the html surface does', () => {
    const { wrapper } = createHTMLStyleCollection(
      { ...composition, theme: 'light' },
      { dispatcher }
    );
    expect(wrapper).toEqual({ framed: true, fluid: false, theme: 'light' });
  });

  it('runs the post-render hook once, however often css() is read', () => {
    const collectAfterRender = vi.fn(
      (_composition: unknown, collector: { rules: string[] }) => {
        collector.rules.push('.after{}');
      }
    );
    const { css } = createHTMLStyleCollection(composition, {
      dispatcher,
      styleAdapter: adapter({ collectAfterRender }),
    });
    expect(css()).toBe('.after{}');
    expect(css()).toBe('.after{}');
    expect(collectAfterRender).toHaveBeenCalledTimes(1);
  });
});
