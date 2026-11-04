/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Shared pieces for drawing text and the root element. Text is positioned by
// its baseline, computed here, rather than with `dominant-baseline`, which
// some SVG rasterizers ignore.

import type { Scene, SceneColor, SceneSize } from '../scene/types';

import { px } from './scale';
import { SVG_THEME } from './theme';
import { type ChildInput, el, type SvgElement } from './tree';

export type Anchor = 'start' | 'middle' | 'end';

/** The baseline that centers a line of `size` px text on `y`. */
export const centeredBaseline = (y: number, size: number) => y + size * 0.35;

export const text = (
  value: string,
  {
    x,
    y,
    size,
    color,
    anchor = 'start',
    weight,
    rotate,
    opacity,
  }: {
    x: number;
    y: number;
    size: number;
    color: SceneColor;
    anchor?: Anchor;
    weight?: 'bold';
    rotate?: number;
    opacity?: number;
  }
): SvgElement =>
  el(
    'text',
    {
      x: px(x),
      y: px(y),
      'font-size': size,
      fill: color,
      'text-anchor': anchor === 'start' ? undefined : anchor,
      'font-weight': weight,
      'fill-opacity': opacity,
      transform: rotate ? `rotate(${rotate} ${px(x)} ${px(y)})` : undefined,
    },
    value
  );

/** The root `svg`: sized, labelled with the Scene's summary, in the Scene's background. */
export const root = (
  scene: Scene,
  size: SceneSize,
  ...children: ChildInput[]
): SvgElement =>
  el(
    'svg',
    {
      width: size.width,
      height: size.height,
      viewBox: `0 0 ${size.width} ${size.height}`,
      role: 'img',
      'aria-label': scene.summary,
      'font-family': SVG_THEME.font.family,
      'data-scheme': scene.scheme,
    },
    el('title', {}, scene.title ?? scene.summary),
    el('desc', {}, scene.summary),
    el('rect', {
      width: size.width,
      height: size.height,
      fill: scene.chrome.background,
    }),
    ...children
  );
