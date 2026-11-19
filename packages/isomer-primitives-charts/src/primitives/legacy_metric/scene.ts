/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SceneBase,
  SceneColor,
  SceneSelection,
  SceneSize,
  SceneSource,
} from '../../scene';
import type { Cell } from '../../schema';
import type { MetricAlignment } from '../metric/scene';

/** One tile of a {@link LegacyMetricScene}: one value of one row, its type sized to fit the chart. */
export interface LegacyMetricTile {
  /** The tile's row, and its breakdown and value columns. */
  readonly source: SceneSource;
  readonly label: string;
  readonly value: {
    readonly text: string;
    readonly raw: Cell;
    readonly color: SceneColor;
  };
  readonly labelColor: SceneColor;
  /** The tile's own background, when it does not fill the chart: its band's color, else the emphasis fill when emphasized. */
  readonly background?: SceneColor;
  /**
   * Lengths in pixels, already shrunk to fit the Scene's `size` as Lens's
   * auto scale shrinks them: the value's and label's font sizes, and the
   * padding around them.
   */
  readonly type: {
    readonly value: number;
    readonly label: number;
    readonly padding: number;
  };
  /** The tile's box at those lengths, from estimated text widths: the width it draws at. */
  readonly box: SceneSize;
  /** What a selection of the tile describes, such as "host.name: web-01 · Count: 12". */
  readonly description: string;
  /** Emphasized: the note, or an empty string for none. */
  readonly emphasis?: string;
  /** The `tile` selection, when the node offers it. */
  readonly selection?: SceneSelection;
}

/** A Scene of large values with labels, as Lens's legacy metric draws them. */
export interface LegacyMetricScene extends SceneBase {
  readonly kind: 'legacyMetric';
  /** In tile order: every row of the first metric column, then of the next. */
  readonly tiles: readonly LegacyMetricTile[];
  readonly labelPosition: 'top' | 'bottom';
  /** How a tile's value and label align with each other. */
  readonly textAlign: MetricAlignment;
  readonly showLabels: boolean;
  /** Line height as a multiple of the font size. */
  readonly lineHeight: number;
  readonly valueWeight: number;
  /** The whole chart's background: a lone tile's band color, else the chrome background. */
  readonly background: SceneColor;
  /** Present when there is nothing to draw: the reason, and the text to draw instead. */
  readonly empty?: { readonly reason: 'noResults'; readonly text: string };
}
