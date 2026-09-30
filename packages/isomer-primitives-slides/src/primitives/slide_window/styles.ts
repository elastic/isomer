/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';

const { createStyleModule, tokens } = slideDistillery;
const { color, window } = tokens;

export const windowModule = createStyleModule('window', ({ css }) => ({
  panel: css`
    background: ${color.bgSurface};
    border: ${window.border} solid ${color.border};
    border-radius: ${window.radius};
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  `,
  bar: css`
    background: ${color.bgMuted};
    border-bottom: ${window.border} solid ${color.border};
    display: flex;
    flex: 0 0 auto;
    margin: 0;
    white-space: nowrap;
  `,
  appBar: css`
    color: ${color.textSubtle};
    ${typeRole(window.bar)}
    padding: ${window.barPadding};
  `,
  slackBar: css`
    color: ${color.text};
    font-family: ${tokens.font.family.sans};
    ${typeRole(window.slackBar)}
    padding: ${window.slackBarPadding};
  `,
  body: css`
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: ${window.bodyGap};
    min-height: 0;
  `,
  appBody: css`
    padding: ${window.bodyPadding};
  `,
  slackBody: css`
    padding: ${window.slackBodyPadding};
  `,
}));
