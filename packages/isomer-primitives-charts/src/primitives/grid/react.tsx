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
  layoutWidthOf,
  nodeAnchor,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';

import type { ChartsReactEnv, ChartsRenderContext } from '../../render';
import { cls, isNominalSize, markNominalSize } from '../../render';
import type { SceneSize } from '../../scene';
import { varStyle } from '../../styles';
import { CHARTS_THEME, px } from '../../theme';

import { blocksOf, headerOf, isOneColumn, rowsHeight } from './layout';
import {
  GRID_COLUMNS,
  type GridNode,
  type GridPanel,
  type GridReadingEntry,
} from './schema';
import { gridModule } from './styles';

const { gap, nominalWidth } = CHARTS_THEME.grid;
const { handles: grid, vars } = gridModule;

/** The width this grid is given: a host's or container's `size`, else the width the surface lays the render out in. */
const hostWidth = (context: ChartsRenderContext | undefined) => {
  const size = context?.size;
  if (size) {
    return isNominalSize(size) ? undefined : size.width;
  }
  return layoutWidthOf(context);
};

/** The context a panel's node renders with: the grid's own, with the box its panel leaves, laid out for `nominalWidth` when the host gives no width. */
const childContext = (
  context: ChartsRenderContext | undefined,
  panel: GridPanel,
  oneColumn: boolean
): ChartsRenderContext => {
  const gridWidth =
    context?.size?.width ?? layoutWidthOf(context) ?? nominalWidth;
  const width = oneColumn
    ? gridWidth
    : // CSS floors the tracks at zero when the gaps alone overflow the grid.
      Math.max(0, gridWidth - (GRID_COLUMNS - 1) * gap) *
        (panel.w / GRID_COLUMNS) +
      (panel.w - 1) * gap;
  const height = Math.max(0, rowsHeight(panel.h) - headerOf(panel));
  const size: SceneSize = { width, height };
  if (hostWidth(context) === undefined) {
    markNominalSize(size);
  }
  return context ? contextWith(context, 'size', size) : { size };
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
      className={cls(
        context,
        grid.header,
        maxHeight !== undefined && grid.clipped
      )}
      {...(maxHeight !== undefined && {
        style: varStyle(vars.clip, { maxHeight: px(maxHeight) }),
      })}>
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
    className={cls(context, grid.panel, oneColumn ? grid.stacked : grid.placed)}
    style={varStyle(
      vars.place,
      oneColumn
        ? { height: px(rowsHeight(panel.h)) }
        : {
            column: `${panel.x + 1} / span ${panel.w}`,
            row: `${panel.y + 1} / span ${panel.h}`,
          }
    )}>
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

/** Draws a grid: its header, then each block of panels, sections titled. */
export const react = (node: GridNode, env: ChartsReactEnv): ReactNode => {
  const width = hostWidth(env.context);
  const oneColumn = isOneColumn(width);
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
