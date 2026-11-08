/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A document to draw charts into on the `snapshot` surface: the body in a
// column on the scheme's background, sized to its content. Its palette carries
// `scheme`, which the pack's charts read to resolve for that scheme.

import type { Frame } from '@elastic/isomer-sdk';

import { CHARTS_THEME } from './render/theme';
import { CHART_CHROME } from './scene/theme';
import type { ColorScheme } from './scene/types';

/** The palette {@link chartsFrame} draws with, per scheme. */
export interface ChartsFrameTheme {
  readonly scheme: ColorScheme;
  readonly background: string;
  readonly text: string;
}

const themeFor = (scheme: ColorScheme): ChartsFrameTheme => ({
  scheme,
  background: CHART_CHROME[scheme].background,
  text: CHART_CHROME[scheme].text,
});

const { width, padding, gap, title, subtitle } = CHARTS_THEME.frame;

/** One line at `size`, so the line is as tall as `estimateHeight` counts it. */
const line = (size: number) => ({
  margin: 0,
  fontSize: size,
  lineHeight: `${size}px`,
});

/** A content-sized page of charts. Register as `frames: { charts: chartsFrame }`. */
export const chartsFrame: Frame<ChartsFrameTheme> = {
  defaultWidth: width,
  sizing: 'content',
  theme: { light: themeFor('light'), dark: themeFor('dark') },
  estimateHeight: (composition, dispatcher) => {
    const nodes = composition.body.map((node) =>
      dispatcher.estimateSnapshotHeight(node)
    );
    return (
      2 * padding +
      (composition.title ? title + gap : 0) +
      (composition.subtitle ? subtitle + gap : 0) +
      nodes.reduce((total, height) => total + height, 0) +
      Math.max(0, nodes.length - 1) * gap
    );
  },
  wrap: (header, body, { width: pageWidth, theme }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
        width: pageWidth,
        padding,
        boxSizing: 'border-box',
        background: theme.background,
        color: theme.text,
      }}>
      {header.title && <h1 style={line(title)}>{header.title}</h1>}
      {header.subtitle && <p style={line(subtitle)}>{header.subtitle}</p>}
      {body}
    </div>
  ),
};
