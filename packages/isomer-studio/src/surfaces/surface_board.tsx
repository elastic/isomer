/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import type { Composition, ValidationResult } from '@elastic/isomer-sdk';
import type { SerializedStyles } from '@emotion/react';
import { css } from '@emotion/react';

import { useStudio } from '../studio_context';

import { PngSurface } from './png_surface';
import type { PreviewZoom } from './scaled_preview';
import type { SurfaceView } from './surface_preview';
import { SurfacePreview } from './surface_preview';
import type { PreviewSurface } from './surface_select';
import {
  isVisualSurface,
  PREVIEW_ICONS,
  PREVIEW_LABELS,
  SURFACE_NOTES,
} from './surface_select';

const CARD_MIN_WIDTH = 360;

/** Two columns from the width of three {@link CARD_MIN_WIDTH} cards, gaps included. Never three. */
const twoColumnBreak = (gap: string) =>
  `calc(${CARD_MIN_WIDTH}px * 3 + ${gap} * 2)`;

interface RenderProps {
  composition: Composition;
  validation: ValidationResult;
  view: SurfaceView;
  zoom: PreviewZoom;
}

const SurfaceRender = ({
  surface,
  composition,
  validation,
  view,
  zoom,
  frameCss,
}: RenderProps & {
  surface: PreviewSurface;
  frameCss?: SerializedStyles | undefined;
}) => {
  const { rasterizePng } = useStudio();
  if (surface !== 'png') {
    return (
      <SurfacePreview
        {...{ surface, composition, validation, view, zoom, frameCss }}
      />
    );
  }
  return rasterizePng ? (
    <PngSurface {...{ composition, rasterizePng, zoom, frameCss }} />
  ) : null;
};

const SurfaceCard = ({
  surface,
  composition,
  validation,
  view,
}: Omit<RenderProps, 'zoom'> & { surface: PreviewSurface }) => {
  const { euiTheme } = useEuiTheme();
  const label = PREVIEW_LABELS[surface];
  const clipsRender = view === 'render' && isVisualSurface(surface);

  return (
    <section
      aria-label={`${label} preview`}
      css={css`
        display: flex;
        flex-direction: column;
        min-width: 0;
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
        overflow: hidden;
      `}>
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.s};
          padding: ${euiTheme.size.s} ${euiTheme.size.m};
          border-bottom: ${euiTheme.border.thin};
        `}>
        <EuiIcon type={PREVIEW_ICONS[surface]} size="m" aria-hidden={true} />
        <EuiText size="xs">
          <strong>{label}</strong>
        </EuiText>
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}>
          {SURFACE_NOTES[surface]}
        </EuiText>
      </div>
      <SurfaceRender
        {...{ surface, composition, validation, view }}
        zoom="fit"
        frameCss={css`
          aspect-ratio: 16 / 9;
          overflow: ${clipsRender ? 'hidden' : 'auto'};
          background: ${euiTheme.colors.backgroundBaseSubdued};
        `}
      />
    </section>
  );
};

export interface SurfaceBoardProps extends RenderProps {
  surfaces: readonly PreviewSurface[];
}

/** One surface at full size, or several as a grid that stops at two columns. */
export const SurfaceBoard = ({
  surfaces,
  composition,
  validation,
  view,
  zoom,
}: SurfaceBoardProps) => {
  const { euiTheme } = useEuiTheme();
  const [only] = surfaces;

  if (surfaces.length === 1 && only) {
    return (
      <section aria-label={`${PREVIEW_LABELS[only]} preview`}>
        <SurfaceRender
          surface={only}
          {...{ composition, validation, view, zoom }}
        />
      </section>
    );
  }

  return (
    <div
      css={css`
        container: surfaces / inline-size;
      `}>
      <div
        css={css`
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: ${euiTheme.size.base};

          @container surfaces (min-width: ${twoColumnBreak(euiTheme.size.base)}) {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        `}>
        {surfaces.map((surface) => (
          <SurfaceCard
            key={surface}
            {...{ surface, composition, validation, view }}
          />
        ))}
      </div>
    </div>
  );
};
