/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCheckbox,
  EuiIcon,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { Composition, ValidationResult } from '@elastic/isomer-sdk';
import { createChildNodeWalker } from '@elastic/isomer-sdk';
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

const EnhancementSelect = ({
  ids,
  selected,
  disabled,
  onChange,
}: {
  ids: readonly string[];
  selected: readonly string[];
  disabled: boolean;
  onChange: (ids: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <EuiPopover
      isOpen={open && !disabled}
      closePopover={() => setOpen(false)}
      anchorPosition="downRight"
      button={
        <EuiButtonEmpty
          size="xs"
          color="text"
          iconType="chevronSingleDown"
          iconSide="right"
          isDisabled={disabled}
          onClick={() => setOpen((value) => !value)}>
          Enhancements ({selected.length}/{ids.length})
        </EuiButtonEmpty>
      }>
      <div role="group" aria-label="Enhancements">
        {ids.map((id) => (
          <EuiCheckbox
            key={id}
            id={`studio-enhancement-${id}`}
            label={id}
            disabled={disabled}
            checked={selected.includes(id)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...selected, id]
                  : selected.filter((value) => value !== id)
              )
            }
          />
        ))}
      </div>
    </EuiPopover>
  );
};

interface RenderProps {
  composition: Composition;
  validation: ValidationResult;
  view: SurfaceView;
  zoom: PreviewZoom;
  enhancements?: readonly string[] | undefined;
}

const SurfaceRender = ({
  surface,
  composition,
  validation,
  view,
  zoom,
  frameCss,
  enhancements,
}: RenderProps & {
  surface: PreviewSurface;
  frameCss?: SerializedStyles | undefined;
}) => {
  const { rasterizePng } = useStudio();
  if (surface !== 'png') {
    return (
      <SurfacePreview
        {...{
          surface,
          composition,
          validation,
          view,
          zoom,
          frameCss,
          enhancements,
        }}
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
  controls,
  title,
  note,
  enhancements,
  zoom = 'fit',
  fullSize = false,
}: Omit<RenderProps, 'zoom'> & {
  surface: PreviewSurface;
  controls?: ReactNode;
  title?: string;
  note?: string | undefined;
  zoom?: PreviewZoom;
  fullSize?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const label = title ?? PREVIEW_LABELS[surface];
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
          flex-wrap: wrap;
          align-items: center;
          gap: ${euiTheme.size.s};
          padding: ${euiTheme.size.s} ${euiTheme.size.m};
          background: ${euiTheme.colors.backgroundBasePlain};
          border-bottom: ${euiTheme.border.thin};
        `}>
        <EuiIcon type={PREVIEW_ICONS[surface]} size="m" aria-hidden={true} />
        <EuiText size="xs">
          <h3
            css={css`
              margin: 0;
              font-size: inherit;
              line-height: inherit;
            `}>
            <strong>{label}</strong>
          </h3>
        </EuiText>
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            flex: 1 1 100%;
            order: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
          title={note ?? SURFACE_NOTES[surface]}>
          {note ?? SURFACE_NOTES[surface]}
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
        {...{ surface, composition, validation, view, enhancements, zoom }}
        frameCss={
          fullSize
            ? undefined
            : css`
                ${
                  isVisualSurface(surface)
                    ? css`
                        aspect-ratio: 16 / 9;
                      `
                    : css`
                        min-height: 16rem;
                        max-height: 30rem;
                      `
                }
                overflow: ${clipsRender ? 'hidden' : 'auto'};
                background: ${euiTheme.colors.backgroundBaseSubdued};
              `
        }
      />
    </section>
  );
};

export interface SurfaceBoardProps extends RenderProps {
  surfaces: readonly PreviewSurface[];
}

type BrowserSurface = 'react' | 'html' | 'snapshot';
const isBrowserSurface = (surface: PreviewSurface): surface is BrowserSurface =>
  surface === 'react' || surface === 'html' || surface === 'snapshot';

/** One surface at full size, or several in a vertical list. */
export const SurfaceBoard = ({
  surfaces,
  composition,
  validation,
  view,
  zoom,
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
  const walk = createChildNodeWalker(runtime.primitives);
  const enhancementIds = runtime.packs
    .flatMap((pack) => pack.enhancements)
    .filter(({ appliesTo }) => appliesTo(composition.body, walk))
    .map(({ id }) => id);
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
    return (
      <section aria-labelledby={`surface-heading-${only}`}>
        <h2
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
          {PREVIEW_LABELS[only]} preview
        </h2>
        <SurfaceRender
          surface={only}
          {...{ composition, validation, view, zoom }}
        />
      </section>
    );
  }

  const renderCards = (items: readonly PreviewSurface[]) =>
    items.map((surface) => (
      <SurfaceCard
        key={surface}
        {...{ surface, composition, validation, view }}
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
                title={
                  activeSurface === 'html'
                    ? 'Web'
                    : PREVIEW_LABELS[activeSurface]
                }
                note={
                  activeSurface === 'html'
                    ? 'HTML / React / Snapshot'
                    : undefined
                }
                {...{ composition, validation, view, enhancements }}
                zoom={surfaces.length === 1 ? zoom : 'fit'}
                fullSize={surfaces.length === 1}
                controls={
                  <EnhancementSelect
                    ids={enhancementIds}
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
