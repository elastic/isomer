/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A legacyMetric node as Lens's legacy metric draws it
// (`expression_legacy_metric`: `MetricVisComponent`, `MetricVisValue` and
// `withAutoScale`, with the font sizes Lens's `toExpression` sets), with every
// tile's text, color and type size decided here.

import type { LegacyMetricNode } from '../schema/legacy_metric';

import {
  createResolution,
  describe,
  type ResolveChartOptions,
  resolveInteractions,
  sceneBase,
  titled,
  toNumber,
} from './common';
import { bandFor } from './resolve_metric';
import { contrastText, resolveColor } from './theme';
import type {
  LegacyMetricScene,
  LegacyMetricTile,
  SceneColor,
  SceneSelection,
} from './types';

const NO_RESULTS = 'No results found';

/** EUI's font sizes, which Lens sizes labels by. */
const LABEL_SIZES = { xs: 12, s: 14, m: 16, l: 20, xl: 24, xxl: 32 } as const;

/** Lens's `labelToMetricFontSizeMap`. */
const VALUE_SIZES = {
  xs: LABEL_SIZES.xs * 2,
  s: LABEL_SIZES.m * 2.5,
  m: LABEL_SIZES.l * 2.5,
  l: LABEL_SIZES.xl * 2.5,
  xl: LABEL_SIZES.xxl * 2.5,
  xxl: LABEL_SIZES.xxl * 3,
} as const;

/** `lHeight` over `size`, as Lens sets both fonts. */
const LINE_HEIGHT = 1.5;
const VALUE_WEIGHT = 600;
/** `euiTheme.size.base`, the metric container's padding. */
const PADDING = 16;
/** `withAutoScale`'s bounds. */
const MIN_SCALE = 0.3;
const MAX_SCALE = 1;

