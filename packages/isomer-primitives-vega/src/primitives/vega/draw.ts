/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderVegaSvg, toVegaSpec } from '../../render';
import type { VegaTheme } from '../../theme';

import { TILE_SRC, type VegaNode } from './schema';
import { chartInput, vegaChartSize } from './size';

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

/**
 * The SVG every surface draws for `node` in a `width` × `height` box, basemap
 * included. Tiles are stamped for the node's own size, so a chart with tiles
 * draws at that size and scales into the box with them.
 */
export const drawVegaNode = (
  node: VegaNode,
  size: { width: number; height: number },
  theme: VegaTheme
): string => {
  const drawn = node.basemap?.tiles.length
    ? vegaChartSize(node, undefined)
    : size;
  return withBasemap(
    renderVegaSvg(toVegaSpec(chartInput(node, drawn), theme), size).svg,
    node.basemap
  );
};
