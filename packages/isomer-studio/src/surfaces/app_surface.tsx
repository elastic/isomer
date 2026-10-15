/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type {
  StudioAppSurface,
  StudioRuntime,
  StudioSurfaceProps,
} from '../config';
import { runtimeSurfaces, SURFACE_LABELS } from '../model/describe_runtime';
import { useStudio } from '../studio_context';

import { PngSurface } from './png_surface';
import { SurfacePreview } from './surface_preview';

/** The surfaces {@link AppSurface} can show, in the Studio's order, with `png` after `snapshot` when the host rasterizes. */
export const appSurfaces = (
  runtime: Pick<StudioRuntime, 'surfaces'>,
  hasPng: boolean
): { id: StudioAppSurface; label: string }[] => [
  ...runtimeSurfaces(runtime).map((id) => ({ id, label: SURFACE_LABELS[id] })),
  ...(hasPng ? [{ id: 'png' as const, label: 'PNG' }] : []),
];

/** The `Surface` an app receives, read from context so its identity never changes. */
export const AppSurface = ({
  composition,
  surface,
  view = 'render',
  zoom = 'fit',
  heading,
}: StudioSurfaceProps) => {
  const { runtime, rasterizePng } = useStudio();
  const validation = useMemo(
    () => runtime.validate(composition),
    [runtime, composition]
  );
  if (surface === 'png') {
    return rasterizePng ? (
      <PngSurface {...{ composition, rasterizePng, zoom }} />
    ) : null;
  }
  return (
    <SurfacePreview
      {...{ surface, composition, validation, view, zoom, heading }}
    />
  );
};
