/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import type { EuiSelectableTemplateSitewideOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiSelectableTemplateSitewide,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { useStudio } from '../studio_context';

import type { Accent } from './accent';
import type { ColorModePreference } from './color_mode';
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
  mode: StudioMode;
  accent: Accent;
  colorMode: ColorModePreference;
  onModeChange: (mode: StudioMode) => void;
  onColorModeChange: (colorMode: ColorModePreference) => void;
  onSelectPrimitive: (type: string) => void;
}

const Search = ({
  onSelectPrimitive,
}: Pick<StudioHeaderProps, 'onSelectPrimitive'>) => {
  const {
    docs: { primitives },
  } = useStudio();
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Editors claim Cmd/Ctrl+K chords by preventing the default.
      if (
        !event.defaultPrevented &&
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const options = useMemo(
    (): EuiSelectableTemplateSitewideOption[] =>
      primitives.map(({ type, label, group, purpose, useWhen, avoidWhen }) => ({
        key: type,
        label,
        searchableLabel: [type, label, purpose, ...useWhen, ...avoidWhen].join(
          ' '
        ),
        meta: [{ text: group, type: 'application' }, { text: purpose }],
      })),
    [primitives]
  );

  return (
    <EuiSelectableTemplateSitewide
      options={options}
      onChange={(updated) => {
        const selected = updated.find(({ checked }) => checked === 'on');
        if (selected?.key) {
          onSelectPrimitive(selected.key);
        }
      }}
      searchProps={{
        placeholder: 'Search names and descriptions',
        append: '⌘K',
        compressed: true,
        inputRef: (element: HTMLInputElement | null) => {
          input.current = element;
        },
        'aria-label': 'Search primitives',
      }}
      popoverProps={{ width: 420 }}
      css={css`
        width: 280px;
      `}
    />
  );
};

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

/** Title, the Dev/Docs switch, search and the color mode. */
export const StudioHeader = ({
  title = 'Isomer Studio',
  mode,
  accent,
  colorMode,
  onModeChange,
  onColorModeChange,
  onSelectPrimitive,
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
    width: ${euiTheme.size.l};
    height: ${euiTheme.size.l};
    border-radius: ${euiTheme.border.radius.small};
    background: ${accent.fill};
  `;

  return (
    <header css={bar}>
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.s};
        `}>
        <span css={logo} />
        <EuiText size="s" color="ghost">
          <strong>{title}</strong>
        </EuiText>
        <EuiText size="xs" color="ghost">
          {mode === 'dev' ? 'Workbench' : 'Reference'}
        </EuiText>
      </div>
      <EuiButtonGroup
        legend="Studio mode"
        buttonSize="s"
        variant="selection"
        idSelected={mode}
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
      <div
        css={css`
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: ${euiTheme.size.s};
        `}>
        <Search {...{ onSelectPrimitive }} />
        <ColorModePicker {...{ colorMode, onColorModeChange }} />
      </div>
    </header>
  );
};
