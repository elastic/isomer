/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, type ZodType } from 'zod';

import type { BodyNodeSurface } from '../composition/body_node_base';
import {
  type DefaultPackTypes,
  definePrimitiveFor,
  unresolvedBodyNodeSchema,
} from '../define/primitive_module';
import { definePrimitivePack } from '../pack/primitive_pack';

const catalog = (type: string, example: object) => ({
  type,
  purpose: type,
  useWhen: [] as string[],
  avoidWhen: [] as string[],
  example,
});

export interface NoteNode {
  type: 'note';
  body: string;
  id?: string;
  surfaces?: BodyNodeSurface[];
}

export interface ChartNode {
  type: 'chart';
  label: string;
  id?: string;
  surfaces?: BodyNodeSurface[];
}

export interface CaptionNode {
  type: 'caption';
  body: string;
  id?: string;
  surfaces?: BodyNodeSurface[];
}

export interface StackNode {
  type: 'stack';
  items: FixtureNode[];
  id?: string;
  surfaces?: BodyNodeSurface[];
}

export interface GroupNode {
  type: 'group';
  items: FixtureNode[];
  id?: string;
  surfaces?: BodyNodeSurface[];
}

export type FixtureNode =
  NoteNode | ChartNode | CaptionNode | StackNode | GroupNode;

/** The fixture pack's types: a one-token palette, everything else the default. */
export interface InkPackTypes extends DefaultPackTypes {
  theme: { ink: string };
}

const definePrimitive = definePrimitiveFor<InkPackTypes>();

const notePrimitive = definePrimitive<NoteNode>({
  type: 'note',
  catalog: catalog('note', { type: 'note', body: 'Hello' }),
  examples: [{ type: 'note', body: 'Hello' }],
  schema: z.object({ type: z.literal('note'), body: z.string() }),
  metrics: { svgHeight: () => 16 },
  renderers: {
    react: (node) => node.body,
    text: (node) => node.body,
    markdown: (node) => node.body,
    slack: (node) => ({
      type: 'section',
      text: { type: 'mrkdwn', text: node.body },
    }),
  },
});

const chartPrimitive = definePrimitive<ChartNode>({
  type: 'chart',
  catalog: catalog('chart', { type: 'chart', label: 'Series' }),
  examples: [{ type: 'chart', label: 'Series' }],
  schema: z.object({ type: z.literal('chart'), label: z.string() }),
  metrics: { svgHeight: () => 64 },
  renderers: {
    react: (node) => node.label,
    text: (node) => node.label,
    markdown: (node) => node.label,
  },
});

const captionPrimitive = definePrimitive<CaptionNode>({
  type: 'caption',
  catalog: catalog('caption', { type: 'caption', body: 'Aside' }),
  examples: [{ type: 'caption', body: 'Aside' }],
  schema: z.object({ type: z.literal('caption'), body: z.string() }),
  renderers: {
    react: (node) => node.body,
    text: (node) => node.body,
    markdown: (node) => node.body,
  },
});

const stackPrimitive = definePrimitive<StackNode>({
  type: 'stack',
  catalog: catalog('stack', {
    type: 'stack',
    items: [{ type: 'note', body: 'Hello' }],
  }),
  examples: [{ type: 'stack', items: [{ type: 'note', body: 'Hello' }] }],
  schema: z.object({
    type: z.literal('stack'),
    items: z.array(unresolvedBodyNodeSchema),
  }),
  schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
    z.object({
      type: z.literal('stack'),
      items: z.array(bodyNodeSchema),
    }),
  children: (node) =>
    node.items.map((item, index) => ({
      node: item,
      path: `items[${index}]`,
    })),
  metrics: { svgHeight: () => 32 },
  renderers: {
    react: (node, { context, scope }) =>
      node.items.map((item) => scope.renderReact(item, context)),
    text: (node, { scope }) =>
      node.items
        .map((item) => scope.renderText(item))
        .filter((text) => text.length > 0)
        .join('\n'),
    markdown: (node, { scope }) =>
      node.items
        .map((item) => scope.renderMarkdown(item))
        .filter((text) => text.length > 0)
        .join('\n\n'),
  },
});

