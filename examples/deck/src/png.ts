/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';

import { deck } from './deck';
import { deckFonts } from './fonts';
import { runtime } from './runtime';
import type { Theme } from './surfaces';

const takumi = createTakumiImageBackend({ fonts: deckFonts });

/** One slide as PNG bytes, or `undefined` for an unknown slug. Node only. */
export const renderPng = async (
  slug: string,
  theme: Theme
): Promise<Uint8Array | undefined> => {
  const slide = deck.find((entry) => entry.slug === slug);
  return slide
    ? takumi.png(runtime.surfaces.svg.render(slide.composition, { theme }))
    : undefined;
};

export { deck };
