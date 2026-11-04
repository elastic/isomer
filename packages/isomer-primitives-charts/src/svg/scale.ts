/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SceneAxis } from '../scene/types';

import { SVG_THEME } from './theme';

/** Maps an axis value to a pixel along `[from, to]`. */
export interface PixelScale {
  (value: number | string): number;
  /** Width of one category on an ordinal axis; 0 otherwise. */
  readonly bandwidth: number;
}

const transform = (scale: SceneAxis['scale']) => {
  switch (scale) {
    case 'log':
      return (value: number) => Math.log10(Math.max(value, Number.MIN_VALUE));
    case 'sqrt':
      return (value: number) => Math.sign(value) * Math.sqrt(Math.abs(value));
    default:
      return (value: number) => value;
  }
};

/** The pixel scale for an axis drawn from `from` to `to`. */
export const scaleFor = (
  axis: SceneAxis,
  from: number,
  to: number
): PixelScale => {
  if (axis.scale === 'ordinal') {
    const categories = axis.domain as readonly string[];
    const step = (to - from) / Math.max(categories.length, 1);
    const index = new Map(categories.map((category, i) => [category, i]));
    const scale = (value: number | string) =>
      from + ((index.get(String(value)) ?? 0) + 0.5) * step;
    return Object.assign(scale, { bandwidth: step });
  }
  const t = transform(axis.scale);
  const [min, max] = axis.domain as readonly [number, number];
  const lo = t(min);
  const span = t(max) - lo || 1;
  const scale = (value: number | string) =>
    from + ((t(Number(value)) - lo) / span) * (to - from);
  return Object.assign(scale, { bandwidth: 0 });
};

/** The value an axis's baseline sits at: zero when the domain holds it, else its nearer end. */
export const baselineOf = (axis: SceneAxis): number => {
  const [min, max] = axis.domain as readonly [number, number];
  if (axis.scale === 'log') {
    return min;
  }
  return Math.min(Math.max(0, min), max);
};

/** A text run's width, estimated for layout. */
export const textWidth = (text: string, fontSize: number): number =>
  text.length * fontSize * SVG_THEME.font.widthRatio;

/** Rounds a coordinate so the markup stays short and stable. */
export const px = (value: number): number => Math.round(value * 100) / 100;
