/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { readCases, staleCaptures } from './fixtures';

const ROOT = join(__dirname, '../../..');

const manifest = (path: string) =>
  JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

describe('captured fixtures', () => {
  const cases = readCases();

  it('were captured with the Elastic Charts and Playwright the repository draws with', () => {
    // The renderer peers on a range and pins the exact release it develops against.
    const elasticCharts = manifest(
      'packages/isomer-renderers-elastic-charts/package.json'
    ).devDependencies?.['@elastic/charts'];
    const playwright =
      manifest('package.json').devDependencies?.['@playwright/test'];
    expect(elasticCharts).toMatch(/^\d+\.\d+\.\d+$/);
    expect(playwright).toMatch(/^\d+\.\d+\.\d+$/);
    expect(
      staleCaptures(cases, { elasticCharts, playwright }),
      'Recapture with `pnpm comparison:capture` against a Kibana that ships the pinned @elastic/charts.'
    ).toEqual([]);
  });

  it("pins the capture browser to the repository's Playwright", () => {
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

describe('staleCaptures', () => {
  const [sample] = readCases();
  const current = {
    elasticCharts: sample!.provenance.elasticCharts,
    playwright: sample!.provenance.browser.playwright,
    chromium: sample!.provenance.browser.chromium,
  };

  it('passes a case captured with what draws now', () => {
    expect(staleCaptures([sample!], current)).toEqual([]);
  });

  it.each(['elasticCharts', 'playwright', 'chromium'] as const)(
    'rejects a case captured with another %s',
    (key) => {
      expect(staleCaptures([sample!], { ...current, [key]: '0.0.0' })).toEqual([
        `${sample!.id}: ${key} ${current[key]}, now 0.0.0`,
      ]);
    }
  );
});
