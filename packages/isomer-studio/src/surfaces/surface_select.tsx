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

import type { StudioAppSurface } from '../config';
import type { StudioSurface } from '../model/describe_runtime';
import { outputLabel } from '../model/surface_catalog';

import { SURFACE_ICONS } from './surface_logos';

/** Every surface, or an explicit subset in display order. */
export type SurfaceSelection = 'all' | readonly StudioAppSurface[];

interface SurfaceOptionData {
  surface: StudioAppSurface;
}

type SurfaceOption = EuiSelectableOption<SurfaceOptionData>;

/** `selection` in `surfaces` order. An empty or stale subset shows every surface. */
export const resolveSurfaces = (
  surfaces: readonly StudioAppSurface[],
  selection: SurfaceSelection
): StudioAppSurface[] => {
  if (selection === 'all') {
    return [...surfaces];
  }
  const picked = surfaces.filter((surface) => selection.includes(surface));
  return picked.length ? picked : [...surfaces];
};

/** From every surface, choosing one shows only it; otherwise the choice toggles, and removing the last shows every surface. */
export const toggleSurface = (
  surfaces: readonly StudioAppSurface[],
  selected: readonly StudioAppSurface[],
  surface: StudioAppSurface
): StudioAppSurface[] => {
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
  selected: readonly StudioAppSurface[],
  surfaces: readonly StudioAppSurface[]
): string => {
  if (selected.length === surfaces.length) {
    return `${surfaces.length} outputs`;
  }
  const [only] = selected;
  return selected.length === 1 && only
    ? outputLabel(only)
    : selected.map(outputLabel).join(', ');
};

/** Adds host PNG output, optionally consolidating browser renders as HTML. */
export const previewSurfaces = (
  supported: readonly StudioSurface[],
  canRasterize: boolean,
  consolidateBrowser = false
): StudioAppSurface[] =>
  supported.flatMap((surface): StudioAppSurface[] => {
    if (
      consolidateBrowser &&
      supported.includes('html') &&
      (surface === 'react' || surface === 'snapshot')
    ) {
      return surface === 'snapshot' && canRasterize ? ['png'] : [];
    }
    return surface === 'snapshot' && canRasterize
      ? [surface, 'png']
      : [surface];
  });

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
  surfaces: readonly StudioAppSurface[],
  initial: SurfaceSelection
) => {
  const [selection, setSelection] = useState<SurfaceSelection>(initial);
  const select = (next: readonly StudioAppSurface[]) =>
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
  surfaces: readonly StudioAppSurface[];
  selected: readonly StudioAppSurface[];
  onChange: (selected: readonly StudioAppSurface[]) => void;
  anchorPosition?: 'downLeft' | 'downRight';
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setOpen] = useState(false);
  const summary = surfaceSummary(selected, surfaces);
  const options: SurfaceOption[] = surfaces.map((surface): SurfaceOption => ({
    label: outputLabel(surface),
    key: surface,
    surface,
    checked: selected.includes(surface) ? 'on' : undefined,
  }));

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
          aria-label={`Outputs: ${summary}`}
          onClick={() => setOpen((open) => !open)}>
          <span
            css={css`
              margin-inline-end: ${euiTheme.size.s};
              color: ${euiTheme.colors.textSubdued};
              font-weight: ${euiTheme.font.weight.regular};
            `}>
            Outputs
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
          aria-label="Outputs"
          {...{ options }}
          onChange={(_next, _event, { surface }) =>
            onChange(toggleSurface(surfaces, selected, surface))
          }
          listProps={{ bordered: false }}
          renderOption={({ surface, label }) => (
            <Option icon={SURFACE_ICONS[surface]} {...{ label }} />
          )}>
          {(list) => list}
        </EuiSelectable>
      </div>
    </EuiPopover>
  );
};
