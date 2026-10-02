/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Zod for the value shapes the sdk already owns types for: `NamedColor`, and
// the structured display value.
//
// Only the shapes the sdk owns belong here. That is what lets any vocabulary
// package validate a color or a display value without depending on another
// pack's schemas.

import { z } from 'zod';

import { ALL_NAMED_COLORS, type NamedColor } from '../composition/named_color';
import { STRUCTURED_VALUE_FORMATS } from '../composition/structured_value';
import { oneOf } from '../define/zod_format';
import { requiredString } from '../define/zod_helpers';

// An enum whose own message names the accepted values, as validation reports it.
const closedEnum = <const T extends readonly [string, ...string[]]>(
  values: T
) => z.enum(values, { error: () => oneOf(values) });

/** Derived from {@link ALL_NAMED_COLORS} rather than restating the literals. */
export const namedColorSchema = closedEnum(
  ALL_NAMED_COLORS as [NamedColor, ...NamedColor[]]
);

/** `RenderTheme`: the light/dark preference a caller asks for. */
export const renderThemeSchema = closedEnum(['auto', 'light', 'dark']);

/**
 * The raw quantity plus a format hint, formatted once in a primitive's model so
 * every surface renders the same string. See `StructuredValue`.
 */
export const structuredValueSchema = z.object({
  raw: z.union([z.number(), requiredString()], {
    error: () => 'must be a finite number or a non-empty string',
  }),
  format: closedEnum(STRUCTURED_VALUE_FORMATS).optional(),
  precision: z
    .number({ error: () => 'must be an integer between 0 and 6' })
    .int({ error: 'must be an integer between 0 and 6' })
    .min(0, { error: 'must be an integer between 0 and 6' })
    .max(6, { error: 'must be an integer between 0 and 6' })
    .optional(),
  currency: z.string({ error: () => 'must be a string' }).optional(),
});

/** Value-bearing fields accept preformatted prose or a structured value. */
export const displayValueSchema = z.union(
  [requiredString(), structuredValueSchema],
  {
    error: () =>
      'must be a non-empty string or a structured value ({ raw, format?, precision?, currency? })',
  }
);