// Inter's advance widths in em, by character class, rounded up a little so a
// tile shrinks rather than clips.
const advance = (char: string): number => {
  if (/[0-9]/.test(char)) {
    return 0.63;
  }
  if (/[\s.,:;'|!il]/.test(char)) {
    return 0.3;
  }
  if (/[mwMW%@]/.test(char)) {
    return 0.92;
  }
  if (/[A-Z]/.test(char)) {
    return 0.7;
  }
  if (/[a-z]/.test(char)) {
    return 0.57;
  }
  return 0.62;
};

/** The estimated width of `text` at `size` pixels and `weight`. */
export const estimateTextWidth = (
  text: string,
  size: number,
  weight = 400
): number =>
  [...text].reduce((width, char) => width + advance(char), 0) *
  size *
  (weight >= 600 ? 1.05 : 1);

const round = (value: number) => Math.round(value * 100) / 100;

// `getLegacyMetricDataBounds`: one value is colored across twice itself, more
// across their range.
const boundsOf = (values: readonly number[]): [number, number] => {
  if (values.length === 1) {
    const only = values[0]!;
    if (only === 0) {
      return [-50, 100];
    }
    return only < 0 ? [only * 2, 0] : [0, only * 2];
  }
  return [Math.min(...values), Math.max(...values)];
};

/** The Scene of a `legacyMetric` node. */
export const resolveLegacyMetric = (
  node: LegacyMetricNode,
  options: ResolveChartOptions
): LegacyMetricScene => {
  const resolution = createResolution(node.data, options);
  const { chrome, data, scheme, size: box } = resolution;
  const interactions = resolveInteractions(node);
  const selectable = interactions.select.includes('tile');
  const breakdownId = node.breakdown?.column;
  const breakdownColumn =
    breakdownId === undefined ? undefined : resolution.column(breakdownId);
  const step = node.size ?? 'm';
  const showLabels = node.showLabels ?? true;
  const bands = node.colors?.bands;
  const onBackground = (node.applyColorTo ?? 'background') === 'background';

  const natural = (label: string, value: string) => {
    const valueSize = VALUE_SIZES[step];
    const labelSize = LABEL_SIZES[step];
    const width =
      Math.max(
        estimateTextWidth(value, valueSize, VALUE_WEIGHT),
        showLabels ? estimateTextWidth(label, labelSize) : 0
      ) +
      2 * PADDING;
    const height =
      (valueSize + (showLabels ? labelSize : 0)) * LINE_HEIGHT + 2 * PADDING;
    return { width, height };
  };

  const colorFor = (columnId: string, row: number): SceneColor | undefined => {
    const value = toNumber(resolution.cell(columnId, row));
    if (
      !bands?.length ||
      value === undefined ||
      resolution.column(columnId).type !== 'number'
    ) {
      return undefined;
    }
    let position = value;
    if (node.bandsRange === 'percentage') {
      const values = data.rows.flatMap((_, at) => {
        const each = toNumber(resolution.cell(columnId, at));
        return each === undefined ? [] : [each];
      });
      const [low, high] = boundsOf(values);
      position = ((value - low) / (high - low)) * 100;
      if (!Number.isFinite(position)) {
        position = bands[0]?.from ?? Number.NEGATIVE_INFINITY;
      }
    }
    const band = bandFor(bands, position);
    return band ? resolveColor(band.color, scheme) : undefined;
  };

  const drafts = node.metrics.flatMap(({ column: metricId }) => {
    const metricColumn = resolution.column(metricId);
    return data.rows.map((_, row) => {
      const text = resolution.text(metricId, row);
      const breakdownText =
        breakdownId === undefined
          ? undefined
          : resolution.text(breakdownId, row);
      const label =
        breakdownText === undefined
          ? metricColumn.label
          : `${breakdownText} - ${metricColumn.label}`;
      const description = describe([
        ...(breakdownColumn && breakdownText !== undefined
          ? [[breakdownColumn.label, breakdownText] as const]
          : []),
        [metricColumn.label, text],
      ]);
      const selection: SceneSelection | undefined = selectable
        ? {
            target: 'tile',
            rows: [row],
            columns: breakdownId === undefined ? [] : [breakdownId],
            values:
              breakdownId === undefined
                ? {}
                : { [breakdownId]: resolution.cell(breakdownId, row) },
            description,
          }
        : undefined;
      return {
        metricId,
        row,
        label,
        text,
        color: colorFor(metricId, row),
        description,
        selection,
      };
    });
  });

  // A lone tile's background color fills the chart, as Lens's
  // `colorFullBackground` does.
  const lone = drafts.length === 1 ? drafts[0] : undefined;
  const fill =
    lone?.color !== undefined && onBackground ? lone.color : undefined;

  const tiles = drafts.map(
    ({
      metricId,
      row,
      label,
      text,
      color,
      description,
      selection,
    }): LegacyMetricTile => {
      const own = color !== undefined && onBackground ? color : undefined;
      const under = own ?? fill ?? chrome.background;
      const ink =
        own === undefined && fill === undefined
          ? chrome.text
          : contrastText(under, chrome.background, scheme);
      const { width, height } = natural(label, text);
      const scale = box
        ? Math.max(
            Math.min(MAX_SCALE, box.width / width, box.height / height),
            MIN_SCALE
          )
        : 1;
      return {
        source: {
          rows: [row],
          columns: [
            ...(breakdownId === undefined ? [] : [breakdownId]),
            metricId,
          ],
        },
        label,
        value: {
          text,
          raw: resolution.cell(metricId, row),
          color: color !== undefined && !onBackground ? color : ink,
        },
        labelColor: ink,
        ...(own !== undefined && fill === undefined ? { background: own } : {}),
        type: {
          value: round(VALUE_SIZES[step] * scale),
          label: round(LABEL_SIZES[step] * scale),
          padding: round(PADDING * scale),
        },
        box: { width: round(width * scale), height: round(height * scale) },
        description,
        ...(selection ? { selection } : {}),
      };
    }
  );

  const labels = node.metrics.map(
    ({ column }) => resolution.column(column).label
  );
  const empty =
    tiles.length === 0
      ? { reason: 'noResults' as const, text: NO_RESULTS }
      : undefined;
  const sentence = empty
    ? `${labels.join(' and ')} ${labels.length === 1 ? 'has' : 'have'} no data.`
    : tiles.length === 1
      ? `${tiles[0]!.label} is ${tiles[0]!.value.text}.`
      : `${tiles.map(({ label, value }) => `${label} ${value.text}`).join(', ')}.`;

  return {
    kind: 'legacyMetric',
    ...sceneBase(resolution, node),
    summary: titled(node.title, sentence),
    interactions,
    tiles,
    labelPosition: node.labelPosition ?? 'top',
    textAlign: node.textAlign ?? 'left',
    showLabels,
    lineHeight: LINE_HEIGHT,
    valueWeight: VALUE_WEIGHT,
    background: fill ?? chrome.background,
    ...(empty ? { empty } : {}),
  };
};
