/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type {
  DefaultPackTypes,
  PrimitiveRenderContext,
  SurfaceMap,
} from '@elastic/isomer-sdk';

import type {
  ColorScheme,
  Scene,
  SceneEnvironment,
  SceneRenderer,
  SceneSize,
} from '../scene/types';
import type { MetricNode } from '../schema/metric';
import type { XyChartNode } from '../schema/xy_chart';

/** A node that resolves to a Scene. */
export type ChartNode = MetricNode | XyChartNode;

/** What a Scene is resolved for. */
export interface ResolveSceneOptions {
  readonly scheme: ColorScheme;
  readonly size?: SceneSize;
  /** Absent: the resolver's default. */
  readonly locale?: string;
  /** Absent: each date format's own time zone. */
  readonly timeZone?: string;
}

/** Turns a chart node into the Scene its renderers draw. */
export type SceneResolver = (
  node: ChartNode,
  options: ResolveSceneOptions
) => Scene;

/** A renderer the `react` and `snapshot` surfaces can use. */
export type ReactSceneRenderer = SceneRenderer<ReactNode>;

/**
 * The render context the pack's `react` renderers read. Every field is
 * optional; hosts set only what they choose.
 */
export interface ChartsRenderContext extends PrimitiveRenderContext {
  /**
   * Preferred renderers, first choice first. They are tried before the pack's
   * own, and the first that runs in `environment` and supports the Scene's
   * kind draws it.
   */
  readonly sceneRenderers?: readonly ReactSceneRenderer[];
  /** Where this render draws. Absent: detected. */
  readonly environment?: SceneEnvironment;
  /** Absent: the frame theme's `scheme` on `snapshot`, else `light`. */
  readonly scheme?: ColorScheme;
  readonly locale?: string;
  readonly timeZone?: string;
  /** The box a container gives a chart. Absent: the renderer's default size. */
  readonly size?: SceneSize;
}

/** The types every contract in this pack is written against. */
export interface ChartsPackTypes extends DefaultPackTypes {
  context: ChartsRenderContext;
}

/** The `env` argument every `react` renderer in this pack receives. */
export type ChartsReactEnv = SurfaceMap<ChartsPackTypes>['react']['env'];
