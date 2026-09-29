/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Modules more than one primitive reads.

import { variants } from '@elastic/distillate';

import { slideDistillery, themeVarName, toneVar } from './distillery';
import { slideTones } from './variants';

const { createStyleModule, tokens } = slideDistillery;
const { color, connector, font, frame, label, marks } = tokens;

export const deckRootModule = createStyleModule('deckRoot', ({ css }) => ({
  root: css`
    color: ${color.text};
    font-family: ${font.family.sans};
    height: ${frame.height};
    overflow-wrap: anywhere;
    width: ${frame.width};
  `,
}));

export const layoutModule = createStyleModule('layout', ({ css }) => ({
  /**
   * Auto margins, not `justify-content: center`, so content taller than the room runs down past the footer, not up over the heading.
   * The `auto` basis keeps it content-sized in an unsized column, which the image surface otherwise collapses.
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

export const tonesModule = createStyleModule('tones', ({ css }) => ({
  tone: variants(slideTones, (tone) => {
    const fg = { primary: color.primary, accent: color.accent }[tone];
    return css`
      ${toneVar.name}: ${fg};
    `;
  }),
}));

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

/** A rail with a border-drawn arrowhead. */
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
  headUp: css`
    border-bottom: ${connector.headLength} solid ${color.line};
    border-left: ${connector.headHalf} solid transparent;
    border-right: ${connector.headHalf} solid transparent;
    flex: 0 0 auto;
    height: 0;
    width: 0;
  `,
  primary: css`
    ${themeVarName('color/line')}: ${color.primary};
  `,
}));

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
