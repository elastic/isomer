/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DefaultPackTypes,
  RenderScope,
  StyledRenderContext,
  SurfaceMap,
} from '@elastic/isomer-sdk';

import type { SlideFrameTheme } from '../theme/palette';

/** The box a container gives the nodes it renders, in pixels, after what it draws around them. */
export interface SlideLayout {
  readonly width: number;
  readonly height: number;
}

/** Render context the pack's Distillate HTML adapter fills; `resolveClassName` is absent when no adapter runs. */
export interface SlideRenderContext extends StyledRenderContext {
  /** Set by every container for its children. Absent means a frame's body with nothing above it. */
  layout?: SlideLayout;
  /** `false` when the frame leaves the mark out, so nothing inside draws it. */
  logo?: boolean;
}

/** The types every contract in this pack is written against. */
export interface SlidePackTypes extends DefaultPackTypes {
  theme: SlideFrameTheme;
  context: SlideRenderContext;
}

/** {@link RenderScope} bound to this pack's types. */
export type SlideRenderScope = RenderScope<SlidePackTypes>;

/** The `env` argument every `react` renderer in this pack receives. */
export type SlideReactEnv = SurfaceMap<SlidePackTypes>['react']['env'];
