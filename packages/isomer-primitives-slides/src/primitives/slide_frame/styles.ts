/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decls, rule, variants } from '@elastic/distillate';

import { slideDistillery, themeVarName } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';
import { slideFrameTones } from '../../theme/variants';

const { createStyleModule, tokens } = slideDistillery;
const { color, frame, inverse, type } = tokens;

export const frameModule = createStyleModule('frame', ({ css }) => ({
  slide: css`
    background: ${color.bgPage};
    box-sizing: border-box;
    color: ${color.text};
    display: flex;
    flex-direction: column;
    font-family: ${tokens.font.family.sans};
    height: ${frame.height};
    overflow: hidden;
    padding: ${frame.paddingTop} ${frame.paddingX} ${frame.paddingBottom};
    position: relative;
    width: ${frame.width};
  `,
  standalone: css`
    padding: ${frame.standalonePadding};
  `,
  // Inverse redeclares the page palette, so every primitive inside reads it unchanged.
  tone: variants(slideFrameTones, (tone) =>
    tone === 'inverse'
      ? css`
          ${themeVarName('color/bgPage')}: ${inverse.bg};
          ${themeVarName('color/bgSurface')}: ${inverse.surface};
          ${themeVarName('color/bgMuted')}: ${inverse.muted};
          ${themeVarName('color/bgTableHead')}: ${inverse.tableHead};
          ${themeVarName('color/codeFill')}: ${inverse.codeFill};
          ${themeVarName('color/text')}: ${inverse.text};
          ${themeVarName('color/textSoft')}: ${inverse.textSoft};
          ${themeVarName('color/textSubtle')}: ${inverse.textSubtle};
          ${themeVarName('color/primary')}: ${inverse.primary};
          ${themeVarName('color/onPrimary')}: ${inverse.onPrimary};
          ${themeVarName('color/primaryTint')}: ${inverse.primaryTint};
          ${themeVarName('color/primaryBg')}: ${inverse.primaryBg};
          ${themeVarName('color/primaryBorder')}: ${inverse.primaryBorder};
          ${themeVarName('color/accent')}: ${inverse.accent};
          ${themeVarName('color/border')}: ${inverse.rule};
          ${themeVarName('color/borderDashed')}: ${inverse.ruleDashed};
          ${themeVarName('color/line')}: ${inverse.connector};
          ${themeVarName('color/placeholderStripe')}: ${inverse.placeholderStripe};
        `
      : undefined
  ),
  inverseBrand: rule(
    (h) => `${h.inverse} ${h.brand}`,
    decls`color: ${color.textSoft};`
  ),
  body: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: ${frame.bodyGap};
    min-height: 0;
  `,
  footer: css`
    align-items: center;
    bottom: ${frame.footerBottom};
    color: ${color.textSubtle};
    display: flex;
    ${typeRole(type.chrome)}
    justify-content: space-between;
    left: ${frame.paddingX};
    position: absolute;
    right: ${frame.paddingX};
  `,
  footerStart: css`
    align-items: center;
    display: flex;
    gap: ${frame.footerGap};
  `,
  brand: css`
    color: ${color.text};
    font-weight: ${frame.brandFontWeight};
  `,
  url: css`
    color: inherit;
    text-decoration: none;
  `,
  logo: css`
    display: block;
    flex: 0 0 auto;
    height: ${frame.logoSize};
    width: ${frame.logoSize};
  `,
}));
