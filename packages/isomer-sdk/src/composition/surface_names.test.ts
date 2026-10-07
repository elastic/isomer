/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';

import { OPTIONAL_SURFACES, type OptionalSurface } from '../define';

import {
  BODY_NODE_SURFACES,
  SURFACE_NAMES,
  type SurfaceName,
} from './body_node_base';

describe('surface name lists', () => {
  it('derives the types from the lists', () => {
    expectTypeOf<SurfaceName>().toEqualTypeOf<
      'react' | 'snapshot' | 'text' | 'markdown' | 'slack'
    >();
    expectTypeOf<OptionalSurface>().toEqualTypeOf<'slack'>();
  });

  it('lists every optional surface among the surface names', () => {
    expect(SURFACE_NAMES).toEqual(
      expect.arrayContaining([...OPTIONAL_SURFACES])
    );
  });

  it('keeps BODY_NODE_SURFACES as the same list', () => {
    expect(BODY_NODE_SURFACES).toBe(SURFACE_NAMES);
  });
});
