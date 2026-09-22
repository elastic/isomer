/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lightDark } from '@elastic/distillate';

import { literal, paddingXy, px } from './scale';

/** Scheme-varying colors. The only group that emits custom properties. */
const color = {
  bgPage: lightDark('#F7F6F1', '#07101F'),
  bgSurface: lightDark('#FFFFFF', '#101B2D'),
  bgSubdued: lightDark('#F3F6FA', '#0C1728'),
  border: lightDark('#D9DEE8', '#25364F'),
  borderStrong: lightDark('#C6D0DF', '#344A67'),
  text: lightDark('#1A1C21', '#F3F7FC'),
  textSoft: lightDark('#475467', '#B7C4D7'),
  textSubtle: lightDark('#6A717D', '#8697AD'),
  primary: lightDark('#0B64DD', '#63A7FF'),
  onPrimary: lightDark('#FFFFFF', '#07101F'),
  accentPink: lightDark('#BC1E70', '#FF6BB0'),
  accentTeal: lightDark('#008B87', '#45D1C8'),
  success: lightDark('#008A5E', '#57D68D'),
  warning: lightDark('#B7791F', '#F4C75B'),
  danger: lightDark('#C61E25', '#FF7C7C'),
  codeBg: lightDark('#F6F9FC', '#07111E'),
  codeBorder: lightDark('#E3E8F2', '#263951'),
  tonePrimaryBg: lightDark('#EEF6FF', '#102A4C'),
  tonePinkBg: lightDark('#FFF0F7', '#37142B'),
  toneTealBg: lightDark('#EAFBFA', '#082F32'),
  toneSuccessBg: lightDark('#EFFAF5', '#102E24'),
  toneWarningBg: lightDark('#FFF8DC', '#34290C'),
  toneDangerBg: lightDark('#FFF2F2', '#3A151A'),
} as const;

/** Spacing on a 4px grid, `m` being the 16px base. */
const size = {
  xxs: px(4),
  xs: px(8),
  s: px(12),
  m: px(16),
  l: px(24),
  xl: px(32),
  xxl: px(48),
  xxxl: px(64),
} as const;

const radius = {
  s: px(4),
  m: px(6),
  pill: px(999),
} as const;

const font = {
  family: {
    sans: literal('Inter, system-ui, sans-serif'),
    mono: literal("'Roboto Mono', ui-monospace, monospace"),
  },
  /** Body and UI ramp. Headings use {@link font.heading}. */
  size: {
    xxs: px(11),
    xs: px(12),
    s: px(14),
    m: px(16),
    l: px(18),
    xl: px(20),
    xxl: px(28),
    xxxl: px(32),
  },
  /** Display ramp for `slideTitle` headings and oversized card badges. */
  heading: {
    s: px(52),
    m: px(64),
    l: px(78),
    xl: px(176),
  },
  weight: {
    medium: literal('500'),
    semibold: literal('600'),
    bold: literal('700'),
    extrabold: literal('800'),
  },
  /** Letter spacing, in `em` so it tracks its own font size. */
  tracking: {
    tight: literal('-0.02em'),
    none: literal('0'),
    wide: literal('0.04em'),
    wider: literal('0.06em'),
    widest: literal('0.08em'),
    caps: literal('0.15em'),
  },
} as const;

/**
 * Per-primitive chrome, composed from the groups above.
 *
 * A primitive's CSS module reads its group here. A raw `px(...)` appears only
 * for a value that genuinely has no place on the scale, and says why.
 */
