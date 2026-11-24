/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The engine on a server: the browser renderer's specs, drawn to static markup
// by Elastic Charts' `renderChart`.

import { type ReactNode, useId } from 'react';
import { Chart } from '@elastic/charts';
import { renderChart } from '@elastic/charts/headless';
import type {
  Scene,
  SceneKind,
  SceneRenderer,
} from '@elastic/isomer-primitives-charts/scene';

import { EmptyChart } from './renderer';
import { emptyTextOf } from './shared/empty';
import type { ElasticChartsOptions } from './shared/options';
import { sceneSpecs } from './specs';

/** Every kind the browser renderer draws but `tagCloud`: `renderChart` throws for a word cloud. */
const KINDS: readonly SceneKind[] = [
  'metric',
  'xy',
  'partition',
  'heatmap',
  'gauge',
];

/** FNV-1a. */
const hash = (text: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  }
  return (h >>> 0).toString(36);
};

/** The Scene's content but its `table`, whose rows are formatted on first read and are not drawn. */
const sceneId = ({ table: _table, ...drawn }: Scene): string =>
  `ech-${hash(JSON.stringify(drawn))}`;

/**
 * `useId`'s value in letters and digits, which Elastic Charts leaves as they
 * are in its clip-path ids: each other UTF-16 unit, and `Z`, becomes `Z` and
 * four hex digits, so distinct values stay distinct.
 */
const encodeId = (id: string): string =>
  id.replace(
    /[^0-9A-Ya-z]/g,
    (unit) => `Z${unit.charCodeAt(0).toString(16).padStart(4, '0')}`
  );

/**
 * Elastic Charts prefixes every id in a chart's markup with the chart's.
 * `id` names the Scene, so it is the same on every render and differs
 * between charts; `useId` tells apart two drawings of one Scene on a page.
 */
const StaticChart = ({ html, id }: { html: string; id: string }) => {
  const occurrence = encodeId(useId());
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: html.replaceAll(id, `${id}-${occurrence}`),
      }}
    />
  );
};

/**
 * A `SceneRenderer` drawing Scenes on Node with Elastic Charts' `renderChart`,
 * as static markup at the Scene's size. The markup needs Elastic Charts'
 * `theme_only_light.css` or `theme_only_dark.css` for the Scene's scheme,
 * then {@link ELASTIC_CHARTS_HOST_RULES}.
 */
export const createElasticChartsNodeRenderer = (
  options: ElasticChartsOptions = {}
): SceneRenderer<ReactNode> => ({
  id: 'elastic-charts-node',
  environments: ['node'],
  sized: true,
  supports: (kind) => KINDS.includes(kind),
  render: (scene, env) => {
    const empty = emptyTextOf(scene);
    if (empty !== undefined) {
      return <EmptyChart scene={scene} text={empty} env={env} />;
    }
    const { size } = scene;
    if (size === undefined) {
      throw new Error('The Elastic Charts Node renderer needs a Scene size.');
    }
    const id = sceneId(scene);
    const html = renderChart(
      <Chart id={id} size={size}>
        {sceneSpecs(scene, env, options)}
      </Chart>
    );
    return <StaticChart html={html} id={id} />;
  },
});

/**
 * What Elastic Charts' stylesheet expects of its page, which EUI's global
 * styles give it in Kibana: the rules `renderChart`'s docs list, for a page
 * without them. They go after Elastic Charts' stylesheet.
 */
export const ELASTIC_CHARTS_HOST_RULES = `
.echChart {
  font: 400 14px/1.1428571429 Inter, BlinkMacSystemFont, Helvetica, Arial, sans-serif;
}
:where(.echChart) *,
:where(.echChart) *::before,
:where(.echChart) *::after {
  box-sizing: border-box;
}
:where(.echChart) :is(ul, li, h2, p, figure) {
  margin: 0;
  padding: 0;
  list-style: none;
}
.echChart :is(.echLegendItem__label, .echLegendItem__legendValue, .echLegendTable__cell, .echLegend__legendValue, .echReactiveChart_noResults) {
  font-size: 12px;
}
`;
