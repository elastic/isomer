/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Picks a type step from the node's own text so every surface draws the same size: the image surface cannot measure or use container units, `min()`, or `clamp()`.

import type { ScaleToken } from '@elastic/distillate';
import { z } from '@elastic/isomer-sdk';

import { displayColumns, isWide } from '../render/mono';
import { extraboldAdvance, monoAdvance, regularAdvance } from '../theme/base';
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

/** The node's own `size`, else the largest step whose budget holds `load` at that step, scaled by `crowding`. */
export const sizeForLoad = (
  size: SlideSize | undefined,
  load: number | ((step: SlideSize) => number),
  budget: LoadBudget,
  crowding = 1
): SlideSize => {
  const at = (step: 'l' | 'm') =>
    (typeof load === 'number' ? load : load(step)) * crowding <= budget[step];
  return size ?? (at('l') ? 'l' : at('m') ? 'm' : 's');
};

/** The smaller of two steps. */
export const smallerStep = (a: SlideSize, b: SlideSize): SlideSize =>
  slideSizes.indexOf(a) > slideSizes.indexOf(b) ? a : b;

/** How many times over `measure` exceeds the room across; 1 when it fits. A room under a pixel counts as one, so the ratio stays finite. */
export const narrowing = (measure: number, width = Infinity): number =>
  Math.max(1, measure / Math.max(1, width));

/** Width of track `index` when `total` pixels split into `shares` fr tracks with `gap` between; 0 when the gaps leave none. */
export const trackWidth = (
  total: number,
  shares: readonly number[],
  gap: ScaleToken,
  index = 0
): number => {
  const sum = shares.reduce((all, share) => all + share, 0);
  const free = total - scalePx(gap) * (shares.length - 1);
  return Math.max(0, (free * (shares[index] ?? 0)) / sum);
};

/** Height in pixels of one line of a type role. */
export const lineBox = ({
  size,
  lineHeight,
}: {
  size: ScaleToken;
  lineHeight: ScaleToken;
}): number => scalePx(size) * parseFloat(lineHeight.value);

/** The longest item's characters times the item count. */
export const rowLoad = (items: readonly (readonly (string | undefined)[])[]) =>
  Math.max(
    0,
    ...items.map((texts) =>
      texts.reduce((total, text) => total + displayColumns(text ?? ''), 0)
    )
  ) * items.length;

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

/** What a wrapping display line cannot break. */
export const widestWord = (text: string, tracking: ScaleToken): number =>
  Math.max(0, ...text.split(/\s+/).map((word) => emWidth(word, tracking)));

/**
 * Lines a greedy wrap takes for `words`, each a list of glyph advances in px, `gap` px apart across `width`. As `overflow-wrap: anywhere` does, a word that fits no line starts its own and breaks between glyphs, at least one glyph a line.
 */
const breakingLines = (
  words: readonly (readonly number[])[],
  gap: number,
  width: number
): number => {
  let lines = 1;
  let used = 0;
  for (const glyphs of words) {
    const advance = glyphs.reduce((total, glyph) => total + glyph, 0);
    if (used > 0 && used + gap + advance <= width) {
      used += gap + advance;
      continue;
    }
    if (used > 0) {
      lines += 1;
      used = 0;
    }
    if (advance <= width) {
      used = advance;
      continue;
    }
    for (const glyph of glyphs) {
      if (used > 0 && used + glyph > width) {
        lines += 1;
        used = glyph;
      } else {
        used += glyph;
      }
    }
  }
  return lines;
};

/** Lines a greedy wrap packs items `advances` px wide into, `gap` px apart, across `width`; an item never breaks. */
export const packedLines = (
  advances: readonly number[],
  gap: number,
  width: number
): number =>
  breakingLines(
    advances.map((advance) => [advance]),
    gap,
    width
  );

const words = (text: string): string[] => text.split(/\s+/).filter(Boolean);

/** Lines `text` in Inter ExtraBold at `fontPx` takes across `width`, breaking a word too wide for any line. */
export const wrappedLines = (
  text: string,
  fontPx: number,
  width: number,
  tracking: ScaleToken
): number =>
  breakingLines(
    words(text).map((word) =>
      [...word].map((glyph) => emWidth(glyph, tracking) * fontPx)
    ),
    emWidth(' ', tracking) * fontPx,
    width
  );

const columnLines = (
  text: string,
  advance: number,
  fontPx: number,
  width: number
): number =>
  breakingLines(
    words(text).map((word) =>
      [...word].map((glyph) => displayColumns(glyph) * advance * fontPx)
    ),
    advance * fontPx,
    width
  );

/** {@link wrappedLines} for Inter Regular, from {@link regularAdvance}. */
export const proseLines = (
  text: string,
  fontPx: number,
  width: number
): number => columnLines(text, regularAdvance, fontPx, width);

/** {@link wrappedLines} for Roboto Mono, from {@link monoAdvance}. */
export const monoLines = (
  text: string,
  fontPx: number,
  width: number
): number => columnLines(text, monoAdvance, fontPx, width);

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
      packedLines(
        words(text).map((word) => emWidth(word, tracking) * fontPx),
        emWidth(' ', tracking) * fontPx,
        width * lineFill
      ) <= maxLines
    );
  }) ??
  's';
