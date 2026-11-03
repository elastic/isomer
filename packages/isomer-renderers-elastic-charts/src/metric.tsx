/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Metric } from '@elastic/charts';
import type { ChartRenderers } from '@elastic/isomer-primitives-charts';
import {
  type MetricNode,
  resolveMetric,
  type Scheme,
} from '@elastic/isomer-primitives-charts/model';
import { type ActionEventRef, nodeAnchor } from '@elastic/isomer-sdk';

import { type ChartDrawing, ElasticChart } from './chart';
import { tileAction, toDatum, toTheme } from './datum';

const rows = <T,>(items: T[], columns: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / columns) }, (_, row) =>
    items.slice(row * columns, (row + 1) * columns)
  );

/** Props of {@link MetricChart}. */
export interface MetricChartProps {
  node: MetricNode;
  /** Receives a tile's action; absent renders the chart inert. */
  onEvent?: ((event: ActionEventRef) => void) | undefined;
  /** Paint in this scheme instead of following the host. */
  scheme?: Scheme | undefined;
}

const drawMetric = (
  node: MetricNode,
  scheme: Scheme,
  onEvent: MetricChartProps['onEvent']
): ChartDrawing => {
  const resolved = resolveMetric(node, scheme);
  const { tiles, columns, placeholders, tokens } = resolved;
  const grid = rows(
    [
      ...tiles.map((tile) => toDatum(tile, tokens)),
      ...Array.from({ length: placeholders }, () => undefined),
    ],
    columns
  );
  const interactive =
    onEvent !== undefined && tiles.some(({ action }) => action);
  return {
    readings: tiles,
    height: grid.length * tokens.rowHeight,
    theme: toTheme(resolved),
    series: <Metric id="metric" data={grid} />,
    onElementClick: interactive
      ? (events) => {
          const action = tileAction(resolved, events);
          if (action) {
            onEvent(action);
          }
        }
      : undefined,
  };
};

const MetricView = ({
  node,
  onEvent,
  scheme,
  attributes,
}: MetricChartProps & { attributes?: Readonly<Record<string, string>> }) => (
  <ElasticChart
    {...{ scheme, attributes }}
    draw={(painted) => drawMetric(node, painted, onEvent)}
  />
);

/** A `metric` node drawn with Elastic Charts' `Metric` chart. */
export const MetricChart = (props: MetricChartProps) => (
  <MetricView {...props} />
);

/** `react` renderers for the charts pack, drawn with Elastic Charts. */
export const elasticChartsRenderers: ChartRenderers = {
  metric: (node, { context }) => (
    <MetricView
      node={node}
      onEvent={context.onEvent}
      attributes={nodeAnchor(context, node)}
    />
  ),
};
