/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideSourceNode}. */
export const catalog = {
  type: 'slideSource',
  name: 'Source',
  description: 'One citation line.',
  purpose:
    'Tell the audience where the numbers or claims on a slide come from, without taking attention from them.',
  useWhen: [
    'The slide shows figures, counts, or findings taken from a report, a dataset, or a survey; place it last in the frame body.',
    'A claim on the slide would prompt “says who?” and the answer fits on one line.',
  ],
  avoidWhen: [
    'The line explains or qualifies the slide’s point; put it in the slideHeading `lede`.',
    'The line draws a conclusion under two columns; put it in the slideSplit `footnote`.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
