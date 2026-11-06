/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { nodeAnchor, type PrimitiveNode, type z } from '@elastic/isomer-sdk';
import { type MarkdownContent, md } from '@elastic/isomer-sdk/markdown';
import { type SlackBlock, slackContainer } from '@elastic/isomer-sdk/slack';

import { gridCatalog } from '../schema/catalog';
import { gridExamples } from '../schema/examples/grid';
import {
  GRID_COLUMNS,
  GRID_SINGLE_COLUMN_BELOW,
  type GridNode,
  type GridPanel,
  type GridReadingEntry,
  gridReadingOrder,
  gridSchema,
  gridSchemaFor,
  type GridSection,
} from '../schema/grid';

import type { ChartsReactEnv, ChartsRenderContext } from './context';
import { definePrimitive } from './define';
import { gridIcon } from './icons';
import { CHARTS_THEME } from './theme';

const { rowHeight, gap, sectionGap, headerHeight } = CHARTS_THEME.grid;

const rowsHeight = (rows: number) =>
  rows === 0 ? 0 : rows * rowHeight + (rows - 1) * gap;

const extent = (panels: readonly GridPanel[]) =>
  Math.max(0, ...panels.map(({ y, h }) => y + h));

interface Block {
  /** Absent for the top-level panels. */
  readonly section?: GridSection;
  readonly entries: readonly GridReadingEntry[];
}

/** Top-level panels, then each section by `y`, each in reading order. */
const blocksOf = (node: GridNode): Block[] => {
  const entries = gridReadingOrder(node);
  const sections = (node.sections ?? [])
    .map((section, index) => ({ section, index }))
    .sort((a, b) => a.section.y - b.section.y || a.index - b.index)
    .map(({ section }) => ({
      section,
      entries: entries.filter((entry) => entry.section === section),
    }));
  return [
    { entries: entries.filter((entry) => entry.section === undefined) },
    ...sections,
  ];
};

const shown = ({ section, entries }: Block) =>
  section?.collapsed ? [] : entries;

/**
 * The box a panel's node draws in. Without a width from the host, the grid
 * assumes its nominal width, so a chart still resolves for its panel's height.
 */
const childContext = (
  context: ChartsRenderContext | undefined,
  panel: GridPanel,
  oneColumn: boolean
): ChartsRenderContext => {
  const { size, ...rest } = context ?? {};
  const gridWidth = size?.width ?? CHARTS_THEME.grid.nominalWidth;
  const width = oneColumn
    ? gridWidth
    : (gridWidth - (GRID_COLUMNS - 1) * gap) * (panel.w / GRID_COLUMNS) +
      (panel.w - 1) * gap;
  const height = rowsHeight(panel.h) - (panel.title ? headerHeight : 0);
  return { ...rest, size: { width, height } };
};

const Heading = ({
  level,
  title,
  children,
}: {
  level: 2 | 3;
  title?: string | undefined;
  children: ReactNode;
}) => {
  const Tag = level === 2 ? 'h2' : 'h3';
  return (
    <Tag
      title={title}
      style={{
        margin: 0,
        height: headerHeight,
        fontSize: CHARTS_THEME.type.title,
      }}>
      {children}
    </Tag>
  );
};

