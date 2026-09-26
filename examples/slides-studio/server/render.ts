/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TakumiImageBackend } from '@elastic/isomer-image-takumi';
import {
  slideOverflow,
  slideOverlaps,
} from '@elastic/isomer-primitives-slides';
import type { Composition } from '@elastic/isomer-sdk';

import { runtime } from '../common/runtime';

import type { SlideLayoutCheck, SlidePng } from './host/deck_tools';

/** The renderers the host takes as options and the PNG route serves, built once over one backend. */
export const slideRenderers = (
  takumi: TakumiImageBackend
): { png: SlidePng; layoutOf: SlideLayoutCheck } => ({
  png: (composition, theme) =>
    takumi.png(
      runtime.surfaces.svg.render(composition, {
        onValidationError: 'collect',
        theme,
      })
    ),
  layoutOf: async (composition: Composition) => {
    const layout = await takumi.measure(
      runtime.surfaces.svg.render(composition, {
        onValidationError: 'collect',
      })
    );
    return { overflow: slideOverflow(layout), overlaps: slideOverlaps(layout) };
  },
});
