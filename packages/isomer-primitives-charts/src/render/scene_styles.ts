/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createVarsModule } from './styles';
import { CHARTS_THEME } from './theme';

const { linkHeight } = CHARTS_THEME.chart;

export const sceneModule = createVarsModule(
  'chartsScene',
  (vars) => ({
    size: vars('size', {
      aspectRatio: 'auto',
      minHeight: 'auto',
      maxWidth: 'none',
    }),
    chrome: vars('chrome', { ink: 'currentColor', fill: 'transparent' }),
  }),
  ({ css }, { size, chrome }) => ({
    /** The box a browser draws a fluid chart in, from its kind's size spec. */
    sized: css`
      ${size}
      width: 100%;
      aspect-ratio: ${size.aspectRatio};
      min-height: ${size.minHeight};
      max-width: ${size.maxWidth};
    `,
    link: css`
      ${chrome}
      color: ${chrome.ink};
      background: ${chrome.fill};
      display: block;
      height: ${linkHeight}px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: ${CHARTS_THEME.type.body}px;
      line-height: ${linkHeight}px;
    `,
  })
);
