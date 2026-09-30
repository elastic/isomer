/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';
import {
  slideTranscriptFormats,
  slideTranscriptRoles,
} from '../../theme/variants';

const { createStyleModule, tokens } = slideDistillery;
const { color, transcript } = tokens;

export const transcriptModule = createStyleModule('transcript', ({ css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    gap: ${transcript.headingGap};
  `,
  turns: css`
    display: flex;
    flex-direction: column;
    gap: ${transcript.gap};
    list-style: none;
    margin: 0;
    padding: 0;
  `,
  turn: css`
    border-radius: ${transcript.radius};
    border-style: solid;
    border-width: ${transcript.border};
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: ${transcript.labelGap};
    padding: ${transcript.padding};
  `,
  speaker: variants(slideTranscriptRoles, (role) =>
    role === 'user'
      ? css`
          align-self: flex-end;
          background: ${color.primaryBg};
          border-color: ${color.primaryBorder};
          max-width: ${transcript.userMaxWidth};
        `
      : css`
          align-self: flex-start;
          background: ${role === 'host' ? color.bgMuted : color.bgSurface};
          border-color: ${color.border};
          max-width: ${transcript.otherMaxWidth};
        `
  ),
  role: variants(slideTranscriptRoles, (role) => {
    const fg = {
      user: color.primary,
      model: color.textSubtle,
      host: color.accent,
    }[role];
    return css`
      color: ${fg};
      ${typeRole(transcript.label)}
      text-transform: uppercase;
    `;
  }),
  text: css`
    color: ${color.text};
    margin: 0;
    white-space: pre-wrap;
  `,
  format: variants(slideTranscriptFormats, (format) =>
    format === 'code'
      ? css`
          ${typeRole(transcript.code)}
        `
      : css`
          ${typeRole(transcript.prose)}
        `
  ),
}));
