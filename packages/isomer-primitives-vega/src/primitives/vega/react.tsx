/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeAnchor } from '@elastic/isomer-sdk';

import {
  chromeStyle,
  cls,
  VEGA_THEMES,
  vegaModule,
  type VegaScheme,
} from '../../theme';
import type { VegaReactEnv } from '../define';

import { drawVegaNode } from './draw';
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
  let svg;
  try {
    svg = drawVegaNode(node, size, theme);
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
