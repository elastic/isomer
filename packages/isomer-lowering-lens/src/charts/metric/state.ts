/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

// Lens's persisted `MetricVisualizationState`, read as a format specification:
// `@kbn/lens-common/visualizations/metric/types.ts`.

const accessor = z.string().min(1).max(4096);
const align = z.enum(['left', 'center', 'right']);
const position = z.enum(['top', 'middle', 'bottom']);
const labelPosition = z.enum(['before', 'after']);

const paletteStop = z.object({ color: z.string(), stop: z.number() }).strict();

export const paletteSchema = z
  .object({
    type: z.literal('palette'),
    name: z.string().min(1),
    params: z
      .object({
        name: z.string().optional(),
        reverse: z.boolean().optional(),
        rangeType: z.enum(['number', 'percent']).optional(),
        rangeMin: z.number().nullable().optional(),
        rangeMax: z.number().nullable().optional(),
        continuity: z.enum(['above', 'below', 'all', 'none']).optional(),
        stops: z.array(paletteStop).optional(),
        colorStops: z.array(paletteStop).optional(),
        steps: z.number().int().positive().optional(),
        progression: z.literal('fixed').optional(),
        maxSteps: z.number().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const secondaryTrendSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }).strict(),
  z.object({ type: z.literal('static'), color: z.string() }).strict(),
  z
    .object({
      type: z.literal('dynamic'),
      visuals: z.enum(['icon', 'value', 'both']),
      paletteId: z.string(),
      reversed: z.boolean(),
      baselineValue: z.union([z.number(), z.literal('primary')]),
    })
    .strict(),
]);

const persistedSchema = z
  .object({
    layerId: accessor,
    layerType: z.literal('data'),
    metricAccessor: accessor.optional(),
    secondaryMetricAccessor: accessor.optional(),
    maxAccessor: accessor.optional(),
    breakdownByAccessor: accessor.optional(),
    collapseFn: z.enum(['sum', 'avg', 'min', 'max']).optional(),
    subtitle: z.string().optional(),
    secondaryPrefix: z.string().optional(),
    secondaryLabel: z.string().optional(),
    secondaryTrend: secondaryTrendSchema.optional(),
    progressDirection: z.enum(['horizontal', 'vertical']).optional(),
    showBar: z.boolean().optional(),
    titlesTextAlign: align.optional(),
    valuesTextAlign: align.optional(),
    secondaryAlign: align.optional(),
    primaryAlign: align.optional(),
    iconAlign: z.enum(['left', 'right']).optional(),
    valueFontMode: z.enum(['default', 'fit']).optional(),
    density: z.enum(['compact', 'default']).optional(),
    titleWeight: z.unknown().optional(),
    primaryPosition: position.optional(),
    secondaryLabelPosition: labelPosition.optional(),
    secondaryNameVisibility: z
      .enum(['hidden', 'before', 'after', 'tooltip'])
      .optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    palette: paletteSchema.optional(),
    maxCols: z.number().int().positive().optional(),
    trendlineLayerId: accessor.optional(),
    trendlineLayerType: z.literal('metricTrendline').optional(),
    trendlineTimeAccessor: accessor.optional(),
    trendlineMetricAccessor: accessor.optional(),
    trendlineSecondaryMetricAccessor: accessor.optional(),
    trendlineBreakdownByAccessor: accessor.optional(),
    applyColorTo: z.enum(['background', 'value']).optional(),
  })
  .strict();

type Persisted = z.infer<typeof persistedSchema>;

/** Visualization state after Lens's runtime converters, with the legacy aliases gone. */
export type MetricState = Omit<
  Persisted,
  | 'secondaryPrefix'
  | 'valuesTextAlign'
  | 'titleWeight'
  | 'secondaryLabelPosition'
>;

export const metricStateSchema = persistedSchema;

/**
 * Applies `getRuntimeConverters()` in order. Lens runs them on every render
 * through `initializeVisualization`, so every saved panel renders converted.
 */
export const normalizeMetricState = (state: Persisted): MetricState => {
  const {
    secondaryPrefix,
    valuesTextAlign,
    titleWeight: _titleWeight,
    secondaryLabelPosition,
    ...rest
  } = state;
  let next: MetricState = { ...rest };
  if (valuesTextAlign) {
    next = {
      ...next,
      primaryAlign: state.primaryAlign ?? valuesTextAlign,
      secondaryAlign: state.secondaryAlign ?? valuesTextAlign,
    };
  }
  if (secondaryPrefix !== undefined && next.secondaryLabel === undefined) {
    next = { ...next, secondaryLabel: secondaryPrefix };
  }
  if (next.applyColorTo === undefined && (next.color || next.palette)) {
    next = { ...next, applyColorTo: 'background' };
  }
  if (next.density === undefined) {
    next = { ...next, density: 'compact' };
  }
  const { secondaryLabel, ...withoutLabel } = next;
  if (!next.secondaryMetricAccessor) {
    return withoutLabel;
  }
  return {
    ...withoutLabel,
    ...(secondaryLabel ? { secondaryLabel } : {}),
    secondaryNameVisibility:
      secondaryLabel === ''
        ? 'hidden'
        : (next.secondaryNameVisibility ?? secondaryLabelPosition ?? 'before'),
  };
};
