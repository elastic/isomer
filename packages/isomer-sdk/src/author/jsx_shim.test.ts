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
import { defineAuthorComponent } from './jsx';
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

const { Composition, Frame, Note, Split, Stack, toComposition } =
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

  it('carries every root field onto the composition', () => {
    const spec = toComposition(
      createElement(
        Composition,
        {
          version: 1,
          title: 'Title',
          subtitle: 'Subtitle',
          theme: 'dark',
          meta: { source: 'test' },
        },
        createElement(Note, { body: 'Hello' })
      )
    );

    expect(spec).toEqual({
      type: 'view',
      version: 1,
      title: 'Title',
      subtitle: 'Subtitle',
      theme: 'dark',
      meta: { source: 'test' },
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
    const Extra = defineAuthorComponent('extra');

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

  it('rejects children on a type that has no field to fill from them', () => {
    try {
      toComposition(
        createElement(
          Composition,
          null,
          createElement(Note, { body: 'Leaf' }, createElement(Note))
        )
      );
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'IsomerError',
        code: 'UNEXPECTED_CHILDREN',
        message: '<Note> takes no JSX children; set its fields through props.',
      });
    }
    expect(
      toComposition(
        createElement(
          Composition,
          null,
          createElement(Note, { body: 'Leaf' }, null, false)
        )
      ).body
    ).toEqual([{ type: 'note', body: 'Leaf' }]);
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

  it('throws when two types become the same component name', () => {
    expect(() =>
      buildJsxShim([{ type: 'slideStat' }, { type: 'SlideStat' }])
    ).toThrow(
      expect.objectContaining({
        name: 'IsomerError',
        code: 'DUPLICATE_PRIMITIVE_TYPE',
        message:
          'buildJsxShim: "slideStat" and "SlideStat" both become the component SlideStat',
      })
    );
    expect(() => buildJsxShim([{ type: 'composition' }])).toThrow(
      expect.objectContaining({ code: 'DUPLICATE_PRIMITIVE_TYPE' })
    );
    expect(() =>
      buildJsxShim([
        { type: 'Item' },
        brandedGroup(
          fromChildren('item', z.array(z.object({ label: z.string() })))
        ),
      ])
    ).toThrow(
      expect.objectContaining({
        code: 'DUPLICATE_PRIMITIVE_TYPE',
        message:
          'buildJsxShim: "Item" and "item" both become the component Item',
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

describe('fromChildren through wrappers', () => {
  it.each([
    ['optional', <T extends z.ZodType>(s: T) => s.optional()],
    ['nullable', <T extends z.ZodType>(s: T) => s.nullable()],
    ['default', <T extends z.ZodType>(s: T) => s.default([] as never)],
    ['readonly', <T extends z.ZodType>(s: T) => s.readonly()],
  ])('generates the child component past %s', (_name, wrap) => {
    const {
      Composition: Root,
      Group,
      Item,
      toComposition: convert,
    } = buildJsxShim([
      brandedGroup(
        wrap(fromChildren('item', z.array(z.object({ label: z.string() }))))
      ),
    ]);
    expect(Item).toBeDefined();
    const spec = convert(
      createElement(
        Root,
        null,
        createElement(Group, null, createElement(Item, { label: 'A' }))
      )
    );
    expect(spec.body).toEqual([{ type: 'group', items: [{ label: 'A' }] }]);
  });

  it('fills a text field past optional', () => {
    const {
      Composition: Root,
      Group,
      toComposition: convert,
    } = buildJsxShim([
      {
        type: 'group' as const,
        schema: z.object({
          type: z.literal('group'),
          title: fromTextChildren(z.string()).optional(),
        }),
      },
    ]);
    expect(
      convert(createElement(Root, null, createElement(Group, null, 'Open')))
        .body
    ).toEqual([{ type: 'group', title: 'Open' }]);
  });

  it('refuses to brand one schema instance as two child types', () => {
    const shared = z.array(z.object({ label: z.string() }));
    fromChildren('item', shared);
    expect(() => fromChildren('entry', shared)).toThrow(
      expect.objectContaining({
        name: 'IsomerError',
        code: 'AUTHORED_SCHEMA_REUSED',
      })
    );
  });

  it('treats text children as optional when an inner layer is', () => {
    const {
      Composition: Root,
      Group,
      toComposition: convert,
    } = buildJsxShim([
      {
        type: 'group' as const,
        schema: z.object({
          type: z.literal('group'),
          title: fromTextChildren(z.string().optional().nullable()),
        }),
      },
    ]);
    expect(
      convert(createElement(Root, null, createElement(Group))).body
    ).toEqual([{ type: 'group' }]);
  });

  it('reads the items of a nullable or readonly child array', () => {
    const items = () => z.array(z.object({ label: z.string() }));
    expect(() =>
      buildJsxShim([
        brandedGroup(fromChildren('item', items())),
        {
          type: 'other' as const,
          schema: z.object({
            type: z.literal('other'),
            items: fromChildren('item', items().nullable()),
          }),
        },
      ])
    ).not.toThrow();
    expect(() =>
      buildJsxShim([
        brandedGroup(fromChildren('item', items().readonly())),
        {
          type: 'other' as const,
          schema: z.object({
            type: z.literal('other'),
            items: fromChildren(
              'item',
              z.array(z.object({ count: z.number() })).readonly()
            ),
          }),
        },
      ])
    ).toThrow(expect.objectContaining({ code: 'DUPLICATE_AUTHORED_CHILD' }));
  });

  it('names the function that rebranded a schema', () => {
    const shared = z.string();
    fromTextChildren(shared);
    expect(() =>
      fromTextChildren(shared, { collapseWhitespace: false })
    ).toThrow(/^fromTextChildren:/);
  });

  it('treats text children as optional when any wrapper layer is', () => {
    const {
      Composition: Root,
      Group,
      toComposition: convert,
    } = buildJsxShim([
      {
        type: 'group' as const,
        schema: z.object({
          type: z.literal('group'),
          title: fromTextChildren(z.string()).optional().nullable(),
        }),
      },
    ]);
    expect(
      convert(createElement(Root, null, createElement(Group))).body
    ).toEqual([{ type: 'group' }]);
  });

  it.each([
    [
      'a different toItem',
      (s: z.ZodType) => fromChildren('item', s, { toItem: () => ({}) }),
    ],
    [
      'an added text field',
      (s: z.ZodType) => fromChildren('item', s, { text: 'label' }),
    ],
    ['a text brand', (s: z.ZodType) => fromTextChildren(s)],
  ])('refuses to rebrand one instance with %s', (_name, rebrand) => {
    const shared = z.array(z.object({ label: z.string() }));
    fromChildren('item', shared, { toItem: () => ({}) });
    expect(() => rebrand(shared)).toThrow(
      expect.objectContaining({ code: 'AUTHORED_SCHEMA_REUSED' })
    );
  });

  it('allows branding one instance twice the same way', () => {
    const shared = z.array(z.object({ label: z.string() }));
    fromChildren('item', shared);
    expect(() => fromChildren('item', shared)).not.toThrow();
  });
});
