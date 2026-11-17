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
import { runtimeSurfaces } from '../model/describe_runtime';
import { SURFACE_CATALOG } from '../model/surface_catalog';
import { useStudio } from '../studio_context';
import { SurfaceRender } from '../surfaces/surface_render';

/** The surfaces {@link AppSurface} can show, in the Studio's order, then `png` when the host rasterizes. */
export const appSurfaces = (
  runtime: Pick<StudioRuntime, 'surfaces'>,
  hasPng: boolean
): { id: StudioAppSurface; label: string }[] =>
  [...runtimeSurfaces(runtime), ...(hasPng ? ['png' as const] : [])].map(
    (id) => ({ id, label: SURFACE_CATALOG[id].label })
  );

/** The `Surface` an app receives, read from context so its identity never changes. */
export const AppSurface = ({
  composition,
  surface,
  view = 'render',
  zoom = 'fit',
  heading,
}: StudioSurfaceProps) => {
  const { runtime } = useStudio();
  const validation = useMemo(
    () => runtime.validate(composition),
    [runtime, composition]
  );
  return (
    <SurfaceRender
      {...{ surface, composition, validation, view, zoom, heading }}
    />
  );
};
