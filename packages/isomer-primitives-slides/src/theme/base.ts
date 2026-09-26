/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Base scales every component group composes from. Component groups live in
// `components/`, one per primitive, and `theme.ts` assembles the single tree.

import { lightDark } from '@elastic/distillate';

import { literal, px } from './scale';

/** Scheme-varying colors for page-tone slides. */
export const color = {
  bgPage: lightDark('#F7F6F1', '#07101F'),
  bgSurface: lightDark('#FFFFFF', '#0E1A2E'),
  bgMuted: lightDark('#F2F1EC', '#14233A'),
  bgTableHead: lightDark('#F4F5F8', '#15253D'),
  /** Behind inline code, which images draw without its border. */
  codeFill: lightDark('#ECEAE3', '#1A2B47'),
  text: lightDark('#1A1C21', '#F3F7FC'),
  textSoft: lightDark('#475467', '#B7C4D7'),
  textSubtle: lightDark('#6A717D', '#8697AD'),
  border: lightDark('#D9DEE8', '#25364F'),
  borderDashed: lightDark('#C4CAD6', '#3A4D6A'),
  /** Rails, arrows, and connectors. Ink on page tone; {@link inverse.connector} on inverse. */
  line: lightDark('#1A1C21', '#F3F7FC'),
  primary: lightDark('#0B64DD', '#63A7FF'),
  onPrimary: lightDark('#FFFFFF', '#07101F'),
  primaryTint: lightDark('#DCEBFF', '#163A6B'),
  primaryBg: lightDark('#EEF6FF', '#102A4C'),
  primaryBorder: lightDark('#C9DDF8', '#1F4A80'),
  accent: lightDark('#BC1E70', '#FF6BB0'),
  placeholderStripe: lightDark('#EEECE5', '#0C1728'),
} as const;

/**
 * What an inverse frame (title, section, closing) swaps into {@link color}, one per key.
 * Light is the dark page palette; dark lifts each value as far as `bg` lifts the dark page.
 */
export const inverse = {
  bg: lightDark('#07101F', '#12213A'),
  surface: lightDark('#0E1A2E', '#1A2B47'),
  muted: lightDark('#14233A', '#203352'),
  tableHead: lightDark('#15253D', '#213555'),
  codeFill: lightDark('#1A2B47', '#26395A'),
  text: lightDark('#F3F7FC', '#F3F7FC'),
  textSoft: lightDark('#B7C4D7', '#C3CFE0'),
  textSubtle: lightDark('#8697AD', '#93A3B8'),
  primary: lightDark('#63A7FF', '#7DB6FF'),
  /** Text on an inverse `primary` fill; white on the lighter blue fails contrast. */
  onPrimary: lightDark('#07101F', '#07101F'),
  primaryTint: lightDark('#163A6B', '#1F4A80'),
  primaryBg: lightDark('#102A4C', '#18355D'),
  primaryBorder: lightDark('#1F4A80', '#2A5A96'),
  accent: lightDark('#FF6BB0', '#FF7DBA'),
  rule: lightDark('#25364F', '#2E4263'),
  ruleDashed: lightDark('#3A4D6A', '#475D80'),
  connector: lightDark('#3A4D6A', '#475D80'),
  placeholderStripe: lightDark('#0C1728', '#172842'),
} as const;

/** Spacing, keyed by pixel value on the fixed 1920×1080 canvas. */
export const space = {
  px4: px(4),
  px6: px(6),
  px8: px(8),
  px12: px(12),
  px14: px(14),
  px16: px(16),
  px18: px(18),
  px20: px(20),
  px22: px(22),
  px24: px(24),
  px28: px(28),
  px32: px(32),
  px36: px(36),
  px40: px(40),
  px48: px(48),
  px56: px(56),
  px64: px(64),
  px72: px(72),
  px88: px(88),
  px96: px(96),
  px112: px(112),
  px120: px(120),
  px128: px(128),
} as const;

export const radius = {
  chipSmall: px(8),
  chip: px(10),
  panel: px(12),
} as const;

/** Stroke widths. */
export const stroke = {
  panel: px(1.5),
  chip: px(2),
  hairline: px(2),
  rail: px(3),
  bar: px(4),
} as const;

/**
 * Inter ExtraBold glyph widths in ems, by class, before tracking: enough to size
 * display text to its column before it renders, which the image surface cannot measure.
 */
export const extraboldAdvance = {
  narrow: 0.3,
  wide: 0.9,
  upper: 0.7,
  digit: 0.62,
  other: 0.58,
} as const;

/** Average Inter Regular glyph width in ems, for estimating how many lines running text takes. */
export const regularAdvance = 0.5;

/** Roboto Mono glyph width in ems, for sizing a line of code that must not wrap. */
export const monoAdvance = 0.6;

