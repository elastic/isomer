/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Picks a primitive's type step from its own text, so every surface draws the
// same size: the image surface cannot measure, and does not support container
// units, `min()`, or `clamp()`.

import type { ScaleToken } from '@elastic/distillate';
import { z } from '@elastic/isomer-sdk';

import { extraboldAdvance } from '../theme/base';
import { scalePx } from '../theme/scale';
import { type SlideSize, slideSizes } from '../theme/variants';

/** The largest load each step holds; anything heavier takes `s`. */
export interface LoadBudget {
  readonly l: number;
  readonly m: number;
}

/** The optional `size` field of a length-sensitive primitive. */
export const sizeField = () =>
  z
    .enum(slideSizes)
    .describe(
      'Type size: `l`, `m`, or `s`. Leave it out and the slide picks the largest that fits its text; set `s` only when a render still looks crowded.'
    )
    .optional();

/** The node's own `size`, else the largest step whose budget holds `load`, scaled by the frame's `crowding`. */
export const sizeForLoad = (
  size: SlideSize | undefined,
  load: number,
  budget: LoadBudget,
  crowding = 1
): SlideSize => {
  const scaled = load * crowding;
  return size ?? (scaled <= budget.l ? 'l' : scaled <= budget.m ? 'm' : 's');
};

/** Text load for a row of items: the longest item's characters times how many share the row. */
export const rowLoad = (items: readonly (readonly (string | undefined)[])[]) =>
  Math.max(
    0,
    ...items.map((texts) =>
      texts.reduce((total, text) => total + (text?.length ?? 0), 0)
    )
  ) * items.length;

/** Width of `text` in ems of Inter ExtraBold, with `tracking` after every glyph. */
export const emWidth = (text: string, tracking: ScaleToken): number =>
  [...text].reduce(
    (total, glyph) =>
      total +
      (/[iljtfrI.,:;!|'’ ]/.test(glyph)
        ? extraboldAdvance.narrow
        : /[mwMW]/.test(glyph)
          ? extraboldAdvance.wide
          : /[0-9]/.test(glyph)
            ? extraboldAdvance.digit
            : /[A-Z]/.test(glyph)
              ? extraboldAdvance.upper
              : extraboldAdvance.other) +
      parseFloat(tracking.value),
    0
  );

/** The node's own `size`, else the largest step at which `text`, `ems` wide per pixel of type, fits in `width` pixels. */
export const sizeForWidth = (
  size: SlideSize | undefined,
  ems: number,
  width: number,
  steps: Readonly<Record<SlideSize, ScaleToken>>
): SlideSize =>
  size ?? slideSizes.find((step) => ems * scalePx(steps[step]) <= width) ?? 's';

/** The longest word of `text`, which is what a wrapping display line cannot break. */
export const longestWord = (text: string): string =>
  text
    .split(/\s+/)
    .reduce(
      (longest, word) => (word.length > longest.length ? word : longest),
      ''
    );
