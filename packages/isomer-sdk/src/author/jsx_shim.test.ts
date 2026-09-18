/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, Fragment } from 'react';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { PrimitiveNode } from '../define/primitive_module';

import { fromChildren, fromTextChildren } from './authored_fields';
import { buildJsxShim, textFromChildren } from './jsx_shim';

const primitives = [
  { type: 'note' as const },
  {
    type: 'stack' as const,
    children: (node: { items: PrimitiveNode[] }) =>
      node.items.map((item, index) => ({
        node: item,
        path: `items[${index}]`,
      })),
  },
  {
    type: 'frame' as const,
    children: (node: { body: PrimitiveNode[] }) =>
      node.body.map((item, index) => ({
        node: item,
        path: `body[${index}]`,
      })),
  },
  {
    type: 'split' as const,
    children: (node: { left: PrimitiveNode[]; right: PrimitiveNode[] }) => [
      ...node.left.map((item, index) => ({
        node: item,
        path: `left[${index}]`,
      })),
      ...node.right.map((item, index) => ({
        node: item,
        path: `right[${index}]`,
      })),
    ],
  },
] as const;

const { Composition, Frame, Note, Split, Stack, component, toComposition } =
  buildJsxShim(primitives);

describe('buildJsxShim', () => {
  it('spreads leaf props and names PascalCase components from the primitive list', () => {
    const spec = toComposition(
      createElement(
        Composition,
        { title: 'Leaf' },
        createElement(Note, { body: 'Hello' })
      )
    );

    expect(spec).toEqual({
      type: 'view',
      title: 'Leaf',
      body: [{ type: 'note', body: 'Hello' }],
    });
  });

  it('maps JSX children onto a unique child-array field from children()', () => {
    const spec = toComposition(
      createElement(
        Composition,
        null,
        createElement(
          Frame,
          { brand: 'Isomer' },
          createElement(Stack, null, createElement(Note, { body: 'Nested' }))
        )
      )
    );

    expect(spec.body).toEqual([
      {
        type: 'frame',
        brand: 'Isomer',
        body: [
          {
            type: 'stack',
            items: [{ type: 'note', body: 'Nested' }],
          },
        ],
      },
    ]);
  });

  it('lets an explicit array prop win over JSX children', () => {
    const spec = toComposition(
      createElement(
        Composition,
        null,
        createElement(
          Stack,
          { items: [{ type: 'note', body: 'Prop' }] },
          createElement(Note, { body: 'Child' })
        )
      )
    );

    expect(spec.body).toEqual([
      { type: 'stack', items: [{ type: 'note', body: 'Prop' }] },
    ]);
  });

  it('converts JSX element props for multi-slot containers', () => {
    const spec = toComposition(
      createElement(Composition, null, [
        createElement(Split, {
          left: createElement(Note, { body: 'L' }),
          right: createElement(Stack, null, createElement(Note, { body: 'R' })),
        }),
      ])
    );

    expect(spec.body).toEqual([
      {
        type: 'split',
        left: [{ type: 'note', body: 'L' }],
        right: [{ type: 'stack', items: [{ type: 'note', body: 'R' }] }],
      },
    ]);
  });

  it('converts an array of JSX elements on a child-array prop', () => {
    const spec = toComposition(
      createElement(
        Composition,
        null,
        createElement(Split, {
          left: [
            createElement(Note, { body: 'A' }),
            createElement(Note, { body: 'B' }),
          ],
          right: createElement(
            Fragment,
            null,
            createElement(Note, { body: 'C' })
          ),
        })
      )
    );

    expect(spec.body).toEqual([
      {
        type: 'split',
        left: [
          { type: 'note', body: 'A' },
          { type: 'note', body: 'B' },
        ],
        right: [{ type: 'note', body: 'C' }],
      },
    ]);
  });

  it('rejects an unregistered type as a body node', () => {
    const Extra = component('extra');

    try {
      toComposition(createElement(Composition, null, createElement(Extra)));
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'IsomerError',
        code: 'INVALID_BODY_NODE',
      });
    }
  });

  it('fills a branded child field and types the child component from the schema', () => {
    const {
      Composition: Root,
      Group,
      Item,
      toComposition: convert,
    } = buildJsxShim([
      brandedGroup(
        fromChildren('item', z.array(z.object({ label: z.string() })))
      ),
    ]);
    const spec = convert(
      createElement(
        Root,
        null,
        createElement(
          Group,
          { title: 'Open' },
          createElement(Item, { label: 'A' })
        )
      )
    );

    expect(spec.body).toEqual([
      {
        type: 'group',
        title: 'Open',
        items: [{ label: 'A' }],
      },
    ]);
  });

  it('fills a text field on a branded child from leftover children', () => {
    const {
      Composition: Root,
      Group,
      Item,
      toComposition: convert,
    } = buildJsxShim([
      brandedGroup(
        fromChildren(
          'item',
          z.array(z.object({ body: z.string(), title: z.string() })),
          {
            text: 'body',
          }
        )
      ),
    ]);
    const spec = convert(
      createElement(
        Root,
        null,
        createElement(
          Group,
          null,
          createElement(Item, { title: 'Host' }, 'Owns routing.')
        )
      )
    );

    expect(spec.body).toEqual([
      {
        type: 'group',
        items: [{ title: 'Host', body: 'Owns routing.' }],
      },
    ]);
  });

  it('keeps an explicit branded prop ahead of children', () => {
    const {
      Composition: Root,
      Group,
      toComposition: convert,
    } = buildJsxShim([
      brandedGroup(
        fromChildren('item', z.array(z.object({ label: z.string() })))
      ),
    ]);
    const spec = convert(
      createElement(
        Root,
        null,
        createElement(Group, { items: [{ label: 'Prop' }] }, 'ignored')
      )
    );

    expect(spec.body).toEqual([{ type: 'group', items: [{ label: 'Prop' }] }]);
  });

  it('maps text children onto a branded string field', () => {
    const schema = z.object({
      type: z.literal('code'),
      code: fromTextChildren(z.string().min(1), { collapseWhitespace: false }),
    });
    const {
      Code,
      Composition: Root,
      toComposition: convert,
    } = buildJsxShim([{ type: 'code' as const, schema }]);
    const spec = convert(
      createElement(Root, null, createElement(Code, null, '\n  const x = 1;\n'))
    );

    expect(spec.body).toEqual([{ type: 'code', code: 'const x = 1;' }]);
  });

  it('throws when required text children are missing', () => {
    const schema = z.object({
      type: z.literal('code'),
      code: fromTextChildren(z.string().min(1)),
    });
    const {
      Code,
      Composition: Root,
      toComposition: convert,
    } = buildJsxShim([{ type: 'code' as const, schema }]);

    try {
      convert(createElement(Root, null, createElement(Code)));
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'IsomerError',
        code: 'MISSING_AUTHORED_TEXT',
      });
    }
  });

  it('throws when two primitives brand one child type with different shapes', () => {
    expect(() =>
      buildJsxShim([
        brandedGroup(
          fromChildren('item', z.array(z.object({ label: z.string() })))
        ),
        {
          type: 'other' as const,
          schema: z.object({
            type: z.literal('other'),
            items: fromChildren(
              'item',
              z.array(z.object({ name: z.string() }))
            ),
          }),
        },
      ])
    ).toThrow(
      expect.objectContaining({
        name: 'IsomerError',
        code: 'DUPLICATE_AUTHORED_CHILD',
      })
    );
  });
});

