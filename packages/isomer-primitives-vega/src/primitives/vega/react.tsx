/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ChartEvent,
  toActionEvent,
} from '@elastic/isomer-primitives-charts/schema';
import { nodeAnchor } from '@elastic/isomer-sdk';

import { LiveChart } from '../../render';
import {
  chromeStyle,
  cls,
  VEGA_THEMES,
  vegaModule,
  type VegaScheme,
} from '../../theme';
import type { VegaReactEnv } from '../define';

import { drawVegaChart } from './draw';
import { VEGA_INTERACTIVE } from './interactive';
import type { VegaNode } from './schema';
import { linkOf, vegaChartSize } from './size';
import { summaryOf } from './text';

const schemeOfTheme = (theme: unknown): VegaScheme | undefined => {
  if (typeof theme !== 'object' || theme === null || !('scheme' in theme)) {
    return undefined;
  }
  const { scheme } = theme;
  return scheme === 'light' || scheme === 'dark' ? scheme : undefined;
};

/** JSON safe inside a `<script>`: no `<` can close it and no line separator can break it. */
const scriptJson = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

/** A chart with host results or a basemap draws statically: a live view would lose either. */
const canGoLive = (node: VegaNode) => !node.basemap && !node.results?.length;

/** `data` without the opaque host `source` fields, which events never read and a page need not carry. */
const withoutSources = ({
  source: _source,
  columns,
  ...rest
}: NonNullable<VegaNode['data']>) => ({
  ...rest,
  columns: columns.map(({ source: _column, ...column }) => column),
});

/** The fields a live view needs to raise events. */
const liveNode = ({ id, data, interactions }: VegaNode) => ({
  ...(id !== undefined && { id }),
  ...(data && { data: withoutSources(data) }),
  ...(interactions && { interactions }),
});

export const react = (
  node: VegaNode,
  { context, theme: frameTheme }: VegaReactEnv
) => {
  const scheme = context?.scheme ?? schemeOfTheme(frameTheme) ?? 'light';
  const theme = VEGA_THEMES[scheme];
  const size = vegaChartSize(node, context?.size);
  const link = linkOf(node);
  const attribution = node.basemap?.attribution;
  const anchor = nodeAnchor(context, node);
  const chrome = chromeStyle({ ink: theme.text, fill: theme.background });
  const label = summaryOf(node);
  const lines = (
    <>
      {link && (
        <a
          href={link.href}
          title={link.label}
          className={cls(context, vegaModule.handles.link)}
          style={chrome}>
          {link.label}
        </a>
      )}
      {attribution && (
        <div
          className={cls(context, vegaModule.handles.attribution)}
          style={chrome}>
          {attribution}
        </div>
      )}
    </>
  );
  let vegaSpec;
  let svg;
  try {
    ({ spec: vegaSpec, svg } = drawVegaChart(node, size, theme));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return (
      <div data-isomer-vega="" {...anchor}>
        <div
          role="note"
          data-isomer-vega-error={reason}
          className={cls(context, vegaModule.handles.note)}
          style={chromeStyle({
            ink: theme.text,
            height: `${size.height}px`,
          })}>
          <strong className={cls(context, vegaModule.handles.noteTitle)}>
            {node.title ?? 'Vega chart'}
          </strong>
          <span className={cls(context, vegaModule.handles.noteBody)}>
            {node.description}
          </span>
        </div>
        {lines}
      </div>
    );
  }
  const onEvent =
    context?.onEvent &&
    ((event: ChartEvent) => context.onEvent?.(toActionEvent(event)));
  const embed =
    frameTheme === undefined &&
    canGoLive(node) &&
    context?.enhancements?.has(VEGA_INTERACTIVE);
  const chartClass = cls(context, vegaModule.handles.chart);
  return (
    <div data-isomer-vega="" {...anchor}>
      {frameTheme === undefined && canGoLive(node) ? (
        <LiveChart
          svg={svg}
          spec={vegaSpec}
          node={liveNode(node)}
          onEvent={onEvent}
          className={chartClass}
          label={label}
        />
      ) : (
        <div
          className={chartClass}
          data-isomer-vega-chart=""
          role="img"
          aria-label={label}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
      {embed && (
        <script
          type="application/json"
          data-isomer-vega-spec=""
          dangerouslySetInnerHTML={{
            __html: scriptJson({ spec: vegaSpec, node: liveNode(node) }),
          }}
        />
      )}
      {lines}
    </div>
  );
};
