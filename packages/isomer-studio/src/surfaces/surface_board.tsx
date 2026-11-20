/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useMemo, useState } from 'react';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import type { Composition, ValidationResult } from '@elastic/isomer-sdk';
import { createChildNodeWalker } from '@elastic/isomer-sdk';
import { css } from '@emotion/react';

import type { StudioAppSurface } from '../config';
import {
  isBrowserSurface,
  isVisualSurface,
  outputLabel,
  SURFACE_CATALOG,
} from '../model/surface_catalog';
import { useStudio } from '../studio_context';

import { applicableEnhancements } from './applicable_enhancements';
import { EnhancementSelect } from './enhancement_select';
import { usePreviewBackground } from './preview_background';
import type { PreviewZoom } from './scaled_preview';
import { SURFACE_ICONS } from './surface_logos';
import type { SurfaceView } from './surface_preview';
import { SurfaceRender } from './surface_render';

interface RenderProps {
  /** The level of each output's title, one below the heading the board sits under. */
  headingLevel: 2 | 3;
  composition: Composition;
  validation: ValidationResult;
  view: SurfaceView;
  zoom: PreviewZoom;
  enhancements?: readonly string[] | undefined;
  errorHref?: string | undefined;
}

const SurfaceCard = ({
  surface,
  headingLevel,
  composition,
  validation,
  view,
  controls,
  title,
  note,
  enhancements,
  errorHref,
  zoom = 'fit',
  fullSize = false,
}: Omit<RenderProps, 'zoom'> & {
  surface: StudioAppSurface;
  controls?: ReactNode;
  title?: string;
  note?: string | undefined;
  zoom?: PreviewZoom;
  fullSize?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const label = title ?? SURFACE_CATALOG[surface].label;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const clipsRender = view === 'render' && isVisualSurface(surface);
  const background = usePreviewBackground();

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
        ${clipsRender ? background : ''};
      `}>
      <div
        css={css`
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: ${euiTheme.size.s};
          padding: ${euiTheme.size.s} ${euiTheme.size.m};
          background: ${euiTheme.colors.backgroundBasePlain};
          border-bottom: ${euiTheme.border.thin};
        `}>
        <EuiIcon type={SURFACE_ICONS[surface]} size="m" aria-hidden={true} />
        <EuiText size="s">
          <Heading
            css={css`
              margin: 0;
              font-size: inherit;
              line-height: inherit;
            `}>
            <strong>{label}</strong>
          </Heading>
        </EuiText>
        <EuiText
          size="s"
          color="subdued"
          css={css`
            flex: 1 1 100%;
            order: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
          title={note ?? SURFACE_CATALOG[surface].note}>
          {note ?? SURFACE_CATALOG[surface].note}
        </EuiText>
        {controls ? (
          <div
            css={css`
              margin-inline-start: auto;
            `}>
            {controls}
          </div>
        ) : null}
      </div>
      <SurfaceRender
        key={`${surface}-${enhancements?.join(',') ?? ''}`}
        {...{
          surface,
          composition,
          validation,
          view,
          enhancements,
          zoom,
          errorHref,
        }}
        frameCss={
          fullSize
            ? undefined
            : css`
                ${
                  // The ratio holds inside any padding, so a fitted slide fills
                  // the inset area exactly.
                  isVisualSurface(surface)
                    ? css`
                        box-sizing: content-box;
                        aspect-ratio: 16 / 9;
                      `
                    : css`
                        min-height: 16rem;
                        max-height: 30rem;
                      `
                }
                ${
                  // A render sits in the middle of its card, whatever size its
                  // frame or content gives it. `safe` keeps the top of a render
                  // taller than the card in view. Visual renders are also inset
                  // from the edges; the text surfaces pad themselves.
                  view === 'render'
                    ? css`
                        display: flex;
                        flex-direction: column;
                        justify-content: safe center;
                        padding: ${
                          isVisualSurface(surface) ? euiTheme.size.l : 0
                        };
                      `
                    : ''
                }
                overflow: ${clipsRender ? 'hidden' : 'auto'};
                background: ${euiTheme.colors.backgroundBaseSubdued};
                ${clipsRender ? background : ''};
              `
        }
      />
    </section>
  );
};

