/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { Composition } from '../../composition/composition';
import {
  definePrimitive,
  type PrimitiveNode,
  type StyledRenderContext,
} from '../../define/primitive_module';
import { createPrimitiveDispatcher } from '../primitive_dispatch';
import { renderCompositionContent } from '../react/content';

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
    react: (node, { context }) => {
      (context as { use?: (rule: string) => void } | undefined)?.use?.(
        `.leaf-${node.text}{}`
      );
      return createElement('p', null, node.text);
    },
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

  it('hands the host render the enhancements the html render would, and asks each once', () => {
    let asked = 0;
    const { context } = createHTMLStyleCollection(composition, {
      dispatcher,
      styleAdapter: adapter(),
      options: { enhancements: ['leafCopy', 'absent'] },
      enhancementDefinitions: [
        {
          id: 'leafCopy',
          anchors: true,
          appliesTo: () => {
            asked += 1;
            return true;
          },
        },
        { id: 'absent', appliesTo: () => false },
      ],
    });
    const { enhancements, anchors } = context as {
      enhancements?: ReadonlySet<string>;
      anchors?: boolean;
    };
    expect([...(enhancements ?? [])]).toEqual(['leafCopy']);
    expect(anchors).toBe(true);
    expect(asked).toBe(1);
  });

  it('turns anchors off when nothing asks for them, whatever the adapter context says', () => {
    const { context } = createHTMLStyleCollection(composition, {
      dispatcher,
      styleAdapter: adapter({ createRenderContext: () => ({ anchors: true }) }),
    });
    expect((context as { anchors?: boolean }).anchors).toBe(false);
  });

  it('returns the heading the style adapter resolved, so the host draws the one html would', () => {
    const { heading } = createHTMLStyleCollection(composition, {
      dispatcher,
      styleAdapter: adapter({
        resolveOptions: (_composition, options) => ({
          ...options,
          heading: false,
        }),
      }),
    });
    expect(heading).toBe(false);
    expect(createHTMLStyleCollection(composition, { dispatcher }).heading).toBe(
      true
    );
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

  it('collects the CSS the host render records through its context', () => {
    interface RecordingContext extends StyledRenderContext {
      use: (rule: string) => void;
    }
    const { context, css } = createHTMLStyleCollection<
      LeafNode,
      { rules: string[] },
      RecordingContext
    >(composition, {
      dispatcher,
      styleAdapter: {
        createCollector: () => ({ rules: [] }),
        createRenderContext: ({ rules }) => ({
          use: (rule) => {
            rules.push(rule);
          },
        }),
        renderStyles: ({ rules }) => rules.join(''),
      },
    });
    renderToStaticMarkup(
      createElement(() =>
        renderCompositionContent(composition, dispatcher, context, {
          heading: false,
        })
      )
    );
    expect(css()).toBe('.leaf-a{}');
  });
});
