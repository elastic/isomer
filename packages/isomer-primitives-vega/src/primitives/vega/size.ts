/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeNavigationHref } from '@elastic/isomer-sdk';

import { type VegaChartInput } from '../../render';
import { VEGA_LAYOUT } from '../../theme';
import type { VegaRenderContext } from '../define';

import { MAX_CHART_SIDE, type VegaNode } from './schema';

const { defaultSize, linkHeight } = VEGA_LAYOUT;

/** The node's link, when its `href` passes the SDK's navigation policy. */
export const linkOf = (node: VegaNode) => {
  const link = node.interactions?.link;
  const href = link && sanitizeNavigationHref(link.href);
  return link && href ? { href, label: link.label } : undefined;
};

/** The height of the lines drawn below the chart: its link, then the basemap's attribution. */
export const chromeHeight = (node: VegaNode) =>
  (linkOf(node) ? linkHeight : 0) +
  (node.basemap?.attribution ? linkHeight : 0);

const clampSide = (value: number) =>
  Math.max(16, Math.min(MAX_CHART_SIDE, Math.round(value)));

/** The box the chart draws in: the host's, less the lines below it; else the node's; else the default. */
export const vegaChartSize = (
  node: VegaNode,
  size: VegaRenderContext['size']
): { width: number; height: number } => {
  if (size) {
    return {
      width: clampSide(size.width),
      height: clampSide(size.height - chromeHeight(node)),
    };
  }
  return {
    width: node.width ?? defaultSize.width,
    height: node.height ?? defaultSize.height,
  };
};

export const chartInput = (
  node: VegaNode,
  size: { width: number; height: number }
): VegaChartInput => ({
  mode: node.mode,
  spec: node.spec,
  ...size,
  ...(node.results && { results: node.results }),
  ...(node.data && { data: node.data }),
});
