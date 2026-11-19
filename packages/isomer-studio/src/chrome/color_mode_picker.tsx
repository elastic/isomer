/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiButtonIcon } from '@elastic/eui';
import { css } from '@emotion/react';

import type { ColorModePreference } from './color_mode';

const COLOR_MODES: {
  id: ColorModePreference;
  label: string;
  iconType: 'sun' | 'moon' | 'display';
}[] = [
  { id: 'system', label: 'System', iconType: 'display' },
  { id: 'light', label: 'Light', iconType: 'sun' },
  { id: 'dark', label: 'Dark', iconType: 'moon' },
];

const isColorMode = (id: string): id is ColorModePreference =>
  COLOR_MODES.some((option) => option.id === id);

/** System, Light and Dark, as icon buttons. */
export const ColorModePicker = ({
  colorMode,
  onColorModeChange,
}: {
  colorMode: ColorModePreference;
  onColorModeChange: (colorMode: ColorModePreference) => void;
}) => (
  <EuiButtonGroup
    css={css`
      flex: none;
    `}
    legend="Color mode"
    buttonSize="s"
    variant="selection"
    idSelected={colorMode}
    display="highlighted"
    onChange={(id) => isColorMode(id) && onColorModeChange(id)}>
    {COLOR_MODES.map(({ id, label, iconType }) => (
      <EuiButtonIcon
        key={id}
        {...{ id, iconType }}
        aria-label={label}
        title={label}
      />
    ))}
  </EuiButtonGroup>
);
