/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { Composition } from '../composition/composition';
import { ISOMER_ERROR_CODES } from '../composition/error';
import { definePrimitive } from '../define/primitive_module';
import {
  createCompositionParser,
  createCompositionValidator,
} from '../validate/validation';

import {
  checkComposition,
  type CompositionCheckFrame,
} from './check_composition';

const kpi = definePrimitive({
  type: 'kpi',
  catalog: {
    type: 'kpi',
    purpose: '',
    useWhen: [],
    avoidWhen: [],
    example: { type: 'kpi', label: 'a' },
  },
  examples: [{ type: 'kpi', label: 'a' }],
  schema: z.object({ type: z.literal('kpi'), label: z.string() }),
  renderers: { react: () => null, text: () => '', markdown: () => [] },
});

const status = definePrimitive({
  type: 'status',
  catalog: {
    type: 'status',
    purpose: '',
    useWhen: [],
    avoidWhen: [],
    example: { type: 'status' },
  },
  examples: [{ type: 'status' }],
  schema: z.object({
    type: z.literal('status'),
    label: z.string().default('Ready'),
  }),
  renderers: { react: () => null, text: () => '', markdown: () => [] },
});

const definitions = [kpi, status];
const inputBudget = { depth: 4 };
const validator = createCompositionValidator(definitions, { inputBudget });
const parser = createCompositionParser(definitions, { inputBudget });
const runtime = { parse: parser, validate: validator };

const oneKpi = { type: 'view', body: [{ type: 'kpi', label: 'a' }] };
const twoKpis = {
  type: 'view',
  body: [
    { type: 'kpi', label: 'a' },
    { type: 'kpi', label: 'b' },
  ],
};

const onlyOne: CompositionCheckFrame = {
  validateBody: (body) =>
    body.length === 1 ? [] : [`expected one node, got ${body.length}`],
};

describe('checkComposition', () => {
  it('validates once and returns the copy validate checked', () => {
    const checked: unknown[] = [];
    const validate = (composition: Composition) => {
      const result = validator(composition);
      checked.push(result.composition);
      return result;
    };
    const check = checkComposition(
      { parse: parser, validate },
      oneKpi,
      onlyOne
    );
    expect(checked).toHaveLength(1);
    expect(check).toMatchObject({ valid: true, errors: [] });
    expect(check.composition).toBe(checked[0]);
    expect(check.composition).not.toBe(oneKpi);
  });

  it('reports a schema error without a composition or the frame rule', () => {
    const validateBody = vi.fn(() => ['never']);
    const check = checkComposition(
      runtime,
      { type: 'view', body: [{ type: 'kpi' }, { type: 'kpi' }] },
      { validateBody }
    );
    expect(check.valid).toBe(false);
    expect(check.errors).toEqual([
      expect.objectContaining({ path: 'body[0].label', nodeType: 'kpi' }),
      expect.objectContaining({ path: 'body[1].label', nodeType: 'kpi' }),
    ]);
    expect(check.composition).toBeUndefined();
    expect(validateBody).not.toHaveBeenCalled();
  });

  it('checks the parsed copy, so schema defaults reach the composition', () => {
    const check = checkComposition(runtime, {
      type: 'view',
      body: [{ type: 'status' }],
    });
    expect(check.valid).toBe(true);
    expect(check.composition?.body).toEqual([
      { type: 'status', label: 'Ready' },
    ]);
  });

  it('reports a frame rule with an empty path and keeps the copy', () => {
    const check = checkComposition(runtime, twoKpis, onlyOne);
    expect(check).toMatchObject({
      valid: false,
      errors: [{ path: '', message: 'expected one node, got 2' }],
    });
    expect(check.composition).toEqual(twoKpis);
  });

  it('skips the body rule without a frame', () => {
    expect(checkComposition(runtime, twoKpis).valid).toBe(true);
  });

  it('keeps the code of an input budget refusal', () => {
    const check = checkComposition(runtime, {
      type: 'view',
      body: [{ type: 'kpi', label: [[[['deep']]]] }],
    });
    expect(check).toMatchObject({
      valid: false,
      errors: [{ path: '', code: ISOMER_ERROR_CODES.INPUT_OVER_BUDGET }],
    });
    expect(check.composition).toBeUndefined();
  });

  it('passes the runtime’s warnings through', () => {
    const warnings = [{ surface: 'text', message: 'is empty' }] as const;
    const check = checkComposition(
      {
        parse: parser,
        validate: (composition: Composition) => ({
          valid: true,
          errors: [],
          warnings,
          composition,
        }),
      },
      oneKpi
    );
    expect(check.warnings).toBe(warnings);
  });
});
