/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decls, rule, variants } from '@elastic/distillate';

import { slideDistillery, toneBgVar, toneVar } from './distillery';
import {
  slideBulletMarkers,
  slideCardColumns,
  slideCardGroupStyles,
  slideFrameLayouts,
  slideSplitRatios,
  slideStackSpacings,
  slideTitleSizes,
  slideTones,
  slideTranscriptFormats,
  slideTranscriptRoles,
  slideWindowChromes,
} from './variants';

const { createStyleModule, tokens } = slideDistillery;
const {
  bullets,
  cards,
  code,
  color,
  cycle,
  flow,
  font,
  frame,
  label,
  logo,
  split,
  stack,
  table,
  territory,
  title,
  transcript,
  window: windowTokens,
} = tokens;

// ---- Deck root -----------------------------------------------------------

/** Distillate module for the deck root wrapper. */
export const deckRootModule = createStyleModule('deckRoot', ({ css }) => ({
  root: css`
    color: ${color.text};
    font-family: ${font.family.sans};
    height: ${frame.height};
    width: ${frame.width};
  `,
}));

// ---- Slide frame ---------------------------------------------------------

/** Distillate module for `slideFrame` chrome and layout. */
export const frameModule = createStyleModule('frame', ({ css }) => ({
  slide: css`
    background: ${color.bgPage};
    border: 1px solid ${color.border};
    height: ${frame.height};
    overflow: hidden;
    position: relative;
    width: ${frame.width};
  `,
  frame: css`
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: ${frame.paddingTop} ${frame.paddingX} ${frame.paddingBottom};
    position: relative;
  `,
  frameStandalone: css`
    padding: ${frame.standalonePadding};
  `,
  topbar: css`
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin-bottom: ${frame.topbarMarginContent};
  `,
  brand: css`
    align-items: center;
    display: inline-flex;
    font-weight: ${frame.brandFontWeight};
    gap: ${frame.brandGap};
  `,
  chapter: css`
    color: ${color.textSubtle};
    font-size: ${frame.chapterFontSize};
    font-weight: ${frame.chapterFontWeight};
    letter-spacing: ${frame.chapterTracking};
    text-transform: uppercase;
  `,
  chapterNumber: css`
    color: ${color.primary};
  `,
  body: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  `,
  footer: css`
    align-items: center;
    bottom: ${frame.footerBottom};
    color: ${color.textSubtle};
    display: flex;
    font-size: ${frame.footerFontSize};
    justify-content: space-between;
    left: ${frame.paddingX};
    letter-spacing: ${frame.footerTracking};
    position: absolute;
    right: ${frame.paddingX};
  `,
  footerBrand: css`
    align-items: center;
    display: inline-flex;
    font-weight: ${frame.footerFontWeight};
    gap: ${frame.footerBrandGap};
  `,
  layout: variants(slideFrameLayouts, (layout) =>
    layout === 'title' ? css`` : undefined
  ),
  // Title-layout overrides. `h` is typed `Record<string, string>`, so a typo
  // such as `h.titel` compiles and emits the string "undefined" into the
  // selector; `modules.test.ts` asserts the selectors resolve.
  titleTopbar: rule(
    (h) => `${h.title} ${h.topbar}`,
    decls`margin-bottom: ${frame.topbarMarginTitle};`
  ),
  titleBody: rule(
    (h) => `${h.title} ${h.body}`,
    decls`justify-content: center;`
  ),
}));

// ---- Logo marks ----------------------------------------------------------

/** Distillate module for brand and Elastic logo marks. */
export const logoModule = createStyleModule('logo', ({ css }) => ({
  logo: css`
    display: block;
    flex: 0 0 auto;
    height: ${logo.mark};
    width: ${logo.mark};
  `,
  logoSmall: css`
    height: ${logo.markSmall};
    width: ${logo.markSmall};
  `,
  elastic: css`
    display: block;
    flex: 0 0 auto;
    height: ${logo.mark};
    width: ${logo.mark};
  `,
  elasticSmall: css`
    height: ${logo.markSmall};
    width: ${logo.markSmall};
  `,
}));

// ---- Tone contextual-var setters -----------------------------------------

/** Distillate module for {@link SlideTone} foreground and background. */
export const tonesModule = createStyleModule('tones', ({ css }) => ({
  tone: variants(slideTones, (tone) => {
    const fg = {
      primary: color.primary,
      pink: color.accentPink,
      teal: color.accentTeal,
      success: color.success,
      warning: color.warning,
      danger: color.danger,
      subtle: color.textSubtle,
    }[tone];
    const bg = {
      primary: color.tonePrimaryBg,
      pink: color.tonePinkBg,
      teal: color.toneTealBg,
      success: color.toneSuccessBg,
      warning: color.toneWarningBg,
      danger: color.toneDangerBg,
      subtle: color.bgSubdued,
    }[tone];
    return css`
      ${toneVar.name}: ${fg};
      ${toneBgVar.name}: ${bg};
    `;
  }),
}));

// ---- Slide title ---------------------------------------------------------

/** Distillate module for `slideTitle`. */
export const titleModule = createStyleModule('title', ({ css }) => ({
  root: css`
    margin: 0 0 ${title.sizes.standard.marginBottom};
    max-width: ${title.rootMaxWidth};
    & h2 {
      color: ${color.text};
      font-size: ${title.sizes.standard.headingFontSize};
      font-weight: ${title.headingFontWeight};
      letter-spacing: ${title.headingTracking};
      line-height: ${title.sizes.standard.headingLineHeight};
      margin: 0;
      text-wrap: balance;
    }
    & p {
      color: ${color.textSoft};
      font-size: ${title.sizes.standard.ledeFontSize};
      line-height: ${title.ledeLineHeight};
      margin: ${title.ledeMarginTop} 0 0;
      max-width: ${title.sizes.standard.ledeMaxWidth};
      text-wrap: pretty;
    }
    & p a {
      color: ${toneVar};
      font-weight: ${title.ledeLinkWeight};
      text-decoration: underline;
      text-decoration-thickness: 2px;
      text-underline-offset: 0.18em;
    }
    & p a:hover {
      text-decoration-thickness: 3px;
    }
  `,
  eyebrow: css`
    color: ${toneVar};
    font-size: ${label.fontSize};
    font-weight: ${label.fontWeight};
    letter-spacing: ${label.tracking};
    margin-bottom: ${label.marginBottom};
    text-transform: uppercase;
  `,
  size: variants(slideTitleSizes, (size) => {
    const metrics = title.sizes[size];
    if (size === 'hero' || size === 'jumbo') {
      return css`
        & h2 {
          font-size: ${metrics.headingFontSize};
          line-height: ${metrics.headingLineHeight};
          max-width: ${metrics.headingMaxWidth};
        }
        & p {
          font-size: ${metrics.ledeFontSize};
          max-width: ${metrics.ledeMaxWidth};
        }
      `;
    }
    if (size === 'compact') {
      return css`
        margin-bottom: ${title.sizes.compact.marginBottom};
        & h2 {
          font-size: ${metrics.headingFontSize};
        }
        & p {
          font-size: ${metrics.ledeFontSize};
          max-width: ${metrics.ledeMaxWidth};
        }
      `;
    }
    return undefined;
  }),
}));

// ---- Slide label (shared with code and bullet) ---------------------------

/** Distillate module for uppercase section labels. */
export const labelModule = createStyleModule('label', ({ css }) => ({
  label: css`
    color: ${color.primary};
    font-size: ${label.fontSize};
    font-weight: ${label.fontWeight};
    letter-spacing: ${label.tracking};
    margin-bottom: ${label.marginBottom};
    text-transform: uppercase;
  `,
}));

// ---- Card group ----------------------------------------------------------

/** Distillate module for `slideCardGroup`. */
export const cardsModule = createStyleModule('cards', ({ css }) => ({
  grid: css`
    display: grid;
    gap: ${cards.styles.standard.gap};
    min-height: 0;
  `,
  // Every group carries one of these, so no rule competes with it on order.
  columns: variants(
    slideCardColumns,
    (key) => css`
      grid-template-columns: repeat(
        ${key.slice('cols'.length)},
        minmax(0, 1fr)
      );
    `
  ),
  card: css`
    background: ${color.bgSurface};
    border: 1px solid ${color.border};
    border-top: ${cards.borderTop} solid ${toneVar};
    border-radius: ${cards.radius};
    box-shadow: ${cards.shadow};
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: ${cards.styles.standard.innerGap};
    min-width: 0;
    padding: ${cards.styles.standard.padding};
    & h3 {
      color: ${color.text};
      font-size: ${cards.styles.standard.titleFontSize};
      letter-spacing: ${font.tracking.none};
      line-height: ${cards.styles.standard.titleLineHeight};
      margin: 0;
    }
    & p {
      color: ${color.textSoft};
      font-size: ${cards.styles.standard.bodyFontSize};
      line-height: ${cards.styles.standard.bodyLineHeight};
      margin: 0;
    }
  `,
  meta: css`
    align-items: center;
    color: ${color.textSubtle};
    display: flex;
    gap: ${cards.meta.gap};
    font-size: ${cards.meta.fontSize};
    font-weight: ${cards.meta.fontWeight};
    letter-spacing: ${cards.meta.tracking};
    min-height: ${cards.meta.minHeight};
    text-transform: uppercase;
    & span {
      background: ${toneBgVar};
      border: 1px solid color-mix(in srgb, ${toneVar} 35%, transparent);
      border-radius: ${cards.meta.badgeRadius};
      color: ${toneVar};
      display: inline-flex;
      font-size: ${cards.meta.badgeFontSize};
      letter-spacing: ${font.tracking.none};
      padding: ${cards.meta.badgePadding};
      text-transform: none;
    }
  `,
  hero: css`
    color: ${toneVar};
    font-size: ${cards.styles.feature.badgeFontSize};
    font-weight: ${cards.badgeFontWeight};
    letter-spacing: ${cards.styles.feature.badgeTracking};
    line-height: ${cards.styles.feature.badgeLineHeight};
    margin-bottom: ${cards.styles.feature.badgeMarginBottom};
  `,
  style: variants(slideCardGroupStyles, (style) => {
    if (style === 'feature') {
      return css`
        gap: ${cards.styles.feature.gap};
      `;
    }
    return undefined;
  }),
  cardStyle: variants(slideCardGroupStyles, (style) => {
    if (style === 'feature') {
      const {
        bodyFontSize,
        bodyLineHeight,
        innerGap,
        padding,
        titleFontSize,
        titleLineHeight,
      } = cards.styles.feature;
      return css`
        gap: ${innerGap};
        padding: ${padding};
        & h3 {
          font-size: ${titleFontSize};
          line-height: ${titleLineHeight};
        }
        & p {
          font-size: ${bodyFontSize};
          line-height: ${bodyLineHeight};
        }
      `;
    }
    return undefined;
  }),
}));

// ---- Split layout --------------------------------------------------------

/** Distillate module for `slideSplit`. */
export const splitModule = createStyleModule('split', ({ css }) => ({
  root: css`
    display: grid;
    gap: ${split.rootGap};
    min-height: 0;
  `,
  col: css`
    display: flex;
    flex-direction: column;
    gap: ${split.colGap};
    min-height: 0;
  `,
  ratio: variants(
    slideSplitRatios,
    (ratio) => css`
      grid-template-columns: ${split.ratios[ratio].columns};
    `
  ),
}));

// ---- Stack layout --------------------------------------------------------

/** Distillate module for `slideStack`. */
export const stackModule = createStyleModule('stack', ({ css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    gap: ${stack.gap.normal};
    min-height: 0;
  `,
  spacing: variants(slideStackSpacings, (spacing) => {
    if (spacing === 'tight') {
      return css`
        gap: ${stack.gap.tight};
      `;
    }
    if (spacing === 'loose') {
      return css`
        gap: ${stack.gap.loose};
      `;
    }
    return undefined;
  }),
}));

