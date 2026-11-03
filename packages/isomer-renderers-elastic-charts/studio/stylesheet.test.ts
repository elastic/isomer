/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import { elasticChartsStylesheet } from './stylesheet';

describe('elasticChartsStylesheet', () => {
  it('matches the installed Elastic Charts stylesheet; run `pnpm studio:stylesheet` when it drifts', () => {
    const require = createRequire(import.meta.url);
    expect(elasticChartsStylesheet).toBe(
      readFileSync(
        require.resolve('@elastic/charts/dist/theme_only_light.css'),
        'utf-8'
      )
    );
  });
});
