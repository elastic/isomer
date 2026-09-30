/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bars,
  barsValueFormat,
  barsValueLocale,
} from '../../theme/components/bars';

const format = new Intl.NumberFormat(barsValueLocale, barsValueFormat);
const smallest = format.format(10 ** -barsValueFormat.maximumFractionDigits);

/** Rounded to the theme's digits, never in exponent form; a positive value that rounds to zero prints as below the smallest step, e.g. `<0.01`. */
export const barValue = (value: number): string => {
  // `+ 0` turns `-0`, which `min(0)` admits, into `0`.
  const shown = format.format(value + 0);
  return value > 0 && Number(shown) === 0
    ? `${bars.valueBelow.value}${smallest}`
    : shown;
};
