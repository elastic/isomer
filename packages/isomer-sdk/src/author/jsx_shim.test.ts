/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, Fragment, type ReactNode } from 'react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type { PrimitiveNode } from '../define/primitive_module';

import {
  fromChildren,
  fromNodeChildren,
  fromTextChildren,
  readAuthoredSpec,
} from './authored_fields';
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
          createElement(Group.Item, { label: 'A' })
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
          createElement(Group.Item, { title: 'Host' }, 'Owns routing.')
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

  it('splits sibling child elements across branded fields by type', () => {
    const schema = z.object({
      type: z.literal('closing'),
      links: fromChildren(
        'link',
        z.array(z.object({ label: z.string(), text: z.string() })),
        { text: 'text' }
      ),
      paths: fromChildren(
        'path',
        z.array(z.object({ title: z.string(), body: z.string() })).optional(),
        { text: 'body' }
      ),
    });
    const {
      Closing,
      Composition: Root,
      toComposition: convert,
    } = buildJsxShim([{ type: 'closing' as const, schema }]);

    expect(
      convert(
        createElement(
          Root,
          null,
          createElement(
            Closing,
            null,
            createElement(Closing.Link, { label: 'Docs' }, 'example.com'),
            createElement(Closing.Path, { title: 'Start' }, 'Read the guide')
          )
        )
      ).body
    ).toEqual([
      {
        type: 'closing',
        links: [{ label: 'Docs', text: 'example.com' }],
        paths: [{ title: 'Start', body: 'Read the guide' }],
      },
    ]);
  });

  it('fills a branded child and leaves other elements in the child slot', () => {
    const schema = z.object({
      type: z.literal('frame'),
      footer: fromChildren(
        'footer',
        z.object({ brand: z.string() })
      ).optional(),
      body: z.array(z.object({ type: z.string() })).min(1),
    });
    const frame = {
      type: 'frame' as const,
      schema,
      children: (node: { body: PrimitiveNode[] }) =>
        node.body.map((item, index) => ({
          node: item,
          path: `body[${index}]`,
        })),
    };
    const {
      Composition: Root,
      Frame,
      Note,
      toComposition: convert,
    } = buildJsxShim([{ type: 'note' as const }, frame]);

    expect(
      convert(
        createElement(
          Root,
          null,
          createElement(
            Frame,
            null,
            createElement(Note, { body: 'Hello' }),
            createElement(Frame.Footer, { brand: 'Ledger' })
          )
        )
      ).body
    ).toEqual([
      {
        type: 'frame',
        footer: { brand: 'Ledger' },
        body: [{ type: 'note', body: 'Hello' }],
      },
    ]);
    expect(
      convert(
        createElement(
          Root,
          null,
          createElement(Frame, null, createElement(Note, { body: 'Hello' }))
        )
      ).body
    ).toEqual([{ type: 'frame', body: [{ type: 'note', body: 'Hello' }] }]);
  });

  it('rejects an element that matches no branded field or child slot', () => {
    const schema = z.object({
      type: z.literal('closing'),
      links: fromChildren('link', z.array(z.object({ label: z.string() }))),
    });
    const {
      Closing,
      Composition: Root,
      Note,
      toComposition: convert,
    } = buildJsxShim([
      { type: 'note' as const },
      { type: 'closing' as const, schema },
    ]);

    expect(() =>
      convert(
        createElement(
          Root,
          null,
          createElement(Closing, null, createElement(Note, { body: 'Nope' }))
        )
      )
    ).toThrow(expect.objectContaining({ code: 'AUTHOR_TYPE_MISMATCH' }));
  });

  it('rejects a stray element beside a filled branded field', () => {
    const schema = z.object({
      type: z.literal('closing'),
      links: fromChildren('link', z.array(z.object({ label: z.string() }))),
    });
    const {
      Closing,
      Composition: Root,
      Note,
      toComposition: convert,
    } = buildJsxShim([
      { type: 'note' as const },
      { type: 'closing' as const, schema },
    ]);

    expect(() =>
      convert(
        createElement(
          Root,
          null,
          createElement(
            Closing,
            null,
            createElement(Closing.Link, { label: 'Docs' }),
            createElement(Note, { body: 'Nope' })
          )
        )
      )
    ).toThrow(expect.objectContaining({ code: 'UNEXPECTED_CHILDREN' }));
  });

  it('keeps an explicitly empty children list as an empty array', () => {
    const schema = z.object({
      type: z.literal('closing'),
      links: fromChildren('link', z.array(z.object({ label: z.string() }))),
    });
    const {
      Closing,
      Composition: Root,
      toComposition: convert,
    } = buildJsxShim([{ type: 'closing' as const, schema }]);

    expect(
      convert(createElement(Root, null, createElement(Closing, null, []))).body
    ).toEqual([{ type: 'closing', links: [] }]);
  });

  it('fills the one unbranded slot when children() also visits a branded field', () => {
    const node = z.object({ type: z.string() });
    const schema = z.object({
      type: z.literal('frame'),
      lead: fromChildren('lead', node).optional(),
      body: z.array(node),
    });
    const frame = {
      type: 'frame' as const,
      schema,
      children: (value: { lead?: PrimitiveNode; body: PrimitiveNode[] }) => [
        ...(value.lead ? [{ node: value.lead, path: 'lead' }] : []),
        ...value.body.map((item, index) => ({
          node: item,
          path: `body[${index}]`,
        })),
      ],
    };
    const {
      Composition: Root,
      Frame,
      Note,
      toComposition: convert,
    } = buildJsxShim([{ type: 'note' as const }, frame]);

    expectTypeOf<{ children: ReactNode }>().toExtend<
      Parameters<typeof Frame>[0]
    >();
    expect(
      convert(
        createElement(
          Root,
          null,
          createElement(
            Frame,
            null,
            createElement(Frame.Lead, { type: 'note' }),
            createElement(Note, { body: 'Hello' })
          )
        )
      ).body
    ).toEqual([
      {
        type: 'frame',
        lead: { type: 'note' },
        body: [{ type: 'note', body: 'Hello' }],
      },
    ]);
  });

  it('makes only a lone unbranded node field optional on props', () => {
    const node = z.object({ type: z.string() });
    const shim = buildJsxShim([
      {
        type: 'pair' as const,
        schema: z.object({
          type: z.literal('pair'),
          left: node,
          right: node.optional(),
        }),
      },
      {
        type: 'chart' as const,
        schema: z.object({
          type: z.literal('chart'),
          curve: z.object({ type: z.literal('linear') }),
        }),
      },
      {
        type: 'panel' as const,
        schema: z.object({ type: z.literal('panel'), body: z.array(node) }),
      },
    ]);
    expect(shim.Pair).toBeDefined();
    type PairProps = Parameters<typeof shim.Pair>[0];
    type ChartProps = Parameters<typeof shim.Chart>[0];
    type PanelProps = Parameters<typeof shim.Panel>[0];

    expectTypeOf<{ children: ReactNode }>().not.toExtend<PairProps>();
    expectTypeOf<{ children: ReactNode }>().not.toExtend<ChartProps>();
    expectTypeOf<{ children: ReactNode }>().toExtend<PanelProps>();
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

  it('lets two primitives share a member name with different shapes', () => {
    const shim = buildJsxShim([
      brandedGroup(
        fromChildren('item', z.array(z.object({ label: z.string() })))
      ),
      {
        type: 'other' as const,
        schema: z.object({
          type: z.literal('other'),
          items: fromChildren('item', z.array(z.object({ name: z.string() }))),
        }),
      },
    ]);
    const { Composition: Root, Group, Other, toComposition: convert } = shim;
    expectTypeOf<{ label: string }>().toExtend<
      Parameters<typeof Group.Item>[0]
    >();
    expectTypeOf<{ label: string }>().not.toExtend<
      Parameters<typeof Other.Item>[0]
    >();
    expect(
      convert(
        createElement(
          Root,
          null,
          createElement(Group, null, createElement(Group.Item, { label: 'A' })),
          createElement(Other, null, createElement(Other.Item, { name: 'B' }))
        )
      ).body
    ).toEqual([
      { type: 'group', items: [{ label: 'A' }] },
      { type: 'other', items: [{ name: 'B' }] },
    ]);
    expect(() =>
      convert(
        createElement(
          Root,
          null,
          createElement(Group, null, createElement(Other.Item, { name: 'B' }))
        )
      )
    ).toThrow(
      expect.objectContaining({
        code: 'AUTHOR_TYPE_MISMATCH',
        message: 'Expected <Group.Item> but received <Other.Item>.',
      })
    );
  });

  it('throws when two fields in one primitive tree share a member name', () => {
    const entry = z.object({
      label: z.string(),
      items: fromChildren('item', z.array(z.object({ name: z.string() }))),
    });
    expect(() =>
      buildJsxShim([
        {
          type: 'group' as const,
          schema: z.object({
            type: z.literal('group'),
            entries: fromChildren('entry', z.array(entry)),
            items: fromChildren('item', z.array(z.object({ id: z.string() }))),
          }),
        },
      ])
    ).toThrow(
      expect.objectContaining({
        name: 'IsomerError',
        code: 'DUPLICATE_AUTHORED_CHILD',
        message: 'buildJsxShim: "items" and "items" both become <Group.Item>',
      })
    );
  });

  it('throws when one item schema becomes one member with different text', () => {
    const tag = z.object({ name: z.string(), note: z.string().optional() });
    const entry = z.object({
      tags: fromChildren('tag', z.array(tag), { text: 'note' }).optional(),
    });
    expect(() =>
      buildJsxShim([
        {
          type: 'group' as const,
          schema: z.object({
            type: z.literal('group'),
            entries: fromChildren('entry', z.array(entry)),
            tags: fromChildren('tag', z.array(tag), { text: 'name' }),
          }),
        },
      ])
    ).toThrow(
      expect.objectContaining({
        code: 'DUPLICATE_AUTHORED_CHILD',
        message: 'buildJsxShim: "tags" and "tags" both become <Group.Tag>',
      })
    );
  });

  it('throws when a member shares its type with a primitive', () => {
    expect(() =>
      buildJsxShim([
        { type: 'group.Item' },
        brandedGroup(
          fromChildren('item', z.array(z.object({ label: z.string() })))
        ),
      ])
    ).toThrow(
      expect.objectContaining({
        code: 'DUPLICATE_PRIMITIVE_TYPE',
        message:
          'buildJsxShim: the primitive "group.Item" and the member Item of "group" share the type "group.Item"',
      })
    );
  });

  it('throws when members of two primitives share a type', () => {
    const items = (name: string) =>
      fromChildren(name, z.array(z.object({ label: z.string() })));
    expect(() =>
      buildJsxShim([
        brandedGroup(items('sub.Item')),
        { ...brandedGroup(items('item')), type: 'group.Sub' as const },
      ])
    ).toThrow(
      expect.objectContaining({
        code: 'DUPLICATE_PRIMITIVE_TYPE',
        message:
          'buildJsxShim: the member Sub.Item of "group" and the member Item of "group.Sub" share the type "group.Sub.Item"',
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
    ).not.toThrow();
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
              List.ListItem,
              { content: 'Parent' },
              createElement(List.ListItem, { content: 'Child' })
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

describe('nested brands', () => {
  const statsPrimitive = () => {
    const deltaSchema = z.object({
      label: z.string(),
      tone: z.enum(['success', 'danger']),
    });
    const statSchema = z.object({
      label: z.string(),
      value: z.string(),
      delta: fromChildren('delta', deltaSchema, { text: 'label' }).optional(),
    });
    return {
      type: 'stats' as const,
      schema: z.object({
        type: z.literal('stats'),
        stats: fromChildren('stat', z.array(statSchema), { text: 'label' }),
      }),
    };
  };

  it('types a nested child component from its item schema', () => {
    const shim = buildJsxShim([statsPrimitive()]);

    expect(shim.Stats.Delta).toBeDefined();
    type DeltaProps = Parameters<typeof shim.Stats.Delta>[0];
    expectTypeOf(shim.Stats.Delta).not.toBeNever();
    expectTypeOf<{ tone: 'success' }>().toExtend<DeltaProps>();
    expectTypeOf<{ label: string }>().not.toExtend<DeltaProps>();
    expectTypeOf<DeltaProps['children']>().toEqualTypeOf<
      ReactNode | undefined
    >();
    expectTypeOf(shim.Stats.Stat).not.toBeNever();
  });

  it('finds nested components through a wrapped array brand', () => {
    const delta = z.object({ label: z.string() });
    const stat = z.object({
      label: z.string(),
      delta: fromChildren('delta', delta, { text: 'label' }).optional(),
    });
    const shim = buildJsxShim([
      {
        type: 'stats' as const,
        schema: z.object({
          type: z.literal('stats'),
          stats: fromChildren('stat', z.array(stat).optional(), {
            text: 'label',
          }),
        }),
      },
    ]);

    expect(shim.Stats.Delta).toBeDefined();
    expectTypeOf(shim.Stats.Delta).not.toBeNever();
  });

  it('types no nested components under a toItem brand, as it builds none', () => {
    const delta = z.object({ label: z.string() });
    const stat = z.object({
      label: z.string(),
      delta: fromChildren('delta', delta).optional(),
    });
    const shim = buildJsxShim([
      {
        type: 'stats' as const,
        schema: z.object({
          type: z.literal('stats'),
          stats: fromChildren('stat', z.array(stat), {
            toItem(props: { label: string }) {
              return props;
            },
          }),
        }),
      },
    ]);

    expect(shim.Stats.Stat).toBeDefined();
    expect('Delta' in shim.Stats).toBe(false);
    expectTypeOf<
      'Delta' extends keyof typeof shim.Stats ? true : false
    >().toEqualTypeOf<false>();
  });

  it('keeps the toItem brand when options with text are held in a variable', () => {
    const delta = z.object({ label: z.string() });
    const stat = z.object({
      label: z.string(),
      delta: fromChildren('delta', delta).optional(),
    });
    const options = {
      text: 'label' as const,
      toItem(props: { label: string }) {
        return props;
      },
    };
    const shim = buildJsxShim([
      {
        type: 'stats' as const,
        schema: z.object({
          type: z.literal('stats'),
          stats: fromChildren('stat', z.array(stat), options),
        }),
      },
    ]);

    expect('Delta' in shim.Stats).toBe(false);
    expectTypeOf<
      'Delta' extends keyof typeof shim.Stats ? true : false
    >().toEqualTypeOf<false>();
  });

  it('lets a required nested field come from child elements', () => {
    const delta = z.object({ label: z.string(), tone: z.string() });
    const stat = z.object({
      label: z.string(),
      value: z.string(),
      delta: fromChildren('delta', delta, { text: 'label' }),
    });
    const shim = buildJsxShim([
      {
        type: 'stats' as const,
        schema: z.object({
          type: z.literal('stats'),
          stats: fromChildren('stat', z.array(stat), { text: 'label' }),
        }),
      },
    ]);
    type StatProps = Parameters<typeof shim.Stats.Stat>[0];

    expect(shim.Stats.Stat).toBeDefined();
    expectTypeOf<{ value: string }>().toExtend<StatProps>();
    expectTypeOf<{ label: string }>().not.toExtend<StatProps>();
  });

  it('fills a single nested item and its owner text from mixed children', () => {
    const {
      Composition: Root,
      Stats,
      toComposition: convert,
    } = buildJsxShim([statsPrimitive()]);

    expect(
      convert(
        createElement(
          Root,
          null,
          createElement(
            Stats,
            null,
            createElement(
              Stats.Stat,
              { value: '42' },
              'Tests',
              createElement(
                Stats.Delta,
                { tone: 'success' },
                '+12 since yesterday'
              )
            ),
            createElement(Stats.Stat, { value: '3' }, 'Flaky')
          )
        )
      ).body
    ).toEqual([
      {
        type: 'stats',
        stats: [
          {
            label: 'Tests',
            value: '42',
            delta: { label: '+12 since yesterday', tone: 'success' },
          },
          { label: 'Flaky', value: '3' },
        ],
      },
    ]);
  });

  it('throws on a second element for a single-item field', () => {
    const {
      Composition: Root,
      Stats,
      toComposition: convert,
    } = buildJsxShim([statsPrimitive()]);

    expect(() =>
      convert(
        createElement(
          Root,
          null,
          createElement(
            Stats,
            null,
            createElement(
              Stats.Stat,
              { value: '42' },
              'Tests',
              createElement(Stats.Delta, { tone: 'success' }, '+12'),
              createElement(Stats.Delta, { tone: 'danger' }, '-3')
            )
          )
        )
      )
    ).toThrow(
      expect.objectContaining({
        name: 'IsomerError',
        code: 'UNEXPECTED_CHILDREN',
        message: '"delta" takes one <Stats.Delta>, not 2.',
      })
    );
  });

  it('throws on a nested element its item does not claim', () => {
    const {
      Composition: Root,
      OtherStats,
      Stats,
      toComposition: convert,
    } = buildJsxShim([
      statsPrimitive(),
      { ...statsPrimitive(), type: 'otherStats' as const },
    ]);
    const statWith = (props: object, delta: ReactNode) =>
      convert(
        createElement(
          Root,
          null,
          createElement(
            Stats,
            null,
            createElement(Stats.Stat, { value: '42', ...props }, 'Tests', delta)
          )
        )
      );

    expect(() =>
      statWith({}, createElement(OtherStats.Delta, { tone: 'success' }, '+12'))
    ).toThrow(
      expect.objectContaining({
        code: 'UNEXPECTED_CHILDREN',
        message: '<OtherStats.Delta> is not a child of <Stats.Stat>.',
      })
    );
    expect(() =>
      statWith(
        { delta: { label: '+1', tone: 'success' } },
        createElement(Stats.Delta, { tone: 'success' }, '+12')
      )
    ).toThrow(
      expect.objectContaining({
        code: 'UNEXPECTED_CHILDREN',
        message: '<Stats.Stat> already has its <Stats.Delta>.',
      })
    );
  });

  it('fills a top-level single-item field with one item', () => {
    const {
      Composition: Root,
      Callout,
      toComposition: convert,
    } = buildJsxShim([
      {
        type: 'callout' as const,
        schema: z.object({
          type: z.literal('callout'),
          icon: fromChildren('icon', z.object({ name: z.string() })),
        }),
      },
    ]);

    expect(
      convert(
        createElement(
          Root,
          null,
          createElement(
            Callout,
            null,
            createElement(Callout.Icon, { name: 'bell' })
          )
        )
      ).body
    ).toEqual([{ type: 'callout', icon: { name: 'bell' } }]);
  });
});

describe('fromNodeChildren', () => {
  const nodeSchema = z.object({ type: z.string() }).loose();
  const embed = {
    type: 'embed' as const,
    schema: z.object({
      type: z.literal('embed'),
      caption: z.string().optional(),
      body: fromNodeChildren(z.array(nodeSchema)).optional(),
    }),
  };
  const gallery = {
    type: 'gallery' as const,
    schema: z.object({
      type: z.literal('gallery'),
      tiles: fromChildren('tile', z.array(z.object({ label: z.string() })), {
        text: 'label',
      }),
      body: fromNodeChildren(z.array(nodeSchema)),
    }),
  };
  const shim = buildJsxShim([...primitives, embed, gallery] as const);

  it('fills the field from primitive elements, nested in turn', () => {
    const { Composition, Embed, Note, Stack } = shim;
    expect(
      shim.toComposition(
        createElement(
          Composition,
          null,
          createElement(
            Embed,
            { caption: 'Shown' },
            createElement(Stack, null, createElement(Note))
          )
        )
      ).body
    ).toEqual([
      {
        type: 'embed',
        caption: 'Shown',
        body: [{ type: 'stack', items: [{ type: 'note' }] }],
      },
    ]);
  });

  it('takes the elements a branded child field leaves', () => {
    const { Composition, Gallery, Note } = shim;
    expect(
      shim.toComposition(
        createElement(
          Composition,
          null,
          createElement(
            Gallery,
            null,
            createElement(Note),
            createElement(Gallery.Tile, null, 'One')
          )
        )
      ).body
    ).toEqual([
      { type: 'gallery', tiles: [{ label: 'One' }], body: [{ type: 'note' }] },
    ]);
  });

  it('rejects a second element for a single-node field', () => {
    const pinned = buildJsxShim([
      { type: 'note' as const },
      {
        type: 'pin' as const,
        schema: z.object({
          type: z.literal('pin'),
          caption: z.string().optional(),
          node: fromNodeChildren(nodeSchema),
        }),
      },
      {
        type: 'card' as const,
        children: (node: { header: PrimitiveNode }) => [
          { node: node.header, path: 'header' },
        ],
      },
    ] as const);
    const { Card, Composition: View, Note: Leaf, Pin } = pinned;
    const twoNotes = [createElement(Leaf), createElement(Leaf)];

    expect(
      pinned.toComposition(
        createElement(View, null, createElement(Pin, null, createElement(Leaf)))
      ).body
    ).toEqual([{ type: 'pin', node: { type: 'note' } }]);
    for (const [element, field] of [
      [createElement(Pin, null, ...twoNotes), 'node'],
      [createElement(Card, null, ...twoNotes), 'header'],
      [
        createElement(Card, {
          header: createElement(Fragment, null, ...twoNotes),
        }),
        'header',
      ],
    ] as const) {
      expect(() =>
        pinned.toComposition(createElement(View, null, element))
      ).toThrow(
        expect.objectContaining({
          code: 'UNEXPECTED_CHILDREN',
          message: `"${field}" takes one node, not 2.`,
        })
      );
    }
  });

  it('reads as a node field on the spec and leaves the prop optional', () => {
    expect(readAuthoredSpec(embed.schema).nodes).toEqual([
      { field: 'body', array: true },
    ]);
    expectTypeOf<Parameters<typeof shim.Gallery>[0]>()
      .toHaveProperty('body')
      .toEqualTypeOf<{ type: string; [key: string]: unknown }[] | undefined>();
  });
});

describe('readAuthoredSpec', () => {
  it('reads a child field as one item or an array, and its own brands from itemSchema', () => {
    const delta = fromChildren('delta', z.object({ label: z.string() }));
    const stat = z.object({ label: z.string(), delta: delta.optional() });
    const spec = readAuthoredSpec(
      z.object({
        stats: fromChildren('stat', z.array(stat), { text: 'label' }),
        title: fromTextChildren(z.string()).optional(),
      })
    );

    expect(spec.children).toMatchObject([
      { field: 'stats', name: 'stat', array: true, textField: 'label' },
    ]);
    expect(spec.text).toEqual([
      { field: 'title', collapseWhitespace: true, optional: true },
    ]);
    expect(
      readAuthoredSpec(spec.children[0]!.itemSchema).children
    ).toMatchObject([
      { field: 'delta', name: 'delta', array: false, optional: true },
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

  it('reads source with `dedent`, keeping inner indentation and blank lines', () => {
    expect(
      textFromChildren('\n      a {\n        b;\n\n      }\n    ', {
        dedent: true,
      })
    ).toBe('a {\n  b;\n\n}');
  });

  it('fills a dedent-branded field from a template literal', () => {
    const {
      Composition: View,
      Snippet,
      toComposition: parse,
    } = buildJsxShim([
      {
        type: 'snippet' as const,
        schema: z.object({
          type: z.literal('snippet'),
          source: fromTextChildren(z.string(), { dedent: true }),
        }),
      },
    ] as const);
    expect(
      parse(
        createElement(
          View,
          null,
          createElement(Snippet, null, '\n  x\n    y\n')
        )
      ).body
    ).toEqual([{ type: 'snippet', source: 'x\n  y' }]);
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
      toComposition: convert,
    } = buildJsxShim([
      brandedGroup(
        wrap(fromChildren('item', z.array(z.object({ label: z.string() }))))
      ),
    ]);
    expect(Group.Item).toBeDefined();
    const spec = convert(
      createElement(
        Root,
        null,
        createElement(Group, null, createElement(Group.Item, { label: 'A' }))
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
    for (const wrapped of [items().nullable(), items().readonly()]) {
      const {
        Composition: Root,
        Group,
        toComposition: convert,
      } = buildJsxShim([brandedGroup(fromChildren('item', wrapped))]);
      expect(
        convert(
          createElement(
            Root,
            null,
            createElement(
              Group,
              null,
              createElement(Group.Item, { label: 'A' })
            )
          )
        ).body
      ).toEqual([{ type: 'group', items: [{ label: 'A' }] }]);
    }
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
