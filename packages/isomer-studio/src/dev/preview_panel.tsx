/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useState } from 'react';
import type { EuiSelectableOption, IconType } from '@elastic/eui';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiSelectable,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { Composition, ValidationResult } from '@elastic/isomer-sdk';
import { css } from '@emotion/react';

import type { StudioSurface } from '../model/describe_runtime';
import { SURFACE_LABELS } from '../model/describe_runtime';
import { useStudio } from '../studio_context';
import { PngSurface } from '../surfaces/png_surface';
import type { PreviewZoom } from '../surfaces/scaled_preview';
import { PngLogo } from '../surfaces/surface_logos';
import type { SurfaceView } from '../surfaces/surface_preview';
import {
  SURFACE_ICONS,
  SurfacePreview,
  SurfaceViewToggle,
} from '../surfaces/surface_preview';
import { ZoomSelect } from '../surfaces/zoom_select';

const TITLE_ICON_SIZE = 20;

const PreviewSection = ({
  icon,
  label,
  children,
}: {
  icon: IconType;
  label: string;
  children: ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <section
      aria-label={`${label} preview`}
      css={css`
        padding: ${euiTheme.size.base} 0;

        &:first-of-type {
          padding-top: 0;
        }

        &:last-of-type {
          padding-bottom: 0;
        }
      `}>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        css={css`
          padding-bottom: ${euiTheme.size.s};
          border-bottom: ${euiTheme.border.thin};
        `}>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={icon}
            size="original"
            aria-hidden={true}
            css={css`
              inline-size: ${TITLE_ICON_SIZE}px;
              block-size: ${TITLE_ICON_SIZE}px;
            `}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{label}</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        css={css`
          margin: ${euiTheme.size.m} 0 0 0;
        `}>
        {children}
      </div>
    </section>
  );
};

const SurfacesSelect = ({
  surfaces,
  supported,
  hidden,
  onChange,
}: {
  surfaces: readonly StudioSurface[];
  supported: readonly StudioSurface[];
  hidden: ReadonlySet<StudioSurface>;
  onChange: (hidden: ReadonlySet<StudioSurface>) => void;
}) => {
  const [isOpen, setOpen] = useState(false);
  const shownCount = surfaces.filter(
    (surface) => supported.includes(surface) && !hidden.has(surface)
  ).length;

  const options = surfaces.map((surface): EuiSelectableOption => ({
    key: surface,
    label: SURFACE_LABELS[surface],
    prepend: (
      <EuiIcon type={SURFACE_ICONS[surface]} size="s" aria-hidden={true} />
    ),
    checked:
      supported.includes(surface) && !hidden.has(surface) ? 'on' : undefined,
    disabled: !supported.includes(surface),
    title: supported.includes(surface)
      ? undefined
      : 'This primitive has no renderer for this surface.',
  }));

  return (
    <EuiPopover
      aria-label="Surfaces"
      isOpen={isOpen}
      closePopover={() => setOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      button={
        <EuiButton
          size="s"
          color="text"
          iconType="layers"
          iconSide="left"
          onClick={() => setOpen((open) => !open)}
          aria-label={`Surfaces, ${shownCount} of ${supported.length} shown`}>
          Surfaces ({shownCount})
        </EuiButton>
      }>
      <EuiSelectable
        aria-label="Surfaces"
        options={options}
        onChange={(next) =>
          onChange(
            new Set(
              surfaces.filter(
                (surface) =>
                  supported.includes(surface) &&
                  next.find(({ key }) => key === surface)?.checked !== 'on'
              )
            )
          )
        }
        listProps={{ bordered: false }}
        css={css`
          min-width: 200px;
        `}>
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
};

export interface PreviewPanelProps {
  composition: Composition;
  validation: ValidationResult;
  supported: readonly StudioSurface[];
}

/** A toolbar choosing which surfaces show and whether to render or print them, then every shown surface. */
export const PreviewPanel = ({
  composition,
  validation,
  supported,
}: PreviewPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    docs: { surfaces },
    rasterizePng,
  } = useStudio();
  const [hidden, setHidden] = useState<ReadonlySet<StudioSurface>>(new Set());
  const [view, setView] = useState<SurfaceView>('render');
  const [zoom, setZoom] = useState<PreviewZoom>('fit');
  const shown = surfaces.filter(
    (surface) => supported.includes(surface) && !hidden.has(surface)
  );

  return (
    <div
      css={css`
        height: 100%;
        display: flex;
        flex-direction: column;
        min-height: 0;
        padding-left: ${euiTheme.size.l};
      `}>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        css={css`
          flex-grow: 0;
          padding-bottom: ${euiTheme.size.s};
          border-bottom: ${euiTheme.border.thin};
          margin-bottom: ${euiTheme.size.m};
        `}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>Preview</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SurfacesSelect
            {...{ surfaces, supported, hidden }}
            onChange={setHidden}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ZoomSelect {...{ zoom }} onChange={setZoom} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SurfaceViewToggle
            {...{ view }}
            onChange={setView}
            legend="Surface view"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        css={css`
          flex: 1;
          min-height: 0;
          overflow: auto;
          display: flex;
          flex-direction: column;
          padding: ${euiTheme.size.s} ${euiTheme.size.base} 0 0;
        `}>
        {shown.flatMap((surface) => [
          <PreviewSection
            key={surface}
            icon={SURFACE_ICONS[surface]}
            label={SURFACE_LABELS[surface]}>
            <SurfacePreview
              {...{ surface, composition, validation, view, zoom }}
            />
          </PreviewSection>,
          ...(surface === 'snapshot' && rasterizePng
            ? [
                <PreviewSection key="png" icon={PngLogo} label="PNG">
                  <PngSurface {...{ composition, rasterizePng, zoom }} />
                </PreviewSection>,
              ]
            : []),
        ])}
      </div>
    </div>
  );
};
