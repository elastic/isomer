/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiCard,
  EuiPopover,
  EuiPopoverTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { StudioExample } from '../model/read_examples';
import { useStudio } from '../studio_context';

import { ReactSurface } from './react_surface';
import { ScaledPreview } from './scaled_preview';

const PREVIEW_HEIGHT = 112;
const PREVIEW_PADDING = 8;

const ExampleOption = ({
  example: { name, description, node },
  isSelected,
  onSelect,
}: {
  example: StudioExample;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const { compose } = useStudio();
  const composition = useMemo(() => compose([node]), [compose, node]);

  return (
    <EuiCard
      title={name}
      titleSize="xs"
      titleElement="span"
      {...(description === undefined ? {} : { description })}
      textAlign="left"
      paddingSize="s"
      hasBorder
      display={isSelected ? 'primary' : 'plain'}
      onClick={onSelect}
      image={
        <div
          aria-hidden={true}
          css={css`
            height: ${PREVIEW_HEIGHT}px;
            overflow: hidden;
            pointer-events: none;
            padding: ${PREVIEW_PADDING}px;
            background: ${euiTheme.colors.backgroundBaseSubdued};
          `}>
          <ScaledPreview maxHeight={PREVIEW_HEIGHT - 2 * PREVIEW_PADDING}>
            <ReactSurface {...{ composition }} />
          </ScaledPreview>
        </div>
      }
    />
  );
};

export interface ExamplePickerProps {
  examples: readonly StudioExample[];
  example: number;
  onChange: (example: number) => void;
}

/** A button naming the current example that opens every example, rendered, to pick from. */
export const ExamplePicker = ({
  examples,
  example,
  onChange,
}: ExamplePickerProps) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setOpen] = useState(false);
  const name = examples[example]?.name ?? 'No examples';

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="s"
      aria-label="Examples"
      button={
        <EuiButton
          size="s"
          color="text"
          iconType="grid"
          isDisabled={!examples.length}
          onClick={() => setOpen((open) => !open)}
          aria-label={`Example: ${name}`}>
          {name}
        </EuiButton>
      }>
      <EuiPopoverTitle paddingSize="s">Examples</EuiPopoverTitle>
      <div
        css={css`
          display: grid;
          grid-template-columns: repeat(2, 260px);
          gap: ${euiTheme.size.s};
          max-height: 60vh;
          overflow: auto;
        `}>
        {examples.map((candidate, index) => (
          <ExampleOption
            key={candidate.name}
            example={candidate}
            isSelected={index === example}
            onSelect={() => {
              setOpen(false);
              onChange(index);
            }}
          />
        ))}
      </div>
    </EuiPopover>
  );
};