// ---- Code block ----------------------------------------------------------

/** Distillate module for `slideCode`. */
export const codeModule = createStyleModule('code', ({ css }) => ({
  root: css`
    & pre {
      background: ${color.codeBg};
      border: 1px solid ${color.codeBorder};
      border-radius: ${code.radius};
      box-sizing: border-box;
      color: ${color.text};
      font-family: ${font.family.mono};
      font-size: ${code.fontSize};
      line-height: ${code.lineHeight};
      margin: 0;
      overflow: hidden;
      padding: ${code.padding};
      tab-size: 2;
      white-space: pre-wrap;
    }
    & code {
      font-family: ${font.family.mono};
    }
  `,
  // Smaller font when a code block appears inside a split-within-split.
  densePre: rule(
    (h) =>
      `${h(splitModule.handles.root)} ${h(splitModule.handles.root)} ${h.root} pre`,
    decls`font-size: ${code.dense.fontSize}; line-height: ${code.lineHeight}; padding: ${code.dense.padding};`
  ),
  line: css`
    display: block;
  `,
  lineDimmed: css`
    opacity: ${code.dimmedOpacity};
  `,
  lineHighlight: css`
    background: ${color.tonePrimaryBg};
    box-shadow: inset ${code.highlightBorder} 0 0 ${color.primary};
    margin: 0 calc(-1 * ${code.highlightInset});
    padding: 0 ${code.highlightInset};
  `,
  denseLineHighlight: rule(
    (h) =>
      `${h(splitModule.handles.root)} ${h(splitModule.handles.root)} ${h.root} ${h.lineHighlight}`,
    decls`margin: 0 calc(-1 * ${code.dense.highlightInset}); padding: 0 ${code.dense.highlightInset};`
  ),
}));

