/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font } from '../base';

import { heading } from './heading';

/** `slideStatement`: one thesis sentence, alone on the slide. */
export const statement = {
  text: {
    size: font.size.px128,
    weight: font.weight.extrabold,
    tracking: font.tracking.stat,
    lineHeight: font.lineHeight.heading,
  },
  textSizes: { l: font.size.px128, m: font.size.px112, s: font.size.px96 },
  maxWidth: heading.titleMaxWidth,
} as const;

/** Characters each step holds: about four lines at `l`, five at `m`. */
export const statementFit = { l: 84, m: 120 } as const;
