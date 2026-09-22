/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Children declarations, `schemaFor`, and `RenderScope` recursion.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  buildAuthoringJsonSchema,
  createCompositionValidator,
  definePrimitive,
  definePrimitivePack,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { slideDeckFrame, slidesPack } from './pack';
import {
  type SlideFrameNode,
  slideFramePrimitive,
} from './primitives/slide_frame';
import {
  type SlideSplitNode,
  slideSplitPrimitive,
} from './primitives/slide_split';
import {
  type SlideStackNode,
  slideStackPrimitive,
} from './primitives/slide_stack';
import { slideDeckPrimitives } from './registry';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

// A second minimal pack with one foreign primitive, to verify cross-pack dispatch.
interface NoteNode extends PrimitiveNode {
  type: 'note';
  text: string;
}

const notePrimitive = definePrimitive<NoteNode>({
  type: 'note',
  catalog: {
    type: 'note',
    purpose: 'Minimal text node for cross-pack tests.',
    useWhen: ['A foreign node must render inside a slides container.'],
    avoidWhen: ['The slides pack covers the need.'],
    example: { type: 'note', text: 'hello' },
  },
  examples: [{ type: 'note', text: 'hello' }],
  schema: z.object({ type: z.literal('note'), text: z.string().min(1) }),
  renderers: {
    react: (node) => createElement('span', null, node.text),
    text: (node) => node.text,
    markdown: (node) => node.text,
  },
});

const foreignPack = definePrimitivePack({
  id: 'foreign',
  primitives: [notePrimitive],
});

const composedRuntime = createIsomerRuntime({
  packs: [slidesPack, foreignPack],
  frames: { slide: slideDeckFrame },
});

// ---------------------------------------------------------------------------
// children declarations
// ---------------------------------------------------------------------------

