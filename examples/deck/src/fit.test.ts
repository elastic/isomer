/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';
import {
  slideOverflow,
  slideOverlaps,
} from '@elastic/isomer-primitives-slides';
import { describe, expect, it } from 'vitest';

import { deck } from './deck';
import { deckFonts } from './fonts';
import { runtime } from './runtime';

const takumi = createTakumiImageBackend({ fonts: deckFonts });

// An embedded render's text tiles are clipped by their own panel, which the measure cannot see.
const clipped = new Set(['slideRender', 'slideRenderGrid']);

describe('every deck slide fits its frame', () => {
  it.each(deck.map(({ slug, composition }) => ({ slug, composition })))(
    '$slug',
    async ({ composition }) => {
      const layout = await takumi.measure(
        runtime.surfaces.svg.render(composition)
      );
      const [frame] = composition.body as unknown as {
        body: { type: string }[];
      }[];
      const past = (slideOverflow(layout)?.nodes ?? []).filter(
        (index) => !clipped.has(frame?.body[index]?.type ?? '')
      );
      expect(past).toEqual([]);
      expect(slideOverlaps(layout)).toEqual([]);
    }
  );
});
