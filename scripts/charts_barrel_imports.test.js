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

const SRC = 'packages/isomer-primitives-charts/src';

const restricted = async (specifier, filePath) => {
  const [{ messages }] = await eslint.lintText(
    `export { a } from '${specifier}';\n`,
    { filePath: `${SRC}/${filePath}` }
  );
  return messages.length > 0;
};

describe('charts barrel imports', () => {
  it.each([
    ['pack.ts', './render/cls'],
    ['pack.ts', './primitives/metric/schema'],
    ['render/probe.ts', '../theme/palette'],
    ['render/probe.ts', '../primitives/data_table'],
    ['render/probe.ts', '../primitives/data_table/index'],
    ['render/probe.ts', '../primitives/data_table/index.js'],
    ['render/probe.ts', '../primitives/data_table.js'],
    ['entries/resolve.ts', '../primitives/metric'],
    ['primitives/defaults.ts', './metric'],
    ['primitives/defaults.ts', './metric/index.js'],
    ['primitives/defaults.ts', '../render/cls'],
    ['primitives/metric/probe.ts', '../../theme/palette'],
    ['render/probe.ts', '@elastic/isomer-primitives-charts'],
    ['primitives/metric/probe.ts', '@elastic/isomer-primitives-charts/scene'],
  ])('rejects, from %s, %s', async (filePath, specifier) => {
    expect(await restricted(specifier, filePath)).toBe(true);
  });

  it.each([
    ['pack.ts', './render'],
    ['pack.ts', './primitives/metric'],
    ['render/probe.ts', '../theme'],
    ['render/probe.ts', '../primitives/data_table/size'],
    ['render/probe.ts', '../primitives/resolve_chart'],
    ['entries/resolve.ts', '../primitives/resolve_chart'],
    ['primitives/defaults.ts', './data_table/react'],
    ['primitives/metric/probe.ts', '../../theme'],
    ['primitives/metric/probe.ts', '../xy_chart/examples'],
    ['render/probe.ts', '@elastic/isomer-primitives-charts-extra'],
  ])('allows, from %s, %s', async (filePath, specifier) => {
    expect(await restricted(specifier, filePath)).toBe(false);
  });

  it.each([
    "export const load = () => import('@elastic/isomer-primitives-charts/testing');\n",
    'export const load = () => import(`@elastic/isomer-primitives-charts/testing`);\n',
    "export const load = () => require('@elastic/isomer-primitives-charts');\n",
    "export type Lazy = import('@elastic/isomer-primitives-charts/scene').Scene;\n",
    'export const load = (name: string) => import(name);\n',
    "import { createRequire } from 'node:module';\n",
    'export const req = createRequire(import.meta.url);\n',
    "export const m = module.require('@elastic/isomer-primitives-charts/testing');\n",
    "export const m = module['require']('@elastic/isomer-primitives-charts/testing');\n",
    'export const m = module.require(name);\n',
    "export const r = nm['createRequire'](import.meta.url);\n",
    "import * as nm from 'node:module';\nexport const r = nm.createRequire(import.meta.url);\n",
  ])('rejects a self-import by any load: %s', async (code) => {
    const [{ messages }] = await eslint.lintText(code, {
      filePath: `${SRC}/render/probe.ts`,
    });
    expect(messages.length).toBeGreaterThan(0);
    expect(new Set(messages.map(({ ruleId }) => ruleId))).toEqual(
      new Set(['no-restricted-syntax'])
    );
  });

  it('allows computed access by other keys', async () => {
    const [{ messages }] = await eslint.lintText(
      "export const a = labels['kind'];\nexport const b = labels[kind];\n",
      { filePath: `${SRC}/render/probe.ts` }
    );
    expect(messages).toEqual([]);
  });

  it('allows calls that are not module loads', async () => {
    const [{ messages }] = await eslint.lintText(
      "export const s = Symbol.for('@elastic/isomer-primitives-charts/style-scope');\n",
      { filePath: `${SRC}/render/probe.ts` }
    );
    expect(messages).toEqual([]);
  });

  it('exempts tests', async () => {
    expect(await restricted('../theme/palette', 'render/probe.test.ts')).toBe(
      false
    );
  });
});
