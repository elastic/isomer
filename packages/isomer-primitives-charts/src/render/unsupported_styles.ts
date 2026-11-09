/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartsDistillery } from './styles';
import { CHARTS_THEME } from './theme';

const { padding, borderWidth } = CHARTS_THEME.unsupported;

export const unsupportedModule = chartsDistillery.createStyleModule(
  'chartsUnsupported',
  ({ css }) => ({
    root: css`
      display: flex;
      flex-direction: column;
      gap: ${padding / 2}px;
      padding: ${padding}px;
      border: ${borderWidth}px dashed currentColor;
    `,
    title: css`
      font-size: ${CHARTS_THEME.type.title}px;
    `,
    body: css`
      font-size: ${CHARTS_THEME.type.body}px;
    `,
  })
);
