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
  SceneSource,
  SceneTooltip,
} from '../../scene/base';

/** The shapes a {@link PartitionScene} draws. */
export type PartitionSceneShape =
  'pie' | 'donut' | 'treemap' | 'mosaic' | 'waffle';

/** One slice of a {@link PartitionScene}, with its children in draw order. */
export interface PartitionNode {
  /**
   * Unique in the Scene: the key parts of the slice's path, outermost first,
   * joined by `:`. A metric slice's part is its column id.
   */
  readonly key: string;
  /** The slice's name: its group cell as displayed, or its metric's label. */
  readonly label: string;
  /** 1 for the outermost layer. */
  readonly depth: number;
  /** The metric column a slice of the metric layer stands for. */
  readonly metric?: string;
  /** The sum of its leaves' values, in the order an engine sums them: depth first, in draw order. */
  readonly value: number;
  /** `value` as displayed. */
  readonly valueText: string;
  /** `value`'s share of the whole, from 0 to 1. */
  readonly share: number;
  /** `share` as a percentage, such as "40.25%". */
  readonly percentText: string;
  /** What follows the name on the slice: `valueText`, `percentText` or empty, as the node's `labels.values` says. */
  readonly valueLabel: string;
  /** The fill. Transparent (`#FFFFFF00`) on a mosaic's outer layer, which its inner slices cover. */
  readonly color: SceneColor;
  /** The slice's rows and columns: its group columns and its metrics. */
  readonly source: SceneSource;
  /** The slice and each slice it sits in, outermost first, for a tooltip. */
  readonly tooltip: SceneTooltip;
  /** What a selection of the slice describes, such as "host.name: web-01". */
  readonly description: string;
  /** The `slice` selection, when the node offers it. */
  readonly selection?: SceneSelection;
  /** In draw order; empty on the innermost layer. */
  readonly children: readonly PartitionNode[];
}

/** One layer of a {@link PartitionScene}, outermost first. */
export interface PartitionLayer {
  /** The group column, absent on the metric layer. */
  readonly column?: string;
  readonly label: string;
}

/** One legend entry of a {@link PartitionScene}, in legend order. */
export interface PartitionLegendItem {
  /** The {@link PartitionNode.key} it names. */
  readonly key: string;
  readonly label: string;
  readonly color: SceneColor;
  /** 1 for the outermost layer. */
  readonly depth: number;
  /** The slice's value, when the legend shows values. */
  readonly value?: string;
  readonly description: string;
  /** The `slice` selection, when the node offers it. */
  readonly selection?: SceneSelection;
}

/** A partition Scene's legend: placement, sizing and items. */
export interface PartitionLegend {
  readonly visible: boolean;
  readonly position: 'top' | 'bottom' | 'left' | 'right';
  /** Every layer, each slice after its parent, rather than the outermost alone. */
  readonly nested: boolean;
  readonly maxLines: number;
  readonly size: 'auto' | 's' | 'm' | 'l' | 'xl';
  readonly values: boolean;
  /** Flat: the outermost slices in the order their rows first show them. Nested: every slice, depth first in draw order. */
  readonly items: readonly PartitionLegendItem[];
}

/** A Scene of slices of a whole: pie, donut, treemap, mosaic or waffle. */
export interface PartitionScene extends SceneBase {
  readonly kind: 'partition';
  readonly shape: PartitionSceneShape;
  /** Outermost first. */
  readonly layers: readonly PartitionLayer[];
  /** The outermost slices, in draw order, each with its children. */
  readonly nodes: readonly PartitionNode[];
  readonly total: number;
  readonly labels: {
    /** Where slice names draw; `auto` lets a pie or donut draw a name outside, linked to its slice. */
    readonly categories: 'auto' | 'inside' | 'hidden';
    readonly values: 'percent' | 'value' | 'hidden';
  };
  /** The hole's radius as a share of the chart's; 0 for any shape but a donut. */
  readonly donutHole: number;
  readonly legend: PartitionLegend;
  /** Present when there is nothing to draw: the reason, and the text to draw instead. */
  readonly empty?: {
    readonly reason: 'noResults' | 'negative';
    readonly text: string;
  };
}
