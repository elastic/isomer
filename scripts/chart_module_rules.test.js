/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CONTRACT_FORBIDDEN,
  isRendererSource,
  matchesForbidden,
  rendererViolation,
  rendererViolations,
} from './chart_module_rules.js';

const src = join('/repo', 'packages', 'isomer-primitives-charts', 'src');
const svgFile = join(src, 'svg', 'draw.ts');
const engineFile = join(
  '/repo',
  'packages',
  'isomer-charts-elastic',
  'src',
  'xy.tsx'
);

const forbidden = (specifier) =>
  CONTRACT_FORBIDDEN.some((rule) => matchesForbidden(specifier, rule));

describe('contract entries', () => {
  it.each([
    'react',
    'react/jsx-runtime',
    'react-dom/server',
    '@elastic/charts',
    '@elastic/isomer-runtime',
    '@elastic/isomer-sdk',
    '@elastic/isomer-sdk/react',
    '@elastic/isomer-sdk/html',
  ])('may not reach %s', (specifier) => {
    expect(forbidden(specifier)).toBe(true);
  });

  it.each([
    'zod',
    '@elastic/numeral',
    '@elastic/isomer-sdk/schema',
    'react-native-svg',
  ])('may reach %s', (specifier) => {
    expect(forbidden(specifier)).toBe(false);
  });
});

describe('renderers', () => {
  it.each([
    ['../format', svgFile],
    ['../format/format.ts', svgFile],
    ['../schema/metric', svgFile],
    ['../scene/resolve', svgFile],
    ['../scene/theme', svgFile],
    ['@elastic/isomer-primitives-charts', engineFile],
    ['@elastic/isomer-primitives-charts/format', engineFile],
    ['@elastic/isomer-primitives-charts/schema', engineFile],
  ])('may not import %s', (specifier, file) => {
    expect(rendererViolation(specifier, file, src)).toBeDefined();
  });

  it.each([
    ['../scene/types', svgFile],
    ['../scene/events', svgFile],
    ['./scale', svgFile],
    ['react', svgFile],
    ['@elastic/isomer-primitives-charts/scene', engineFile],
    ['@elastic/charts', engineFile],
    ['./metric', engineFile],
  ])('may import %s', (specifier, file) => {
    expect(rendererViolation(specifier, file, src)).toBeUndefined();
  });

  it('reports each file and specifier that breaks the rule', () => {
    const imports = {
      [svgFile]: ['../scene/types', '../format'],
      [join(src, 'svg', 'xy.ts')]: ['./scale'],
    };
    expect(
      rendererViolations(Object.keys(imports), (file) => imports[file], src)
    ).toEqual([
      expect.objectContaining({ file: svgFile, specifier: '../format' }),
    ]);
  });

  it.each([
    "import { resolveChart } from '@elastic/isomer-primitives-charts/scene';",
    "import { resolveColor as color } from '@elastic/isomer-primitives-charts/scene';",
    "import { categoricalColor } from '@elastic/isomer-primitives-charts/scene';",
    "import * as charts from '@elastic/isomer-primitives-charts/scene';",
    "export { resolveChart as resolve } from '@elastic/isomer-primitives-charts/scene';",
    "export * from '@elastic/isomer-primitives-charts/scene';",
    "const charts = require('@elastic/isomer-primitives-charts/scene');",
    "const charts = import('@elastic/isomer-primitives-charts/scene');",
  ])('rejects resolver access through the scene entry: %s', (source) => {
    expect(
      rendererViolations(
        [engineFile],
        () => ['@elastic/isomer-primitives-charts/scene'],
        src,
        () => source
      )
    ).toHaveLength(1);
  });

  it('allows Scene types and event helpers through the public scene entry', () => {
    const source =
      "import { type Scene, type SceneRenderer, selectEvent, brushEvent, SCENE_KINDS } from '@elastic/isomer-primitives-charts/scene';";
    expect(
      rendererViolations(
        [engineFile],
        () => ['@elastic/isomer-primitives-charts/scene'],
        src,
        () => source
      )
    ).toEqual([]);
  });

  it('checks sources, not tests, fixtures or declarations', () => {
    expect(isRendererSource('draw.ts')).toBe(true);
    expect(isRendererSource('metric.tsx')).toBe(true);
    expect(isRendererSource('draw.test.ts')).toBe(false);
    expect(isRendererSource('scenes.fixtures.ts')).toBe(false);
    expect(isRendererSource('types.d.ts')).toBe(false);
  });
});
