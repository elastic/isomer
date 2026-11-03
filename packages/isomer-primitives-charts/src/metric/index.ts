/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  definePrimitive,
  type PrimitiveCatalogEntry,
  type Renderer,
} from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';

import { example, examples } from './examples';
import { icon } from './icon';
import { resolveMetric } from './resolve';
import { type MetricNode, metricSchema } from './schema';

const catalog = {
  type: 'metric',
  name: 'Metric',
  description:
    'Tiles of headline readings. Keys are unique; `null` reads N/A, never zero. Numbers carry a `format`, never preformatted strings.',
  purpose: 'Show one reading, or one per breakdown value.',
  useWhen: ['The answer is a number: a count, rate, size or percentage now.'],
  avoidWhen: ['The reader must compare many values exactly or read an axis.'],
  example,
} satisfies PrimitiveCatalogEntry;

/** One line per tile. */
const metricText = (node: MetricNode): string =>
  resolveMetric(node)
    .tiles.map(({ reading }) => reading)
    .join('\n');

const metricMarkdown = (node: MetricNode) => {
  const lines = resolveMetric(node).tiles.map(({ title, subtitle, value }) => {
    const rest = [subtitle, value].filter(Boolean).join(', ');
    return title ? [md.strong(title), md.text(`: ${rest}`)] : [md.text(rest)];
  });
  return lines.length === 1
    ? md.paragraph(...lines[0]!)
    : md.list(lines.map((line) => md.paragraph(...line)));
};

/** The `metric` primitive with `react` drawn by a renderer package. */
export const defineMetricPrimitive = (react: Renderer<MetricNode, 'react'>) =>
  definePrimitive({
    type: 'metric',
    catalog,
    examples,
    icon,
    schema: metricSchema,
    renderers: { react, text: metricText, markdown: metricMarkdown },
  });
