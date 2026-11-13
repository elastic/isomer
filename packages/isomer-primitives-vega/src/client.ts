/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Makes `html` output live: each chart rendered with the `vegaInteractive`
// enhancement carries its compiled spec, and the node fields its events need.

import {
  type ChartEvent,
  toActionEvent,
} from '@elastic/isomer-primitives-charts/schema';
import type { ActionEventRef } from '@elastic/isomer-sdk/schema';
import type { View } from 'vega';

import { type LiveVegaNode, startLiveView } from './render/live';
import { isSpecObject, type SpecObject } from './schema/spec';

export interface HydratedVega {
  views: readonly View[];
  /** Finalizes every view, removing its listeners and timers. */
  dispose: () => void;
}

export interface HydrateVegaOptions {
  /** Receives each chart event as the SDK's `ActionEventRef`, `chart.select` or `chart.brush`. */
  readonly onEvent?: (event: ActionEventRef) => void;
}

interface Embedded {
  spec: SpecObject;
  node?: LiveVegaNode;
}

const readEmbedded = (chart: Element): Embedded | undefined => {
  const source = chart.querySelector(
    'script[data-isomer-vega-spec]'
  )?.textContent;
  if (!source) {
    return undefined;
  }
  const embedded: unknown = JSON.parse(source);
  if (!isSpecObject(embedded) || !isSpecObject(embedded.spec)) {
    return undefined;
  }
  return {
    spec: embedded.spec,
    ...(isSpecObject(embedded.node) && {
      node: embedded.node,
    }),
  };
};

/**
 * Replaces each server-rendered chart under `root` with a live Vega view, for
 * tooltips, signals and chart events. Needs the `vegaInteractive` enhancement
 * on the render, which embeds each chart's spec; a chart without one keeps its
 * SVG.
 */
export const hydrateVega = async (
  root: ParentNode,
  { onEvent }: HydrateVegaOptions = {}
): Promise<HydratedVega> => {
  const charts = Array.from(root.querySelectorAll('[data-isomer-vega]'));
  const raise =
    onEvent && ((event: ChartEvent) => onEvent(toActionEvent(event)));
  // A chart that cannot start keeps its server SVG and leaves the others live.
  const start = async (chart: Element): Promise<View[]> => {
    const container = chart.querySelector('[data-isomer-vega-chart]');
    if (!(container instanceof HTMLElement)) {
      return [];
    }
    try {
      const embedded = readEmbedded(chart);
      if (embedded === undefined) {
        return [];
      }
      return [
        await startLiveView(container, embedded.spec, {
          ...(raise && { onEvent: raise }),
          ...(embedded.node && { node: embedded.node }),
        }),
      ];
    } catch {
      return [];
    }
  };
  const views = (await Promise.all(charts.map(start))).flat();
  return {
    views,
    dispose: () => {
      for (const view of views) {
        view.finalize();
      }
    },
  };
};