export const font = {
  family: {
    sans: literal('Inter, system-ui, sans-serif'),
    mono: literal("'Roboto Mono', ui-monospace, monospace"),
  },
  /** Every size the pack sets, keyed by pixel value. Nothing is below 24. */
  size: {
    px24: px(24),
    px26: px(26),
    px28: px(28),
    px30: px(30),
    px32: px(32),
    px34: px(34),
    px36: px(36),
    px38: px(38),
    px40: px(40),
    px44: px(44),
    px48: px(48),
    px52: px(52),
    px56: px(56),
    px64: px(64),
    px72: px(72),
    px76: px(76),
    px88: px(88),
    px96: px(96),
    px104: px(104),
    px112: px(112),
    px120: px(120),
    px128: px(128),
    px144: px(144),
    px160: px(160),
    px176: px(176),
    px200: px(200),
    px240: px(240),
    px280: px(280),
  },
  weight: {
    regular: literal('400'),
    medium: literal('500'),
    semibold: literal('600'),
    bold: literal('700'),
    extrabold: literal('800'),
  },
  /** Letter spacing, in `em` so it tracks its own font size. */
  tracking: {
    none: literal('0'),
    tight: literal('-0.01em'),
    snug: literal('-0.02em'),
    heading: literal('-0.03em'),
    sectionTitle: literal('-0.035em'),
    stat: literal('-0.04em'),
    display: literal('-0.045em'),
    max: literal('-0.05em'),
    label: literal('0.12em'),
    labelWide: literal('0.14em'),
  },
  lineHeight: {
    tightest: literal('0.85'),
    display: literal('0.9'),
    title: literal('0.95'),
    solid: literal('1'),
    heading: literal('1.05'),
    snug: literal('1.1'),
    item: literal('1.25'),
    list: literal('1.3'),
    compact: literal('1.35'),
    body: literal('1.4'),
    loose: literal('1.45'),
  },
} as const;

const { family, size, weight, tracking, lineHeight } = font;

/**
 * Type roles from the design spec. A component reads a role rather than
 * picking size, weight, tracking, and leading separately.
 */
export const type = {
  display: {
    size: size.px240,
    weight: weight.extrabold,
    tracking: tracking.display,
    lineHeight: lineHeight.title,
  },
  sectionNumber: {
    size: size.px280,
    weight: weight.extrabold,
    tracking: tracking.max,
    lineHeight: lineHeight.tightest,
  },
  sectionTitle: {
    size: size.px120,
    weight: weight.extrabold,
    tracking: tracking.sectionTitle,
    lineHeight: lineHeight.solid,
  },
  closingTitle: {
    size: size.px160,
    weight: weight.extrabold,
    tracking: tracking.display,
    lineHeight: lineHeight.title,
  },
  stat: {
    size: size.px200,
    weight: weight.extrabold,
    tracking: tracking.max,
    lineHeight: lineHeight.display,
  },
  statUnit: {
    size: size.px72,
    weight: weight.extrabold,
    tracking: tracking.stat,
    lineHeight: lineHeight.display,
  },
  statInline: {
    size: size.px112,
    weight: weight.extrabold,
    tracking: tracking.stat,
    lineHeight: lineHeight.solid,
  },
  heading: {
    size: size.px76,
    weight: weight.extrabold,
    tracking: tracking.heading,
    lineHeight: lineHeight.heading,
  },
  lede: {
    size: size.px36,
    weight: weight.regular,
    tracking: tracking.none,
    lineHeight: lineHeight.body,
  },
  itemTitle: {
    size: size.px44,
    weight: weight.extrabold,
    tracking: tracking.snug,
    lineHeight: lineHeight.snug,
  },
  nodeTitle: {
    size: size.px36,
    weight: weight.extrabold,
    tracking: tracking.snug,
    lineHeight: lineHeight.item,
  },
  bodyL: {
    size: size.px32,
    weight: weight.regular,
    tracking: tracking.none,
    lineHeight: lineHeight.body,
  },
  body: {
    size: size.px28,
    weight: weight.regular,
    tracking: tracking.none,
    lineHeight: lineHeight.body,
  },
  bodyS: {
    size: size.px26,
    weight: weight.regular,
    tracking: tracking.none,
    lineHeight: lineHeight.compact,
  },
  label: {
    size: size.px24,
    weight: weight.bold,
    tracking: tracking.labelWide,
    lineHeight: lineHeight.body,
  },
  mono: {
    family: family.mono,
    size: size.px26,
    weight: weight.regular,
    lineHeight: lineHeight.body,
  },
  chrome: {
    size: size.px24,
    weight: weight.regular,
    lineHeight: lineHeight.body,
  },
} as const;
