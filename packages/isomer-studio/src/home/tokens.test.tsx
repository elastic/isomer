/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  calculateContrast,
  EuiProvider,
  hexToRgb,
  useEuiTheme,
} from '@elastic/eui';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { homeColors } from './tokens';

/** The dark theme Home is rendered in. */
const darkTheme = (): UseEuiTheme['euiTheme'] => {
  let theme: UseEuiTheme['euiTheme'] | undefined;
  const Capture = () => {
    theme = useEuiTheme().euiTheme;
    return null;
  };
  render(
    <EuiProvider colorMode="dark">
      <Capture />
    </EuiProvider>
  );
  if (!theme) {
    throw new Error('EuiProvider rendered no theme');
  }
  return theme;
};

describe('Home action colors', () => {
  const colors = homeColors(darkTheme());

  for (const action of ['docs', 'dev', 'app', 'accent'] as const) {
    for (const surface of ['action', 'actionHover'] as const) {
      it(`keeps ${action} text at AA contrast over ${surface}`, () => {
        expect(
          calculateContrast(hexToRgb(colors[action]), hexToRgb(colors[surface]))
        ).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
