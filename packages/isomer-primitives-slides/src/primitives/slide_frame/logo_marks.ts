/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slidePaletteForMode } from '../../theme/palette';

const brand = slidePaletteForMode('light');

/** Brand-fixed Elastic mark paths. Fills are not palette-driven. */
export const ELASTIC_LOGO_PATHS: ReadonlyArray<{ d: string; fill: string }> = [
  {
    d: 'M27.565 11.242c5.1 1.94 4.872 9.396-.245 11.127l-.162.055-.167-.039-5.28-1.238-.268-.063-.127-.244-1.4-2.69-.217-.417.352-.31 6.904-6.07.272-.24.338.13Z',
    fill: '#0B64DD',
  },
  {
    d: 'm22.047 21.239 4.8 1.125.316.074.11.304.066.19c.623 1.964-.26 3.78-1.652 4.797-1.434 1.048-3.51 1.32-5.182.022l-.29-.225.069-.361 1.037-5.454.117-.615.61.143Z',
    fill: '#9ADC30',
  },
  {
    d: 'm5.01 9.63 5.267 1.255.283.067.122.264 1.235 2.65.187.4-.328.298-6.733 6.1-.272.248-.345-.132C1.939 19.83.72 17.456.752 15.153c.032-2.308 1.321-4.644 3.932-5.508l.162-.054.165.039Z',
    fill: '#1BA9F5',
  },
  {
    d: 'M6.281 4.32c1.416-1.08 3.48-1.387 5.222-.069l.297.226-.07.366-1.053 5.474-.118.615-.609-.144-4.8-1.137-.316-.075-.11-.306c-.709-1.967.149-3.876 1.557-4.95Z',
    fill: '#F04E98',
  },
  {
    d: 'm12.466 14.433 7.03 3.211.188.086.095.183 1.555 2.985.096.184-.04.206-1.165 6.101-.024.122-.068.103c-2.68 3.958-6.902 4.71-10.268 3.26-3.356-1.447-5.834-5.07-5.126-9.736l.033-.21.158-.144 6.884-6.25.293-.265.36.164Z',
    fill: '#02BCB7',
  },
  {
    d: 'M11.892 4.41C14.438.676 18.741.105 22.134 1.54c3.392 1.433 5.99 4.92 5.102 9.362l-.039.2-.153.133-7.066 6.213-.293.258-.353-.163-7.002-3.21-.201-.093-.094-.2-1.38-2.988-.081-.177.037-.19L11.8 4.633l.023-.121.07-.102Z',
    fill: '#FEC514',
  },
];

export const ELASTIC_LOGO_STROKE = {
  stroke: '#fff',
  strokeWidth: '1.2',
} as const;

/** Four-shape logo tiles; each carries a handle and a literal `fill` (see "Drawing inside an `svg`" in `docs/primitives.md`). */
export const LOGO_TILES = [
  {
    handle: 'tilePrimary',
    fill: brand.primary,
    props: { x: 0, y: 0, width: 9, height: 9, rx: 2, ry: 2 },
    shape: 'rect',
  },
  {
    handle: 'tileSuccess',
    fill: brand.success,
    props: { cx: 15.5, cy: 4.5, r: 4.5 },
    shape: 'circle',
  },
  {
    handle: 'tileWarning',
    fill: brand.warning,
    props: { points: '0,20 9,20 4.5,11' },
    shape: 'polygon',
  },
  {
    handle: 'tileDanger',
    fill: brand.danger,
    props: { points: '15.5,11 20,15.5 15.5,20 11,15.5' },
    shape: 'polygon',
  },
] as const satisfies ReadonlyArray<{
  handle: 'tilePrimary' | 'tileSuccess' | 'tileWarning' | 'tileDanger';
  /** Light-scheme literal; the image has no stylesheet to vary it from. */
  fill: string;
  props: Record<string, number | string>;
  shape: 'rect' | 'circle' | 'polygon';
}>;
