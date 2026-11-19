/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, Fragment } from 'react';
import {
  type AnyPrimitiveDefinition,
  definePrimitive,
  definePrimitivePack,
  type Frame,
  type PrimitiveNode,
  type PrimitivePack,
  unresolvedBodyNodeSchema,
} from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';
import { z } from 'zod';

import { createIsomerRuntime } from './index';

export interface NoteNode extends PrimitiveNode {
  type: 'note';
  text: string;
}

export const notePrimitive = definePrimitive<NoteNode>({
  type: 'note',
  catalog: {
    type: 'note',
    purpose: 'Render a compact note.',
    useWhen: ['A runtime needs a minimal text node.'],
    avoidWhen: ['The official primitive pack is available.'],
    example: { type: 'note', text: 'Hello' },
  },
  examples: [{ type: 'note', text: 'Hello' }],
  schema: z.object({
    type: z.literal('note'),
    text: z.string().min(1),
  }),
  renderers: {
    react: (node) => createElement('span', null, node.text),
    text: (node) => node.text,
    markdown: (node) => md.paragraph(node.text),
    slack: (node): SlackBlock => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: node.text,
      },
    }),
  },
});

export const view = (text: string) => ({
  type: 'view' as const,
  body: [{ type: 'note' as const, text }],
});

export interface WrapNode extends PrimitiveNode {
  type: 'wrap';
  // Loosely typed on purpose: the point of this fixture is holding *another*
  // pack's node, which this package cannot name.
  items: (PrimitiveNode & Record<string, unknown>)[];
}

/** A container, so tests can nest one pack's node inside another's. */
export const wrapPrimitive = definePrimitive<WrapNode>({
  type: 'wrap',
  catalog: {
    type: 'wrap',
    purpose: 'Group child nodes.',
    useWhen: ['A runtime needs a container for tree-walk fixtures.'],
    avoidWhen: ['The official primitive pack is available.'],
    example: { type: 'wrap', items: [] },
  },
  examples: [{ type: 'wrap', items: [] }],
  schema: z.object({
    type: z.literal('wrap'),
    items: z.array(z.looseObject({ type: z.string() })),
  }),
  children: (node) =>
    node.items.map((item, index) => ({
      node: item,
      path: `items[${index}]`,
    })),
  renderers: {
    react: (node, { context, scope }) =>
      createElement(
        'div',
        null,
        node.items.map((item, index) =>
          createElement(
            Fragment,
            { key: index },
            scope.renderReact(item, context)
          )
        )
      ),
    text: (node, { scope }) =>
      node.items.map((item) => scope.renderText(item)).join(','),
    markdown: (node) => md.paragraph(`wrap(${node.items.length})`),
  },
});

export interface HolderNode extends PrimitiveNode {
  type: 'holder';
  child: PrimitiveNode;
}

/** A `schemaFor` container, so authoring projection can name the composed member. */
export const holderPrimitive = definePrimitive<HolderNode>({
  type: 'holder',
  catalog: {
    type: 'holder',
    purpose: 'Nest a child node.',
    useWhen: ['A runtime needs a recursive container for schema fixtures.'],
    avoidWhen: ['The official primitive pack is available.'],
    example: { type: 'holder', child: { type: 'note', text: 'Hello' } },
  },
  examples: [],
  schema: z.object({
    type: z.literal('holder'),
    child: unresolvedBodyNodeSchema,
  }),
  schemaFor: (bodyNodeSchema) =>
    z.object({ type: z.literal('holder'), child: bodyNodeSchema }),
  children: (node) => [{ node: node.child, path: 'child' }],
  renderers: {
    react: () => createElement('div'),
    text: () => 'holder',
    markdown: () => md.paragraph('holder'),
  },
});

export interface BoldNode extends PrimitiveNode {
  type: 'bold';
  text: string;
}

