/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../pack';
import { slideDeckPrimitives } from '../registry';
import { slideOverflow, slideOverlaps } from '../render/overflow';

import { slideFonts } from './fonts';
import { previewSlide } from './preview_slide';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});
const takumi = createTakumiImageBackend({ fonts: slideFonts });

const cases = slideDeckPrimitives.flatMap(({ type, examples }) =>
  type === 'slideFrame'
    ? []
    : examples.map((example, index) => ({
        name: `${type} #${index}`,
        slide: previewSlide(example),
      }))
);

const fits = async ({ slide }: (typeof cases)[number]) => {
  const layout = await takumi.measure(runtime.surfaces.svg.render(slide));
  expect(slideOverflow(layout)).toBeUndefined();
  expect(slideOverlaps(layout)).toEqual([]);
};

describe('every example fits a slide under a heading and lede', () => {
  it.each(cases)('$name', fits);
});
