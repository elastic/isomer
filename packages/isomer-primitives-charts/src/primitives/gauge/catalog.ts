/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk/schema';

import { gaugeSemiCircle } from './examples';

/** What an agent reads to choose `gauge`: purpose, when to use it, and an example. */
export const gaugeCatalog: PrimitiveCatalogEntry = {
  type: 'gauge',
  name: 'Gauge',
  purpose:
    'Show one value against a scale from a minimum to a maximum, as a bullet or a dial, with colored ranges and an optional goal.',
  useWhen: [
    'The point is where one value sits within known bounds, such as utilization against capacity.',
    'Ranges of the scale mean something, such as healthy, warning and critical.',
    'A Lens gauge is shown.',
  ],
  avoidWhen: [
    'The value has no meaningful bounds: use `metric`.',
    'Several values are compared: use `xyChart` bars or `metric` tiles.',
    'The value changes over time: use `xyChart`.',
  ],
  example: gaugeSemiCircle,
};