describe('children declarations', () => {
  const validate = createCompositionValidator(slideDeckPrimitives);

  it('slideFrame.children walks body', () => {
    const frame: SlideFrameNode = {
      type: 'slideFrame',
      chapter: 'test',
      footer: 'test',
      body: [
        { type: 'slideTitle', title: 'T1' },
        { type: 'slideTitle', title: 'T2' },
      ],
    };
    const children = slideFramePrimitive.children?.(frame);
    expect(children).toHaveLength(2);
    expect(children?.[0]?.path).toBe('body[0]');
    expect(children?.[1]?.path).toBe('body[1]');
  });

  it('slideFrame.hasOwnContent is true', () => {
    const frame: SlideFrameNode = {
      type: 'slideFrame',
      chapter: 'c',
      footer: 'f',
      body: [{ type: 'slideTitle', title: 'T' }],
    };
    expect(slideFramePrimitive.hasOwnContent?.(frame)).toBe(true);
  });

  it('slideSplit.children walks left and right', () => {
    const split: SlideSplitNode = {
      type: 'slideSplit',
      left: [{ type: 'slideTitle', title: 'L' }],
      right: [{ type: 'slideTitle', title: 'R' }],
    };
    const children = slideSplitPrimitive.children?.(split);
    expect(children).toHaveLength(2);
    expect(children?.[0]?.path).toBe('left[0]');
    expect(children?.[1]?.path).toBe('right[0]');
  });

  it('slideStack.children walks items', () => {
    const stack: SlideStackNode = {
      type: 'slideStack',
      items: [
        { type: 'slideTitle', title: 'A' },
        { type: 'slideBulletList', items: ['x'] },
      ],
    };
    const children = slideStackPrimitive.children?.(stack);
    expect(children).toHaveLength(2);
    expect(children?.[0]?.path).toBe('items[0]');
    expect(children?.[1]?.path).toBe('items[1]');
  });

  it('duplicate id nested two containers deep is reported', () => {
    const composition = {
      type: 'view' as const,
      body: [
        {
          type: 'slideFrame',
          chapter: 'c',
          footer: 'f',
          body: [
            {
              type: 'slideSplit',
              left: [{ type: 'slideTitle', id: 'dup', title: 'L' }],
              right: [{ type: 'slideTitle', id: 'dup', title: 'R' }],
            },
          ],
        },
      ],
    };
    const result = validate(composition);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /dup/.test(e.message))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RenderScope recursion
// ---------------------------------------------------------------------------

describe('RenderScope recursion', () => {
  it('a foreign note nested in slideSplit renders on react', () => {
    const composition = {
      type: 'view' as const,
      title: 'Cross-pack',
      body: [
        {
          type: 'slideFrame',
          chapter: 'c',
          footer: 'f',
          body: [
            {
              type: 'slideSplit',
              left: [{ type: 'slideTitle', title: 'Left' }],
              right: [{ type: 'note', text: 'foreign node' }],
            },
          ],
        },
      ],
    };
    const node = composedRuntime.surfaces.react.render(composition);
    const markup = renderToStaticMarkup(createElement(() => node));
    expect(markup).toContain('foreign node');
  });

  it('a foreign note nested in slideSplit renders on text', () => {
    const composition = {
      type: 'view' as const,
      body: [
        {
          type: 'slideFrame',
          chapter: 'c',
          footer: 'f',
          body: [
            {
              type: 'slideSplit',
              left: [{ type: 'slideTitle', title: 'Left' }],
              right: [{ type: 'note', text: 'foreign-text-node' }],
            },
          ],
        },
      ],
    };
    const text = composedRuntime.surfaces.text.render(composition);
    expect(text).toContain('foreign-text-node');
  });

  it('a foreign note nested in slideSplit renders on markdown', () => {
    const composition = {
      type: 'view' as const,
      body: [
        {
          type: 'slideFrame',
          chapter: 'c',
          footer: 'f',
          body: [
            {
              type: 'slideSplit',
              left: [{ type: 'slideTitle', title: 'Left' }],
              right: [{ type: 'note', text: 'foreign-md-node' }],
            },
          ],
        },
      ],
    };
    const md = composedRuntime.surfaces.markdown.render(composition);
    expect(md).toContain('foreign-md-node');
  });

  it('a foreign note nested in slideStack renders on svg', () => {
    const composition = {
      type: 'view' as const,
      body: [
        {
          type: 'slideFrame',
          chapter: 'c',
          footer: 'f',
          body: [
            {
              type: 'slideStack',
              items: [
                { type: 'slideTitle', title: 'Top' },
                { type: 'note', text: 'foreign-svg' },
              ],
            },
          ],
        },
      ],
    };
    const { element } = composedRuntime.surfaces.svg.render(composition);
    expect(renderToStaticMarkup(element)).toContain('foreign-svg');
  });
});

// ---------------------------------------------------------------------------
// authoring schema descriptions
// ---------------------------------------------------------------------------

describe('authoring schema descriptions', () => {
  it('describes every field of the three container primitives', () => {
    const schema = buildAuthoringJsonSchema(slideDeckPrimitives) as {
      $defs?: Record<string, { properties?: Record<string, unknown> }>;
    };
    const defs = schema.$defs ?? {};

    for (const type of ['slideFrame', 'slideSplit', 'slideStack']) {
      const properties = defs[type]?.properties ?? {};
      for (const [name, property] of Object.entries(properties)) {
        if (name === 'type') {
          continue;
        }
        expect(
          (property as { description?: string }).description,
          `${type}.${name} should carry a description`
        ).toBeTypeOf('string');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// slideTitle sanitize hook via scope (layer 3)
// ---------------------------------------------------------------------------

describe('slideTitle sanitize via scope', () => {
  it('sanitize hook fires on a slideTitle nested in slideFrame', () => {
    const composition = {
      type: 'view' as const,
      body: [
        {
          type: 'slideFrame',
          chapter: 'c',
          footer: 'f',
          body: [
            {
              type: 'slideTitle',
              title: 'Test',
              lede: [
                {
                  type: 'link' as const,
                  text: 'click',
                  href: 'javascript:alert(1)',
                },
              ],
            },
          ],
        },
      ],
    };
    const node = runtime.surfaces.react.render(composition);
    const markup = renderToStaticMarkup(createElement(() => node));
    // Blocked href replaces the javascript: URI
    expect(markup).not.toContain('javascript:');
  });
});