export interface SurfaceBoardProps extends RenderProps {
  surfaces: readonly StudioAppSurface[];
}

/** One surface at full size, or several in a vertical list. */
export const SurfaceBoard = ({
  surfaces,
  headingLevel,
  composition,
  validation,
  view,
  zoom,
  errorHref,
}: SurfaceBoardProps) => {
  const { euiTheme } = useEuiTheme();
  const { runtime, createReactContext } = useStudio();
  const [selectedEnhancements, setSelectedEnhancements] = useState<string[]>(
    []
  );
  const [only] = surfaces;
  const browserSurfaces = surfaces.filter(isBrowserSurface);
  const activeSurface = browserSurfaces.includes('html')
    ? 'html'
    : browserSurfaces[0];
  const walk = useMemo(
    () => createChildNodeWalker(runtime.primitives),
    [runtime.primitives]
  );
  const applicable = useMemo(
    () =>
      applicableEnhancements(
        runtime.enhancements ?? [],
        composition.body,
        walk
      ),
    [runtime.enhancements, composition.body, walk]
  );
  const enhancementIds = applicable.map(({ id }) => id);
  const canEnhance =
    (activeSurface === 'html' ||
      (activeSurface === 'react' && Boolean(createReactContext))) &&
    enhancementIds.length > 0;
  const enabled = enhancementIds.filter((id) =>
    selectedEnhancements.includes(id)
  );
  const enhancements = canEnhance && enabled.length ? enabled : undefined;
  const visualSurfaces = surfaces.filter(isVisualSurface);
  const otherSurfaces = surfaces.filter((surface) => !isVisualSurface(surface));

  if (surfaces.length === 1 && only && !isBrowserSurface(only)) {
    const Heading = headingLevel === 2 ? 'h2' : 'h3';
    return (
      <section aria-labelledby={`surface-heading-${only}`}>
        <Heading
          id={`surface-heading-${only}`}
          css={css`
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
          `}>
          {SURFACE_CATALOG[only].label} preview
        </Heading>
        <SurfaceRender
          surface={only}
          {...{ composition, validation, view, zoom, errorHref }}
        />
      </section>
    );
  }

  const renderCards = (items: readonly StudioAppSurface[]) =>
    items.map((surface) => (
      <SurfaceCard
        key={surface}
        {...{ surface, headingLevel, composition, validation, view, errorHref }}
      />
    ));

  return (
    <div>
      {visualSurfaces.length ? (
        <section
          aria-label="Visual output previews"
          css={css`
            margin-block-end: ${otherSurfaces.length ? euiTheme.size.m : 0};
          `}>
          <div
            role="region"
            aria-label="Visual preview grid"
            css={css`
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              gap: ${euiTheme.size.base};
            `}>
            {activeSurface ? (
              <SurfaceCard
                surface={activeSurface}
                {...{ headingLevel }}
                title={outputLabel(activeSurface)}
                note={
                  activeSurface === 'html'
                    ? 'HTML / React / Snapshot'
                    : undefined
                }
                {...{ composition, validation, view, enhancements, errorHref }}
                zoom={surfaces.length === 1 ? zoom : 'fit'}
                fullSize={surfaces.length === 1}
                controls={
                  <EnhancementSelect
                    definitions={applicable}
                    selected={enabled}
                    disabled={!canEnhance || view !== 'render'}
                    onChange={setSelectedEnhancements}
                  />
                }
              />
            ) : null}
            {renderCards(
              visualSurfaces.filter((surface) => !isBrowserSurface(surface))
            )}
          </div>
        </section>
      ) : null}
      {otherSurfaces.length ? (
        <section aria-label="Other output previews">
          <div
            css={css`
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              gap: ${euiTheme.size.base};
            `}>
            {renderCards(otherSurfaces)}
          </div>
        </section>
      ) : null}
    </div>
  );
};
