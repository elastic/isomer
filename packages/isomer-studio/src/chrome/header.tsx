/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import type { EuiSelectableTemplateSitewideOption } from '@elastic/eui';
import {
  EuiButtonGroup,
  EuiSelectableTemplateSitewide,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { useStudio } from '../studio_context';

import type { Accent } from './accent';
import type { ColorModePreference } from './color_mode';
import { isColorModePreference } from './color_mode';
import type { StudioMode } from './route';

const MODE_OPTIONS = [
  { id: 'dev', label: 'Dev' },
  { id: 'docs', label: 'Docs' },
];

const COLOR_MODE_OPTIONS = [
  { id: 'light', label: 'Light', iconType: 'sun' },
  { id: 'dark', label: 'Dark', iconType: 'moon' },
  { id: 'system', label: 'System', iconType: 'display' },
];

const isMode = (id: string): id is StudioMode => id === 'dev' || id === 'docs';

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
    background: ${accent.shell};
    transition: background ${euiTheme.animation.normal}
      ${euiTheme.animation.resistance};
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
        <EuiText size="s">
          <strong>{title}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {mode === 'dev' ? 'Workbench' : 'Reference'}
        </EuiText>
      </div>
      <EuiButtonGroup
        legend="Studio mode"
        options={MODE_OPTIONS}
        idSelected={mode}
        onChange={(id) => isMode(id) && onModeChange(id)}
        color={accent.color}
        buttonSize="compressed"
      />
      <div
        css={css`
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: ${euiTheme.size.s};
        `}>
        <Search {...{ onSelectPrimitive }} />
        <EuiButtonGroup
          legend="Color mode"
          options={COLOR_MODE_OPTIONS}
          idSelected={colorMode}
          onChange={(id) => isColorModePreference(id) && onColorModeChange(id)}
          color={accent.color}
          buttonSize="compressed"
          isIconOnly
        />
      </div>
    </header>
  );
};
