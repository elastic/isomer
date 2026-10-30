/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider, useEuiTheme } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import { Glyph } from './primitive_glyph';

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
  '<rect fill="var(--isomer-icon-fg)"/></svg>';

/** The theme colour the glyph paints with, so the test never hard-codes EUI's palette. */
const Subdued = () => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();
  return <span data-testid="subdued">{colors.textSubdued}</span>;
};

const tree = (colorMode: 'light' | 'dark') => (
  <EuiProvider {...{ colorMode }}>
    <Subdued />
    <span data-testid="glyph">
      <Glyph {...{ svg }} label="Callout" size={16} />
    </span>
  </EuiProvider>
);

const maskOf = () =>
  getComputedStyle(
    screen.getByTestId('glyph').firstElementChild as HTMLElement
  ).getPropertyValue('mask');

const subdued = () =>
  encodeURIComponent(screen.getByTestId('subdued').textContent ?? '');

describe('Glyph', () => {
  it('repaints the same svg when the colour mode changes', () => {
    const { rerender } = render(tree('light'));
    const light = subdued();
    expect(maskOf()).toContain(light);

    rerender(tree('dark'));
    const dark = subdued();
    expect(dark).not.toBe(light);
    expect(maskOf()).toContain(dark);
    expect(maskOf()).not.toContain(light);
  });

  it('shows the label initial without an svg', () => {
    render(
      <EuiProvider colorMode="light">
        <Glyph svg={undefined} label="callout" size={16} />
      </EuiProvider>
    );
    expect(screen.getByText('C')).toBeInTheDocument();
  });
});
