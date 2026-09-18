/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { definePrimitive } from '../define/primitive_module';
import { createSlackAssetCollector } from '../render/slack/assets';
import { gfmToSlackBlocks } from '../render/slack/format';
import type {
  CaptionNode,
  ChartNode,
  FixtureNode,
  InkPackTypes,
  StackNode,
} from '../testing/sdk.fixtures';
import { fixtureDefinitions } from '../testing/sdk.fixtures';

import { createPrimitiveDispatcher } from './primitive_dispatch';

const dispatcher = () =>
  createPrimitiveDispatcher<FixtureNode>(fixtureDefinitions, {
    label: 'sdk.fixture',
    isSlackAssetType: (type) => type === 'chart',
  });

describe('createPrimitiveDispatcher', () => {
  it('throws on duplicate primitive types', () => {
    const [note] = fixtureDefinitions;
    expect(() => createPrimitiveDispatcher([note!, note!])).toThrow(
      'duplicate primitive type "note" registered'
    );
  });

  it('prefixes the duplicate-type error with the dispatcher label', () => {
    const [note] = fixtureDefinitions;
    expect(() =>
      createPrimitiveDispatcher([note!, note!], { label: 'sdk.fixture' })
    ).toThrow('sdk.fixture: duplicate primitive type "note" registered');
  });

  it('throws on an unknown primitive type', () => {
    expect(() =>
      dispatcher().getDefinition({ type: 'missing' } as unknown as FixtureNode)
    ).toThrow('Unknown primitive type "missing"');
  });

  it('identifies unknown-type failures by name and code', () => {
    try {
      dispatcher().getDefinition({ type: 'missing' } as unknown as FixtureNode);
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'IsomerError',
        code: 'UNKNOWN_PRIMITIVE_TYPE',
      });
    }
  });

  it('degrades a primitive with no slack renderer through its markdown', () => {
    const blocks = dispatcher().renderSlack({
      type: 'caption',
      body: 'Aside',
    } satisfies CaptionNode);
    expect(blocks).toEqual(gfmToSlackBlocks('Aside'));
  });

  // The envelope only ever sees a container's own output, so a child that
  // degraded to nothing here could not be recovered downstream.
  it('degrades a child with no slack renderer nested inside a container', () => {
    const caption = { type: 'caption', body: 'Aside' } satisfies CaptionNode;
    const nested = dispatcher().renderSlack({
      type: 'stack',
      items: [caption],
    } satisfies StackNode);
    expect(nested).toEqual(dispatcher().renderSlack(caption));
    expect(nested).not.toEqual([]);
  });

  it('swaps a slack asset type for an image block when a collector is present', () => {
    const collector = createSlackAssetCollector();
    const blocks = dispatcher().renderSlack(
      { type: 'chart', label: 'Series' } satisfies ChartNode,
      collector
    );
    expect(blocks).toEqual([
      {
        type: 'image',
        alt_text: 'Series',
        slack_file: { ref: 'asset-0' },
      },
    ]);
    expect(collector.requests).toHaveLength(1);
  });
});

interface TaggedNote {
  type: 'note';
  body: string;
}

interface TaggedStack {
  type: 'stack';
  items: TaggedNote[];
}

const taggedNote = (tag: string) =>
  definePrimitive<TaggedNote>({
    type: 'note',
    catalog: {
      type: 'note',
      purpose: '',
      useWhen: [],
      avoidWhen: [],
      example: {},
    },
    examples: [],
    schema: z.object({ type: z.literal('note'), body: z.string() }),
    renderers: {
      react: (node) => node.body,
      text: (node) => `${tag}:${node.body}`,
      markdown: (node) => node.body,
    },
  });

const taggedStack = definePrimitive<TaggedStack>({
  type: 'stack',
  catalog: {
    type: 'stack',
    purpose: '',
    useWhen: [],
    avoidWhen: [],
    example: {},
  },
  examples: [],
  schema: z.object({ type: z.literal('stack') }),
  renderers: {
    react: () => null,
    text: (node, { scope }) =>
      node.items.map((item) => scope.renderText(item)).join('|'),
    markdown: () => '',
  },
});

describe('RenderScope', () => {
  it('renders a child owned by another pack without ambient dispatcher state', () => {
    const composed = createPrimitiveDispatcher<TaggedStack | TaggedNote>([
      taggedStack,
      taggedNote('a'),
    ]);
    expect(
      composed.renderText({
        type: 'stack',
        items: [{ type: 'note', body: 'hello' }],
      })
    ).toBe('a:hello');
  });

  it('does not leak a nested dispatcher into the outer render', () => {
    let nested = '';
    const inner = createPrimitiveDispatcher<TaggedNote>([taggedNote('inner')]);
    const probingNote = definePrimitive<TaggedNote>({
      type: 'note',
      catalog: {
        type: 'note',
        purpose: '',
        useWhen: [],
        avoidWhen: [],
        example: {},
      },
      examples: [],
      schema: z.object({ type: z.literal('note'), body: z.string() }),
      renderers: {
        react: (node) => node.body,
        text: (node) => {
          nested = inner.renderText({ type: 'note', body: 'child' });
          return `outer:${node.body}`;
        },
        markdown: (node) => node.body,
      },
    });
    const outer = createPrimitiveDispatcher<TaggedStack | TaggedNote>([
      taggedStack,
      probingNote,
    ]);
    expect(
      outer.renderText({
        type: 'stack',
        items: [{ type: 'note', body: 'parent' }],
      })
    ).toBe('outer:parent');
    expect(nested).toBe('inner:child');
    expect(inner.renderText({ type: 'note', body: 'again' })).toBe(
      'inner:again'
    );
  });

  it('threads the frame theme through renderSvg as env.theme', () => {
    interface SwatchNode {
      type: 'swatch';
    }
    const swatch = definePrimitive<SwatchNode, InkPackTypes>({
      type: 'swatch',
      catalog: {
        type: 'swatch',
        purpose: '',
        useWhen: [],
        avoidWhen: [],
        example: { type: 'swatch' },
      },
      examples: [{ type: 'swatch' }],
      schema: z.object({ type: z.literal('swatch') }),
      renderers: {
        react: (_node, { theme }) => theme?.ink ?? 'none',
        text: () => '',
        markdown: () => '',
      },
    });
    const swatchDispatcher = createPrimitiveDispatcher<
      SwatchNode,
      InkPackTypes
    >([swatch]);

    expect(
      swatchDispatcher.renderSvg({ type: 'swatch' }, {}, { ink: '#fff' }, 'k')
    ).toBe('#fff');
    expect(
      swatchDispatcher.renderSvg({ type: 'swatch' }, {}, undefined, 'k')
    ).toBe('none');
  });
});
