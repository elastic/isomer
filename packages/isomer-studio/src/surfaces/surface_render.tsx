/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { StudioAppSurface } from '../config';
import { useStudio } from '../studio_context';

import { PngSurface } from './png_surface';
import type { PreviewZoom } from './scaled_preview';
import type { SurfacePreviewProps } from './surface_preview';
import { SurfacePreview } from './surface_preview';

type SurfaceRenderProps = Omit<SurfacePreviewProps, 'surface' | 'zoom'> & {
  surface: StudioAppSurface;
  zoom: PreviewZoom;
};

/** {@link SurfacePreview} for a runtime surface; the host's PNG, when it rasterizes, for `png`. */
export const SurfaceRender = ({ surface, ...props }: SurfaceRenderProps) => {
  const { rasterizePng } = useStudio();
  if (surface !== 'png') {
    return <SurfacePreview {...{ surface, ...props }} />;
  }
  const { composition, zoom, frameCss } = props;
  return rasterizePng ? (
    <PngSurface {...{ composition, rasterizePng, zoom, frameCss }} />
  ) : null;
};