// ---- Bullet list ---------------------------------------------------------

/** Distillate module for `slideBulletList`. */
export const bulletsModule = createStyleModule('bullets', ({ css }) => ({
  root: css`
    background: ${color.bgSubdued};
    border: 1px solid ${color.border};
    border-radius: ${bullets.radius};
    box-sizing: border-box;
    padding: ${bullets.padding};
    & ul {
      display: grid;
      gap: ${bullets.listGap};
      list-style: none;
      margin: 0;
      padding: 0;
    }
    & li {
      color: ${color.textSoft};
      display: grid;
      font-size: ${bullets.itemFontSize};
      gap: ${bullets.itemGap};
      grid-template-columns: ${bullets.markerWidth} 1fr;
      line-height: ${bullets.itemLineHeight};
    }
    & li::before {
      color: ${color.primary};
      content: '${bullets.markerGlyph.dot}';
      font-weight: ${bullets.markerFontWeight};
      line-height: 1;
      margin-top: ${bullets.markerOffset};
    }
    & li > span {
      min-width: 0;
    }
  `,
  marker: variants(slideBulletMarkers, (marker) => {
    if (marker === 'check') {
      return css`
        & li::before {
          color: ${color.success};
          content: '${bullets.markerGlyph.check}';
        }
      `;
    }
    if (marker === 'x') {
      return css`
        & li::before {
          color: ${color.textSubtle};
          content: '${bullets.markerGlyph.x}';
        }
      `;
    }
    return undefined;
  }),
}));

