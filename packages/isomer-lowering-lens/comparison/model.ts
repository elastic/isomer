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
  const { tiles, columns } = resolveMetric(node, scheme);
  return fingerprint.tiles.map(({ position: [row, column] }) => {
    const tile = tiles[row * columns + column];
    return {
      title: tile?.title,
      subtitle: tile?.subtitle,
      // Elastic Charts' `getTextParts` lists a multivalue reading in brackets.
      value: tile?.values ? `[${tile.values.join(', ')}]` : tile?.value,
      background: tile?.fill,
      valueColor: tile?.valueColor,
      'secondary.label': tile?.secondary?.label,
      'secondary.value': tile?.secondary?.value ?? tile?.secondary?.badge?.text,
      'secondary.badge.background': tile?.secondary?.badge?.background,
    };
  });
};
