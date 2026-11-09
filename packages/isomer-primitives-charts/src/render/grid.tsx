/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import {
  contextWith,
  createChildNodeWalker,
  isVisibleOnSurface,
  nodeAnchor,
  type PrimitiveNode,
  type z,
} from '@elastic/isomer-sdk';
import { type MarkdownContent, md } from '@elastic/isomer-sdk/markdown';

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
import { gridModule } from './grid_styles';
import { cls } from './styles';
import { CHARTS_THEME } from './theme';

const { rowHeight, gap, sectionGap, headerHeight, descriptionHeight } =
  CHARTS_THEME.grid;
const { handles: grid } = gridModule;

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

/** The height a title and description take. */
const headerOf = ({
  title,
  description,
}: {
  readonly title?: string | undefined;
  readonly description?: string | undefined;
}) => (title ? headerHeight : 0) + (description ? descriptionHeight : 0);

const shown = ({ section, entries }: Block) =>
  section?.collapsed ? [] : entries;

/** The context a panel's node renders with: the grid's own, with the panel's box when the grid knows its width. */
const childContext = (
  context: ChartsRenderContext | undefined,
  panel: GridPanel,
  oneColumn: boolean
): ChartsRenderContext | undefined => {
  const size = context?.size;
  if (!context || !size) {
    return context;
  }
  const width = oneColumn
    ? size.width
    : (size.width - (GRID_COLUMNS - 1) * gap) * (panel.w / GRID_COLUMNS) +
      (panel.w - 1) * gap;
  const height = Math.max(0, rowsHeight(panel.h) - headerOf(panel));
  return contextWith(context, 'size', { width, height });
};

type Context = ChartsReactEnv['context'];

const Heading = ({
  level,
  context,
  children,
}: {
  level: 2 | 3 | 4;
  context: Context;
  children: ReactNode;
}) => {
  const Tag = `h${level}` as const;
  return <Tag className={cls(context, grid.heading)}>{children}</Tag>;
};

const Description = ({
  context,
  children,
}: {
  context: Context;
  children: string;
}) => (
  <p title={children} className={cls(context, grid.description)}>
    {children}
  </p>
);

const Header = ({
  level,
  context,
  title,
  description,
  maxHeight,
}: {
  level: 2 | 4;
  context: Context;
  title?: string | undefined;
  description?: string | undefined;
  /** The panel's height, which the header is clipped to. */
  maxHeight?: number;
}) =>
  title || description ? (
    <header
      className={cls(context, grid.header)}
      {...(maxHeight !== undefined && { style: { maxHeight } })}>
      {title && <Heading {...{ level, context }}>{title}</Heading>}
      {description && <Description {...{ context }}>{description}</Description>}
    </header>
  ) : null;

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
    className={cls(context, grid.panel)}
    style={
      oneColumn
        ? { height: rowsHeight(panel.h) }
        : {
            gridColumn: `${panel.x + 1} / span ${panel.w}`,
            gridRow: `${panel.y + 1} / span ${panel.h}`,
          }
    }>
    <Header
      level={4}
      context={context}
      title={panel.title}
      description={panel.description}
      maxHeight={rowsHeight(panel.h)}
    />
    <div className={cls(context, grid.body)}>
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
  <div className={cls(env.context, oneColumn ? grid.column : grid.panels)}>
    {entries.map((entry) => (
      <Panel key={entry.path} entry={entry} env={env} oneColumn={oneColumn} />
    ))}
  </div>
);

// A collapsed section draws none of its panels, but keeps the anchor of every
// node a render would have drawn, in walk order, so anchors still pair with
// the nodes `children` reaches.
const CollapsedAnchors = ({
  entries,
  env: { context, scope },
}: {
  entries: readonly GridReadingEntry[];
  env: ChartsReactEnv;
}) => {
  const walk = createChildNodeWalker(scope.definitions);
  const anchored = (node: unknown): PrimitiveNode[] =>
    isVisibleOnSurface(node, 'react')
      ? [
          node as PrimitiveNode,
          ...walk(node).flatMap((child) => anchored(child.node)),
        ]
      : [];
  return entries
    .flatMap(({ panel }) => anchored(panel.node))
    .map((node, index) => (
      <div
        key={index}
        hidden
        className={cls(context, grid.collapsed)}
        {...nodeAnchor(context, node)}
      />
    ));
};

const renderGrid = (node: GridNode, env: ChartsReactEnv): ReactNode => {
  const width = env.context?.size?.width;
  const oneColumn = width !== undefined && width < GRID_SINGLE_COLUMN_BELOW;
  return (
    <div
      {...nodeAnchor(env.context, node)}
      className={cls(env.context, grid.root)}>
      <Header
        level={2}
        context={env.context}
        title={node.title}
        description={node.description}
      />
      {blocksOf(node).map((block, index) =>
        block.section ? (
          <section key={index} aria-label={block.section.title}>
            <Heading level={3} context={env.context}>
              {block.section.title}
            </Heading>
            {block.section.collapsed ? (
              <CollapsedAnchors entries={block.entries} env={env} />
            ) : (
              <>
                <div className={cls(env.context, grid.sectionGap)} />
                <Panels
                  entries={block.entries}
                  env={env}
                  oneColumn={oneColumn}
                />
              </>
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

/** The `snapshot` height of a grid laid out at full width. */
export const gridSnapshotHeight = (node: GridNode): number =>
  [
    headerOf(node),
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
  schema: gridSchema,
  schemaFor: (bodyNode: z.ZodType<unknown>) => gridSchemaFor(bodyNode),
  catalog: gridCatalog,
  examples: gridExamples,
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
    react: (node, env) => renderGrid(node, env),
    text: (node, { scope }) =>
      gridText(node, (child) => scope.renderText(child)),
    markdown: (node, { scope }) =>
      gridMarkdown(node, (child) => scope.renderMarkdownContent(child)),
  },
});
