/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckPrimitives } from '../registry';

import { layoutFindings, noFindings } from './measure';
import { previewSlide } from './preview_slide';

const cases = slideDeckPrimitives.flatMap(({ type, examples }) =>
  examples.map((example, index) => ({
    name: `${type} #${index}`,
    slide: previewSlide(example as PrimitiveNode),
  }))
);

describe('every example fits its preview slide', () => {
  it.each(cases)('$name', async ({ slide }) => {
    expect(await layoutFindings(slide)).toEqual(noFindings);
  });
});