const groupPrimitive = definePrimitive<GroupNode>({
  type: 'group',
  catalog: catalog('group', {
    type: 'group',
    items: [{ type: 'note', body: 'Hello' }],
  }),
  examples: [{ type: 'group', items: [{ type: 'note', body: 'Hello' }] }],
  schema: z.object({
    type: z.literal('group'),
    items: z.array(unresolvedBodyNodeSchema),
  }),
  schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
    z.object({
      type: z.literal('group'),
      items: z.array(bodyNodeSchema),
    }),
  children: (node) =>
    node.items.map((item, index) => ({
      node: item,
      path: `items[${index}]`,
    })),
  metrics: { svgHeight: () => 32 },
  renderers: {
    react: (node, { context, scope }) =>
      node.items.map((item) => scope.renderReact(item, context)),
    text: (node, { scope }) =>
      node.items
        .map((item) => scope.renderText(item))
        .filter((text) => text.length > 0)
        .join('\n'),
    markdown: (node, { scope }) =>
      node.items
        .map((item) => scope.renderMarkdown(item))
        .filter((text) => text.length > 0)
        .join('\n\n'),
    // Recurses like a real container, so a child with no `slack` renderer has
    // to degrade inside this call or not at all.
    slack: (node, { collector, scope }) =>
      node.items.flatMap((item) => [...scope.renderSlack(item, collector)]),
  },
});

export const fixturePack = definePrimitivePack({
  id: 'sdk.fixture',
  surfaces: ['slack'],
  slackAssetTypes: ['chart'],
  primitives: [
    notePrimitive,
    chartPrimitive,
    captionPrimitive,
    stackPrimitive,
    groupPrimitive,
  ],
});

export const fixtureDefinitions = fixturePack.primitives;

// ---------------------------------------------------------------------------
// Conformance subject
// ---------------------------------------------------------------------------

/**
 * `primitiveConformanceCases` asserts a positive `svg` height for every
 * example, so every primitive in its subject must declare `metrics.svgHeight`.
 * `fixturePack` cannot: its `caption` exists precisely to be the gap case
 * other tests need.
 */
export interface TileNode {
  type: 'tile';
  body: string;
  id?: string;
  surfaces?: BodyNodeSurface[];
}

export interface TileGroupNode {
  type: 'tileGroup';
  items: TileNode[];
  id?: string;
  surfaces?: BodyNodeSurface[];
}

const tilePrimitive = definePrimitive<TileNode>({
  type: 'tile',
  catalog: catalog('tile', { type: 'tile', body: 'Tile' }),
  examples: [{ type: 'tile', body: 'Tile' }],
  schema: z.object({ type: z.literal('tile'), body: z.string() }),
  metrics: { svgHeight: () => 24 },
  renderers: {
    react: (node) => node.body,
    text: (node) => node.body,
    markdown: (node) => node.body,
    slack: (node) => ({
      type: 'section',
      text: { type: 'mrkdwn', text: node.body },
    }),
  },
});

const tileGroupPrimitive = definePrimitive<TileGroupNode>({
  type: 'tileGroup',
  catalog: catalog('tileGroup', {
    type: 'tileGroup',
    items: [{ type: 'tile', body: 'Tile' }],
  }),
  examples: [{ type: 'tileGroup', items: [{ type: 'tile', body: 'Tile' }] }],
  schema: z.object({
    type: z.literal('tileGroup'),
    items: z.array(unresolvedBodyNodeSchema),
  }),
  schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
    z.object({
      type: z.literal('tileGroup'),
      items: z.array(bodyNodeSchema),
    }),
  children: (node) =>
    node.items.map((item, index) => ({ node: item, path: `items[${index}]` })),
  metrics: { svgHeight: () => 48 },
  renderers: {
    react: (node, { context, scope }) =>
      node.items.map((item) => scope.renderReact(item, context)),
    text: (node, { scope }) =>
      node.items.map((item) => scope.renderText(item)).join('\n'),
    markdown: (node, { scope }) =>
      node.items.map((item) => scope.renderMarkdown(item)).join('\n\n'),
    slack: (node, { collector, scope }) =>
      node.items.flatMap((item) => [...scope.renderSlack(item, collector)]),
  },
});

export const conformancePack = definePrimitivePack({
  id: 'sdk.conformance',
  surfaces: ['slack'],
  primitives: [tilePrimitive, tileGroupPrimitive],
});

export const conformanceDefinitions = conformancePack.primitives;
