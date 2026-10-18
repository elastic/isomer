/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCheckbox,
  EuiPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { EnhancementDefinition } from '@elastic/isomer-sdk';
import { css } from '@emotion/react';

export interface EnhancementSelectProps {
  definitions: readonly EnhancementDefinition[];
  selected: readonly string[];
  disabled: boolean;
  onChange: (ids: string[]) => void;
}

/** Opt-in checklist for enhancements that apply to the current composition. */
export const EnhancementSelect = ({
  definitions,
  selected,
  disabled,
  onChange,
}: EnhancementSelectProps) => {
  const [open, setOpen] = useState(false);
  const ids = definitions.map(({ id }) => id);
  const enabled = ids.filter((id) => selected.includes(id));

  return (
    <EuiPopover
      isOpen={open && !disabled}
      closePopover={() => setOpen(false)}
      anchorPosition="downRight"
      panelPaddingSize="s"
      button={
        <EuiButtonEmpty
          size="xs"
          color="text"
          iconType="chevronSingleDown"
          iconSide="right"
          isDisabled={disabled}
          onClick={() => setOpen((value) => !value)}>
          Enhancements ({enabled.length}/{ids.length})
        </EuiButtonEmpty>
      }>
      <div role="group" aria-label="Enhancements">
        {definitions.map(({ id, name, description }) => {
          const label = name ?? id;
          const helpId = description
            ? `studio-enhancement-help-${id}`
            : undefined;
          return (
            <div key={id}>
              <EuiCheckbox
                id={`studio-enhancement-${id}`}
                label={label}
                disabled={disabled}
                checked={selected.includes(id)}
                aria-describedby={helpId}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selected, id]
                      : selected.filter((value) => value !== id)
                  )
                }
              />
              {description ? (
                <>
                  <EuiSpacer size="xs" />
                  <EuiText
                    id={helpId}
                    size="xs"
                    color="subdued"
                    css={css`
                      padding-inline-start: 28px;
                    `}>
                    {description}
                  </EuiText>
                  <EuiSpacer size="s" />
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </EuiPopover>
  );
};