const components = {
  /** Fixed 16:9 canvas and its chrome. */
  frame: {
    // Canvas, not spacing: the deck is a fixed 1920x1080 surface.
    width: px(1920),
    height: px(1080),
    // Chrome insets, sized to the canvas rather than the 4px grid.
    paddingTop: px(72),
    paddingX: px(96),
    standalonePadding: px(96),
    paddingBottom: size.xxxl,
    topbarMarginContent: size.xxl,
    topbarMarginTitle: size.xl,
    brandLabel: literal('Elastic'),
    brandFontSize: font.size.m,
    brandFontWeight: font.weight.bold,
    brandGap: size.s,
    chapterFontSize: font.size.s,
    chapterFontWeight: font.weight.semibold,
    chapterTracking: font.tracking.wider,
    chapterSeparator: literal(' · '),
    footerBottom: size.xl,
    footerFontSize: font.size.xs,
    footerFontWeight: font.weight.medium,
    footerTracking: font.tracking.wide,
    footerBrandGap: size.s,
  },
  /** Glyph boxes: `mark` draws the 20-unit viewBox at 1:1, `markSmall` is the footer's. */
  logo: {
    mark: px(20),
    markSmall: px(17),
  },
  /** Uppercase section label shared by `slideCode`, `slideBulletList`, and `slideFlow`. */
  label: {
    fontSize: font.size.s,
    fontWeight: font.weight.bold,
    tracking: font.tracking.caps,
    marginBottom: size.m,
  },
  /** Every `*MaxWidth` is a measure on the 1920px canvas, not spacing. */
  title: {
    rootMaxWidth: px(1520),
    headingFontWeight: font.weight.extrabold,
    headingTracking: font.tracking.none,
    ledeLineHeight: literal('1.38'),
    ledeMarginTop: size.l,
    ledeLinkWeight: font.weight.semibold,
    sizes: {
      compact: {
        headingFontSize: font.heading.s,
        headingLineHeight: literal('1.05'),
        headingMaxWidth: px(1520),
        ledeFontSize: font.size.xxl,
        ledeMaxWidth: px(1240),
        marginBottom: size.l,
      },
      hero: {
        headingFontSize: font.heading.l,
        headingLineHeight: literal('1.02'),
        headingMaxWidth: px(1220),
        ledeFontSize: font.size.xxxl,
        ledeMaxWidth: px(1040),
      },
      jumbo: {
        headingFontSize: font.heading.xl,
        headingLineHeight: literal('0.94'),
        headingMaxWidth: px(1280),
        ledeFontSize: font.size.xxxl,
        ledeMaxWidth: px(1120),
      },
      standard: {
        headingFontSize: font.heading.m,
        headingLineHeight: literal('1.05'),
        headingMaxWidth: px(1520),
        ledeFontSize: font.size.xxl,
        ledeMaxWidth: px(1240),
        marginBottom: size.xl,
      },
    },
  },
  cards: {
    /** Grid columns when a card group names none. */
    defaultColumns: literal('3'),
    radius: radius.m,
    borderTop: size.xxs,
    shadow: literal(
      '0 1px 2px rgba(35, 49, 73, 0.06), 0 4px 12px rgba(35, 49, 73, 0.06)'
    ),
    titleFontWeight: font.weight.bold,
    badgeFontWeight: font.weight.extrabold,
    meta: {
      fontSize: font.size.s,
      fontWeight: font.weight.bold,
      gap: size.s,
      tracking: font.tracking.widest,
      minHeight: size.l,
      badgeFontSize: font.size.xs,
      badgePadding: paddingXy(size.xxs, size.xs),
      badgeRadius: radius.s,
    },
    styles: {
      feature: {
        badgeFontSize: font.heading.s,
        badgeLineHeight: literal('1'),
        badgeMarginBottom: size.xs,
        badgeTracking: font.tracking.tight,
        bodyFontSize: font.size.xl,
        bodyLineHeight: literal('1.5'),
        gap: size.xl,
        innerGap: size.m,
        // The x-inset is canvas geometry like the frame's, off the grid.
        padding: paddingXy(size.xl, px(28)),
        titleFontSize: font.size.xxxl,
        titleLineHeight: literal('1.08'),
      },
      standard: {
        bodyFontSize: font.size.l,
        bodyLineHeight: literal('1.48'),
        gap: size.l,
        innerGap: size.m,
        padding: size.l,
        titleFontSize: font.size.xxl,
        titleLineHeight: literal('1.1'),
      },
    },
  },
  code: {
    radius: radius.m,
    fontSize: font.size.l,
    lineHeight: literal('1.5'),
    padding: paddingXy(size.l, size.xl),
    dense: {
      fontSize: font.size.s,
      padding: paddingXy(size.m, size.l),
    },
  },
  bullets: {
    radius: radius.m,
    padding: size.l,
    listGap: size.s,
    itemFontSize: font.size.xl,
    itemGap: size.m,
    itemLineHeight: literal('1.38'),
    markerWidth: size.l,
    markerFontWeight: font.weight.extrabold,
    // Optical nudge that aligns the glyph with the first text line.
    markerOffset: px(3),
    markerGlyph: {
      check: literal('✓'),
      dot: literal('•'),
      x: literal('✕'),
    },
  },
  flow: {
    blockGap: size.m,
    radius: radius.m,
    padding: paddingXy(size.m, size.l),
    partFontSize: font.size.s,
    partFontWeight: font.weight.bold,
    partPadding: paddingXy(size.xs, size.s),
    partRadius: radius.s,
    // Hairline rule, not spacing.
    connectorHeight: px(2),
    connectorMargin: size.s,
    connectorWidth: size.xxxl,
  },
  split: {
    colGap: size.l,
    rootGap: size.xxl,
    ratios: {
      even: {
        columns: literal('minmax(0, 1fr) minmax(0, 1fr)'),
      },
      wideLeft: {
        columns: literal('minmax(0, 1.22fr) minmax(0, .78fr)'),
      },
      wideRight: {
        columns: literal('minmax(0, .84fr) minmax(0, 1.16fr)'),
      },
    },
  },
  stack: {
    gap: {
      loose: size.xl,
      normal: size.l,
      tight: size.s,
    },
  },
  territory: {
    gridGap: size.l,
    itemGap: size.xs,
    paddingLeft: size.m,
    borderWidth: size.xxs,
    titleFontSize: font.size.s,
    titleFontWeight: font.weight.extrabold,
    titleTracking: font.tracking.widest,
    bodyFontSize: font.size.l,
    bodyLineHeight: literal('1.45'),
  },
} as const;

/**
 * Every value the pack renders, in one tree. `lightDark` leaves become
 * scheme-varying custom properties; every other leaf is a `ScaleToken` that
 * inlines its literal. `docs/theme.md` covers the leaf kinds.
 */
export const SLIDE_THEME = {
  color,
  size,
  radius,
  font,
  ...components,
} as const;

/** Scheme-varying color names in {@link SLIDE_THEME}. */
export type SlideColorName = keyof typeof color;
