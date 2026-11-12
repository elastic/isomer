/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A gauge node as Lens's gauge draws it (`expression_gauge`: `GaugeComponent`,
// `getMinValue`, `getMaxValue`, `normalizeBands` and `getTicksLabels`), with
// the scale, its colored stretches, ticks and every string decided here.

import type { GaugeNode } from '../schema/gauge';

import {
  createResolution,
  nextUp,
  percentAlong,
  type ResolveChartOptions,
  resolveInteractions,
  sceneBase,
  titled,
  toNumber,
} from './common';
import { resolveColor, TABLE_CHROME, TRANSPARENT } from './theme';
import type { GaugeBand, GaugeScene } from './types';

/** Lens's texts for a gauge with nothing to draw. */
const EMPTY_TEXT = {
  noResults: 'No results found',
  equalBounds: 'Minimum and maximum values may not be equal',
  invertedBounds: 'Minimum value may not be greater than maximum value',
} as const;

/** Lens's tooltip names for the hovered value and the goal. */
const TOOLTIP = { active: 'Current', goal: 'Goal' } as const;

/** Lens's `getNiceNumber`: 1, 2, 5 or 10 times a power of ten, at least `range`. */
const niceNumber = (range: number): number => {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / 10 ** exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * 10 ** exponent;
};

/** Lens's `getNiceRange(min, max).max`: `max` rounded up to a step of about a quarter of the range. */
export const niceMax = (min: number, max: number): number => {
  const offsetMax = max + 0.0000001;
  const spacing = niceNumber(niceNumber(offsetMax - min) / 4);
  const nice = Math.ceil(Math.ceil(offsetMax / spacing) * spacing);
  // Where the offset rounds away and `max` is `min`, there is no span to step.
  return Number.isFinite(nice) ? nice : Math.ceil(nextUp(max));
};

/** Lens's `getTicksLabels`: the ascending edges, without any within a tenth of the scale of its neighbor or the last. */
const bandTicks = (edges: readonly number[]): number[] => {
  const last = edges.length - 1;
  const tenth = (edges[last]! - edges[0]!) * 0.1;
  return edges.filter(
    (edge, index) =>
      index === 0 ||
      index === last ||
      !(edge - edges[index - 1]! < tenth || edges[last]! - edge < tenth)
  );
};

/** The Scene of a `gauge` node. */
export const resolveGauge = (
  node: GaugeNode,
  options: ResolveChartOptions
): GaugeScene => {
  const resolution = createResolution(node.data, options);
  const { data, scheme } = resolution;
  const valueColumn = node.value.column;
  const valueLabel = resolution.column(valueColumn).label;
  const row = data.rows.findIndex(
    (_, index) => toNumber(resolution.cell(valueColumn, index)) !== undefined
  );
  const read = (column: string | undefined) =>
    column === undefined || row < 0
      ? undefined
      : toNumber(resolution.cell(column, row));
  const value = read(valueColumn);
  const statedMin = read(node.min?.column);
  const statedMax = read(node.max?.column);
  const goalValue = read(node.goal?.column);
  const lowest = Math.min(
    ...[value, statedMax].filter((one): one is number => one !== undefined)
  );
  const min = statedMin ?? (lowest <= 0 ? lowest - 10 : 0);
  const max =
    statedMax ??
    (value === undefined
      ? 100
      : niceMax(
          min,
          Math.max(
            ...[min, goalValue, value].filter(
              (one): one is number => one !== undefined
            )
          )
        ));
  const format = resolution.format(valueColumn);
  const text = (number: number) => resolution.formatAs(number, format);

  const reason =
    value === undefined
      ? 'noResults'
      : min === max
        ? 'equalBounds'
        : min > max
          ? 'invertedBounds'
          : undefined;

  // The scale's colored stretches: between every band edge within it, each
  // the color of the band it lies in, transparent where none covers it.
  const stated = node.colors?.bands ?? [];
  const absolute = (bound: number | undefined) =>
    bound === undefined || node.bandsRange !== 'percentage'
      ? bound
      : percentAlong(min, max, bound);
  const ranges = stated.map(({ from, to, color }) => ({
    from: absolute(from) ?? Number.NEGATIVE_INFINITY,
    to: absolute(to) ?? Number.POSITIVE_INFINITY,
    color: resolveColor(color, scheme),
  }));
  const edges = [
    ...new Set([
      min,
      ...ranges
        .flatMap(({ from, to }) => [from, to])
        .filter((edge) => edge > min && edge < max),
      max,
    ]),
  ].sort((a, b) => a - b);
  // Bands ascend without overlapping, so one pass pairs stretches with them.
  let next = 0;
  const colorAt = (middle: number) => {
    while (next < ranges.length && ranges[next]!.to <= middle) {
      next += 1;
    }
    const range = ranges[next];
    return range && range.from <= middle ? range.color : TRANSPARENT;
  };
  const bands: GaugeBand[] = reason
    ? []
    : stated.length === 0
      ? [{ start: min, end: max, color: TABLE_CHROME[scheme].barTrack }]
      : edges.slice(1).map((end, index) => {
          const start = edges[index]!;
          return { start, end, color: colorAt(start / 2 + end / 2) };
        });

  const ticksMode = node.ticks ?? 'auto';
  const valueText =
    value === undefined
      ? ''
      : (data.display?.[valueColumn]?.[row] ?? text(value));
  const goal =
    goalValue !== undefined && goalValue >= min && goalValue <= max
      ? {
          value: goalValue,
          text:
            data.display?.[node.goal!.column]?.[row] ??
            resolution.formatAs(
              goalValue,
              resolution.format(node.goal!.column)
            ),
        }
      : undefined;
  const major =
    node.labels?.major === false ? '' : (node.labels?.major ?? valueLabel);
  const sentence = reason
    ? `${valueLabel} cannot be shown: ${EMPTY_TEXT[reason].toLowerCase()}.`
    : `${valueLabel} is ${valueText}, on a scale from ${text(min)} to ${text(max)}${
        goal ? `, with a goal of ${goal.text}` : ''
      }.`;

  return {
    kind: 'gauge',
    ...sceneBase(resolution, node),
    summary: titled(node.title, sentence),
    interactions: resolveInteractions(node),
    shape: node.shape,
    ...(value === undefined ? {} : { value }),
    valueText,
    min,
    max,
    format,
    ...(goal ? { goal } : {}),
    labels: {
      major,
      ...(node.labels?.minor === undefined ? {} : { minor: node.labels.minor }),
    },
    tooltipLabels: {
      active: TOOLTIP.active,
      value: valueLabel,
      goal: TOOLTIP.goal,
    },
    bands,
    ...(ticksMode === 'hidden'
      ? { ticks: [] }
      : ticksMode === 'bands' && !reason
        ? { ticks: bandTicks(edges) }
        : {}),
    ...(reason ? { empty: { reason, text: EMPTY_TEXT[reason] } } : {}),
  };
};
