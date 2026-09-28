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
import { eastAsianWidthType } from 'get-east-asian-width';

import { displayColumns } from '../render/mono';
import { extraboldAdvance, monoAdvance } from '../theme/base';
import { scalePx } from '../theme/scale';
import { type SlideSize, slideSizes } from '../theme/variants';

/** The largest load each step holds; anything heavier takes `s`. */
export interface LoadBudget {
  readonly l: number;
  readonly m: number;
}

// One instance, so the authoring schema names it once rather than repeating it on every primitive.
const sizeSchema = z
  .enum(slideSizes)
  .describe(
    'Type size: `l`, `m`, or `s`. Leave it out and the slide picks the largest that fits its text; if a render still runs past its body or crowds inside a container, set the step below the one it drew.'
  )
  .optional();

/** The optional `size` field of a length-sensitive primitive. */
export const sizeField = () => sizeSchema;

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
      texts.reduce((total, text) => total + displayColumns(text ?? ''), 0)
    )
  ) * items.length;

const wide = (glyph: string): boolean => {
  const type = eastAsianWidthType(glyph.codePointAt(0) ?? 0);
  return type === 'wide' || type === 'fullwidth';
};

const glyphAdvance = (glyph: string): number =>
  wide(glyph)
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

/** Width of `text` in ems of Inter ExtraBold, with `tracking` after every glyph. */
export const emWidth = (text: string, tracking: ScaleToken): number =>
  [...text].reduce(
    (total, glyph) =>
      /\p{M}/u.test(glyph)
        ? total
        : total + glyphAdvance(glyph) + parseFloat(tracking.value),
    0
  );

/** Width of `text` in ems of Roboto Mono. */
export const monoWidth = (text: string): number =>
  displayColumns(text) * monoAdvance;

/** The node's own `size`, else the largest step at which `text`, `ems` wide per pixel of type, fits in `width` pixels. */
export const sizeForWidth = (
  size: SlideSize | undefined,
  ems: number,
  width: number,
  steps: Readonly<Record<SlideSize, ScaleToken>>
): SlideSize =>
  size ?? slideSizes.find((step) => ems * scalePx(steps[step]) <= width) ?? 's';

/** Width in ems of the widest word of `text`, which is what a wrapping display line cannot break. */
export const widestWord = (text: string, tracking: ScaleToken): number =>
  Math.max(0, ...text.split(/\s+/).map((word) => emWidth(word, tracking)));

/** Lines a greedy word wrap gives `text` at `fontPx` in a column `width` pixels wide. */
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

/** Glyph estimates run a few percent short over a line of words, so lines are packed into this share of the column. */
export const lineFill = 0.92;

/** The node's own `size`, else the largest step at which `text` fills at most `maxLines` lines of `width`, no word broken. */
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
