/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';
import { slideSizes } from '../../theme/variants';

const { createStyleModule, tokens } = slideDistillery;
const { color, title } = tokens;

/** Distillate module for `slideTitle`. */
export const titleModule = createStyleModule('title', ({ css }) => ({
  root: css`
    align-items: center;
    column-gap: ${title.columnGap};
    display: grid;
    flex: 1;
    grid-template-columns: ${title.columns};
    min-height: 0;
  `,
  /** No aside: the title takes the whole width. */
  single: css`
    grid-template-columns: minmax(0, 1fr);
  `,
  lead: css`
    display: flex;
    flex-direction: column;
    min-width: 0;
  `,
  logo: css`
    display: block;
    flex: 0 0 auto;
    height: ${title.logoSize};
    margin-bottom: ${title.logoGap};
    width: ${title.logoSize};
  `,
  eyebrow: css`
    color: ${color.primary};
    ${typeRole(title.eyebrow)}
    margin: 0;
    text-transform: uppercase;
  `,
  titleSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${title.displaySizes[size]};
    `
  ),
  title: css`
    color: ${color.text};
    ${typeRole(title.display)}
    margin: ${title.displayGap} 0 0;
    overflow-wrap: anywhere;
  `,
  tagline: css`
    color: ${color.textSoft};
    ${typeRole(title.tagline)}
    margin: ${title.taglineGap} 0 0;
    text-wrap: balance;
  `,
  definition: css`
    align-items: baseline;
    color: ${color.textSubtle};
    display: flex;
    ${typeRole(title.definition)}
    gap: ${title.termGap};
    margin: ${title.definitionGap} 0 0;
    max-width: ${title.definitionMaxWidth};
  `,
  term: css`
    color: ${color.textSoft};
    font-style: italic;
    white-space: nowrap;
  `,
  definitionText: css`
    text-wrap: pretty;
  `,
  aside: css`
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
  `,
}));
