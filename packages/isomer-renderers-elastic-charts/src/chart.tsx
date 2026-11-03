/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ReactNode, useRef } from 'react';
import {
  Chart,
  DARK_THEME,
  type ElementClickListener,
  LIGHT_THEME,
  type PartialTheme,
  Settings,
} from '@elastic/charts';
import type { Scheme } from '@elastic/isomer-primitives-charts/model';

import { useScheme } from './scheme';

/** What {@link ElasticChart} draws in one scheme. */
export interface ChartDrawing {
  /** One line per mark, for server markup and before the chart mounts. */
  readings: ReadonlyArray<{ key: string; reading: string }>;
  /** The chart's height when the host's height is indefinite. */
  height: number;
  theme: PartialTheme;
  /** The chart's series, inside `Chart` after its `Settings`. */
  series: ReactNode;
  /** Absent renders the chart inert. */
  onElementClick?: ElementClickListener | undefined;
}

/** Props of {@link ElasticChart}. */
export interface ElasticChartProps {
  /** Paint in this scheme instead of following the host. */
  scheme?: Scheme | undefined;
  attributes?: Readonly<Record<string, string>> | undefined;
  draw: (scheme: Scheme) => ChartDrawing;
}

/** An Elastic Charts `Chart` in the host's scheme, filling the host or sized by `height`. */
export const ElasticChart = ({
  scheme: fixed,
  attributes,
  draw,
}: ElasticChartProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const scheme = useScheme(ref, fixed);
  const { readings, height, theme, series, onElementClick } = draw(
    scheme ?? 'light'
  );
  return (
    <div
      {...attributes}
      ref={ref}
      style={{ position: 'relative', height: '100%' }}>
      {scheme === undefined ? (
        <ul>
          {readings.map(({ key, reading }) => (
            <li key={key}>{reading}</li>
          ))}
        </ul>
      ) : (
        <>
          {/* Sizes the chart only when the host's height is indefinite. */}
          <div style={{ height, maxHeight: '100%' }} />
          <div style={{ position: 'absolute', inset: 0 }}>
            <Chart>
              <Settings
                baseTheme={scheme === 'dark' ? DARK_THEME : LIGHT_THEME}
                theme={theme}
                {...(onElementClick ? { onElementClick } : {})}
              />
              {series}
            </Chart>
          </div>
        </>
      )}
    </div>
  );
};
