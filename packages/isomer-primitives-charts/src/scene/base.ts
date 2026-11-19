/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Cell, ColumnRole, ColumnType } from '../schema/data';
import type { SelectTarget } from '../schema/events';

/** The chart kinds a Scene describes. A renderer declares which it supports. */
export const SCENE_KINDS = [
  'metric',
  'xy',
  'table',
  'partition',
  'heatmap',
  'gauge',
  'tagCloud',
  'legacyMetric',
] as const;

/** One of {@link SCENE_KINDS}. */
export type SceneKind = (typeof SCENE_KINDS)[number];

/** The color scheme a Scene is resolved for. */
export type ColorScheme = 'light' | 'dark';

/** A concrete color for the Scene's scheme: `#rrggbb` or `#rrggbbaa`. */
export type SceneColor = string;

/**
 * The cells of the node's `data` a mark represents: row indexes into
 * `data.rows` and column ids. A renderer maps a gesture to an event through
 * this, never through its own indexes. Helper marks (reference lines,
 * annotations, progress bars, trend lines) carry none.
 */
export interface SceneSource {
  readonly rows: readonly number[];
  readonly columns: readonly string[];
}

interface SceneSelectionBase {
  readonly rows: readonly number[];
  readonly columns: readonly string[];
  readonly values: Readonly<Record<string, Cell>>;
  readonly description: string;
}

/**
 * What selecting a part of the chart raises, decided by the resolver: the
 * `select` event without the node id and `negate`. `columns` are the dimension
 * columns that identify the target, and `values` their raw cells, which every
 * row in `rows` shares. Present only where the node offers `target`.
 */
export type SceneSelection =
  | (SceneSelectionBase & {
      readonly target: 'datum';
      readonly series: { readonly layer: number; readonly y: number };
      readonly seriesKey: string;
    })
  | (SceneSelectionBase & {
      readonly target: 'series';
      readonly series: { readonly layer: number; readonly y: number };
      readonly seriesKey: string;
    })
  | (SceneSelectionBase & {
      readonly target: 'legend';
      readonly series: { readonly layer: number; readonly y: number };
      readonly seriesKey: string;
    })
  | (SceneSelectionBase & {
      readonly target: Exclude<SelectTarget, 'datum' | 'series' | 'legend'>;
    });

/** One labelled value in a tooltip, already formatted. */
export interface SceneTooltipEntry {
  readonly label: string;
  readonly value: string;
  readonly color?: SceneColor;
}

/** A tooltip's header and entries, already formatted. */
export interface SceneTooltip {
  readonly header?: string;
  readonly entries: readonly SceneTooltipEntry[];
}

/** Chrome colors for the Scene's scheme, resolved from `{ token }` colors and the chart theme. */
export interface SceneChrome {
  readonly text: SceneColor;
  readonly textSubdued: SceneColor;
  readonly axis: SceneColor;
  readonly gridLine: SceneColor;
  readonly background: SceneColor;
  readonly border: SceneColor;
}

/** One column of {@link SceneTable}, labelled for display. */
export interface SceneColumn {
  readonly id: string;
  readonly label: string;
  readonly type: ColumnType;
  readonly role: ColumnRole;
  /** Every cell is null or empty. A renderer may hide the column. */
  readonly empty: boolean;
}

/**
 * The node's data as text, for accessible tables and the text, Markdown and
 * Slack surfaces. Cells are formatted; an empty cell carries the empty-value
 * text. Rows keep `data` order, and are formatted on first read, from the
 * node's data as it is then.
 */
export interface SceneTable {
  readonly columns: readonly SceneColumn[];
  readonly rows: readonly {
    /** The row's index in `data.rows`. */
    readonly row: number;
    readonly cells: readonly string[];
    /** Raw node data in matching column order, for constructing chart events without parsing display text. */
    readonly values: readonly Cell[];
  }[];
  /** A summary row below the rows, one string per column, where the chart has one. */
  readonly footer?: readonly string[];
}

/** A box in CSS pixels. */
export interface SceneSize {
  readonly width: number;
  readonly height: number;
}

/** What the node offers, resolved. A renderer offers nothing when the host passes no `onEvent`. */
export interface SceneInteractions {
  /** Empty when nothing is selectable. */
  readonly select: readonly SelectTarget[];
  /** The continuous column a range can be brushed along. */
  readonly brush?: { readonly column: string };
  readonly sync: { readonly cursor: boolean; readonly tooltips: boolean };
  /** Drawn on every surface, including images and text. */
  readonly link?: { readonly href: string; readonly label: string };
  /** Static highlights, by row. */
  readonly emphasis: readonly {
    readonly rows: readonly number[];
    readonly note?: string;
  }[];
}

export interface SceneBase {
  readonly kind: SceneKind;
  /** The scheme every color in the Scene is for. Always explicit, so a renderer draws every color without CSS. */
  readonly scheme: ColorScheme;
  /** The size the host draws the Scene at. Absent when resolved without one. */
  readonly size?: SceneSize;
  readonly locale: string;
  readonly timeZone: string;
  readonly title?: string;
  readonly description?: string;
  readonly chrome: SceneChrome;
  /** One sentence that states what the chart shows, for screen readers and text surfaces. */
  readonly summary: string;
  readonly table: SceneTable;
  readonly interactions: SceneInteractions;
}
