/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toActionEvent } from '../shared/action';
import {
  type ColorRef,
  resolveBadge,
  resolveFill,
  sparkShade,
  textOn,
} from '../shared/color';
import { formatValue } from '../shared/format';
import type { Point } from '../shared/series';
import {
  type ChartTokens,
  chartTokens,
  type Scheme,
  type TextTokens,
} from '../theme';

import type { MetricNode, MetricTile } from './schema';
import { type TileIconGlyph, tileIconGlyphs } from './tile_icons';

type Direction = 'up' | 'down' | 'flat';

const GLYPHS: Record<Direction, string> = { up: '↑', down: '↓', flat: '=' };

interface ResolvedSecondary {
  label?: string | undefined;
  labelPosition: 'before' | 'after' | 'tooltip';
  value?: string | undefined;
  badge?:
    | { background: string; text: string; glyph?: string | undefined }
    | undefined;
  /** Screen-reader wording, e.g. `up 12.50%`. */
  description: string;
}

/** A tile with its text formatted and its colors concrete, ready to draw. */
export interface ResolvedMetricTile {
  key: string;
  title?: string | undefined;
  subtitle?: string | undefined;
  /** Formatted value, or the missing text; a multivalue reading joins its values. */
  value: string;
  /** Each formatted value of a multivalue reading. */
  values?: string[] | undefined;
  /** The value when it is a number, for engines that format or scale it. */
  number?: number | undefined;
  /** The tile's icon glyph, drawn in `text.title`. */
  icon?: TileIconGlyph | undefined;
  /** Tile background. */
  fill: string;
  /** Value text color when the tile paints its value. */
  valueColor?: string | undefined;
  /** Text colors that read on `fill`. */
  text: TextTokens;
  secondary?: ResolvedSecondary | undefined;
  visual?:
    | {
        kind: 'trend';
        points: Point[];
        shape: 'area' | 'bars';
        /** The sparkline's shade of `fill`, drawn over the tile's lower half. */
        color: string;
      }
    | {
        kind: 'progress';
        min: number;
        max: number;
        /** 0–1, clamped. */
        ratio: number;
        direction: 'horizontal' | 'vertical';
        color: string;
      };
  action?: { name: string; context: Record<string, unknown> };
  /** One line naming everything the tile shows. */
  reading: string;
}

type Align = 'left' | 'center' | 'right';

interface MetricLayout {
  titleAlign: Align;
  valueAlign: Align;
  secondaryAlign: Align;
  valuePosition: 'top' | 'middle' | 'bottom';
  valueSize: 'default' | 'fit';
  density: 'compact' | 'default';
  iconAlign: 'left' | 'right';
}

/** What {@link resolveMetric} returns: the grid, layout, tiles and tokens a renderer draws. */
export interface ResolvedMetric {
  columns: number;
  /** Empty cells drawn after the tiles. */
  placeholders: number;
  layout: MetricLayout;
  tiles: ResolvedMetricTile[];
  tokens: ChartTokens;
}

const DEFAULT_LAYOUT: MetricLayout = {
  titleAlign: 'left',
  valueAlign: 'right',
  secondaryAlign: 'right',
  valuePosition: 'bottom',
  valueSize: 'default',
  density: 'default',
  iconAlign: 'right',
};

const signed = (delta: number, formatted: string) =>
  delta > 0 ? `+${formatted}` : formatted;

const CHANGE_COLORS: Record<
  'good' | 'bad' | 'neutral',
  Record<Direction, ColorRef>
> = {
  good: { up: 'success', down: 'danger', flat: 'default' },
  bad: { up: 'danger', down: 'success', flat: 'default' },
  neutral: { up: 'default', down: 'default', flat: 'default' },
};

