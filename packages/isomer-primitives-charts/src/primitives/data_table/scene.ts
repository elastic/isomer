/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SceneBase,
  SceneColor,
  SceneColumn,
  SceneSelection,
  SceneSource,
} from '../../scene/base';

/** How a table column aligns its cells. */
export type TableAlignment = 'left' | 'center' | 'right';

/** One column of a {@link TableScene}, with its alignment, width and footer. */
export interface TableColumn extends SceneColumn {
  readonly alignment: TableAlignment;
  /** Width in pixels, where the node sets one. */
  readonly width?: number;
  /** The `summary` footer, formatted, such as "Sum: 1,204". */
  readonly footer?: string;
}

/** How one cell is drawn. Colors are concrete for the Scene's scheme. */
export interface TableCell {
  /** The cell's row and column. */
  readonly source: SceneSource;
  /** As Kibana's table shows it: `-` for a missing value, `(blank)` for an empty string. */
  readonly text: string;
  /** Why a cell is empty. Empty cells are drawn subdued and never decorated. */
  readonly empty?: 'missing' | 'blank';
  /** What an empty cell's text stands for, such as `(null)`, for a tooltip or a screen reader. */
  readonly title?: string;
  readonly color: SceneColor;
  /** The whole cell's fill. */
  readonly background?: SceneColor;
  /** A badge around the text: its fill. `color` is the text on it. */
  readonly badge?: SceneColor;
  /**
   * A bar beside the text, as fractions of the bar's track: the fill runs from
   * `from` to `to`, `0 ≤ from ≤ to ≤ 1`.
   */
  readonly bar?: {
    readonly from: number;
    readonly to: number;
    readonly color: SceneColor;
    readonly track: SceneColor;
  };
  readonly description: string;
  /** The `cell` selection, on `dimension` cells when the node offers it. */
  readonly selection?: SceneSelection;
}

/** One row of a {@link TableScene}: its cells, in column order. */
export interface TableRow {
  /** The row's index in `data.rows`. */
  readonly row: number;
  /** One per column in `columns`, in that order. */
  readonly cells: readonly TableCell[];
  /** Emphasized: the note, or an empty string for none. */
  readonly emphasis?: string;
}

/** Positions into `rows`, in the order a sort shows them. */
export interface TableOrder {
  readonly asc: readonly number[];
  readonly desc: readonly number[];
}

/** A Scene of a data table: columns, rows and their sorted orders. */
export interface TableScene extends SceneBase {
  readonly kind: 'table';
  /** The columns shown, in order. */
  readonly columns: readonly TableColumn[];
  /** The column whose cells head their rows: the first `dimension` shown. */
  readonly rowHeader?: string;
  /** In `data` order. */
  readonly rows: readonly TableRow[];
  /** The sort the table starts in. */
  readonly sort?: {
    readonly column: string;
    readonly direction: 'asc' | 'desc';
  };
  /** Positions into `rows` in the order they show at first: `sort`'s, else `data` order. */
  readonly order: readonly number[];
  /** Each column's sorted orders, by column id, so a renderer can re-sort without comparing values. */
  readonly orders: Readonly<Record<string, TableOrder>>;
  /** Present when rows are paged. */
  readonly paging?: {
    readonly pageSize: number;
    readonly pageCount: number;
    /** Such as "Rows per page: 10". */
    readonly rowsPerPage: string;
    /** The pager's entries on the first page: at most the first, a run of pages and the last. An entry with no `page` is the gap between them. */
    readonly pages: readonly {
      readonly label: string;
      /** Zero-based. */
      readonly page?: number;
    }[];
  };
  readonly density: 'compact' | 'default' | 'expanded';
  /** Drawn in place of the rows when there are none. */
  readonly emptyText: string;
  /** Header and footer fill. */
  readonly headerBackground: SceneColor;
  /** The fill of an emphasized row. */
  readonly emphasisBackground: SceneColor;
}
