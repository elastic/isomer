/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { command, commandLineWidth } from '../../theme/components/command';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { measureText } from '../size';

const { prompt, text: role, textSizes } = command;

/** Pixels at `size`, prompt included. */
export const commandWidth = (text: string, size: SlideSize): number =>
  // The line is `white-space: pre`, so every space is a glyph `measureText` must not collapse.
  measureText(`${prompt.value}${text}`.replace(/ /g, ' '), {
    ...role,
    size: textSizes[size],
  }).widest;

/** The largest step at which `text` fits a layout `width` wide. */
export const commandSize = (text: string, width?: number): SlideSize =>
  slideSizes.find(
    (size) => commandWidth(text, size) <= commandLineWidth(width)
  ) ?? 's';
