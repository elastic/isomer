/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import {
  definePrimitive,
  definePrimitivePack,
  type Frame,
  type PrimitivePack,
  unresolvedBodyNodeSchema,
} from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import { z, type ZodType } from 'zod';

/** A synthetic node: a label, optional string fields, and optional children. */
export interface SyntheticNode {
  type: string;
  label: string;
  items?: SyntheticNode[];
  [field: `field${number}`]: string | undefined;
}

export interface SyntheticPackOptions {
  /** How many primitive types the pack defines. */
  primitives: number;
  /** Optional string fields on each primitive, beyond its label. */
  fieldsPerPrimitive?: number;
}

export const syntheticType = (index: number) => `box${index}`;

const boxPrimitive = (type: string, fields: number) => {
  const fieldShape = Object.fromEntries(
    Array.from({ length: fields }, (_, index) => [
      `field${index}`,
      z.string().optional(),
    ])
  );
  const shapeWith = (item: ZodType<unknown>) =>
    z.object({
      type: z.literal(type),
      label: z.string(),
      items: z.array(item).optional(),
      ...fieldShape,
    });
  const example = { type, label: 'Box' };
  return definePrimitive<SyntheticNode>({
    type,
    catalog: {
      type,
      purpose: `Synthetic primitive ${type}.`,
      useWhen: [],
      avoidWhen: [],
      example,
    },
    examples: [example],
    schema: shapeWith(unresolvedBodyNodeSchema),
    schemaFor: shapeWith,
    children: ({ items = [] }) =>
      items.map((node, index) => ({ node, path: `items[${index}]` })),
    metrics: { snapshotHeight: () => 20 },
    renderers: {
      react: ({ label, items = [] }, { context, scope }) =>
        createElement(
          'div',
          null,
          label,
          ...items.map((item) => scope.renderReact(item, context))
        ),
      text: ({ label, items = [] }, { scope }) =>
        [label, ...items.map((item) => scope.renderText(item))].join('\n'),
      markdown: ({ label, items = [] }, { scope }) => [
        md.paragraph(label),
        ...items.flatMap((item) => scope.renderMarkdownContent(item)),
      ],
      slack: ({ label, items = [] }, { collector, scope }) => [
        { type: 'section', text: { type: 'mrkdwn', text: label } },
        ...items.flatMap((item) => [...scope.renderSlack(item, collector)]),
      ],
    },
  });
};

/**
 * A pack whose renderers do next to nothing, so what it costs to validate and
 * render is the SDK's and runtime's own overhead.
 */
export const createSyntheticPack = ({
  primitives,
  fieldsPerPrimitive = 0,
}: SyntheticPackOptions): PrimitivePack<string> =>
  definePrimitivePack<string>({
    id: 'benchmarks.synthetic',
    surfaces: ['slack'],
    primitives: Array.from({ length: primitives }, (_, index) =>
      boxPrimitive(syntheticType(index), fieldsPerPrimitive)
    ),
  });

/** A frame that sizes the body by its primitives' declared heights. */
export const syntheticFrame: Frame<string> = {
  defaultWidth: 600,
  theme: { light: 'light', dark: 'dark' },
  estimateHeight: ({ body }, dispatcher) =>
    body.reduce(
      (sum, node) => sum + dispatcher.estimateSnapshotHeight(node),
      0
    ),
  wrap: (_header, body, { width, height }) =>
    createElement('div', { style: { width, height } }, body),
};

export interface SyntheticTreeOptions {
  /** How many primitive types the nodes cycle through. */
  types: number;
  /** Total nodes in the tree. */
  nodes: number;
  /** How deep the deepest node nests; 1 is a flat body. */
  depth?: number;
  /** Characters across every label, spread evenly. */
  labelCharacters?: number;
}

/**
 * A view holding exactly `nodes` nodes: one chain `depth` deep, and the rest
 * flat in the body.
 */
export const synthTree = ({
  types,
  nodes,
  depth = 1,
  labelCharacters = nodes * 8,
}: SyntheticTreeOptions): { type: 'view'; body: SyntheticNode[] } => {
  if (depth > nodes) {
    throw new Error(`depth ${depth} needs at least ${depth} nodes`);
  }
  const labelLength = Math.max(1, Math.floor(labelCharacters / nodes));
  let made = 0;
  const node = (): SyntheticNode => {
    const index = made;
    made += 1;
    return {
      type: syntheticType(index % types),
      label: String.fromCharCode(97 + (index % 26)).repeat(labelLength),
    };
  };
  let chain = node();
  for (let level = 1; level < depth; level += 1) {
    chain = { ...node(), items: [chain] };
  }
  const rest = Array.from({ length: nodes - depth }, node);
  return { type: 'view', body: [chain, ...rest] };
};
