/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiAvatarProps } from '@elastic/eui';
import { EuiAvatar, EuiThemeProvider, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { useStudio } from '../studio_context';

import { iconDataUri } from './icon_data_uri';

type TileSize = NonNullable<EuiAvatarProps['size']>;

export interface PrimitiveTileProps {
  type: string;
  size?: TileSize;
}

const TILE_SIZES: Readonly<Record<TileSize, number>> = {
  s: 24,
  m: 32,
  l: 40,
  xl: 64,
};
const ICON_SIZES: Readonly<Record<TileSize, number>> = {
  s: 16,
  m: 16,
  l: 24,
  xl: 32,
};

const HUES = [
  'Warning',
  'Primary',
  'Success',
  'Assistance',
  'Accent',
  'Risk',
  'AccentSecondary',
  'Danger',
] as const;

type Hue = (typeof HUES)[number];

interface TileProps {
  label: string;
  hue: Hue;
  size: TileSize;
  svg?: string | undefined;
}

const Tile = ({ label, hue, size, svg }: TileProps) => {
  const {
    euiTheme: { border, colors },
  } = useEuiTheme();
  const accent = colors[`backgroundFilled${hue}`];
  const background = colors[`backgroundBase${hue}`];
  const src = useMemo(
    () =>
      svg
        ? iconDataUri(svg, {
            accent,
            bg: background,
            fg: colors.textHeading,
            muted: colors.textSubdued,
          })
        : undefined,
    [svg, accent, background, colors.textHeading, colors.textSubdued]
  );

  if (!src) {
    return (
      <EuiAvatar
        name={label}
        type="space"
        {...{ size }}
        color={accent}
        aria-hidden={true}
      />
    );
  }

  const tile = css`
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    inline-size: ${TILE_SIZES[size]}px;
    block-size: ${TILE_SIZES[size]}px;
    border: ${border.width.thin} solid ${colors[`borderBase${hue}`]};
    border-radius: ${border.radius.control};
    background: ${background};
  `;

  return (
    <span css={tile} aria-hidden={true}>
      <img
        {...{ src }}
        alt=""
        width={ICON_SIZES[size]}
        height={ICON_SIZES[size]}
      />
    </span>
  );
};

/** A primitive's icon, or its initials when it has none, on a light tile whose hue stays the same wherever the primitive appears. */
export const PrimitiveTile = ({ type, size = 's' }: PrimitiveTileProps) => {
  const {
    docs: { primitives },
  } = useStudio();
  const index = primitives.findIndex((primitive) => primitive.type === type);
  const { label = type, definition } = primitives[index] ?? {};

  return (
    <EuiThemeProvider colorMode="light">
      <Tile
        {...{ label, size }}
        hue={HUES[Math.max(index, 0) % HUES.length] ?? HUES[0]}
        svg={definition?.icon?.svg}
      />
    </EuiThemeProvider>
  );
};
