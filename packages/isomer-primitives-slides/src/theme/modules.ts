/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Modules more than one primitive reads. Each primitive's own module lives in
// its folder's `styles.ts`; `src/stylesheet.ts` collects them all.

import { variants } from '@elastic/distillate';

import { slideDistillery, themeVarName, toneVar } from './distillery';
import { typeRole } from './type_role';
import { slideTones } from './variants';

const { createStyleModule, tokens } = slideDistillery;
const { color, connector, font, frame, label, marks, placeholder, type } =
  tokens;

/** The deck root wrapper every slide renders inside. */
export const deckRootModule = createStyleModule('deckRoot', ({ css }) => ({
  root: css`
    color: ${color.text};
    font-family: ${font.family.sans};
    height: ${frame.height};
    width: ${frame.width};
  `,
}));

/** Layout roles a primitive's root can take inside the frame body. */
export const layoutModule = createStyleModule('layout', ({ css }) => ({
  /**
   * Takes the frame body's remaining height and centers its content in it.
   * Auto margins rather than `justify-content: center`, so content taller than
   * the space runs down past the footer instead of up over the heading. The
   * `auto` basis keeps it content-sized inside an unsized column, which the
   * image surface otherwise collapses to nothing.
   */
  fill: css`
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;

    & > :first-child {
      margin-top: auto;
    }

    & > :last-child {
      margin-bottom: auto;
    }
  `,
}));

/** Sets {@link toneVar} for a {@link SlideTone}. */
export const tonesModule = createStyleModule('tones', ({ css }) => ({
  tone: variants(slideTones, (tone) => {
    const fg = { primary: color.primary, accent: color.accent }[tone];
    return css`
      ${toneVar.name}: ${fg};
    `;
  }),
}));

/** Uppercase label above a list, column, or lane. */
export const labelModule = createStyleModule('label', ({ css }) => ({
  label: css`
    color: ${color.textSubtle};
    font-size: ${label.size};
    font-weight: ${label.weight};
    letter-spacing: ${label.tracking};
    text-transform: uppercase;
  `,
  toned: css`
    color: ${toneVar};
  `,
}));

/** Striped stand-in for a render or number that does not exist yet. */
export const placeholderModule = createStyleModule(
  'placeholder',
  ({ css }) => ({
    root: css`
      align-items: center;
      background: repeating-linear-gradient(
        ${placeholder.angle},
        ${color.placeholderStripe} 0 ${placeholder.stripe},
        ${color.bgPage} ${placeholder.stripe} ${placeholder.stripeEnd}
      );
      border: ${placeholder.border} dashed ${color.borderDashed};
      border-radius: ${placeholder.radius};
      box-sizing: border-box;
      display: flex;
      justify-content: center;
      min-height: 0;
      min-width: 0;
    `,
    caption: css`
      background: ${color.bgPage};
      border-radius: ${placeholder.captionRadius};
      color: ${color.textSubtle};
      display: flex;
      ${typeRole({ ...type.mono, size: placeholder.captionFontSize })}
      padding: ${placeholder.captionPadding};
    `,
  })
);

/** A rail with a border-drawn arrowhead, horizontal or vertical. */
export const connectorModule = createStyleModule('connector', ({ css }) => ({
  across: css`
    align-items: center;
    display: flex;
    min-width: 0;
  `,
  down: css`
    align-items: center;
    display: flex;
    flex-direction: column;
    min-height: 0;
  `,
  railAcross: css`
    background: ${color.line};
    flex: 1;
    height: ${connector.rail};
    min-width: 0;
  `,
  railDown: css`
    background: ${color.line};
    flex: 1;
    min-height: 0;
    width: ${connector.rail};
  `,
  headRight: css`
    border-bottom: ${connector.headHalf} solid transparent;
    border-left: ${connector.headLength} solid ${color.line};
    border-top: ${connector.headHalf} solid transparent;
    flex: 0 0 auto;
    height: 0;
    width: 0;
  `,
  headDown: css`
    border-left: ${connector.headHalf} solid transparent;
    border-right: ${connector.headHalf} solid transparent;
    border-top: ${connector.headLength} solid ${color.line};
    flex: 0 0 auto;
    height: 0;
    width: 0;
  `,
  headLeft: css`
    border-bottom: ${connector.headHalf} solid transparent;
    border-right: ${connector.headLength} solid ${color.line};
    border-top: ${connector.headHalf} solid transparent;
    flex: 0 0 auto;
    height: 0;
    width: 0;
  `,
  headUp: css`
    border-bottom: ${connector.headLength} solid ${color.line};
    border-left: ${connector.headHalf} solid transparent;
    border-right: ${connector.headHalf} solid transparent;
    flex: 0 0 auto;
    height: 0;
    width: 0;
  `,
  /** Draws the connector in `primary` instead of ink. */
  primary: css`
    ${themeVarName('color/line')}: ${color.primary};
  `,
  /** Draws the connector in the enclosing {@link toneVar}. */
  toned: css`
    ${themeVarName('color/line')}: ${toneVar};
  `,
}));

/** Inline `code` and `**strong**` runs inside authored text. */
export const marksModule = createStyleModule('marks', ({ css }) => ({
  code: css`
    background: ${color.codeFill};
    border: ${marks.codeBorder} solid ${color.borderDashed};
    border-radius: ${marks.codeRadius};
    color: ${color.text};
    font-family: ${marks.code.family};
    padding: ${marks.codePadding};
  `,
  displayCode: css`
    font-family: ${marks.displayCode.family};
    font-weight: ${marks.displayCode.weight};
  `,
  strong: css`
    color: ${color.text};
    font-weight: ${marks.strong.weight};
  `,
  strongPrimary: css`
    color: ${color.primary};
    font-weight: inherit;
  `,
}));
