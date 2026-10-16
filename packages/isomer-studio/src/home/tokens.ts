/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { ISOMER_MARK } from '../chrome/isomer_mark';

/** Home's own palette: one dark look on the plum shell, whatever the color mode. */
export const HOME = {
  shell: '#3E3748',
  fg: '#FFFFFF',
  fg2: 'rgba(255, 255, 255, 0.72)',
  fg3: 'rgba(255, 255, 255, 0.55)',
  surface1: 'rgba(255, 255, 255, 0.05)',
  surface2: 'rgba(255, 255, 255, 0.07)',
  surface3: 'rgba(255, 255, 255, 0.11)',
  field: 'rgba(22, 12, 30, 0.5)',
  line1: 'rgba(255, 255, 255, 0.12)',
  line2: 'rgba(255, 255, 255, 0.14)',
  line3: 'rgba(255, 255, 255, 0.18)',
  accent: '#F78BBB',
  accentBorder: '#F04E98',
  docs: ISOMER_MARK.blue,
  dev: ISOMER_MARK.teal,
  app: ISOMER_MARK.yellow,
} as const;

/** The glows behind the shell: the same stops as Dev and Docs, in the logo's palette. */
export const homeBackground = css`
  background-color: ${HOME.shell};
  background-image:
    radial-gradient(circle at 0% 0%, rgba(0, 191, 179, 0.3), transparent 24%),
    radial-gradient(
      circle at 4% 100%,
      rgba(254, 197, 20, 0.2),
      transparent 22%
    ),
    radial-gradient(circle at 40% 0%, rgba(240, 78, 152, 0.14), transparent 18%);
`;

export const CONTENT_WIDTH = 620;
export const HOME_NARROW = `@container isomer-home (max-width: ${CONTENT_WIDTH - 1}px)`;
export const WIDE_CONTENT_WIDTH = 880;
export const PANEL_WIDTH = 360;
export const GUTTER = 48;

/** Where the main column fits {@link WIDE_CONTENT_WIDTH} beside the panel. */
export const WIDE = `@media (min-width: ${WIDE_CONTENT_WIDTH + 2 * GUTTER + PANEL_WIDTH + 64}px)`;

/** Tiles per row, set on the main column and read by every tile grid inside it. */
export const TILE_COLUMNS = '--isomer-studio-tile-columns';

export const sectionLabel = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: ${HOME.fg2};
`;

export const quietLabel = css`
  ${sectionLabel};
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${HOME.fg3};
`;

/** A tile's chrome. Rows line up across a grid through subgrid, so a wrapped title shifts its neighbours too. */
export const tile = (rows: number) => css`
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span ${rows};
  row-gap: 5px;
  padding: 14px 16px;
  border-radius: 10px;
  box-sizing: border-box;
  min-height: 120px;
  background: ${HOME.surface2};
  border: 1px solid ${HOME.line2};
  color: ${HOME.fg2};
  text-decoration: none;
  transition:
    background 0.12s,
    border-color 0.12s;
  &:hover,
  &:focus-within {
    background: ${HOME.surface3};
    text-decoration: none;
  }
`;

export const tileTop = css`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`;

export const tileName = css`
  font-size: 14px;
  font-weight: 600;
  color: ${HOME.accent};
`;

export const tileDescription = css`
  font-size: 12px;
  color: ${HOME.fg2};
  text-wrap: pretty;
`;

/** The bottom row of links, shown on hover or focus; always shown where there is no hover. */
export const tileActions = css`
  margin-top: auto;
  padding-top: 6px;
  display: flex;
  gap: 14px;
  font-size: 12px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.12s;
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
`;

/** A dashed tile that points somewhere else: the gallery, or the docs on adding an app. */
export const helpTile = (rows: number, color: string) => css`
  ${tile(rows)};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 6px;
  border-style: dashed;
  border-color: rgba(255, 255, 255, 0.25);
  background: ${HOME.surface1};
  &:hover,
  &:focus-within {
    border-color: ${color};
  }
`;

export const tilesGrid = css`
  display: grid;
  grid-template-columns: repeat(var(${TILE_COLUMNS}, 3), minmax(0, 1fr));
  gap: 12px;
  ${HOME_NARROW} {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const monoFont = (familyCode: string) => css`
  font-family: ${familyCode};
`;
