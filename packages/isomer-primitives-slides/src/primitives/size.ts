/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Picks a type step from the node's own text so every surface draws the same size: the image surface cannot measure or use container units, `min()`, or `clamp()`.

import type { ScaleToken } from '@elastic/distillate';
import { z } from '@elastic/isomer-sdk';

import { isWide } from '../render/mono';
import { extraboldAdvance } from '../theme/base';
import { scalePx } from '../theme/scale';
import { type SlideSize, slideSizes } from '../theme/variants';

/** The largest load each step holds; anything heavier takes `s`. */
export interface LoadBudget {
  readonly l: number;
  readonly m: number;
}

// One instance, so the authoring schema names it once.
const sizeSchema = z
  .enum(slideSizes)
  .describe(
    'Type size: `l`, `m`, or `s`. Leave it out and the slide picks the largest that fits its text; if a render still runs past its body or crowds inside a container, set the step below the one it drew.'
  )
  .optional();

export const sizeField = () => sizeSchema;

/** The node's own `size`, else the largest step whose budget holds `load`, scaled by `crowding`. */
export const sizeForLoad = (
  size: SlideSize | undefined,
  load: number,
  budget: LoadBudget,
  crowding = 1
): SlideSize => {
  const scaled = load * crowding;
  return size ?? (scaled <= budget.l ? 'l' : scaled <= budget.m ? 'm' : 's');
};

const glyphAdvance = (glyph: string): number =>
  isWide(glyph)
    ? extraboldAdvance.fullwidth
    : /[iljtfrI.,:;!|'’ ]/.test(glyph)
      ? extraboldAdvance.narrow
      : /[mwMW]/.test(glyph)
        ? extraboldAdvance.wide
        : /[0-9]/.test(glyph)
          ? extraboldAdvance.digit
          : /[A-Z]/.test(glyph)
            ? extraboldAdvance.upper
            : extraboldAdvance.other;

/** Width in ems of Inter ExtraBold, with `tracking` after every glyph. */
export const emWidth = (text: string, tracking: ScaleToken): number =>
  [...text].reduce(
    (total, glyph) =>
      /\p{M}/u.test(glyph)
        ? total
        : total + glyphAdvance(glyph) + parseFloat(tracking.value),
    0
  );

/** The node's own `size`, else the largest step at which `ems` of type fits `width` pixels. */
export const sizeForWidth = (
  size: SlideSize | undefined,
  ems: number,
  width: number,
  steps: Readonly<Record<SlideSize, ScaleToken>>
): SlideSize =>
  size ?? slideSizes.find((step) => ems * scalePx(steps[step]) <= width) ?? 's';

/** What a wrapping display line cannot break. */
export const widestWord = (text: string, tracking: ScaleToken): number =>
  Math.max(0, ...text.split(/\s+/).map((word) => emWidth(word, tracking)));

export const wrappedLines = (
  text: string,
  fontPx: number,
  width: number,
  tracking: ScaleToken
): number => {
  const gap = emWidth(' ', tracking) * fontPx;
  let lines = 1;
  let used = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const advance = emWidth(word, tracking) * fontPx;
    if (used > 0 && used + gap + advance > width) {
      lines += 1;
      used = advance;
    } else {
      used += (used > 0 ? gap : 0) + advance;
    }
  }
  return lines;
};

/** Glyph estimates run a few percent short over a line, so lines pack into this share of the column. */
export const lineFill = 0.92;

/** No word broken. */
export const sizeForLines = (
  size: SlideSize | undefined,
  text: string,
  tracking: ScaleToken,
  width: number,
  steps: Readonly<Record<SlideSize, ScaleToken>>,
  maxLines = 2
): SlideSize =>
  size ??
  slideSizes.find((step) => {
    const fontPx = scalePx(steps[step]);
    return (
      widestWord(text, tracking) * fontPx <= width &&
      wrappedLines(text, fontPx, width * lineFill, tracking) <= maxLines
    );
  }) ??
  's';
