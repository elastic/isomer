/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { barsValueFormat } from '../../theme/components/bars';

const format = new Intl.NumberFormat('en-US', barsValueFormat);

/** A bar's value as printed: rounded to the theme's digits, never in exponent form. */
export const barValue = (value: number): string =>
  // `+ 0` turns `-0`, which `min(0)` admits, into `0`.
  format.format(value + 0);
