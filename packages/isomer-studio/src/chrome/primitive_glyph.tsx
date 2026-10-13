/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { useStudio } from '../studio_context';

import { iconDataUri } from './icon_data_uri';

export interface PrimitiveGlyphProps {
  type: string;
  /** Edge length in pixels. */
  size: number;
}

/** A primitive's icon as a bare glyph in `currentColor`; its initial when it has no icon. */
export const PrimitiveGlyph = ({ type, size }: PrimitiveGlyphProps) => {
  const {
    euiTheme: { font, colors },
  } = useEuiTheme();
  const {
    docs: { primitives },
  } = useStudio();
  const doc = primitives.find((primitive) => primitive.type === type);
  const svg = doc?.definition.icon?.svg;
  const label = doc?.label ?? type;
  const src = useMemo(
    () =>
      svg
        ? iconDataUri(svg, {
            accent: colors.textSubdued,
            bg: 'transparent',
            fg: colors.textSubdued,
            muted: colors.textSubdued,
          })
        : undefined,
    [svg]
  );

  return (
    <span
      aria-hidden={true}
      css={css`
        display: inline-flex;
        flex: none;
        align-items: center;
        justify-content: center;
        inline-size: ${size}px;
        block-size: ${size}px;
        font-size: ${Math.round(size * 0.65)}px;
        font-weight: ${font.weight.bold};
        line-height: 1;
        ${
          src
            ? css`
                background-color: currentColor;
                mask: ${`url("${src}")`} center / contain no-repeat;
              `
            : ''
        }
      `}>
      {src ? null : label.charAt(0).toUpperCase()}
    </span>
  );
};
