/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChildProcess } from 'node:child_process';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  compareFingerprints,
  deviations,
  failures,
} from '../../isomer-lowering-lens/comparison/compare';
import {
  extractMetricFingerprint,
  type Fingerprint,
  NUMERIC_GLYPHS,
} from '../../isomer-lowering-lens/comparison/fingerprint';

import { serveStatic } from './serve_static';

const root = resolve(__dirname, '../../..');
const cli = join(root, 'packages/isomer-studio/bin/isomer-studio.js');
const config = join(root, 'isomer-studio.config.ts');
const casesDir = join(
  root,
  'packages/isomer-lowering-lens/comparison/__fixtures__'
);

interface CaseFile {
  id: string;
  title: string;
  context: { scheme: 'light' | 'dark' };
  reference: { fingerprint: Fingerprint };
}

const cases: CaseFile[] = readdirSync(casesDir, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() && existsSync(join(casesDir, entry.name, 'case.json'))
  )
  .map(
    ({ name }) =>
      JSON.parse(
        readFileSync(join(casesDir, name, 'case.json'), 'utf8')
      ) as CaseFile
  );

const startDev = async (): Promise<{ url: string; child: ChildProcess }> => {
  const child = spawn(
    process.execPath,
    [cli, 'dev', '--config', config, '--port', '0'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  let output = '';
  child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()));
  child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()));
  await expect
    .poll(() => /Isomer Studio: (http\S+)/.exec(output)?.[1])
    .toBeTruthy();
  return { url: /Isomer Studio: (http\S+)/.exec(output)![1]!, child };
};

interface Outcome {
  id: string;
  status: string | null;
  differences: string[];
  drawn?: Fingerprint;
}

const compare = async (
  page: Page,
  url: string,
  { id, context }: CaseFile
): Promise<Outcome> => {
  await page.goto(`${url}#/app/lens-comparison/${encodeURIComponent(id)}`);
  await page.locator(`button#${context.scheme}`).click();
  // The app must compare the case asked for, not another one.
  await expect(page.getByLabel('Case', { exact: true })).toHaveValue(id);
  const section = page.getByLabel('Comparison');
  await expect(section).not.toHaveAttribute('data-status', 'pending', {
    timeout: 30_000,
  });
  const status = await section.getAttribute('data-status');
  const differences =
    status === 'pass'
      ? []
      : await section
          .locator('tr, li')
          .evaluateAll((rows) =>
            rows
              .map((row) =>
                (row as HTMLElement).innerText.replace(/\s+/g, ' ').trim()
              )
              .filter(Boolean)
          );
  const fingerprint = page.getByLabel('Isomer fingerprint');
  const drawn =
    (await fingerprint.count()) > 0
      ? (JSON.parse((await fingerprint.textContent()) ?? 'null') as Fingerprint)
      : undefined;
  return { id, status, differences, ...(drawn ? { drawn } : {}) };
};

