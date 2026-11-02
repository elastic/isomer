/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import {
  type DefaultPackTypes,
  definePrimitiveFor,
  definePrimitivePack,
} from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';

import { metricExamples } from './examples';
import { metricTrendSchema } from './model';
import { metricText } from './model/presentation';
import {
  type ChartsRenderContext,
  chartsStyleAdapter,
  type ChartsTheme,
  type ChartStyleCollector,
} from './theme';
import { type MetricTrendNode, MetricView } from './view';

interface ChartsPackTypes extends DefaultPackTypes {
  theme: ChartsTheme;
  context: ChartsRenderContext;
  collector: ChartStyleCollector;
}
const definePrimitive = definePrimitiveFor<ChartsPackTypes>();
const examples: MetricTrendNode[] = metricExamples;

/**
 * Validated metric/trend primitive with baseline React/SVG, text and Markdown
 * adaptations. Browser overrides replace React rendering, not style collection
 * or nonvisual behavior; snapshots continue to use the baseline tree.
 */
export const metricTrendPrimitive = definePrimitive({
  type: 'metricTrend',
  schema: metricTrendSchema,
  catalog: {
    type: 'metricTrend',
    name: 'Metric / trend',
    purpose:
      'Show named primary and optional independent secondary readings, comparisons, progress and timestamped trends as one tile or a breakdown.',
    useWhen: [
      'A headline reading, its comparison or history answers the question.',
    ],
    avoidWhen: [
      'A gauge or another chart family is required; this pack currently supports only metric/trend.',
    ],
    description:
      'Finite readings; unique tile keys and trend instants. Secondary comparisons require numeric readings. Null marks missing data, not zero. Percent palettes require a domain. Collapse requires homogeneous numeric sources; no preformatted readings or per-source actions. Bounds apply per series and across the whole node.',
    example: examples[0],
  },
  examples,
  collectStyles: (_node, { styles }) => {
    styles.rules.add('metric');
  },
  renderers: {
    react: (node, { context, theme }) =>
      createElement(MetricView, {
        node,
        context,
        theme: theme ?? context.chartTheme,
      }),
    text: metricText,
    markdown: (node) => md.paragraph(metricText(node)),
  },
});

const chartPrimitives = [metricTrendPrimitive] as const;
/**
 * Portable chart pack with standalone style defaults and authoring examples.
 * Bind a host style adapter/frame separately when using application themes.
 */
export const chartsPack = definePrimitivePack<ChartsTheme>({
  id: 'charts',
  primitives: chartPrimitives,
  styleAdapter: chartsStyleAdapter,
  authoring: { groups: [{ title: 'Metrics', types: ['metricTrend'] }] },
});

export { metricExamples } from './examples';
export {
  type ChartsRenderContext,
  type ChartsTheme,
  type ChartsThemes,
  chartFrame,
  chartsThemes,
  createChartFrame,
  createChartsStyleAdapter,
} from './theme';
export {
  type ChartTokens,
  type ChartTokenSource,
  METRIC_GLYPHS,
  createChartTokens,
} from './tokens';
export { type MetricTrendNode, type MetricViewProps, MetricView } from './view';
