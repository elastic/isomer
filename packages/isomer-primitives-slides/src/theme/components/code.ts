/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { literal, px } from '../scale';

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
