/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode, z } from '@elastic/isomer-sdk';
import { type MarkdownContent, md } from '@elastic/isomer-sdk/markdown';
import {
  markdownContentToSlackBlocks,
  type SlackBlock,
  slackContainer,
} from '@elastic/isomer-sdk/slack';

import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { blocksOf, gridSnapshotHeight, shown } from './layout';
import { react } from './react';
import {
  type GridNode,
  gridReadingOrder,
  gridSchemaFor,
  schema,
} from './schema';

export { catalog as gridCatalog } from './catalog';
export { examples as gridExamples } from './examples';
export {
  type GridNode,
  type GridPanel,
  type GridReadingEntry,
  type GridSection,
  GRID_COLUMNS,
  GRID_RULES,
  GRID_SINGLE_COLUMN_BELOW,
  gridReadingOrder,
  schema as gridSchema,
  gridSchemaFor,
} from './schema';

const text = (
  node: GridNode,
  renderText: (node: PrimitiveNode) => string
): string =>
  [
    ...(node.title || node.description
      ? [[node.title, node.description].filter(Boolean).join('\n')]
      : []),
    ...blocksOf(node).flatMap((block) => [
      ...(block.section ? [block.section.title.toUpperCase()] : []),
      ...shown(block).map(({ panel }) =>
        [panel.title, panel.description, renderText(panel.node)]
          .filter((part) => part !== undefined && part !== '')
          .join('\n')
      ),
    ]),
  ]
    .filter((part) => part !== '')
    .join('\n\n');

const markdown = (
  node: GridNode,
  renderMarkdown: (node: PrimitiveNode) => MarkdownContent
): MarkdownContent => [
  ...(node.title ? [md.heading(2, node.title)] : []),
  ...(node.description ? [md.paragraph(node.description)] : []),
  ...blocksOf(node).flatMap((block) => [
    ...(block.section ? [md.heading(3, block.section.title)] : []),
    ...shown(block).flatMap(({ panel }) => [
      ...(panel.title ? [md.heading(4, panel.title)] : []),
      ...(panel.description
        ? [md.paragraph(md.emphasis(panel.description))]
        : []),
      renderMarkdown(panel.node),
    ]),
  ]),
];

const header = (text: string, level: 2 | 4): SlackBlock => ({
  type: 'header',
  level,
  text: { type: 'plain_text', text, emoji: true },
});

// Sections become containers; panel titles are headers inside them, since a
// container nested in another is unwrapped and would lose its title.
const slack = (
  node: GridNode,
  renderSlack: (node: PrimitiveNode) => readonly SlackBlock[]
): SlackBlock[] => [
  ...(node.title ? [header(node.title, 2)] : []),
  ...(node.description
    ? markdownContentToSlackBlocks(md.paragraph(node.description))
    : []),
  ...blocksOf(node).flatMap((block) => {
    const panels = shown(block).flatMap(({ panel }) => [
      ...(panel.title ? [header(panel.title, 4)] : []),
      ...(panel.description
        ? markdownContentToSlackBlocks(
            md.paragraph(md.emphasis(panel.description))
          )
        : []),
      ...renderSlack(panel.node),
    ]);
    return block.section
      ? slackContainer(block.section.title, panels, { fallbackLevel: 3 })
      : panels;
  }),
];

/** Panels on a 48-column grid; one column, in reading order, below the threshold width. */
export const gridPrimitive = definePrimitive<GridNode>({
  type: 'grid',
  catalog,
  icon,
  examples,
  schema,
  schemaFor: (bodyNode: z.ZodType<unknown>) => gridSchemaFor(bodyNode),
  children: (node) =>
    gridReadingOrder(node).map(({ panel, path }) => ({
      node: panel.node,
      path,
    })),
  hasOwnContent: (node) =>
    Boolean(node.title || node.description || node.sections?.length) ||
    node.panels.some(({ title, description }) => title || description),
  metrics: { snapshotHeight: gridSnapshotHeight },
  renderers: {
    react,
    text: (node, { scope }) => text(node, (child) => scope.renderText(child)),
    markdown: (node, { scope }) =>
      markdown(node, (child) => scope.renderMarkdownContent(child)),
    slack: (node, { collector, scope }) =>
      slack(node, (child) => scope.renderSlack(child, collector)),
  },
});
