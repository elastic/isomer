/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ECH_CLASSES } from './metric';
import { ELASTIC_CHARTS_VERSION } from './renderer';

const require = createRequire(import.meta.url);
const manifest = require.resolve('@elastic/charts/package.json');

describe('the installed Elastic Charts', () => {
  it('is the version the engine names', () => {
    const { version } = JSON.parse(readFileSync(manifest, 'utf8')) as {
      version: string;
    };
    expect(ELASTIC_CHARTS_VERSION).toBe(version);
  });

  describe.each([
    'theme_light.css',
    'theme_dark.css',
    'theme_only_light.css',
    'theme_only_dark.css',
  ])('%s', (file) => {
    const css = readFileSync(join(dirname(manifest), 'dist', file), 'utf8');

    it.each(Object.values(ECH_CLASSES))('styles .%s', (name) => {
      expect(css).toMatch(new RegExp(`\\.${name}(?![\\w-])`));
    });
  });
});
