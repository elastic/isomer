/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { euiFontSize, transparentize, useEuiTheme } from '@elastic/eui';
import type { SerializedStyles } from '@emotion/react';
import { css } from '@emotion/react';

export const CONTENT_WIDTH = 620;
export const HOME_NARROW = `@container isomer-home (max-width: ${CONTENT_WIDTH - 1}px)`;
export const WIDE_CONTENT_WIDTH = 880;
export const PANEL_WIDTH = 360;
export const GUTTER = 48;

/** Where the main column fits {@link WIDE_CONTENT_WIDTH} beside the panel. */
export const WIDE = `@media (min-width: ${WIDE_CONTENT_WIDTH + 2 * GUTTER + PANEL_WIDTH + 64}px)`;

/** Tiles per row, set on the main column and read by every tile grid inside it. */
export const TILE_COLUMNS = '--isomer-studio-tile-columns';

/** How opaque each translucent layer over the shell's glows is. */
const VEIL = {
  surface: 0.06,
  surfaceHover: 0.11,
  line: 0.14,
  dashed: 0.25,
} as const;

/**
 * Home's colors from the dark EUI theme it is rendered in: text in the theme's text roles, the
 * Reference, Workbench and app actions in its primary, accent-secondary and warning text colors,
 * and translucent layers of the theme's plain light color over the shell.
 */
export const homeColors = ({ colors }: UseEuiTheme['euiTheme']) => {
  const veil = (alpha: number) => transparentize(colors.plainLight, alpha);
  return {
    heading: colors.textHeading,
    paragraph: colors.textParagraph,
    subdued: colors.textSubdued,
    accent: colors.textAccent,
    accentBorder: colors.borderStrongAccent,
    docs: colors.textPrimary,
    dev: colors.textAccentSecondary,
    app: colors.textWarning,
    surface: veil(VEIL.surface),
    surfaceHover: veil(VEIL.surfaceHover),
    line: veil(VEIL.line),
    dashed: veil(VEIL.dashed),
    /** Opaque, so the actions' colored text keeps its contrast over the glows. */
    action: colors.backgroundBaseAssistance,
    actionHover: colors.backgroundBaseInteractiveHoverAssistance,
  };
};

export type HomeColors = ReturnType<typeof homeColors>;

type FontScale = Parameters<typeof euiFontSize>[1];

export interface Home {
  euiTheme: UseEuiTheme['euiTheme'];
  color: HomeColors;
  /** The theme's font size at `scale`. */
  fontSize: (scale: FontScale) => string;
  sectionLabel: SerializedStyles;
  sectionHeading: SerializedStyles;
  quietLabel: SerializedStyles;
  /** A tile's chrome. Rows line up across a grid through subgrid, so a wrapped title shifts its neighbours too. */
  tile: (rows: number) => SerializedStyles;
  actionCard: SerializedStyles;
  tileTop: SerializedStyles;
  tileName: SerializedStyles;
  tileDescription: SerializedStyles;
  tileActions: SerializedStyles;
  helpTile: (rows: number, hover: string) => SerializedStyles;
  tilesGrid: SerializedStyles;
}

/** Home's colors, font sizes and the blocks its sections share, all from the current EUI theme. */
export const useHome = (): Home => {
  const context = useEuiTheme();
  return useMemo(() => {
    const { euiTheme } = context;
    const { size, border, font } = euiTheme;
    const color = homeColors(euiTheme);
    const fontSize = (scale: FontScale) =>
      String(euiFontSize(context, scale).fontSize);
    const transition = `${euiTheme.animation.fast} ${euiTheme.animation.resistance}`;

    const sectionLabel = css`
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: ${fontSize('xs')};
      font-weight: ${font.weight.bold};
      color: ${color.paragraph};
    `;

    const tile = (rows: number) => css`
      display: grid;
      grid-template-rows: subgrid;
      grid-row: span ${rows};
      row-gap: ${size.xs};
      padding: ${size.m} ${size.base};
      border-radius: ${border.radius.panel};
      box-sizing: border-box;
      min-height: 120px;
      background: ${color.surface};
      border: ${border.width.thin} solid ${color.line};
      color: ${color.paragraph};
      text-decoration: none;
      transition:
        background ${transition},
        border-color ${transition};
      &:hover,
      &:focus-within {
        background: ${color.surfaceHover};
        text-decoration: none;
      }
    `;

    return {
      euiTheme,
      color,
      fontSize,
      sectionLabel,
      sectionHeading: css`
        margin: 0;
        font: inherit;
      `,
      quietLabel: css`
        ${sectionLabel};
        font-size: ${fontSize('xxs')};
        font-weight: ${font.weight.regular};
        text-transform: uppercase;
        color: ${color.subdued};
      `,
      tile,
      /** Opaque behind the logo-colored actions, so they stay readable over the shell's glows. */
      actionCard: css`
        background: ${color.action};
        &:hover,
        &:focus-within {
          background: ${color.actionHover};
        }
      `,
      tileTop: css`
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: ${size.s};
      `,
      tileName: css`
        font-size: ${fontSize('s')};
        font-weight: ${font.weight.bold};
        color: ${color.accent};
      `,
      tileDescription: css`
        font-size: ${fontSize('xs')};
        color: ${color.paragraph};
        text-wrap: pretty;
      `,
      /** The bottom row of links, shown on hover or focus; always shown where there is no hover. */
      tileActions: css`
        margin-top: auto;
        padding-top: ${size.xs};
        display: flex;
        gap: ${size.m};
        font-size: ${fontSize('xs')};
        font-weight: ${font.weight.bold};
        opacity: 0;
        transition: opacity ${transition};
        a {
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        *:hover > &,
        *:focus-within > & {
          opacity: 1;
        }
        @media (hover: none) {
          opacity: 1;
        }
      `,
      /** A dashed tile that points somewhere else: the gallery, or the docs on adding an app. */
      helpTile: (rows: number, hover: string) => css`
        ${tile(rows)};
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        gap: ${size.s};
        border-style: dashed;
        border-color: ${color.dashed};
        &:hover,
        &:focus-within {
          border-color: ${hover};
        }
      `,
      tilesGrid: css`
        display: grid;
        grid-template-columns: repeat(var(${TILE_COLUMNS}, 3), minmax(0, 1fr));
        gap: ${size.m};
        ${HOME_NARROW} {
          grid-template-columns: minmax(0, 1fr);
        }
      `,
    };
  }, [context]);
};