const Panel = ({
  entry: { panel },
  env: { context, scope },
  oneColumn,
}: {
  entry: GridReadingEntry;
  env: ChartsReactEnv;
  oneColumn: boolean;
}) => (
  <section
    aria-label={panel.title}
    style={{
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      ...(oneColumn
        ? { height: rowsHeight(panel.h) }
        : {
            gridColumn: `${panel.x + 1} / span ${panel.w}`,
            gridRow: `${panel.y + 1} / span ${panel.h}`,
          }),
    }}>
    {panel.title && (
      <h4
        title={panel.description}
        style={{
          margin: 0,
          height: headerHeight,
          fontSize: CHARTS_THEME.type.title,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}>
        {panel.title}
      </h4>
    )}
    <div style={{ flex: 1, minHeight: 0 }}>
      {scope.renderReact(panel.node, childContext(context, panel, oneColumn))}
    </div>
  </section>
);

const Panels = ({
  entries,
  env,
  oneColumn,
}: {
  entries: readonly GridReadingEntry[];
  env: ChartsReactEnv;
  oneColumn: boolean;
}) => (
  <div
    style={
      oneColumn
        ? { display: 'flex', flexDirection: 'column', gap }
        : {
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
            gridAutoRows: rowHeight,
            gap,
          }
    }>
    {entries.map((entry) => (
      <Panel key={entry.path} entry={entry} env={env} oneColumn={oneColumn} />
    ))}
  </div>
);

const renderGrid = (node: GridNode, env: ChartsReactEnv): ReactNode => {
  const width = env.context?.size?.width;
  const oneColumn = width !== undefined && width < GRID_SINGLE_COLUMN_BELOW;
  return (
    <div
      {...nodeAnchor(env.context, node)}
      style={{ display: 'flex', flexDirection: 'column', gap: sectionGap }}>
      {node.title && (
        <Heading level={2} title={node.description}>
          {node.title}
        </Heading>
      )}
      {blocksOf(node).map((block, index) =>
        block.section ? (
          <section key={index} aria-label={block.section.title}>
            <Heading level={3}>{block.section.title}</Heading>
            {!block.section.collapsed && (
              <div style={{ height: sectionGap / 2 }} />
            )}
            {!block.section.collapsed && (
              <Panels entries={block.entries} env={env} oneColumn={oneColumn} />
            )}
          </section>
        ) : (
          block.entries.length > 0 && (
            <Panels
              key={index}
              entries={block.entries}
              env={env}
              oneColumn={oneColumn}
            />
          )
        )
      )}
    </div>
  );
};

const gridText = (
  node: GridNode,
  renderText: (node: PrimitiveNode) => string
): string =>
  [
    ...(node.title
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
  ].join('\n\n');

const gridMarkdown = (
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
const gridSlack = (
  node: GridNode,
  renderSlack: (node: PrimitiveNode) => readonly SlackBlock[]
): SlackBlock[] => [
  ...(node.title ? [header(node.title, 2)] : []),
  ...blocksOf(node).flatMap((block) => {
    const panels = shown(block).flatMap(({ panel }) => [
      ...(panel.title ? [header(panel.title, 4)] : []),
      ...renderSlack(panel.node),
    ]);
    return block.section
      ? slackContainer(block.section.title, panels, { fallbackLevel: 3 })
      : panels;
  }),
];

/** The `snapshot` height of a grid laid out at full width. */
export const gridSnapshotHeight = (node: GridNode): number =>
  [
    ...(node.title ? [headerHeight] : []),
    ...blocksOf(node).map(({ section, entries }) => {
      const panels = rowsHeight(extent(entries.map(({ panel }) => panel)));
      if (!section) {
        return panels;
      }
      return headerHeight + (section.collapsed ? 0 : sectionGap / 2 + panels);
    }),
  ]
    .filter((height) => height > 0)
    .reduce(
      (total, height, index) => total + height + (index > 0 ? sectionGap : 0),
      0
    );

/** Panels on a 48-column grid; one column, in reading order, below the threshold width. */
export const gridPrimitive = definePrimitive<GridNode>({
  type: 'grid',
  icon: gridIcon,
  schema: gridSchema,
  schemaFor: (bodyNode: z.ZodType<unknown>) => gridSchemaFor(bodyNode),
  catalog: gridCatalog,
  examples: gridExamples,
  children: (node) =>
    gridReadingOrder(node).map(({ panel, path }) => ({
      node: panel.node,
      path,
    })),
  metrics: { snapshotHeight: gridSnapshotHeight },
  renderers: {
    react: (node, env) => renderGrid(node, env),
    text: (node, { scope }) =>
      gridText(node, (child) => scope.renderText(child)),
    markdown: (node, { scope }) =>
      gridMarkdown(node, (child) => scope.renderMarkdownContent(child)),
    slack: (node, { collector, scope }) =>
      gridSlack(node, (child) => scope.renderSlack(child, collector)),
  },
});