const resolveSecondary = (
  { value, format, secondary }: MetricTile,
  tokens: ChartTokens
): ResolvedSecondary | undefined => {
  if (!secondary) {
    return undefined;
  }
  const { label, labelPosition = 'before' } = secondary;
  if (secondary.kind === 'value') {
    const shown =
      typeof secondary.value === 'number'
        ? formatValue(secondary.value, secondary.format)
        : secondary.value;
    const { badge } = secondary;
    const glyph = badge?.direction && GLYPHS[badge.direction];
    return {
      label,
      labelPosition,
      value: shown,
      badge: badge && { ...resolveBadge(badge.color, tokens), glyph },
      description: [label, glyph, shown].filter(Boolean).join(' '),
    };
  }
  const delta = (value as number) - secondary.previous;
  const direction: Direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const relative =
    (secondary.show ?? 'relative') === 'relative' && secondary.previous !== 0;
  const shown = relative
    ? signed(
        delta,
        formatValue(delta / Math.abs(secondary.previous), { kind: 'percent' })
      )
    : signed(delta, formatValue(delta, format));
  const color = CHANGE_COLORS[secondary.increase ?? 'neutral'][direction];
  return {
    label,
    labelPosition,
    value: shown,
    badge: { ...resolveBadge(color, tokens), glyph: GLYPHS[direction] },
    description: `${label ? `${label} ` : ''}${direction === 'flat' ? 'unchanged' : direction} ${shown}`,
  };
};

const resolveTile = (
  tile: MetricTile,
  tokens: ChartTokens
): ResolvedMetricTile => {
  const {
    key,
    title,
    subtitle,
    value,
    format,
    icon,
    color,
    colorTarget,
    visual,
    action,
  } = tile;
  const number = typeof value === 'number' ? value : undefined;
  const values = Array.isArray(value)
    ? value.map((each) =>
        typeof each === 'number' ? formatValue(each, format) : each
      )
    : undefined;
  const shown =
    value === null
      ? tokens.missing
      : values
        ? values.join(', ')
        : number === undefined
          ? (value as string)
          : formatValue(number, format);
  const paint = color && resolveFill(color, tokens);
  const paintsValue = colorTarget === 'value' && visual === undefined;
  const fill =
    visual?.kind === 'progress' || paintsValue || !paint
      ? tokens.background
      : paint;
  const secondary = resolveSecondary(tile, tokens);
  const resolved: ResolvedMetricTile = {
    key,
    title,
    subtitle,
    value: shown,
    values,
    number,
    icon: icon && tileIconGlyphs[icon],
    fill,
    valueColor: paintsValue ? paint : undefined,
    text: textOn(fill, tokens),
    secondary,
    reading: [title, subtitle, shown, secondary?.description]
      .filter(Boolean)
      .join(', '),
  };
  if (visual?.kind === 'trend') {
    resolved.visual = {
      kind: 'trend',
      points: visual.points,
      shape: visual.shape ?? 'area',
      color: sparkShade(fill),
    };
  } else if (visual?.kind === 'progress') {
    const min = visual.min ?? 0;
    // d3's `scaleLinear`, which Elastic Charts uses: an empty domain maps to the middle.
    const ratio =
      number === undefined
        ? 0
        : visual.max === min
          ? 0.5
          : (number - min) / (visual.max - min);
    resolved.visual = {
      kind: 'progress',
      min,
      max: visual.max,
      ratio: Math.min(1, Math.max(0, ratio)),
      direction: visual.direction ?? 'vertical',
      color: paint ?? tokens.progress,
    };
  }
  if (action) {
    resolved.action = toActionEvent(action, key);
  }
  return resolved;
};

/** Everything a renderer draws for `node` in `scheme`: formatted text, concrete colors, defaults applied. */
export const resolveMetric = (
  node: MetricNode,
  scheme: Scheme = 'light'
): ResolvedMetric => {
  const tokens = chartTokens[scheme];
  return {
    columns: Math.max(
      1,
      Math.min(node.columns ?? 3, node.tiles.length + (node.placeholders ?? 0))
    ),
    placeholders: node.placeholders ?? 0,
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
