/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveFill, textOn } from '../shared/color';
import { formatValue } from '../shared/format';
import {
  type ChartTokens,
  chartTokens,
  type Scheme,
  type TextTokens,
} from '../theme';

import type { MetricNode, MetricTile } from './schema';

/** A tile with its text formatted and its colors concrete, ready to draw. */
export interface ResolvedMetricTile {
  key: string;
  title?: string | undefined;
  subtitle?: string | undefined;
  /** Formatted value, or the missing text. */
  value: string;
  /** The value when it is a number, for engines that format or scale it. */
  number?: number | undefined;
  /** Tile background. */
  fill: string;
  /** Value text color when the tile paints its value. */
  valueColor?: string | undefined;
  /** Text colors that read on `fill`. */
  text: TextTokens;
  /** One line naming everything the tile shows. */
  reading: string;
}

type Align = 'left' | 'center' | 'right';

interface MetricLayout {
  titleAlign: Align;
  valueAlign: Align;
  valuePosition: 'top' | 'middle' | 'bottom';
  valueSize: 'default' | 'fit';
  density: 'compact' | 'default';
}

/** What {@link resolveMetric} returns: the grid, layout, tiles and tokens a renderer draws. */
export interface ResolvedMetric {
  columns: number;
  layout: MetricLayout;
  tiles: ResolvedMetricTile[];
  tokens: ChartTokens;
}

const DEFAULT_LAYOUT: MetricLayout = {
  titleAlign: 'left',
  valueAlign: 'right',
  valuePosition: 'bottom',
  valueSize: 'default',
  density: 'default',
};

const resolveTile = (
  tile: MetricTile,
  tokens: ChartTokens
): ResolvedMetricTile => {
  const { key, title, subtitle, value, format, color, colorTarget } = tile;
  const number = typeof value === 'number' ? value : undefined;
  const shown =
    value === null
      ? tokens.missing
      : number === undefined
        ? (value as string)
        : formatValue(number, format);
  const paint = color && resolveFill(color, tokens);
  const paintsValue = colorTarget === 'value';
  const fill = paintsValue || !paint ? tokens.background : paint;
  const resolved: ResolvedMetricTile = {
    key,
    title,
    subtitle,
    value: shown,
    number,
    fill,
    valueColor: paintsValue ? paint : undefined,
    text: textOn(fill, tokens),
    reading: [title, subtitle, shown].filter(Boolean).join(', '),
  };
  return resolved;
};

/** Everything a renderer draws for `node` in `scheme`: formatted text, concrete colors, defaults applied. */
export const resolveMetric = (
  node: MetricNode,
  scheme: Scheme = 'light'
): ResolvedMetric => {
  const tokens = chartTokens[scheme];
  return {
    columns: Math.max(1, Math.min(node.columns ?? 3, node.tiles.length)),
    layout: {
      ...DEFAULT_LAYOUT,
      ...Object.fromEntries(
        Object.entries(node.layout ?? {}).filter(
          ([, value]) => value !== undefined
        )
      ),
    },
    tiles: node.tiles.map((tile) => resolveTile(tile, tokens)),
    tokens,
  };
};
