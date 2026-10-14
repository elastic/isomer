/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSelectableOption, IconType } from '@elastic/eui';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiSelectable,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { StudioSurface } from '../model/describe_runtime';
import { SURFACE_LABELS } from '../model/describe_runtime';

import { PngLogo } from './surface_logos';
import { SURFACE_ICONS } from './surface_preview';

/** A runtime surface, or the host's PNG of the snapshot surface. */
export type PreviewSurface = StudioSurface | 'png';

/** Every surface, or an explicit subset in display order. */
export type SurfaceSelection = 'all' | readonly PreviewSurface[];

interface SurfaceOptionData {
  surface: PreviewSurface | 'all';
}

type SurfaceOption = EuiSelectableOption<SurfaceOptionData>;

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

/** `selection` in `surfaces` order. An empty or stale subset shows every surface. */
export const resolveSurfaces = (
  surfaces: readonly PreviewSurface[],
  selection: SurfaceSelection
): PreviewSurface[] => {
  if (selection === 'all') {
    return [...surfaces];
  }
  const picked = surfaces.filter((surface) => selection.includes(surface));
  return picked.length ? picked : [...surfaces];
};

/** From every surface, choosing one shows only it; otherwise the choice toggles, and removing the last shows every surface. */
export const toggleSurface = (
  surfaces: readonly PreviewSurface[],
  selected: readonly PreviewSurface[],
  surface: PreviewSurface
): PreviewSurface[] => {
  if (selected.length === surfaces.length) {
    return [surface];
  }
  const next = selected.includes(surface)
    ? selected.filter((item) => item !== surface)
    : [...selected, surface];
  const ordered = surfaces.filter((item) => next.includes(item));
  return ordered.length ? ordered : [...surfaces];
};

export const surfaceSummary = (
  selected: readonly PreviewSurface[],
  surfaces: readonly PreviewSurface[]
): string => {
  if (selected.length === surfaces.length) {
    return 'All surfaces';
  }
  const [only] = selected;
  return selected.length === 1 && only
    ? PREVIEW_LABELS[only]
    : selected.map((surface) => PREVIEW_LABELS[surface]).join(', ');
};

export const surfaceNote = (
  showing: readonly PreviewSurface[],
  available: number
): string => {
  const [only] = showing;
  if (showing.length === 1 && only) {
    return SURFACE_NOTES[only];
  }
  return showing.length === available
    ? `All ${available} surfaces from the same props. Pick a surface above to inspect one at full size, or several to compare.`
    : `Comparing ${showing.length} surfaces from the same props.`;
};

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

/** The surfaces to show, and a setter that stores a full selection as `'all'`. */
export const useSurfaceSelection = (
  surfaces: readonly PreviewSurface[],
  initial: SurfaceSelection
) => {
  const [selection, setSelection] = useState<SurfaceSelection>(initial);
  const select = (next: readonly PreviewSurface[]) =>
    setSelection(next.length === surfaces.length ? 'all' : next);
  return { showing: resolveSurfaces(surfaces, selection), select };
};

const MENU_WIDTH = 220;

/** Checks the surfaces to compare. One shows at full size; several share the grid. */
export const SurfaceSelect = ({
  surfaces,
  selected,
  onChange,
  anchorPosition = 'downLeft',
}: {
  surfaces: readonly PreviewSurface[];
  selected: readonly PreviewSurface[];
  onChange: (selected: readonly PreviewSurface[]) => void;
  anchorPosition?: 'downLeft' | 'downRight';
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setOpen] = useState(false);
  const summary = surfaceSummary(selected, surfaces);
  const allSelected = selected.length === surfaces.length;
  const options: SurfaceOption[] = [
    {
      label: 'All surfaces',
      key: 'all',
      surface: 'all',
      checked: allSelected ? 'on' : undefined,
    },
    ...surfaces.map((surface): SurfaceOption => ({
      label: PREVIEW_LABELS[surface],
      key: surface,
      surface,
      checked: selected.includes(surface) ? 'on' : undefined,
    })),
  ];

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setOpen(false)}
      {...{ anchorPosition }}
      panelPaddingSize="none"
      button={
        <EuiButton
          size="s"
          color="text"
          iconType="chevronSingleDown"
          iconSide="right"
          aria-label={`Surface: ${summary}`}
          onClick={() => setOpen((open) => !open)}>
          <span
            css={css`
              margin-inline-end: ${euiTheme.size.s};
              color: ${euiTheme.colors.textSubdued};
              font-weight: ${euiTheme.font.weight.regular};
            `}>
            Surface
          </span>
          <span
            css={css`
              display: inline-block;
              max-width: ${MENU_WIDTH}px;
              overflow: hidden;
              text-overflow: ellipsis;
              vertical-align: bottom;
            `}>
            {summary}
          </span>
        </EuiButton>
      }>
      <div
        css={css`
          min-width: ${MENU_WIDTH}px;
        `}>
        <EuiSelectable<SurfaceOptionData>
          aria-label="Surfaces"
          {...{ options }}
          onChange={(_next, _event, { surface }) =>
            onChange(
              surface === 'all'
                ? [...surfaces]
                : toggleSurface(surfaces, selected, surface)
            )
          }
          listProps={{ bordered: false }}
          renderOption={({ surface, label }) => (
            <Option
              icon={surface === 'all' ? 'apps' : PREVIEW_ICONS[surface]}
              {...{ label }}
            />
          )}>
          {(list) => list}
        </EuiSelectable>
      </div>
    </EuiPopover>
  );
};
