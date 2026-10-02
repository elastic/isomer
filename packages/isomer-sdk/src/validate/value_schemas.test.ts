/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { bodyNodeSurfacesSchema } from '../define/primitive_module';
import { formatDisplayValue } from '../render/format_display_value';

import {
  namedColorSchema,
  renderThemeSchema,
  structuredValueSchema,
} from './value_schemas';

describe('closed enum schemas', () => {
  it.each([
    [
      'renderThemeSchema',
      renderThemeSchema,
      'x',
      'must be one of: auto, light, dark',
    ],
    ['namedColorSchema', namedColorSchema, 'x', /^must be one of: /],
    [
      'bodyNodeSurfacesSchema',
      bodyNodeSurfacesSchema,
      ['x'],
      /^must be one of: react, svg/,
    ],
  ])(
    '%s names the accepted values in its own message',
    (_name, schema, value, message) => {
      expect(schema.safeParse(value).error?.issues[0]?.message).toMatch(
        message
      );
    }
  );

  it('names the accepted formats for a structured value', () => {
    expect(
      structuredValueSchema.safeParse({ raw: 1, format: 'x' }).error?.issues[0]
        ?.message
    ).toMatch(/^must be one of: number/);
  });
});

describe('structuredValueSchema currency', () => {
  it('rejects a currency code Intl.NumberFormat would throw on', () => {
    expect(
      structuredValueSchema.safeParse({
        raw: 5,
        format: 'currency',
        currency: 'dollars',
      }).error?.issues[0]?.message
    ).toBe('must be a three-letter currency code');
  });

  it('formats a valid currency code', () => {
    const value = { raw: 5, format: 'currency', currency: 'eur' } as const;

    expect(structuredValueSchema.safeParse(value).success).toBe(true);
    expect(formatDisplayValue(value)).toBe('€5.00');
  });
});
