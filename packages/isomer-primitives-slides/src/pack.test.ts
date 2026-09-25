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
      url: 'https://example.com',
      body: [
        { type: 'slideHeading', title: 'T1' },
        { type: 'slideHeading', title: 'T2' },
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
      url: 'https://example.com',
      body: [{ type: 'slideHeading', title: 'T' }],
    };
    expect(slideFramePrimitive.hasOwnContent?.(frame)).toBe(true);
  });

  it('slideSplit.children walks left and right', () => {
    const split: SlideSplitNode = {
      type: 'slideSplit',
      left: { items: [{ type: 'slideHeading', title: 'L' }] },
      right: { items: [{ type: 'slideHeading', title: 'R' }] },
    };
    const children = slideSplitPrimitive.children?.(split);
    expect(children).toHaveLength(2);
    expect(children?.[0]?.path).toBe('left.items[0]');
    expect(children?.[1]?.path).toBe('right.items[0]');
  });

  it('slideStack.children walks items', () => {
    const stack: SlideStackNode = {
      type: 'slideStack',
      items: [
        { type: 'slideHeading', title: 'A' },
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
          url: 'https://example.com',
          body: [
            {
              type: 'slideSplit',
              left: {
                items: [{ type: 'slideHeading', id: 'dup', title: 'L' }],
              },
              right: {
                items: [{ type: 'slideHeading', id: 'dup', title: 'R' }],
              },
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
          url: 'https://example.com',
          body: [
            {
              type: 'slideSplit',
              left: { items: [{ type: 'slideHeading', title: 'Left' }] },
              right: { items: [{ type: 'note', text: 'foreign node' }] },
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
          url: 'https://example.com',
          body: [
            {
              type: 'slideSplit',
              left: { items: [{ type: 'slideHeading', title: 'Left' }] },
              right: { items: [{ type: 'note', text: 'foreign-text-node' }] },
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
          url: 'https://example.com',
          body: [
            {
              type: 'slideSplit',
              left: { items: [{ type: 'slideHeading', title: 'Left' }] },
              right: { items: [{ type: 'note', text: 'foreign-md-node' }] },
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
          url: 'https://example.com',
          body: [
            {
              type: 'slideStack',
              items: [
                { type: 'slideHeading', title: 'Top' },
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
  it('describes every field of every primitive', () => {
    const schema = buildAuthoringJsonSchema(slideDeckPrimitives) as {
      $defs?: Record<string, { properties?: Record<string, unknown> }>;
    };
    const defs = schema.$defs ?? {};

    for (const { type } of slideDeckPrimitives) {
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
// sanitize hooks via scope
// ---------------------------------------------------------------------------

describe('sanitize via scope', () => {
  it('drops an unsafe frame url', () => {
    const composition = {
      type: 'view' as const,
      body: [
        {
          type: 'slideFrame',
          chapter: 'c',
          url: 'javascript:alert(1)',
          body: [{ type: 'slideHeading', title: 'Test' }],
        },
      ],
    };
    const node = runtime.surfaces.react.render(composition);
    const markup = renderToStaticMarkup(createElement(() => node));
    expect(markup).not.toContain('javascript:');
  });

  it('drops a relative frame url', () => {
    const composition = {
      type: 'view' as const,
      body: [
        {
          type: 'slideFrame',
          url: 'developer.mozilla.org',
          body: [{ type: 'slideHeading', title: 'Test' }],
        },
      ],
    };
    const node = runtime.surfaces.react.render(composition);
    const markup = renderToStaticMarkup(createElement(() => node));
    expect(markup).not.toContain('developer.mozilla.org');
  });
});

describe('frame url', () => {
  const withUrl = (url: string) => ({
    type: 'view',
    body: [
      {
        type: 'slideFrame',
        url,
        body: [{ type: 'slideHeading', title: 'Test' }],
      },
    ],
  });

  it.each(['https://example.com', 'http://example.com/deck'])(
    'accepts %s',
    (url) => {
      expect(runtime.parse(withUrl(url)).valid).toBe(true);
    }
  );

  it.each(['developer.mozilla.org', '/deck', 'mailto:a@example.com'])(
    'rejects %s with a path-prefixed message',
    (url) => {
      const { valid, errors } = runtime.parse(withUrl(url));
      expect(valid).toBe(false);
      expect(errors).toContainEqual(
        expect.objectContaining({
          path: 'body[0].url',
          message: expect.stringContaining(
            'absolute http or https URL'
          ) as unknown,
        })
      );
    }
  );
});

// ---------------------------------------------------------------------------
// frames never nest
// ---------------------------------------------------------------------------

describe('frames never nest', () => {
  const inner = {
    type: 'slideFrame',
    body: [{ type: 'slideHeading', title: 'Inner' }],
  };
  const slots = {
    'body[0].body[0]': inner,
    'body[0].body[0].left.items[0]': {
      type: 'slideSplit',
      left: { items: [inner] },
      right: { items: ['Right'] },
    },
    'body[0].body[0].items[0]': { type: 'slideStack', items: [inner] },
    'body[0].body[0].body[0]': {
      type: 'slideWindow',
      chrome: 'terminal',
      title: 'Terminal',
      body: [inner],
    },
    'body[0].body[0].aside': { type: 'slideTitle', title: 'T', aside: inner },
  };

  it.each(Object.entries(slots))('rejects a frame at %s', (path, node) => {
    const { valid, errors } = runtime.parse({
      type: 'view',
      body: [{ type: 'slideFrame', body: [node] }],
    });
    expect(valid).toBe(false);
    expect(
      errors.filter(({ message }) => message.includes('frames never nest'))
    ).toEqual([{ path, message: expect.any(String) as string }]);
  });
});
