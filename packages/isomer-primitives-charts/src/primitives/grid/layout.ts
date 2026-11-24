/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CHARTS_THEME } from '../../theme';

import {
  GRID_SINGLE_COLUMN_BELOW,
  type GridNode,
  type GridPanel,
  type GridReadingEntry,
  gridReadingOrder,
  type GridSection,
} from './schema';

/**
 * The lengths a grid draws with, in pixels: a panel `h` rows tall is
 * `h * rowHeight + (h - 1) * gap`, less `headerHeight` under a title.
 */
export const GRID_GEOMETRY = CHARTS_THEME.grid;

const { rowHeight, gap, sectionGap, headerHeight, descriptionHeight } =
  GRID_GEOMETRY;

/** The height `rows` grid rows take, with the gaps between them. */
export const rowsHeight = (rows: number) =>
  rows === 0 ? 0 : rows * rowHeight + (rows - 1) * gap;

const extent = (panels: readonly GridPanel[]) =>
  panels.reduce((rows, { y, h }) => Math.max(rows, y + h), 0);

export interface Block {
  /** Absent for the top-level panels. */
  readonly section?: GridSection;
  readonly entries: readonly GridReadingEntry[];
}

/** Top-level panels, then each section by `y`, each in reading order. */
export const blocksOf = (node: GridNode): Block[] => {
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
export const headerOf = ({
  title,
  description,
}: {
  readonly title?: string | undefined;
  readonly description?: string | undefined;
}) => (title ? headerHeight : 0) + (description ? descriptionHeight : 0);

/** The entries a block draws: none while its section is collapsed. */
export const shown = ({ section, entries }: Block) =>
  section?.collapsed ? [] : entries;

/** Whether a grid `width` wide draws its panels in one column; a grid told no width keeps its columns. */
export const isOneColumn = (width: number | undefined): boolean =>
  width !== undefined && width < GRID_SINGLE_COLUMN_BELOW;

/** The height of panels on the grid's rows, or stacked in one column, each as tall as its rows. */
const panelsHeight = (
  panels: readonly GridPanel[],
  oneColumn: boolean
): number =>
  oneColumn
    ? panels.reduce(
        (total, { h }, index) => total + rowsHeight(h) + (index > 0 ? gap : 0),
        0
      )
    : rowsHeight(extent(panels));

/** The `snapshot` height of a grid laid out `width` wide, or on its columns when told no width. */
export const gridSnapshotHeight = (
  node: GridNode,
  { width }: { readonly width?: number } = {}
): number =>
  [
    headerOf(node),
    ...blocksOf(node).map(({ section, entries }) => {
      const panels = panelsHeight(
        entries.map(({ panel }) => panel),
        isOneColumn(width)
      );
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
