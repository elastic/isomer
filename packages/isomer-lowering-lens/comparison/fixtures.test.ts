/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { readCases } from './fixtures';

const ROOT = join(__dirname, '../../..');

const manifest = (path: string) =>
  JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

describe('captured fixtures', () => {
  const cases = readCases();

  it('were drawn by the Elastic Charts release the renderer pins', () => {
    const pinned = manifest(
      'packages/isomer-renderers-elastic-charts/package.json'
    ).dependencies?.['@elastic/charts'];
    const stale = cases
      .filter(({ provenance }) => provenance.elasticCharts !== pinned)
      .map(({ id, provenance }) => `${id} (${provenance.elasticCharts})`);
    expect(
      stale,
      `The renderer pins @elastic/charts ${pinned}; recapture with \`pnpm comparison:capture\` against a Kibana that ships it.`
    ).toEqual([]);
  });

  it('are captured with the browser the repository tests with', () => {
    const playwright =
      manifest('package.json').devDependencies?.['@playwright/test'];
    const compose = readFileSync(
      join(__dirname, 'capture/compose.yml'),
      'utf8'
    );
    expect(
      [...compose.matchAll(/PLAYWRIGHT_VERSION:-([\d.]+)/g)].map(
        ([, version]) => version
      ),
      'Update `PLAYWRIGHT_VERSION` in `capture/compose.yml` with @playwright/test, then recapture.'
    ).toEqual([playwright, playwright]);
  });
});
