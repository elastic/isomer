/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { Composition, ValidationResult } from '@elastic/isomer-sdk';
import { css } from '@emotion/react';

import type { StudioSurface } from '../model/describe_runtime';
import { useStudio } from '../studio_context';
import type { PreviewZoom } from '../surfaces/scaled_preview';
import { SurfaceBoard } from '../surfaces/surface_board';
import type { SurfaceView } from '../surfaces/surface_preview';
import { SurfaceViewToggle } from '../surfaces/surface_preview';
import {
  previewSurfaces,
  SurfaceSelect,
  useSurfaceSelection,
} from '../surfaces/surface_select';
import { ZoomSelect } from '../surfaces/zoom_select';

export interface PreviewPanelProps {
  composition: Composition;
  validation: ValidationResult;
  supported: readonly StudioSurface[];
}

/** The output column, with its own toolbar and scroll area. */
export const PreviewPanel = ({
  composition,
  validation,
  supported,
}: PreviewPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const { rasterizePng } = useStudio();
  const [view, setView] = useState<SurfaceView>('render');
  const [zoom, setZoom] = useState<PreviewZoom>('fit');
  const surfaces = previewSurfaces(supported, Boolean(rasterizePng), true);
  const { showing, select } = useSurfaceSelection(surfaces, 'all');
  const bar = css`
    flex-grow: 0;
    padding: ${euiTheme.size.s} ${euiTheme.size.base};
  `;

  return (
    <div
      role="region"
      aria-label="Outputs"
      css={css`
        height: 100%;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
      `}>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        wrap
        css={css`
          ${bar};
          border-bottom: ${euiTheme.border.thin};
        `}>
        <EuiFlexItem grow={false}>
          <SurfaceSelect
            {...{ surfaces }}
            selected={showing}
            onChange={select}
          />
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <SurfaceViewToggle
            {...{ view }}
            onChange={setView}
            legend="Surface view"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ZoomSelect
            {...{ zoom }}
            onChange={setZoom}
            isDisabled={showing.length !== 1}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        css={css`
          flex: 1;
          min-height: 0;
          overflow: auto;
          padding: ${euiTheme.size.base};
          background: ${euiTheme.colors.backgroundBaseRecessed};
        `}>
        <SurfaceBoard
          surfaces={showing}
          {...{ composition, validation, view, zoom }}
        />
      </div>
    </div>
  );
};
