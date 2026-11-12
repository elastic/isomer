/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import type { LegacyMetricScene, MetricAlignment } from '../scene/types';

import { createVarsModule } from './styles';
import { CHARTS_THEME } from './theme';

const ALIGNMENTS: readonly MetricAlignment[] = ['left', 'center', 'right'];
const POSITIONS: readonly LegacyMetricScene['labelPosition'][] = [
  'top',
  'bottom',
];

const ellipsis = `
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/**
 * The legacy metric's handles, laid out as Kibana's `legacyMtrVis` container
 * and `legacyMtrVis__container` tiles, and the vars a Scene's colors and sizes
 * reach them through.
 */
export const legacyMetricModule = createVarsModule(
  'chartsLegacyMetric',
  (vars) => ({
    box: vars('box', {
      width: '100%',
      height: '100%',
      fill: 'transparent',
      ink: 'currentColor',
    }),
    tile: vars('tile', { fill: 'transparent', padding: '0px', width: 'auto' }),
    text: vars('text', {
      size: 'inherit',
      color: 'currentColor',
      lineHeight: 'normal',
      weight: 'normal',
    }),
  }),
  ({ css }, { box, tile, text }) => ({
    root: css`
      ${box}
      box-sizing: border-box;
      width: ${box.width};
      height: ${box.height};
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      align-content: center;
      overflow: hidden;
      color: ${box.ink};
      background: ${box.fill};
    `,
    tile: css`
      ${tile}
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      flex: none;
      width: ${tile.width};
      max-width: 100%;
      min-width: 0;
      padding: ${tile.padding};
      background: ${tile.fill};
    `,
    selectable: css`
      cursor: pointer;
    `,
    align: variants(
      ALIGNMENTS,
      (alignment) => css`
        text-align: ${alignment};
      `
    ),
    text: css`
      ${text}
      ${ellipsis}
      font-size: ${text.size};
      line-height: ${text.lineHeight};
      font-weight: ${text.weight};
      color: ${text.color};
    `,
    label: variants(
      POSITIONS,
      (position) => css`
        order: ${position === 'top' ? -1 : 2};
      `
    ),
    note: css`
      ${ellipsis}
      flex: none;
      width: 100%;
      height: ${CHARTS_THEME.chart.legacyMetric.noteHeight}px;
      line-height: ${CHARTS_THEME.chart.legacyMetric.noteHeight}px;
      font-size: ${CHARTS_THEME.type.body}px;
      text-align: center;
    `,
    empty: css`
      font-size: ${CHARTS_THEME.type.body}px;
    `,
  })
);
