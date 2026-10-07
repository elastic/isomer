/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ValidationError } from '../composition/validation_error';
import { definePrimitive } from '../define/primitive_module';
import { md } from '../render/markdown/builder';
import { createSlackAssetCollector } from '../render/slack/assets';
import { gfmToSlackBlocks } from '../render/slack/markdown_content';
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

  it('names the node type on a schema failure in the node itself', () => {
    const errors: ValidationError[] = [];
    dispatcher().validate(
      { type: 'stack', items: 'none' } as unknown as FixtureNode,
      'body[0]',
      errors
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      path: 'body[0].items',
      nodeType: 'stack',
    });
  });

  it('leaves a child of unknown type unnamed, not its container', () => {
    const errors: ValidationError[] = [];
    dispatcher().validate(
      { type: 'stack', items: [{ type: '' }] } as unknown as FixtureNode,
      'body[0]',
      errors
    );
    expect(errors).toEqual([
      { path: 'body[0].items[0].type', message: 'must be a non-empty string' },
    ]);
  });

  it('lists the declared fields on an unknown key', () => {
    const errors: ValidationError[] = [];
    dispatcher().validate(
      { type: 'note', body: 'Hi', extra: 1 } as unknown as FixtureNode,
      'body[0]',
      errors
    );
    expect(errors).toEqual([
      {
        path: 'body[0]',
        message: 'has unrecognized key(s): extra; its fields are body',
        nodeType: 'note',
      },
    ]);
  });

  it('degrades a primitive with no slack renderer through its markdown', () => {
    const blocks = dispatcher().renderSlack({
      type: 'caption',
      body: 'Aside',
    } satisfies CaptionNode);
    expect(blocks).toEqual(gfmToSlackBlocks('Aside'));
  });

  it('degrades builder content through its tree, not the string translator', () => {
    const builtNote = definePrimitive<TaggedNote>({
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
        text: (node) => node.body,
        markdown: (node) => md.paragraph(md.strong(node.body)),
      },
    });
    expect(
      createPrimitiveDispatcher<TaggedNote>([builtNote]).renderSlack({
        type: 'note',
        body: '_x_',
      })
    ).toEqual([
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [{ type: 'text', text: '_x_', style: { bold: true } }],
          },
        ],
      },
    ]);
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
      markdown: (node) => md.paragraph(node.body),
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
    markdown: () => [],
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

  it('embeds a child as content, printing authored source as written', () => {
    const catalog = {
      purpose: '',
      useWhen: [],
      avoidWhen: [],
      example: {},
    };
    const listStack = definePrimitive<TaggedStack>({
      type: 'stack',
      catalog: { type: 'stack', ...catalog },
      examples: [],
      schema: z.object({ type: z.literal('stack') }),
      renderers: {
        react: () => null,
        text: () => '',
        markdown: (node, { scope }) =>
          md.list(node.items.map((item) => scope.renderMarkdownContent(item))),
      },
    });
    const builtNote = definePrimitive<TaggedNote>({
      type: 'note',
      catalog: { type: 'note', ...catalog },
      examples: [],
      schema: z.object({ type: z.literal('note'), body: z.string() }),
      renderers: {
        react: (node) => node.body,
        text: (node) => node.body,
        markdown: (node) => md.paragraph(node.body),
      },
    });
    const authoredNote = definePrimitive<TaggedNote>({
      ...builtNote,
      renderers: {
        ...builtNote.renderers,
        markdown: (node) => md.authored(node.body),
      },
    });
    const items = [
      { type: 'note' as const, body: 'line1\nline2' },
      { type: 'note' as const, body: '*b*' },
    ];

    const withAuthored = createPrimitiveDispatcher<TaggedStack | TaggedNote>([
      listStack,
      authoredNote,
    ]);
    expect(withAuthored.renderMarkdown({ type: 'stack', items })).toBe(
      '- line1\n  line2\n- *b*'
    );

    const withContent = createPrimitiveDispatcher<TaggedStack | TaggedNote>([
      listStack,
      builtNote,
    ]);
    expect(withContent.renderMarkdown({ type: 'stack', items })).toBe(
      '- line1 line2\n- \\*b\\*'
    );
    expect(withContent.renderMarkdown(items[1]!)).toBe('\\*b\\*');

    const hidden = { type: 'note' as const, body: 'x', surfaces: ['text'] };
    expect(
      withContent.renderMarkdown({ type: 'stack', items: [hidden, items[1]!] })
    ).toBe('- \\*b\\*');
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
        markdown: (node) => md.paragraph(node.body),
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

  it('threads the frame theme through renderSnapshot as env.theme', () => {
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
        markdown: () => [],
      },
    });
    const swatchDispatcher = createPrimitiveDispatcher<
      SwatchNode,
      InkPackTypes
    >([swatch]);

    expect(
      swatchDispatcher.renderSnapshot(
        { type: 'swatch' },
        {},
        { ink: '#fff' },
        'k'
      )
    ).toBe('#fff');
    expect(
      swatchDispatcher.renderSnapshot({ type: 'swatch' }, {}, undefined, 'k')
    ).toBe('none');
  });
});

describe('slack asset swap', () => {
  interface PicNode {
    type: 'pic';
    src: string;
  }
  const pic = (
    sanitize: (node: PicNode) => PicNode | null,
    text: () => string
  ) =>
    createPrimitiveDispatcher<PicNode>(
      [
        definePrimitive<PicNode>({
          type: 'pic',
          catalog: {
            type: 'pic',
            purpose: '',
            useWhen: [],
            avoidWhen: [],
            example: { type: 'pic', src: '/a.png' },
          },
          examples: [{ type: 'pic', src: '/a.png' }],
          schema: z.object({ type: z.literal('pic'), src: z.string() }),
          sanitize,
          renderers: { react: () => null, text, markdown: () => [] },
        }),
      ],
      { isSlackAssetType: () => true }
    );

  it('allocates the sanitized node', () => {
    const collector = createSlackAssetCollector();
    pic(
      (node) => ({ ...node, src: '#' }),
      () => 'alt'
    ).renderSlack({ type: 'pic', src: 'javascript:x' }, collector);
    expect(collector.requests[0]?.node).toEqual({ type: 'pic', src: '#' });
  });

  it('runs the sanitizer once, rendering alt text from the node it allocates', () => {
    const collector = createSlackAssetCollector();
    let calls = 0;
    pic(
      (node) => ({ ...node, src: `${node.src}#${++calls}` }),
      () => 'alt'
    ).renderSlack({ type: 'pic', src: 'x' }, collector);
    expect(calls).toBe(1);
    expect(collector.requests[0]?.node).toEqual({ type: 'pic', src: 'x#1' });
  });

  it('allocates nothing for a node its sanitizer drops', () => {
    const collector = createSlackAssetCollector();
    expect(
      pic(
        () => null,
        () => 'alt'
      ).renderSlack({ type: 'pic', src: 'x' }, collector)
    ).toEqual([]);
    expect(collector.requests).toEqual([]);
  });

  it('falls back to the type for an empty alt text', () => {
    const [block] = pic(
      (node) => node,
      () => ''
    ).renderSlack({ type: 'pic', src: 'x' }, createSlackAssetCollector());
    expect(block).toMatchObject({ alt_text: 'pic' });
  });
});