// ---- Flow diagram --------------------------------------------------------

/** Distillate module for `slideFlow`. */
export const flowModule = createStyleModule('flow', ({ css }) => ({
  block: css`
    display: grid;
    gap: ${flow.blockGap};
  `,
  flow: css`
    align-items: center;
    background: ${color.bgSubdued};
    border: 1px solid ${color.border};
    border-radius: ${flow.radius};
    display: flex;
    min-width: 0;
    padding: ${flow.padding};
  `,
  part: css`
    align-items: center;
    display: flex;
    min-width: 0;
    & span {
      background: ${color.bgSurface};
      border: 1px solid ${color.borderStrong};
      border-radius: ${flow.partRadius};
      color: ${color.text};
      font-size: ${flow.partFontSize};
      font-weight: ${flow.partFontWeight};
      padding: ${flow.partPadding};
      white-space: nowrap;
    }
  `,
  line: css`
    background: ${color.accentPink};
    display: block;
    height: ${flow.connectorHeight};
    margin: 0 ${flow.connectorMargin};
    min-width: ${flow.connectorWidth};
  `,
  linePrimary: css`
    background: ${color.primary};
  `,
}));

// ---- Territory group -----------------------------------------------------

/** Distillate module for `slideTerritoryGroup`. */
export const territoryModule = createStyleModule('territory', ({ css }) => ({
  grid: css`
    display: grid;
    gap: ${territory.gridGap};
    grid-template-columns: repeat(2, minmax(0, 1fr));
  `,
  item: css`
    border-left: ${territory.borderWidth} solid ${toneVar};
    padding-left: ${territory.paddingLeft};
    & h3 {
      color: ${toneVar};
      font-size: ${territory.titleFontSize};
      font-weight: ${territory.titleFontWeight};
      letter-spacing: ${territory.titleTracking};
      margin: 0 0 ${territory.itemGap};
      text-transform: uppercase;
    }
    & p {
      color: ${color.textSoft};
      font-size: ${territory.bodyFontSize};
      line-height: ${territory.bodyLineHeight};
      margin: 0;
    }
  `,
}));

