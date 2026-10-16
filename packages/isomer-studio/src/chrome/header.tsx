/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiLink,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { DOCS_URL } from '../home/links';

import type { ColorModePreference } from './color_mode';
import { IsomerMark } from './isomer_mark';
import { PrimitiveSearch } from './primitive_search';
import type { StudioMode } from './route';

const MODE_OPTIONS: { id: StudioMode; label: string }[] = [
  { id: 'dev', label: 'Dev' },
  { id: 'docs', label: 'Docs' },
];
const isMode = (id: string): id is StudioMode =>
  MODE_OPTIONS.some((option) => option.id === id);

export interface StudioHeaderProps {
  /** Defaults to "Isomer Studio". */
  title?: string | undefined;
  /** Absent while an app or Home is open, which selects neither mode. */
  mode: StudioMode | undefined;
  /** The open app's title, shown in place of the mode's name. */
  appTitle?: string | undefined;
  /** On Home the switch, search and color mode give way to a docs link. */
  home?: boolean | undefined;
  colorMode: ColorModePreference;
  onModeChange: (mode: StudioMode) => void;
  onColorModeChange: (colorMode: ColorModePreference) => void;
  onSelectPrimitive: (type: string) => void;
  onHome: () => void;
}

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

const ColorModePicker = ({
  colorMode,
  onColorModeChange,
}: Pick<StudioHeaderProps, 'colorMode' | 'onColorModeChange'>) => (
  <EuiButtonGroup
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

/** Title, the Dev/Docs switch, search and the color mode. The mark returns to Home. */
export const StudioHeader = ({
  title = 'Isomer Studio',
  mode,
  appTitle,
  home = false,
  colorMode,
  onModeChange,
  onColorModeChange,
  onSelectPrimitive,
  onHome,
}: StudioHeaderProps) => {
  const { euiTheme } = useEuiTheme();

  const bar = css`
    flex: none;
    height: ${euiTheme.size.xxxl};
    padding: 0 ${euiTheme.size.base} 0 ${euiTheme.size.m};
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
  `;
  const logo = css`
    display: inline-flex;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    border-radius: ${euiTheme.border.radius.small};
    &:focus-visible {
      outline: 2px solid ${euiTheme.colors.primary};
      outline-offset: 2px;
    }
  `;

  return (
    <header css={bar}>
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.s};
        `}>
        <button
          type="button"
          css={logo}
          aria-label={`${title} home`}
          onClick={onHome}>
          <IsomerMark size={22} />
        </button>
        <EuiText size="s" color="ghost">
          <strong>{title}</strong>
        </EuiText>
        {home ? null : (
          <EuiText size="xs" color="ghost">
            {mode === undefined
              ? appTitle
              : mode === 'dev'
                ? 'Workbench'
                : 'Reference'}
          </EuiText>
        )}
      </div>
      {home ? (
        <span />
      ) : (
        <EuiButtonGroup
          legend="Studio mode"
          buttonSize="s"
          variant="selection"
          idSelected={mode ?? ''}
          display="highlighted"
          onChange={(id) => isMode(id) && onModeChange(id)}>
          {MODE_OPTIONS.map(({ id, label }) => (
            <EuiButton
              key={id}
              id={id}
              iconType={id === 'dev' ? 'code' : 'document'}>
              {label}
            </EuiButton>
          ))}
        </EuiButtonGroup>
      )}
      <div
        css={css`
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: ${euiTheme.size.s};
        `}>
        {home ? (
          <EuiLink href={DOCS_URL} target="_blank" external color="ghost">
            Isomer docs
          </EuiLink>
        ) : (
          <>
            <PrimitiveSearch {...{ onSelectPrimitive }} />
            <ColorModePicker {...{ colorMode, onColorModeChange }} />
          </>
        )}
      </div>
    </header>
  );
};
