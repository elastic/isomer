/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import { repoRoot } from './workspace_packages.js';

// The fixtures are not files, so they parse without the type-aware project and run only the import rules.
const eslint = new ESLint({
  cwd: repoRoot,
  overrideConfig: {
    languageOptions: {
      parserOptions: { project: null, projectService: false },
    },
  },
  ruleFilter: ({ ruleId }) => ruleId.startsWith('no-restricted-'),
});

const ENGINE_SOURCE = 'packages/isomer-charts-probe/src/engine.ts';

const restrictions = async (code, filePath = ENGINE_SOURCE) => {
  const [{ messages }] = await eslint.lintText(code, { filePath });
  return messages.map(({ message, ruleId }) => ruleId ?? message);
};

describe('chart engine imports', () => {
  it.each([
    '@elastic/isomer-primitives-charts',
    '@elastic/isomer-primitives-charts/resolve',
    '@elastic/isomer-primitives-charts/schema',
    '@elastic/isomer-primitives-charts/scene/types',
  ])('rejects %s', async (specifier) => {
    expect(
      await restrictions(`import { a } from '${specifier}';\nexport { a };\n`)
    ).toEqual(['no-restricted-imports']);
    expect(await restrictions(`export { a } from '${specifier}';\n`)).toEqual([
      'no-restricted-imports',
    ]);
    expect(
      await restrictions(`export const load = () => import('${specifier}');\n`)
    ).toEqual(['no-restricted-syntax']);
  });

  it('accepts the Scene entry', async () => {
    expect(
      await restrictions(
        [
          "import type { Scene } from '@elastic/isomer-primitives-charts/scene';",
          "import { selectEvent } from '@elastic/isomer-primitives-charts/scene';",
          '',
          'export type Drawn = Scene;',
          'export const select = selectEvent;',
          "export const load = () => import('@elastic/isomer-primitives-charts/scene');",
          '',
        ].join('\n')
      )
    ).toEqual([]);
  });

  it.each([
    'packages/isomer-charts-probe/src/engine.test.ts',
    'packages/isomer-runtime/src/probe.ts',
  ])('leaves %s alone', async (filePath) => {
    expect(
      await restrictions(
        [
          "import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';",
          '',
          'export const resolve = resolveChart;',
          "export const load = () => import('@elastic/isomer-primitives-charts/resolve');",
          '',
        ].join('\n'),
        filePath
      )
    ).toEqual([]);
  });
});