const brandedGroup = <TSchema extends z.ZodType>(items: TSchema) => ({
  type: 'group' as const,
  schema: z.object({
    type: z.literal('group'),
    title: z.string().optional(),
    items,
  }),
});

describe('recursive fromChildren', () => {
  it('nests items without looping the child signature', () => {
    let nested: z.ZodOptional<z.ZodArray<z.ZodType>> | undefined;
    const item = z.object({
      content: z.string(),
      get children(): z.ZodOptional<z.ZodArray<z.ZodType>> {
        nested ??= fromChildren(
          'listItem',
          z.array(item as z.ZodType).optional()
        ) as z.ZodOptional<z.ZodArray<z.ZodType>>;
        return nested;
      },
    });
    const {
      Composition: Root,
      List,
      ListItem,
      toComposition: convert,
    } = buildJsxShim([
      {
        type: 'list' as const,
        schema: z.object({
          type: z.literal('list'),
          items: fromChildren('listItem', z.array(item).min(1)),
        }),
      },
    ]);

    expect(
      convert(
        createElement(
          Root,
          null,
          createElement(
            List,
            null,
            createElement(
              ListItem,
              { content: 'Parent' },
              createElement(ListItem, { content: 'Child' })
            )
          )
        )
      ).body
    ).toEqual([
      {
        type: 'list',
        items: [{ content: 'Parent', children: [{ content: 'Child' }] }],
      },
    ]);
  });
});

describe('textFromChildren', () => {
  it('collapses whitespace by default', () => {
    expect(textFromChildren('  foo\n  bar  ')).toBe('foo bar');
  });

  it('preserves newlines when collapseWhitespace is false', () => {
    expect(
      textFromChildren('\n  const x = {\n  a: 1,\n};\n', {
        collapseWhitespace: false,
      })
    ).toBe('const x = {\n  a: 1,\n};');
  });

  it('rejects an element child', () => {
    try {
      textFromChildren(createElement('span', null, 'nope'));
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'IsomerError',
        code: 'EXPECTED_TEXT_CHILDREN',
      });
    }
  });
});