// ---- Table ---------------------------------------------------------------

/** Distillate module for `slideTable`. */
export const tableModule = createStyleModule('table', ({ css }) => ({
  table: css`
    background: ${color.bgSurface};
    border: 1px solid ${color.border};
    border-radius: ${table.radius};
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `,
  row: css`
    border-top: 1px solid ${color.border};
    display: grid;
    grid-auto-columns: minmax(0, 1fr);
    grid-auto-flow: column;
  `,
  head: css`
    background: ${color.bgSubdued};
    border-top: 0;
  `,
  cell: css`
    color: ${color.textSoft};
    font-size: ${table.cellFontSize};
    line-height: ${table.cellLineHeight};
    min-width: 0;
    padding: ${table.cellPadding};
  `,
  headCell: css`
    color: ${color.textSubtle};
    font-size: ${table.headFontSize};
    font-weight: ${table.headFontWeight};
    letter-spacing: ${table.headTracking};
    text-transform: uppercase;
  `,
  rowHeader: css`
    color: ${color.text};
    font-weight: ${table.rowHeaderFontWeight};
  `,
}));

// ---- Transcript ----------------------------------------------------------

/** Distillate module for `slideTranscript`. */
export const transcriptModule = createStyleModule('transcript', ({ css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    gap: ${transcript.gap};
  `,
  turn: css`
    border: 1px solid ${color.border};
    border-radius: ${transcript.radius};
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: ${transcript.roleGap};
    max-width: ${transcript.turnMaxWidth};
    padding: ${transcript.padding};
  `,
  role: css`
    color: ${toneVar};
    font-size: ${transcript.roleFontSize};
    font-weight: ${transcript.roleFontWeight};
    letter-spacing: ${transcript.roleTracking};
    text-transform: uppercase;
  `,
  text: css`
    color: ${color.text};
    font-size: ${transcript.textFontSize};
    line-height: ${transcript.textLineHeight};
    margin: 0;
    white-space: pre-wrap;
  `,
  speaker: variants(slideTranscriptRoles, (role) => {
    if (role === 'user') {
      return css`
        align-self: flex-end;
        background: ${color.tonePrimaryBg};
        ${toneVar.name}: ${color.primary};
      `;
    }
    if (role === 'model') {
      return css`
        align-self: flex-start;
        background: ${color.bgSurface};
        ${toneVar.name}: ${color.accentTeal};
      `;
    }
    return css`
      align-self: center;
      background: ${color.bgSubdued};
      ${toneVar.name}: ${color.textSubtle};
    `;
  }),
  format: variants(slideTranscriptFormats, (format) =>
    format === 'code'
      ? css`
          font-family: ${font.family.mono};
          font-size: ${transcript.codeFontSize};
        `
      : undefined
  ),
}));

// ---- Window --------------------------------------------------------------

/** Distillate module for `slideWindow`. */
export const windowModule = createStyleModule('window', ({ css }) => ({
  root: css`
    background: ${color.bgSurface};
    border: 1px solid ${color.borderStrong};
    border-radius: ${windowTokens.radius};
    box-shadow: ${windowTokens.shadow};
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  `,
  bar: css`
    align-items: center;
    background: ${color.bgSubdued};
    border-bottom: 1px solid ${color.border};
    display: flex;
    gap: ${windowTokens.barGap};
    padding: ${windowTokens.barPadding};
  `,
  dot: css`
    border-radius: 50%;
    display: block;
    flex: 0 0 auto;
    height: ${windowTokens.dotSize};
    width: ${windowTokens.dotSize};
  `,
  dotClose: css`
    background: ${color.danger};
  `,
  dotMinimize: css`
    background: ${color.warning};
  `,
  dotZoom: css`
    background: ${color.success};
  `,
  title: css`
    color: ${color.textSoft};
    font-size: ${windowTokens.titleFontSize};
    font-weight: ${windowTokens.titleFontWeight};
    min-width: 0;
    overflow: hidden;
    padding: ${windowTokens.titlePadding};
    white-space: nowrap;
  `,
  body: css`
    display: flex;
    flex-direction: column;
    gap: ${windowTokens.bodyGap};
    min-height: 0;
    padding: ${windowTokens.bodyPadding};
  `,
  titleChrome: variants(slideWindowChromes, (chrome) => {
    if (chrome === 'browser') {
      return css`
        background: ${color.bgSurface};
        border: 1px solid ${color.border};
        border-radius: ${windowTokens.radius};
        flex: 1;
      `;
    }
    if (chrome === 'terminal') {
      return css`
        font-family: ${font.family.mono};
      `;
    }
    if (chrome === 'slack') {
      return css`
        color: ${color.text};
        font-weight: ${font.weight.bold};
        &::before {
          content: '${windowTokens.slackPrefix} ';
        }
      `;
    }
    return css`
      color: ${color.accentTeal};
      font-weight: ${font.weight.bold};
    `;
  }),
  terminalBody: css`
    background: ${color.codeBg};
    padding: 0;
  `,
  // The terminal is the code block's surround, so the block drops its own.
  terminalPre: rule(
    (h) => `${h.terminalBody} ${h(codeModule.handles.root)} pre`,
    decls`background: transparent; border: 0; border-radius: 0;`
  ),
}));

// ---- Cycle diagram -------------------------------------------------------

/** Distillate module for `slideCycle`. */
export const cycleModule = createStyleModule('cycle', ({ css }) => ({
  block: css`
    align-items: flex-start;
    display: flex;
    flex-direction: column;
  `,
  diagram: css`
    flex: 0 0 auto;
    height: ${cycle.size};
    position: relative;
    width: ${cycle.size};
  `,
  svg: css`
    display: block;
    height: 100%;
    left: 0;
    position: absolute;
    top: 0;
    width: 100%;
  `,
  // HTML stays scheme-aware; the attribute beside each class is what the image draws.
  ring: css`
    stroke: ${color.primary};
  `,
  arrow: css`
    fill: ${color.primary};
  `,
  part: css`
    background: ${color.bgSurface};
    border: 1px solid ${color.borderStrong};
    border-radius: ${cycle.partRadius};
    color: ${color.text};
    font-size: ${cycle.partFontSize};
    font-weight: ${cycle.partFontWeight};
    padding: ${cycle.partPadding};
    position: absolute;
    transform: translate(-50%, -50%);
    white-space: nowrap;
  `,
  center: css`
    color: ${color.text};
    font-size: ${cycle.centerFontSize};
    font-weight: ${cycle.centerFontWeight};
    left: 50%;
    max-width: ${cycle.centerMaxWidth};
    position: absolute;
    text-align: center;
    top: 50%;
    transform: translate(-50%, -50%);
  `,
}));

// ---- Full stylesheet helper ----------------------------------------------

/** All modules, keyed for external reference. */
export const slideModules = {
  deckRoot: deckRootModule,
  frame: frameModule,
  logo: logoModule,
  tones: tonesModule,
  title: titleModule,
  label: labelModule,
  cards: cardsModule,
  split: splitModule,
  stack: stackModule,
  code: codeModule,
  bullets: bulletsModule,
  flow: flowModule,
  territory: territoryModule,
  table: tableModule,
  transcript: transcriptModule,
  window: windowModule,
  cycle: cycleModule,
};

/** Readable CSS for every slide module; hosts include this beside React markup. */
export const slideStylesheet = (): string =>
  slideDistillery.renderStyles(slideDistillery.stylesheetCollector());
