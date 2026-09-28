/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, monoAdvance, radius, space, stroke, type } from '../base';
import { literal, px, scalePx } from '../scale';

import { frameContentWidth } from './frame';

/** `slideCode`: one or two code panels. */
export const code = {
  file: { ...type.mono, size: font.size.px24 },
  fileGap: space.px14,
  border: stroke.panel,
  radius: radius.panel,
  paddingY: space.px28,
  paddingX: space.px36,
  text: type.mono,
  /** When either panel has more than ten lines. */
  denseText: { ...type.mono, size: font.size.px24 },
  highlightBar: stroke.bar,
  // `paddingX` less the bar, so highlighted text stays in column.
  highlightPaddingStart: px(32),
  arrowWidth: space.px72,
  panelGap: space.px24,
  /** Joins two panels in text, markdown, and Slack. */
  traceArrow: literal('→'),
} as const;

/** Lines a panel holds before it takes `denseText`. */
export const codeDenseAfter = 10;

/** Characters a line holds on a full-width slide before its panel clips it, by panel count and density. */
export const codeLineMaxLength = (panels: 1 | 2, dense: boolean): number => {
  const width =
    panels === 1
      ? frameContentWidth
      : (frameContentWidth -
          scalePx(code.arrowWidth) -
          2 * scalePx(code.panelGap)) /
        2;
  const inner = width - 2 * scalePx(code.border) - 2 * scalePx(code.paddingX);
  const size = dense ? code.denseText.size : code.text.size;
  return Math.floor(inner / (monoAdvance * scalePx(size)));
};
