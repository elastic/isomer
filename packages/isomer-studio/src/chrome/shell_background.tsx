/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiThemeProvider, transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

/** Which shell the Studio shows: Workbench, Reference, or Home. */
export type ShellLook = 'dev' | 'docs' | 'home';

/**
 * The shell's color under three glows in the logo's hues: one in the top corner, one in the bottom
 * corner and a fainter one along the top.
 */
export const shellBackground = (
  { colors }: UseEuiTheme['euiTheme'],
  look: ShellLook
) => {
  const { base, corner, foot, top } = {
    docs: {
      base: colors.backgroundBasePrimary,
      corner: colors.primary,
      foot: colors.accent,
      top: colors.accentSecondary,
    },
    dev: {
      base: colors.backgroundLightSuccess,
      corner: colors.accentSecondary,
      foot: colors.warning,
      top: colors.primary,
    },
    home: {
      base: colors.backgroundLightAssistance,
      corner: colors.accentSecondary,
      foot: colors.warning,
      top: colors.accent,
    },
  }[look];
  return css`
    background-color: ${base};
    background-image:
      radial-gradient(
        circle at 0% 0%,
        ${transparentize(corner, 0.3)},
        transparent 24%
      ),
      radial-gradient(
        circle at 4% 100%,
        ${transparentize(foot, 0.2)},
        transparent 22%
      ),
      radial-gradient(
        circle at 40% 0%,
        ${transparentize(top, 0.14)},
        transparent 18%
      );
  `;
};

const Backdrop = ({ look }: { look: ShellLook }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      aria-hidden={true}
      css={[
        css`
          position: absolute;
          inset: 0;
          z-index: -1;
        `,
        shellBackground(euiTheme, look),
      ]}
    />
  );
};

/**
 * Paints {@link shellBackground} behind the rest of a positioned, isolated parent, in the dark
 * theme whatever the color mode.
 */
export const ShellBackdrop = ({ look }: { look: ShellLook }) => (
  <EuiThemeProvider colorMode="dark" wrapperProps={{ cloneElement: true }}>
    <Backdrop {...{ look }} />
  </EuiThemeProvider>
);
