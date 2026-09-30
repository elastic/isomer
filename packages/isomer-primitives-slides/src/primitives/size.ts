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
import {
  extraboldAdvance,
  font,
  monoAdvance,
  regularAdvance,
} from '../theme/base';
import { px, scalePx } from '../theme/scale';
import type { TypeRole } from '../theme/type_role';
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

// What collapses to one space and breaks, with the line and paragraph separators takumi reads as spaces; a no-break space stays a glyph.
const collapsible = /[ \t\n\r\f\u2028\u2029]+/;

const words = (text: string): string[] =>
  text.split(collapsible).filter(Boolean);

/** Columns `text` fills once its whitespace collapses as CSS collapses it. */
export const textColumns = (text: string): number =>
  displayColumns(words(text).join(' '));

/** The longest item's characters times the item count. */
export const rowLoad = (items: readonly (readonly (string | undefined)[])[]) =>
  Math.max(
    0,
    ...items.map((texts) =>
      texts.reduce((total, text) => total + textColumns(text ?? ''), 0)
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
  Math.max(0, ...words(text).map((word) => emWidth(word, tracking)));

/** Lines a greedy wrap packs items `advances` px wide into, `gap` px apart, across `width`; an item never breaks. */
export const packedLines = (
  advances: readonly number[],
  gap: number,
  width: number
): number => {
  let lines = 1;
  let used = 0;
  for (const advance of advances) {
    if (used > 0 && used + gap + advance > width) {
      lines += 1;
      used = advance;
    } else {
      used += (used > 0 ? gap : 0) + advance;
    }
  }
  return lines;
};

/** Lines and the widest line's width in pixels. */
export interface TextMeasure {
  readonly lines: number;
  readonly widest: number;
}

const measureWords = (
  glyphs: readonly (readonly number[])[],
  gap: number,
  width: number
): TextMeasure => {
  let lines = 0;
  let used = 0;
  let widest = 0;
  const startLine = () => {
    widest = Math.max(widest, used);
    lines += 1;
    used = 0;
  };
  for (const word of glyphs) {
    const advance = word.reduce((total, glyph) => total + glyph, 0);
    if (lines > 0 && used + gap + advance <= width) {
      used += gap + advance;
    } else if (advance <= width) {
      startLine();
      used = advance;
    } else {
      // Breaks at the space before it first, then between glyphs, one glyph a line at least.
      startLine();
      for (const glyph of word) {
        if (used > 0 && used + glyph > width) {
          startLine();
        }
        used += glyph;
      }
    }
  }
  return { lines, widest: Math.max(widest, used) };
};

const displayAdvance = (glyph: string): number =>
  displayColumns(glyph) === 0 ? 0 : glyphAdvance(glyph);

/** The face's advance in ems for one glyph: mono and regular by column, anything semibold or heavier by Inter ExtraBold's glyph classes. */
const faceOf = ({ family, weight }: TypeRole): ((glyph: string) => number) =>
  family === font.family.mono
    ? (glyph) => displayColumns(glyph) * monoAdvance
    : parseFloat(weight?.value ?? '400') >= 600
      ? displayAdvance
      : (glyph) => displayColumns(glyph) * regularAdvance;

/**
 * `text` as `role` sets it across `width` pixels: transformed, whitespace collapsed, wrapped at spaces, and a word wider than a line broken between glyphs (`overflow-wrap: anywhere`); `nowrap` keeps one line.
 * Pass the role at the step drawn, and marks already stripped.
 */
export const measureText = (
  text: string,
  role: TypeRole,
  width = Infinity
): TextMeasure => {
  const fontPx = scalePx(role.size);
  const tracking = role.tracking ? parseFloat(role.tracking.value) : 0;
  const advance = faceOf(role);
  const glyphPx = (glyph: string) => {
    const em = advance(glyph);
    return em === 0 ? 0 : (em + tracking) * fontPx;
  };
  const shown =
    role.transform?.value === 'uppercase' ? text.toUpperCase() : text;
  return measureWords(
    words(shown).map((word) => [...word].map(glyphPx)),
    glyphPx(' '),
    role.whiteSpace?.value === 'nowrap' ? Infinity : width
  );
};

/** Lines `text` in Inter ExtraBold at `fontPx` takes across `width`, from {@link measureText}. */
export const wrappedLines = (
  text: string,
  fontPx: number,
  width: number,
  tracking: ScaleToken
): number =>
  Math.max(
    1,
    measureText(
      text,
      { size: px(fontPx), weight: font.weight.extrabold, tracking },
      width
    ).lines
  );

/** {@link wrappedLines} for Inter Regular. */
export const proseLines = (
  text: string,
  fontPx: number,
  width: number
): number => Math.max(1, measureText(text, { size: px(fontPx) }, width).lines);

/** {@link wrappedLines} for Roboto Mono. */
export const monoLines = (
  text: string,
  fontPx: number,
  width: number
): number =>
  Math.max(
    1,
    measureText(text, { family: font.family.mono, size: px(fontPx) }, width)
      .lines
  );

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
