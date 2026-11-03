/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { command, commandLineWidth } from '../../theme/components/command';
import type { SlideSize } from '../../theme/variants';
import { openBody, type StepLayout } from '../layout';
import { measureText, stepWhere } from '../size';

import type { SlideCommandNode } from './schema';

const { prompt, text: role, textSizes } = command;

/** Pixels at `size`, prompt included. */
export const commandWidth = (text: string, size: SlideSize): number =>
  // The line is `white-space: pre`, so every space is a glyph `measureText` must not collapse.
  measureText(`${prompt.value}${text}`.replace(/ /g, ' '), {
    ...role,
    size: textSizes[size],
  }).widest;

/** The largest step at which the command fits its layout's width on one line. */
export const commandStep = (
  { command }: Pick<SlideCommandNode, 'command'>,
  { width }: Pick<StepLayout, 'width'> = openBody
): SlideSize =>
  stepWhere((step) => commandWidth(command, step) <= commandLineWidth(width));
