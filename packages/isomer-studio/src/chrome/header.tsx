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
import { formatLocation, HOME } from './route';

const MODE_OPTIONS: { id: StudioMode; label: string }[] = [
  { id: 'dev', label: 'Workbench' },
  { id: 'docs', label: 'Reference' },
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

/** Title, the Workbench/Reference switch, search and color mode. The mark and title link to Home. */
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
    gap: ${euiTheme.size.s};
    @media (max-width: 1200px) {
      display: flex;
      flex-wrap: nowrap;
      padding-inline: ${euiTheme.size.s};
    }
  `;
  const brandSlot = css`
    min-width: 0;
    flex-wrap: nowrap;
    @media (max-width: 1200px) {
      flex: 1 0 auto;
    }
  `;
  const subtitle = css`
    white-space: nowrap;
    @media (max-width: 1024px) {
      display: none;
    }
  `;
  const titleText = css`
    white-space: nowrap;
    @media (max-width: 640px) {
      display: none;
    }
  `;
  const modeSlot = css`
    flex: none;
  `;
  const modeLabel = css`
    @media (max-width: 1200px) {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `;
  const toolsSlot = css`
    min-width: 0;
    flex-wrap: nowrap;
    @media (max-width: 1200px) {
      flex: 0 1 auto;
    }
  `;
  const brand = css`
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    border-radius: ${euiTheme.border.radius.small};
    text-decoration: none;
    &:hover {
      text-decoration: none;
    }
    &:focus-visible {
      outline: 2px solid ${euiTheme.colors.primary};
      outline-offset: 2px;
    }
  `;

  return (
    <header css={bar}>
      <div
        css={[
          brandSlot,
          css`
            display: flex;
            align-items: center;
            gap: ${euiTheme.size.s};
          `,
        ]}>
        <a
          href={formatLocation(HOME)}
          css={brand}
          aria-label={`${title} home`}
          onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey) {
              return;
            }
            event.preventDefault();
            onHome();
          }}>
          <IsomerMark size={22} />
          <EuiText size="s" color="ghost" css={titleText}>
            <strong>{title}</strong>
          </EuiText>
        </a>
        {home ? null : (
          <EuiText size="xs" color="ghost" css={subtitle}>
            {mode === undefined
              ? appTitle
              : mode === 'dev'
                ? 'Composition editor'
                : 'Primitive reference'}
          </EuiText>
        )}
      </div>
      {home ? (
        <span
          css={css`
            @media (max-width: 1200px) {
              display: none;
            }
          `}
        />
      ) : (
        <EuiButtonGroup
          css={modeSlot}
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
              title={label}
              iconType={id === 'dev' ? 'code' : 'document'}>
              <span css={modeLabel}>{label}</span>
            </EuiButton>
          ))}
        </EuiButtonGroup>
      )}
      <div
        css={[
          toolsSlot,
          css`
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: ${euiTheme.size.s};
          `,
        ]}>
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
