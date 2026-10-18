/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import type { EuiSelectableTemplateSitewideOption } from '@elastic/eui';
import { EuiSelectableTemplateSitewide } from '@elastic/eui';
import { css } from '@emotion/react';

import { HOME } from '../home/tokens';
import { useStudio } from '../studio_context';

export interface PrimitiveSearchProps {
  onSelectPrimitive: (type: string) => void;
  /** `compressed` fits the header; `large` is the Home page's search. */
  size?: 'compressed' | 'large' | undefined;
  placeholder?: string | undefined;
}

/** Every primitive by name, purpose and guidance, with ⌘K / Ctrl+K focusing the field. */
export const PrimitiveSearch = ({
  onSelectPrimitive,
  size = 'compressed',
  placeholder = 'Search names and descriptions',
}: PrimitiveSearchProps) => {
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

  const large = size === 'large';

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
        placeholder,
        append: '⌘K',
        compressed: !large,
        fullWidth: large,
        inputRef: (element: HTMLInputElement | null) => {
          input.current = element;
        },
        'aria-label': 'Search primitives',
      }}
      popoverProps={{ width: large ? 620 : 420 }}
      css={
        large
          ? css`
              width: 100%;
              .euiFormControlLayout,
              .euiFieldSearch {
                block-size: 52px;
              }
              .euiFormControlLayout {
                background-color: ${HOME.field};
              }
              .euiFormControlLayout:not(:focus-within)::after {
                border-color: ${HOME.line3};
              }
              .euiFieldSearch {
                background-color: transparent;
                color: ${HOME.fg};
              }
              .euiFieldSearch::placeholder {
                color: ${HOME.fg3};
              }
              .euiFormControlLayoutIcons,
              .euiFormControlLayout__append {
                color: ${HOME.fg2};
              }
              .euiFormControlLayoutIcons {
                max-block-size: none;
              }
              .euiFieldSearch {
                font-size: 15px;
              }
            `
          : css`
              flex: 0 1 280px;
              width: 280px;
              min-width: 72px;
              @media (max-width: 480px) {
                .euiFormControlLayout__append {
                  display: none;
                }
              }
            `
      }
    />
  );
};
