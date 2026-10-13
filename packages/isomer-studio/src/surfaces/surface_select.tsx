/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSuperSelectOption, IconType } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSuperSelect,
} from '@elastic/eui';

import type { StudioSurface } from '../model/describe_runtime';
import { SURFACE_LABELS } from '../model/describe_runtime';

import { PngLogo } from './surface_logos';
import { SURFACE_ICONS } from './surface_preview';

/** A runtime surface, or the host's PNG of the snapshot surface. */
export type PreviewSurface = StudioSurface | 'png';

/** One surface, or every surface side by side. */
export type SurfaceChoice = PreviewSurface | 'all';

export const PREVIEW_LABELS: Readonly<Record<PreviewSurface, string>> = {
  ...SURFACE_LABELS,
  png: 'PNG',
};

export const PREVIEW_ICONS: Readonly<Record<PreviewSurface, IconType>> = {
  ...SURFACE_ICONS,
  png: PngLogo,
};

export const SURFACE_NOTES: Readonly<Record<PreviewSurface, string>> = {
  react: 'Live React, styled by the host.',
  html: 'Static markup in a sandboxed frame.',
  slack: 'Block Kit, drawn as Slack would.',
  markdown: 'Markdown for chat and docs.',
  text: 'Plain text with no markup.',
  snapshot: 'The React render with the pack stylesheet, laid out for an image.',
  png: 'The snapshot, rasterized by the host.',
};

/** Surfaces drawn at a fixed layout width, which a card shows as a scaled 16:9 frame. */
export const isVisualSurface = (surface: PreviewSurface): boolean =>
  surface === 'react' ||
  surface === 'html' ||
  surface === 'snapshot' ||
  surface === 'png';

export const surfaceNote = (choice: SurfaceChoice, count: number): string =>
  choice === 'all'
    ? `All ${count} surfaces from the same props. Pick a surface above to inspect one at full size.`
    : SURFACE_NOTES[choice];

/** `supported` in display order, with `png` after `snapshot` when the host rasterizes. */
export const previewSurfaces = (
  supported: readonly StudioSurface[],
  canRasterize: boolean
): PreviewSurface[] =>
  supported.flatMap((surface): PreviewSurface[] =>
    surface === 'snapshot' && canRasterize ? [surface, 'png'] : [surface]
  );

const Option = ({ icon, label }: { icon: IconType; label: string }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon type={icon} size="m" aria-hidden={true} />
    </EuiFlexItem>
    <EuiFlexItem>{label}</EuiFlexItem>
  </EuiFlexGroup>
);

/** Chooses one surface to show at full size, or all of them. */
export const SurfaceSelect = ({
  surfaces,
  value,
  onChange,
}: {
  surfaces: readonly PreviewSurface[];
  value: SurfaceChoice;
  onChange: (choice: SurfaceChoice) => void;
}) => {
  const options: Array<EuiSuperSelectOption<SurfaceChoice>> = [
    {
      value: 'all',
      inputDisplay: <Option icon="apps" label="All surfaces" />,
    },
    ...surfaces.map((surface): EuiSuperSelectOption<SurfaceChoice> => ({
      value: surface,
      inputDisplay: (
        <Option icon={PREVIEW_ICONS[surface]} label={PREVIEW_LABELS[surface]} />
      ),
    })),
  ];

  return (
    <EuiSuperSelect<SurfaceChoice>
      aria-label="Surface"
      compressed
      prepend="Surface"
      {...{ options }}
      valueOfSelected={value}
      onChange={onChange}
      popoverProps={{ panelMinWidth: 200 }}
    />
  );
};
