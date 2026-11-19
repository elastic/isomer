/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePrimitivePack } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { createIsomerRuntime } from './index';
import {
  boldPrimitive,
  notePrimitive,
  packOf,
  plainPrimitive,
} from './runtime.fixtures';

describe('createIsomerRuntime', () => {
  it('requires at least one pack', () => {
    expect(() => createIsomerRuntime({ packs: [] })).toThrow(
      /at least one primitive pack is required/
    );
  });

  it('identifies pack admission failures by name and code', () => {
    try {
      createIsomerRuntime({ packs: [] });
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'IsomerError',
        code: 'EMPTY_PACKS',
      });
    }
  });

  it('requires at least one primitive in a pack', () => {
    expect(() =>
      definePrimitivePack({
        id: 'test.empty',
        surfaces: [],
        primitives: [],
      })
    ).toThrow(/at least one primitive is required/);
  });

  it('rejects a primitive type claimed by two packs', () => {
    expect(() =>
      createIsomerRuntime({
        packs: [
          packOf(notePrimitive),
          definePrimitivePack({
            id: 'test.other',
            surfaces: [],
            primitives: [notePrimitive],
          }),
        ],
      })
    ).toThrow(/primitive type "note" registered by "test" and "test.other"/);
  });

  it('accepts a primitive with no snapshot renderer', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(plainPrimitive)] });
    const spec = {
      type: 'view' as const,
      body: [{ type: 'plain' as const, text: 'no image' }],
    };

    // `snapshot` is optional in the contract, so the pack is valid and every
    // mandatory surface still renders.
    expect(runtime.validate(spec)).toMatchObject({ valid: true, errors: [] });
    expect(runtime.surfaces.text.render(spec)).toBe('no image');
    expect(runtime.surfaces.markdown.render(spec)).toContain('no image');
  });

  it('rejects the same enhancement id owned by two packs', () => {
    const enhancement = {
      id: 'tableSort',
      appliesTo: () => false,
      script: '',
    };
    expect(() =>
      createIsomerRuntime({
        packs: [
          definePrimitivePack({
            id: 'a',
            surfaces: [],
            primitives: [notePrimitive],
            enhancements: [enhancement],
          }),
          definePrimitivePack({
            id: 'b',
            surfaces: [],
            primitives: [boldPrimitive],
            enhancements: [enhancement],
          }),
        ],
      })
    ).toThrow('enhancement "tableSort" registered by "a" and "b"');
  });
});
