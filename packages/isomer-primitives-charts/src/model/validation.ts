/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import { collapseSignature, metricTiles } from './collapse';
import {
  METRIC_LIMITS,
  metricNodeSchema,
  type MetricReading,
  type MetricTile,
  metricTileSchema,
  type MetricTrendModel,
} from './declarations';
import { compareMetric } from './readings';

type TileIssue = (message: string, path: (string | number)[]) => void;

function isNumericReading(value: MetricReading['value']): boolean {
  return value === null || typeof value === 'number';
}

function validateComparison(tile: MetricTile, issue: TileIssue): void {
  const secondary = tile.secondary;
  if (!secondary?.comparison) {
    return;
  }
  const { baseline } = secondary.comparison;
  if (!isNumericReading(secondary.value)) {
    issue('Comparison requires a numeric secondary reading', [
      'secondary',
      'value',
    ]);
  }
  if (baseline === 'primary' && !isNumericReading(tile.primary.value)) {
    issue('Primary baseline requires a numeric primary reading', [
      'primary',
      'value',
    ]);
  }

  // Missing values have no delta. Reject arithmetic overflow before any renderer sees it.
  let delta = 0;
  if (baseline === 'primary') {
    if (
      typeof tile.primary.value === 'number' &&
      typeof secondary.value === 'number'
    ) {
      delta = tile.primary.value - secondary.value;
    }
  } else if (typeof secondary.value === 'number') {
    delta = secondary.value - baseline;
  }
  const overflowsPercent =
    secondary.format?.style === 'percent' && !Number.isFinite(delta * 100);
  if (!Number.isFinite(delta) || overflowsPercent) {
    issue('Comparison difference must be finite', ['secondary', 'comparison']);
  }
}

function validateTrend(tile: MetricTile, issue: TileIssue): void {
  if (!tile.trend) {
    return;
  }
  if (tile.trend.secondary && !tile.secondary) {
    issue('Secondary trend requires a secondary reading', [
      'trend',
      'secondary',
    ]);
  }
  const points = [...tile.trend.primary, ...(tile.trend.secondary ?? [])];
  const values = points.flatMap((point) =>
    point.value === null ? [] : [point.value]
  );
  if (
    values.length > 0 &&
    !Number.isFinite(Math.max(...values) - Math.min(...values))
  ) {
    issue('Trend value span must be finite', ['trend']);
  }
}

function validateCollapseSource(
  tile: MetricTile,
  expectedSignature: string,
  staticMaximum: boolean,
  issue: TileIssue
): void {
  if (tile.action) {
    issue('Collapsed sources cannot declare tile actions', ['action']);
  }
  for (const [field, reading] of [
    ['primary', tile.primary],
    ['secondary', tile.secondary],
  ] as const) {
    if (!reading) {
      continue;
    }
    if (!isNumericReading(reading.value) || reading.formatted !== undefined) {
      issue('Collapse requires numeric readings without preformatted text', [
        field,
      ]);
    }
  }
  if (collapseSignature(tile, staticMaximum) !== expectedSignature) {
    issue(
      'Collapsed tiles must share reading formats, secondary semantics, progress domain and presentation',
      []
    );
  }
}

function validateCollapsedResult(
  node: MetricTrendModel,
  context: z.RefinementCtx
): void {
  const issue = (message: string) =>
    context.addIssue({ code: 'custom', message, path: ['collapse'] });
  try {
    const collapsed = metricTiles(node)[0]!;
    if (!metricTileSchema.safeParse(collapsed).success) {
      issue('Collapse produces an invalid reading or progress domain');
    }
    if (collapsed.secondary?.comparison) {
      const compared = compareMetric(collapsed, node.locale);
      if (
        compared &&
        compared.absolute !== null &&
        !Number.isFinite(compared.absolute)
      ) {
        issue('Collapsed comparison must be finite');
      }
    }
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }
    issue(error.message);
  }
}

/** Validate relationships only after Zod has established each field's shape. */
function validateMetricNode(
  node: MetricTrendModel,
  context: z.RefinementCtx
): void {
  const keys = new Set<string>();
  const staticMaximum = node.collapse?.max === 'static';
  let expectedSignature = '';
  if (node.collapse && node.tiles.length > 0) {
    expectedSignature = collapseSignature(node.tiles[0]!, staticMaximum);
  }
  let totalPoints = 0;
  node.tiles.forEach((tile, index) => {
    const issue: TileIssue = (message, path) =>
      context.addIssue({
        code: 'custom',
        message,
        path: ['tiles', index, ...path],
      });
    if (keys.has(tile.key)) {
      issue('Duplicate tile key', ['key']);
    }
    keys.add(tile.key);
    totalPoints +=
      (tile.trend?.primary.length ?? 0) + (tile.trend?.secondary?.length ?? 0);
    validateComparison(tile, issue);
    validateTrend(tile, issue);
    if (tile.progress && !isNumericReading(tile.primary.value)) {
      issue('Progress requires a numeric primary reading', [
        'primary',
        'value',
      ]);
    }
    if (node.collapse) {
      validateCollapseSource(tile, expectedSignature, staticMaximum, issue);
    }
  });
  if (totalPoints > METRIC_LIMITS.totalPoints) {
    context.addIssue({
      code: 'custom',
      message: `At most ${METRIC_LIMITS.totalPoints} trend points across all tiles and series`,
      path: ['tiles'],
    });
  }
  if (node.collapse && context.issues.length === 0) {
    validateCollapsedResult(node, context);
  }
}

/** Public schema: structural declarations plus cross-reading and cross-tile invariants. */
export const metricTrendSchema: typeof metricNodeSchema =
  metricNodeSchema.superRefine(validateMetricNode);
