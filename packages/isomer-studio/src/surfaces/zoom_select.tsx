/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import { css } from '@emotion/react';

import type { PreviewZoom } from './scaled_preview';

const ZOOMS: readonly PreviewZoom[] = ['fit', 0.5, 0.75, 1, 1.5, 2];

export const zoomLabel = (zoom: PreviewZoom): string =>
  zoom === 'fit' ? 'Fit' : `${Math.round(zoom * 100)}%`;

/** Chooses how the visual surfaces scale: fit to the panel, or a fixed zoom. */
export const ZoomSelect = ({
  zoom,
  onChange,
}: {
  zoom: PreviewZoom;
  onChange: (zoom: PreviewZoom) => void;
}) => {
  const [isOpen, setOpen] = useState(false);

  const options = ZOOMS.map((candidate): EuiSelectableOption => ({
    key: String(candidate),
    label: candidate === 'fit' ? 'Fit to container' : zoomLabel(candidate),
    checked: candidate === zoom ? 'on' : undefined,
  }));

  return (
    <EuiPopover
      aria-label="Zoom"
      isOpen={isOpen}
      closePopover={() => setOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      button={
        <EuiButton
          size="s"
          color="text"
          iconType="magnifyPlus"
          iconSide="left"
          onClick={() => setOpen((open) => !open)}
          aria-label={`Zoom: ${zoomLabel(zoom)}`}>
          {zoomLabel(zoom)}
        </EuiButton>
      }>
      <EuiSelectable
        aria-label="Zoom"
        singleSelection="always"
        options={options}
        onChange={(next) => {
          const index = next.findIndex(({ checked }) => checked === 'on');
          const selected = ZOOMS[index];
          if (selected !== undefined) {
            onChange(selected);
            setOpen(false);
          }
        }}
        listProps={{ bordered: false }}
        css={css`
          min-width: 180px;
        `}>
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
};
