/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, monoAdvance, radius, space, stroke, type } from '../base';
import { px, scalePx } from '../scale';

import { frameContentWidth } from './frame';
import { glyph } from './shared';

export const code = {
  file: { ...type.mono, size: font.size.px24 },
  fileGap: space.px14,
  border: stroke.panel,
  radius: radius.panel,
  paddingY: space.px28,
  paddingX: space.px36,
  text: type.mono,
  // Tighter leading keeps `codeMaxLines` inside the body under a heading and lede.
  denseText: {
    ...type.mono,
    size: font.size.px24,
    lineHeight: font.lineHeight.compact,
  },
  highlightBar: stroke.bar,
  // `paddingX` less the bar, so highlighted text stays in column.
  highlightPaddingStart: px(32),
  arrowWidth: space.px72,
  panelGap: space.px24,
  /** Joins two panels in text, Markdown, and Slack. */
  traceArrow: glyph.arrow,
} as const;

/** Lines a panel holds before it takes `denseText`. */
export const codeDenseAfter = 10;

/** Lines a panel holds at `denseText`. */
export const codeMaxLines = 16;

/** Characters a line holds in a code panel `panel` pixels wide once `inset`, the chrome either side of the text, is taken out. */
export const codePanelColumns = (
  panel: number,
  inset: number,
  dense: boolean
): number => {
  const inner = Math.max(0, panel - 2 * scalePx(code.border) - inset);
  const size = dense ? code.denseText.size : code.text.size;
  return Math.floor(inner / (monoAdvance * scalePx(size)));
};

/** Characters a line holds across `width`, a full-width slide by default, before its panel clips it, by panel count and density. */
export const codeLineMaxLength = (
  panels: 1 | 2,
  dense: boolean,
  width = frameContentWidth
): number =>
  codePanelColumns(
    panels === 1
      ? width
      : (width - scalePx(code.arrowWidth) - 2 * scalePx(code.panelGap)) / 2,
    2 * scalePx(code.paddingX),
    dense
  );