export const boldPrimitive = definePrimitive<BoldNode>({
  type: 'bold',
  catalog: {
    type: 'bold',
    purpose: 'Render bold text.',
    useWhen: ['A runtime needs a second minimal text node for fixtures.'],
    avoidWhen: ['The official primitive pack is available.'],
    example: { type: 'bold', text: 'Hello' },
  },
  examples: [{ type: 'bold', text: 'Hello' }],
  schema: z.object({
    type: z.literal('bold'),
    text: z.string().min(1),
  }),
  renderers: {
    react: (node) => createElement('strong', null, node.text),
    text: (node) => node.text,
    markdown: (node) => md.paragraph(node.text),
  },
});

export interface PlainNode extends PrimitiveNode {
  type: 'plain';
  text: string;
}

// A primitive from a pack that does not target images: no `snapshot` renderer.
export const plainPrimitive = definePrimitive<PlainNode>({
  type: 'plain',
  catalog: {
    type: 'plain',
    purpose: 'Render text on the non-image surfaces only.',
    useWhen: ['A pack does not target SVG or PNG output.'],
    avoidWhen: ['The view must be rasterizable.'],
    example: { type: 'plain', text: 'Hello' },
  },
  examples: [{ type: 'plain', text: 'Hello' }],
  schema: z.object({
    type: z.literal('plain'),
    text: z.string().min(1),
  }),
  renderers: {
    react: (node) => createElement('span', null, node.text),
    text: (node) => node.text,
    markdown: (node) => md.paragraph(node.text),
  },
});

// Stands in for a host's frame: records the viewport it was handed so the
// tests can assert what the surface resolved.
export const testFrame: Frame<string> = {
  defaultWidth: 600,
  theme: { light: 'light-theme', dark: 'dark-theme' },
  // 40 per node plus whatever the primitive's own metrics report (`note` has
  // none, so it contributes 0).
  estimateHeight: (spec, dispatcher) =>
    spec.body.reduce(
      (sum, node) => sum + dispatcher.estimateSnapshotHeight(node) + 40,
      0
    ),
  wrap: (_spec, body, viewport) =>
    createElement(
      'svg',
      {
        width: viewport.width,
        height: viewport.height,
        theme: viewport.theme,
      },
      body
    ),
};

/** A pack declaring no optional surfaces and requiring nothing of a runtime's theme. */
export const packOf = (
  ...primitives: readonly AnyPrimitiveDefinition[]
): PrimitivePack<unknown> =>
  definePrimitivePack({
    id: 'test',
    surfaces: [],
    primitives,
  });

/** A pack whose primitives all draw on the snapshot surface, needing the `string` palette {@link testFrame} supplies. */
export const snapshotPackOf = (
  ...primitives: readonly AnyPrimitiveDefinition[]
): PrimitivePack<string> =>
  definePrimitivePack<string>({
    id: 'test.drawing',
    primitives,
  });

/** Stands in for the slide frame: a fixed frame that never measures a node. */
export const fixedFrame: Frame<string> = {
  ...testFrame,
  estimateHeight: () => 1080,
};

/**
 * A runtime that draws, since only a frame gives it a `snapshot` surface.
 *
 * Return type inferred rather than written as
 * `ReturnType<typeof createIsomerRuntime>`: that instantiates the type
 * parameters at their constraints, so `TTheme` lands on `unknown` — "supply
 * nothing" — which no frame-bearing runtime satisfies.
 */
export const drawingRuntime = (
  ...primitives: readonly AnyPrimitiveDefinition[]
) =>
  createIsomerRuntime({
    packs: [snapshotPackOf(...primitives)],
    frames: { card: testFrame },
  });

export const primitiveNamed = (type: string) =>
  definePrimitive({
    type,
    catalog: {
      type,
      purpose: 'Order fixture.',
      useWhen: [],
      avoidWhen: [],
      example: { type, text: type },
    },
    examples: [{ type, text: type }],
    schema: z.object({
      type: z.string(),
      text: z.string(),
    }),
    renderers: {
      react: () => null,
      text: () => type,
      markdown: () => md.paragraph(type),
    },
  });
