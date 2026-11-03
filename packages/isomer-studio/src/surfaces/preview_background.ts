/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const usePreviewBackground = () => {
  const { euiTheme } = useEuiTheme();
  const { backgroundBasePlain, borderBasePlain } = euiTheme.colors;

  return css`
    background-color: ${backgroundBasePlain};
    background-image: radial-gradient(
      circle,
      ${borderBasePlain} 1px,
      transparent 1px
    );
    background-size: 16px 16px;
    background-position: 8px 8px;
  `;
};
