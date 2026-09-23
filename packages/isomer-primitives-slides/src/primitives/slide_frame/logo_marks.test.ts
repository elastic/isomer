/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ISOMER_LOGO_PATHS } from './logo_marks';

const logoSvg = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../docs/logo.svg'
);

describe('ISOMER_LOGO_PATHS', () => {
  it('matches docs/logo.svg', () => {
    const svg = readFileSync(logoSvg, 'utf8');
    const paths = [...svg.matchAll(/<path d="([^"]+)" fill="([^"]+)"/g)].map(
      ([, d, fill]) => ({ d, fill })
    );
    expect(paths).toEqual(ISOMER_LOGO_PATHS);
  });
});
