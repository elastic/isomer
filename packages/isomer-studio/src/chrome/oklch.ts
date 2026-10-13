/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hexToRgb, rgbToHex } from '@elastic/eui';

/** Perceptual lightness (0–1), chroma, and hue in degrees. See https://bottosson.github.io/posts/oklab/. */
export interface Oklch {
  l: number;
  c: number;
  h: number;
}

type Triple = [number, number, number];

const toLinear = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
const fromLinear = (channel: number) =>
  channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;

const multiply = (matrix: readonly Triple[], [x, y, z]: Triple): Triple =>
  matrix.map(([a, b, c]) => a * x + b * y + c * z) as Triple;

const RGB_TO_LMS: readonly Triple[] = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
];
const LMS_TO_LAB: readonly Triple[] = [
  [0.2104542553, 0.793617785, -0.0040720468],
  [1.9779984951, -2.428592205, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.808675766],
];
const LAB_TO_LMS: readonly Triple[] = [
  [1, 0.3963377774, 0.2158037573],
  [1, -0.1055613458, -0.0638541728],
  [1, -0.0894841775, -1.291485548],
];
const LMS_TO_RGB: readonly Triple[] = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707612701],
];

export const hexToOklch = (hex: string): Oklch => {
  const rgb = hexToRgb(hex).map((channel) => toLinear(channel / 255)) as Triple;
  const lms = multiply(RGB_TO_LMS, rgb).map(Math.cbrt) as Triple;
  const [l, a, b] = multiply(LMS_TO_LAB, lms);
  return {
    l,
    c: Math.hypot(a, b),
    h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
  };
};

const toLinearRgb = ({ l, c, h }: Oklch): Triple => {
  const radians = (h * Math.PI) / 180;
  const lms = multiply(LAB_TO_LMS, [
    l,
    c * Math.cos(radians),
    c * Math.sin(radians),
  ]).map((value) => value ** 3) as Triple;
  return multiply(LMS_TO_RGB, lms);
};

const EPSILON = 1e-6;
const isInGamut = (rgb: Triple) =>
  rgb.every((channel) => channel >= -EPSILON && channel <= 1 + EPSILON);

/** The nearest sRGB hex, giving up chroma rather than lightness or hue when out of gamut. */
export const oklchToHex = (color: Oklch): string => {
  let { c } = color;
  while (c > 0 && !isInGamut(toLinearRgb({ ...color, c }))) {
    c = Math.max(0, c - 0.001);
  }
  const [r, g, b] = toLinearRgb({ ...color, c }).map((channel) =>
    Math.round(fromLinear(Math.min(1, Math.max(0, channel))) * 255)
  ) as Triple;
  return rgbToHex(`rgb(${r}, ${g}, ${b})`).toUpperCase();
};