test.describe('Lens comparison', () => {
  let dev: { url: string; child: ChildProcess };

  test.beforeAll(async () => {
    dev = await startDev();
  });

  test.afterAll(async () => {
    dev.child.kill();
    await once(dev.child, 'exit');
  });

  // Each moves a drawn element without touching the class Elastic Charts aligns it with.
  for (const { field, from, css } of [
    {
      field: 'valueAlign',
      from: 'right',
      css: '.echMetricText__valueBlock{justify-content:flex-start !important}',
    },
    {
      field: 'iconAlign',
      from: 'right',
      css: '.echMetricText__icon{grid-column:1 !important}',
    },
    {
      field: 'extraAlign',
      from: 'right',
      css: '.echMetricText__extraBlock{justify-content:center !important}',
    },
  ] as const) {
    test(`reads ${field} as drawn, not from class names`, async ({ page }) => {
      const comparison = cases.find(({ reference }) =>
        reference.fingerprint.tiles.some((tile) => tile[field] === from)
      );
      expect(comparison, `a case with a ${from} ${field}`).toBeDefined();
      expect((await compare(page, dev.url, comparison!)).status).toBe('pass');
      const drawing = page.locator(
        '[aria-label="Isomer drawing"] section.isomer'
      );
      const before = await drawing.evaluate(
        extractMetricFingerprint,
        NUMERIC_GLYPHS.source
      );
      await drawing.evaluate((section, rule) => {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(rule);
        const shadow = section.getRootNode() as ShadowRoot;
        shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];
      }, css);
      const after = await drawing.evaluate(
        extractMetricFingerprint,
        NUMERIC_GLYPHS.source
      );
      expect(
        failures(compareFingerprints(before!, after)).map(
          ({ path, feature }) => `${path} ${feature}`
        )
      ).toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            new RegExp(`^tiles\\[\\d+\\]\\.${field} layout\\.align$`)
          ),
        ])
      );
    });
  }

  test('fails a drawing made in another color scheme than the reference', async ({
    page,
  }) => {
    const dark = cases.find(({ context }) => context.scheme === 'dark')!;
    const { status, differences } = await compare(page, dev.url, {
      ...dark,
      context: { scheme: 'light' },
    });
    expect(status).toBe('fail');
    expect(differences).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^context\.scheme context dark light/),
        expect.stringMatching(/^tiles\[0\]\.background color /),
      ])
    );
  });

  test('every captured Lens panel draws as Kibana drew it', async ({
    page,
  }) => {
    test.setTimeout(cases.length * 30_000);
    const outcomes: Outcome[] = [];
    for (const comparison of cases) {
      outcomes.push(await compare(page, dev.url, comparison));
    }
    const failed = outcomes.filter(({ status }) => status !== 'pass');
    const report = failed
      .map(
        ({ id, status, differences }) =>
          `${id} (${status})\n  ${differences.join('\n  ')}`
      )
      .join('\n');
    // The largest deviation per feature, which the tolerances are set against.
    const largest: Record<string, number> = {};
    outcomes.forEach(({ drawn }, index) => {
      if (drawn) {
        for (const [feature, value] of Object.entries(
          deviations(cases[index]!.reference.fingerprint, drawn)
        )) {
          largest[feature] = Math.max(largest[feature] ?? 0, value);
        }
      }
    });
    test.info().annotations.push(
      {
        type: 'comparison',
        description: `${outcomes.length - failed.length}/${outcomes.length} match`,
      },
      { type: 'deviations', description: JSON.stringify(largest) }
    );
    console.info(
      `Largest deviation per feature on ${process.platform}: ${JSON.stringify(largest)}`
    );
    expect(report, report).toBe('');
  });
});

test('a static build bundles the cases, their screenshots and Kibana fonts', async ({
  page,
}) => {
  const base = '/lens-comparison/review/';
  const dir = mkdtempSync(join(tmpdir(), 'isomer-lens-comparison-'));
  try {
    execFileSync(
      process.execPath,
      [cli, 'build', '--config', config, '--out', dir, '--base', base],
      {
        stdio: 'pipe',
      }
    );
    const server = await serveStatic(dir, base);
    try {
      // One case per dashboard and scheme covers each bundle path without redrawing them all.
      const sample = [
        ...new Map(
          cases.map((comparison) => [
            `${comparison.id.split('--')[0]}/${comparison.context.scheme}`,
            comparison,
          ])
        ).values(),
      ];
      for (const comparison of sample) {
        const { status, differences } = await compare(
          page,
          server.url,
          comparison
        );
        expect(status, `${comparison.id}\n${differences.join('\n')}`).toBe(
          'pass'
        );
        // A failed load is `complete` too; only a decoded image has a width.
        await expect
          .poll(() =>
            page
              .getByRole('img', { name: /^Kibana's drawing of / })
              .evaluate((image) => (image as HTMLImageElement).naturalWidth)
          )
          .toBeGreaterThan(0);
      }
    } finally {
      await server.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
