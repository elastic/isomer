/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImageInput, PngRuntime } from '@elastic/isomer-image-takumi';
import {
  createIsomerRuntime,
  type SvgRenderResult,
} from '@elastic/isomer-runtime';
import { describe, expectTypeOf, it } from 'vitest';

import { slideDeckFrame, slidesPack } from './pack';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

// Takumi declares its inputs structurally rather than importing the runtime;
// this package depends on both, so it is where the two shapes are held together.
describe('takumi structural contracts', () => {
  it('a runtime built with frames satisfies PngRuntime', () => {
    expectTypeOf(runtime).toMatchTypeOf<PngRuntime>();
  });

  it('SvgRenderResult satisfies ImageInput', () => {
    expectTypeOf<SvgRenderResult>().toMatchTypeOf<ImageInput>();
  });
});
