/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { ChartEvent } from '@elastic/isomer-primitives-charts/schema';

import type { SpecObject } from '../schema/spec';

import { type LiveVegaNode, startLiveView } from './live';

export interface LiveChartProps {
  readonly svg: string;
  readonly spec: SpecObject;
  readonly node: LiveVegaNode;
  readonly onEvent?: ((event: ChartEvent) => void) | undefined;
  readonly className: string;
  readonly label: string;
}

/**
 * The server's SVG, replaced in a browser by a live view of the same spec
 * once mounted. Effects never run on a server, so `html` and `snapshot`
 * output is the SVG alone.
 */
export const LiveChart = ({
  svg,
  spec,
  node,
  onEvent,
  className,
  label,
}: LiveChartProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const handler = useRef(onEvent);
  handler.current = onEvent;
  const interactive = onEvent !== undefined;
  const events = JSON.stringify([node.id, node.interactions]);
  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return undefined;
    }
    let disposed = false;
    let finalize: (() => void) | undefined;
    startLiveView(container, spec, {
      node,
      ...(interactive && {
        onEvent: (event: ChartEvent) => handler.current?.(event),
      }),
    })
      .then((view) => {
        finalize = () => view.finalize();
        if (disposed) {
          finalize();
        }
      })
      .catch(() => {
        // The server's SVG stays where the view cannot start.
      });
    return () => {
      disposed = true;
      finalize?.();
    };
    // `svg` changes whenever the spec, data, size or scheme does; `events` covers the rest of what the view reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svg, interactive, events]);
  return (
    <div
      ref={ref}
      className={className}
      data-isomer-vega-chart=""
      role="img"
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
