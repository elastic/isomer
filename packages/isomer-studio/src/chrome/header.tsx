/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ref } from 'react';
import React from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { ColorModePreference } from './color_mode';
import { ColorModePicker } from './color_mode_picker';
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

export interface PhoneNav {
  isOpen: boolean;
  onToggle: () => void;
  toggleRef: Ref<HTMLButtonElement>;
}

export interface StudioHeaderProps {
  /** Defaults to "Isomer Studio". */
  title?: string | undefined;
  /** Absent while an app is open, which selects neither mode. */
  mode: StudioMode | undefined;
  /** The open app's title, shown in place of the mode's name. */
  appTitle?: string | undefined;
  colorMode: ColorModePreference;
  onModeChange: (mode: StudioMode) => void;
  onColorModeChange: (colorMode: ColorModePreference) => void;
  onSelectPrimitive: (type: string) => void;
  onHome: () => void;
  /** On a phone: a menu button for the nav, and one color mode button. */
  phoneNav?: PhoneNav | undefined;
}

/** Title, the Workbench/Reference switch, search and color mode. The mark and title link to Home. */
export const StudioHeader = ({
  title = 'Isomer Studio',
  mode,
  appTitle,
  colorMode,
  onModeChange,
  onColorModeChange,
  onSelectPrimitive,
  onHome,
  phoneNav,
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
    @media (pointer: coarse) {
      height: calc(${euiTheme.size.xxxl} + ${euiTheme.size.s});
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
    @media (pointer: coarse) {
      min-block-size: 44px;
      min-inline-size: 44px;
      justify-content: center;
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
        {phoneNav ? (
          <EuiButtonIcon
            display="empty"
            size="m"
            color="text"
            iconType="menu"
            aria-label="Primitive navigation"
            aria-expanded={phoneNav.isOpen}
            buttonRef={phoneNav.toggleRef}
            onClick={phoneNav.onToggle}
          />
        ) : null}
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
        <EuiText size="xs" color="ghost" css={subtitle}>
          {mode === undefined
            ? appTitle
            : mode === 'dev'
              ? 'Composition editor'
              : 'Primitive reference'}
        </EuiText>
      </div>
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
        <PrimitiveSearch {...{ onSelectPrimitive }} />
        <ColorModePicker
          {...{ colorMode, onColorModeChange }}
          compact={phoneNav !== undefined}
        />
      </div>
    </header>
  );
};
