/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { displayColumns } from '../../render/mono';
import { monoAdvance } from '../../theme/base';
import { command, commandLineWidth } from '../../theme/components/command';
import { scalePx } from '../../theme/scale';
import { type SlideSize, slideSizes } from '../../theme/variants';

const { prompt, textSizes } = command;

/** Pixels at `size`, prompt included. */
export const commandWidth = (text: string, size: SlideSize): number =>
  displayColumns(`${prompt.value}${text}`) *
  monoAdvance *
  scalePx(textSizes[size]);

export const commandSize = (text: string): SlideSize =>
  slideSizes.find((size) => commandWidth(text, size) <= commandLineWidth) ??
  's';
