/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import {
  Chart,
  DARK_THEME,
  LIGHT_THEME,
  Metric,
  Settings,
} from '@elastic/charts';
import type { ChartRenderers } from '@elastic/isomer-primitives-charts';
import {
  type MetricNode,
  type ResolvedMetric,
  resolveMetric,
  type Scheme,
} from '@elastic/isomer-primitives-charts/model';
import { type ActionEventRef, nodeAnchor } from '@elastic/isomer-sdk';

import { toDatum, toTheme } from './datum';
import { useScheme } from './scheme';

const rows = <T,>(items: T[], columns: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / columns) }, (_, row) =>
    items.slice(row * columns, (row + 1) * columns)
  );

export interface MetricChartProps {
  node: MetricNode;
  /** Receives a tile's action; absent renders the chart inert. */
  onEvent?: ((event: ActionEventRef) => void) | undefined;
  /** Paint in this scheme instead of following the host. */
  scheme?: Scheme | undefined;
}

/** Text of every tile, for server markup and before the chart mounts. */
const Readings = ({ resolved }: { resolved: ResolvedMetric }) => (
  <ul>
    {resolved.tiles.map(({ key, reading }) => (
      <li key={key}>{reading}</li>
    ))}
  </ul>
);

const MetricView = ({
  node,
  onEvent,
  scheme: fixed,
  attributes,
}: MetricChartProps & { attributes?: Readonly<Record<string, string>> }) => {
  const ref = useRef<HTMLDivElement>(null);
  const scheme = useScheme(ref, fixed);
  const resolved = resolveMetric(node, scheme ?? 'light');
  const { tiles, columns, tokens } = resolved;
  const grid = rows(tiles, columns);
  const interactive =
    onEvent !== undefined && tiles.some(({ action }) => action);
  // The spacer sizes the chart only when the host's height is indefinite.
  return (
    <div
      {...attributes}
      ref={ref}
      style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <div style={{ height: grid.length * tokens.rowHeight }} />
      <div style={{ position: 'absolute', inset: 0 }}>
        {scheme === undefined ? (
          <Readings resolved={resolved} />
        ) : (
          <Chart>
            <Settings
              baseTheme={scheme === 'dark' ? DARK_THEME : LIGHT_THEME}
              theme={toTheme(resolved)}
              {...(interactive
                ? {
                    onElementClick: ([event]) => {
                      const action =
                        event &&
                        'type' in event &&
                        event.type === 'metricElementEvent' &&
                        tiles[event.rowIndex * columns + event.columnIndex]
                          ?.action;
                      if (action) {
                        onEvent(action);
                      }
                    },
                  }
                : {})}
            />
            <Metric
              id="metric"
              data={grid.map((row) => row.map((tile) => toDatum(tile, tokens)))}
            />
          </Chart>
        )}
      </div>
    </div>
  );
};

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
