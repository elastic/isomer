/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type MetricNode,
  resolveMetric,
  type Scheme,
} from '@elastic/isomer-primitives-charts/model';

import type { MetricFingerprint } from './fingerprint';

/**
 * The resolved model's reading of each fingerprint field it has, per fingerprint tile. Tiles are matched by
 * grid position, since the model lists only drawn tiles, in row order.
 */
export const modelReadings = (
  node: MetricNode,
  scheme: Scheme,
  fingerprint: MetricFingerprint
): Record<string, unknown>[] => {
  const { tiles, columns, tokens } = resolveMetric(node, scheme);
  return fingerprint.tiles.map(({ position: [row, column] }) => {
    const tile = tiles[row * columns + column];
    return {
      title: tile?.title,
      subtitle: tile?.subtitle,
      // Elastic Charts' `getTextParts` lists a multivalue reading in brackets.
      value: tile?.values ? `[${tile.values.join(', ')}]` : tile?.value,
      'secondary.label': tile?.secondary?.label,
      'secondary.value': tile?.secondary?.value,
      // A trend or progress tile keeps the background and paints its color on the sparkline or bar.
      background: (tile?.visual
        ? tokens.background
        : tile?.fill
      )?.toLowerCase(),
      fill: tile?.fill?.toLowerCase(),
      valueColor: tile?.valueColor?.toLowerCase(),
      'badge.background': tile?.secondary?.badge?.background.toLowerCase(),
      'badge.text': tile?.secondary?.badge?.text.toLowerCase(),
    };
  });
};

/** Where a drawn element's paint comes from in the resolved model, by the end of its fingerprint path. */
const PAINT_SOURCES: readonly [RegExp, string][] = [
  [/^elements\.echMetric\.style\.background$/, 'background'],
  [/>echSingleMetricSparkline__svg>rect\.style\.fill$/, 'fill'],
  [/>echMetricText__value(>echMetricText__part)?\.style\.color$/, 'valueColor'],
  [/>echBadge__content\.style\.background$/, 'badge.background'],
  [/>echBadge__content>[^.]+\.style\.color$/, 'badge.text'],
];

/** The resolved model's value for a fingerprint field such as `tiles[0].value`, where the model has one. */
export const modelValue = (
  readings: readonly Record<string, unknown>[],
  path: string
) => {
  const match = /^tiles\[(\d+)\]\.(.+)$/.exec(path);
  if (!match) {
    return undefined;
  }
  const reading = readings[Number(match[1])];
  const field = match[2]!;
  const source = PAINT_SOURCES.find(([pattern]) => pattern.test(field))?.[1];
  return reading?.[source ?? field];
};
