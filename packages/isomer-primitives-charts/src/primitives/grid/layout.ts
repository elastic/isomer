/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CHARTS_THEME } from '../../theme';

import {
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
