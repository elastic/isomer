/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeAnchor } from '@elastic/isomer-sdk';

import { renderVegaSvg, toVegaSpec } from '../../render';
import {
  chromeStyle,
  cls,
  VEGA_THEMES,
  vegaModule,
  type VegaScheme,
} from '../../theme';
import type { VegaReactEnv } from '../define';

import { TILE_SRC, type VegaNode } from './schema';
import { chartInput, linkOf, vegaChartSize } from './size';
import { summaryOf } from './text';

const schemeOfTheme = (theme: unknown): VegaScheme | undefined => {
  if (typeof theme !== 'object' || theme === null || !('scheme' in theme)) {
    return undefined;
  }
  const { scheme } = theme;
  return scheme === 'light' || scheme === 'dark' ? scheme : undefined;
};

const round = (value: number) => Math.round(value * 100) / 100;

/** `svg` with `basemap`'s tiles as its first children, under everything Vega drew. */
const withBasemap = (svg: string, basemap: VegaNode['basemap']): string => {
  if (!basemap?.tiles.length) {
    return svg;
  }
  const tiles = basemap.tiles
    .filter(({ src }) => TILE_SRC.test(src))
    .map(
      ({ src, x, y, width, height }) =>
        `<image href="${src}" x="${round(x)}" y="${round(y)}" width="${round(
          width
        )}" height="${round(height)}" preserveAspectRatio="none"/>`
    )
    .join('');
  return svg.replace(
    /^(<svg[^>]*>)/,
    `$1<g data-isomer-vega-basemap="">${tiles}</g>`
  );
};

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
    vegaSpec = toVegaSpec(chartInput(node, size), theme);
    svg = withBasemap(renderVegaSvg(vegaSpec, size).svg, node.basemap);
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
  const chartClass = cls(context, vegaModule.handles.chart);
  return (
    <div data-isomer-vega="" {...anchor}>
      <div
        className={chartClass}
        data-isomer-vega-chart=""
        role="img"
        aria-label={label}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {lines}
    </div>
  );
};
