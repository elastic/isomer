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
const { closing, color } = tokens;

/** Distillate module for `slideClosing`. Link labels use `labelModule`. */
export const closingModule = createStyleModule('closing', ({ css }) => ({
  root: css`
    align-items: center;
    column-gap: ${closing.columnGap};
    display: grid;
    flex: 1;
    grid-template-columns: ${closing.columns};
    min-height: 0;
  `,
  /** No paths: the title and links take the whole width. */
  single: css`
    grid-template-columns: minmax(0, 1fr);
  `,
  lead: css`
    display: flex;
    flex-direction: column;
    min-width: 0;
  `,
  titleSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${closing.titleSizes[size]};
    `
  ),
  title: css`
    color: ${color.text};
    ${typeRole(closing.title)}
    margin: 0;
  `,
  links: css`
    display: flex;
    flex-direction: column;
    gap: ${closing.linksGap};
    list-style: none;
    margin: ${closing.linksTop} 0 0;
    padding: 0;
  `,
  linkItem: css`
    display: flex;
    flex-direction: column;
    gap: ${closing.linkGap};
  `,
  link: css`
    color: ${color.primary};
    ${typeRole(closing.link)}
    text-decoration: none;
  `,
  paths: css`
    border-top: ${closing.rule} solid ${color.border};
    display: flex;
    flex-direction: column;
    list-style: none;
    margin: 0;
    min-width: 0;
    padding: 0;
  `,
  path: css`
    border-bottom: ${closing.rule} solid ${color.border};
    display: flex;
    flex-direction: column;
    gap: ${closing.pathGap};
    padding: ${closing.pathPaddingY} 0;
  `,
  pathTitle: css`
    color: ${color.text};
    ${typeRole(closing.pathTitle)}
    margin: 0;
  `,
  pathBody: css`
    color: ${color.textSoft};
    ${typeRole(closing.pathBody)}
    margin: 0;
  `,
}));
