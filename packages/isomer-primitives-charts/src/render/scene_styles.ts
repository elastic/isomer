/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartsDistillery } from './styles';
import { CHARTS_THEME } from './theme';

const { linkHeight } = CHARTS_THEME.chart;

export const sceneModule = chartsDistillery.createStyleModule(
  'chartsScene',
  ({ css }) => ({
    link: css`
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
