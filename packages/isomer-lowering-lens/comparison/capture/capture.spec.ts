/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Captures comparison cases from a local Kibana with sample data: each supported dashboard panel's saved state,
// the data Lens drew it from, its drawing's fingerprint and a screenshot. See docs/comparison.md.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import type { JsonObject } from '../../src/json';
import type { ComparisonCase, LayerData } from '../case';
import { caseSchema, platformOf } from '../case';
import { extractMetricFingerprint, NUMERIC_GLYPHS } from '../fingerprint';

import { type CapturedFont, writeCaseIndex } from './case_index';
import { AUTHORED_DASHBOARDS, dashboardSavedObject } from './scenarios';

type Json = Record<string, unknown>;

const KIBANA = process.env.KIBANA_URL ?? 'http://127.0.0.1:5601';
/** Kibana as the capture browser reaches it, from inside the compose network. */
const KIBANA_PAGES = process.env.KIBANA_BROWSER_URL ?? 'http://kibana:5601';
const CASES = resolve(__dirname, '../__fixtures__');
/** Written first and swapped in only when the capture succeeds, so a failure leaves the committed cases alone. */
const NEXT = `${CASES}.next`;
const COMPOSE = resolve(__dirname, 'compose.yml');
const SAMPLE_DATA = ['flights', 'logs', 'ecommerce'] as const;
const SCHEMES = ['light', 'dark'] as const;
const SUPPORTED = new Set(['lnsMetric']);
const HEADERS = { 'kbn-xsrf': 'isomer', 'x-elastic-internal-origin': 'Kibana' };

const request = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(`${KIBANA}${path}`, {
    ...init,
    headers: {
      ...HEADERS,
      ...(typeof init.body === 'string'
        ? { 'content-type': 'application/json' }
        : {}),
    },
  });
  if (!response.ok) {
    throw new Error(
      `${init.method ?? 'GET'} ${path}: ${response.status} ${await response.text()}`
    );
  }
  return response.text();
};

const api = async <T = Json>(
  path: string,
  init: RequestInit = {}
): Promise<T> => JSON.parse(await request(path, init)) as T;

const day = (offset: number) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString();
};

/** Sample data rebases its timestamps around install time, so the range is fixed per capture and recorded. */
const TIME_RANGE = { from: day(-60), to: day(30) };

const elasticChartsVersion = () => {
  if (process.env.KIBANA_ELASTIC_CHARTS) {
    return process.env.KIBANA_ELASTIC_CHARTS;
  }
  const manifest = execFileSync(
    'docker',
    [
      'compose',
      '-f',
      COMPOSE,
      'exec',
      '-T',
      'kibana',
      'cat',
      'node_modules/@elastic/charts/package.json',
    ],
    { encoding: 'utf8' }
  );
  return (JSON.parse(manifest) as { version: string }).version;
};

/** The families an Elastic Charts metric draws with in Kibana. */
const FONT_FAMILIES = new Set(['Inter', 'Elastic UI Numeric']);

/**
 * Downloads the font files Kibana serves for the metric's families, with their licenses, so the comparison
 * draws with the same files rather than whatever the machine has.
 */
const captureFonts = async (
  directory: string
): Promise<{ faces: CapturedFont[]; digests: Record<string, string> }> => {
  const page = await request('/app/home');
  const faces: CapturedFont[] = [];
  const digests: Record<string, string> = {};
  mkdirSync(directory, { recursive: true });
  for (const [, block] of page.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const read = (property: string) =>
      new RegExp(`${property}:\\s*([^;]+);`).exec(block!)?.[1]?.trim();
    const family = read('font-family')?.replace(/^['"]|['"]$/g, '');
    const style = read('font-style') ?? 'normal';
    const weight = read('font-weight') ?? '400';
    const url = /url\('([^']+)'\)/.exec(read('src') ?? '')?.[1];
    const inRange =
      /^\d+ \d+$/.test(weight) ||
      (Number(weight) >= 400 && Number(weight) <= 700);
    if (
      !family ||
      !FONT_FAMILIES.has(family) ||
      style !== 'normal' ||
      !inRange ||
      !url
    ) {
      continue;
    }
    const file = url.split('/').at(-1)!;
    const bytes = Buffer.from(
      await (await fetch(`${KIBANA}${url}`)).arrayBuffer()
    );
    writeFileSync(join(directory, file), bytes);
    digests[file] = createHash('sha256').update(bytes).digest('hex');
    const unicodeRange = read('unicode-range');
    faces.push({
      family,
      weight,
      file,
      ...(unicodeRange ? { unicodeRange } : {}),
    });
    const license = url.replace(/[^/]+$/, 'LICENSE.txt');
    writeFileSync(
      join(directory, `${file.replace(/[-.].*$/, '')}-LICENSE.txt`),
      await request(license)
    );
  }
  return { faces, digests };
};

/** Kibana's version and build, from the metadata every app page carries. */
const kibanaMetadata = async () => {
  const page = await request('/app/home');
  const data = /<kbn-injected-metadata data="([^"]*)"/.exec(page)?.[1];
  if (!data) {
    throw new Error('Kibana served no injected metadata.');
  }
  const decoded = data
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  return JSON.parse(decoded) as {
    version: string;
    buildNumber: number;
    buildSha?: string;
  };
};

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Reads a panel's Lens state and inspector adapters through its embeddable API, found on its React fiber. */
const readPanel = (panel: Element) => {
  const candidates = [panel, ...panel.querySelectorAll('*')];
  for (const element of candidates) {
    const key = Object.keys(element).find((name) =>
      name.startsWith('__reactFiber$')
    );
    let fiber = key
      ? (
          element as unknown as Record<
            string,
            { return?: unknown; memoizedProps?: unknown }
          >
        )[key]
      : undefined;
    for (let depth = 0; fiber && depth < 80; depth += 1) {
      const props = fiber.memoizedProps;
      if (props && typeof props === 'object') {
        for (const value of Object.values(props)) {
          const embeddable = value as {
            getInspectorAdapters?: () => {
              tables: { tables: Record<string, unknown> };
              requests: {
                getRequests: () => {
                  json?: { query?: string };
                  response?: { json?: { rawResponse?: Json } };
                }[];
              };
            };
            getFullAttributes?: () => Json;
          };
          if (
            embeddable &&
            typeof embeddable.getInspectorAdapters === 'function' &&
            embeddable.getFullAttributes
          ) {
            const adapters = embeddable.getInspectorAdapters();
            return JSON.parse(
              JSON.stringify({
                attributes: embeddable.getFullAttributes(),
                tables: adapters.tables.tables,
                requests: adapters.requests
                  .getRequests()
                  .map(({ json, response }) => ({
                    query: json?.query,
                    response: response?.json?.rawResponse,
                  })),
              })
            ) as {
              attributes: Json;
              tables: Record<string, Json>;
              requests: { query?: string; response?: Json }[];
            };
          }
        }
      }
      fiber = fiber.return as typeof fiber;
    }
  }
  return null;
};

const datatableToResponse = ({ columns, rows }: Json) => {
  const list = columns as {
    id: string;
    name: string;
    meta: { esType?: string; type: string };
  }[];
  return {
    columns: list.map(({ id, meta }) => ({
      name: id,
      type: meta.esType ?? meta.type,
    })),
    values: (rows as Json[]).map((row) =>
      list.map(({ id }) => row[id] ?? null)
    ),
  };
};

/** Lens asks for `dropNullColumns`; a host's own request returns every column, so `all_columns` is restored. */
const withNullColumns = ({ columns, values, all_columns: all }: Json): Json => {
  const kept = columns as { name: string; type: string }[];
  const every = (all as typeof kept | undefined) ?? kept;
  return {
    columns: every,
    values: (values as unknown[][]).map((row) =>
      every.map(({ name }) => {
        const index = kept.findIndex((column) => column.name === name);
        return index === -1 ? null : (row[index] ?? null);
      })
    ),
  };
};

const layerData = (
  attributes: Json,
  panel: NonNullable<ReturnType<typeof readPanel>>
): Record<string, LayerData> => {
  const states = (attributes.state as Json).datasourceStates as Json;
  const data: Record<string, LayerData> = {};
  const formLayers =
    ((states.formBased ?? states.indexpattern) as { layers?: Json } | undefined)
      ?.layers ?? {};
  for (const layerId of Object.keys(formLayers)) {
    const datatable = panel.tables[layerId];
    if (datatable) {
      data[layerId] = { kind: 'form', datatable: datatable as JsonObject };
    }
  }
  const textLayers =
    (
      states.textBased as
        { layers?: Record<string, { query?: { esql?: string } }> } | undefined
    )?.layers ?? {};
  for (const [layerId, { query }] of Object.entries(textLayers)) {
    const request = panel.requests.find(
      ({ query: text, response }) => text === query?.esql && response
    );
    if (request?.response) {
      data[layerId] = {
        kind: 'esql',
        query: query?.esql ?? '',
        response: withNullColumns(request.response) as JsonObject,
      };
    } else if (panel.tables[layerId]) {
      // Lens rebuilds some ES|QL queries at render time, such as a trendline's, so only its table is keyed to the layer.
      data[layerId] = {
        kind: 'esql',
        query: query?.esql ?? '',
        response: datatableToResponse(panel.tables[layerId]) as JsonObject,
      };
    }
  }
  return data;
};

const dataViewMetadata = async (references: Json[]) => {
  const ids = [
    ...new Set(
      references
        .filter(({ type }) => type === 'index-pattern')
        .map(({ id }) => String(id))
    ),
  ];
  return Promise.all(
    ids.map(async (id) => {
      const {
        data_view: { title, timeFieldName, fieldFormats = {}, fieldAttrs = {} },
      } = await api<{
        data_view: {
          title: string;
          timeFieldName?: string;
          fieldFormats?: JsonObject;
          fieldAttrs?: Record<string, { customLabel?: string }>;
        };
      }>(`/api/data_views/data_view/${id}`);
      const fieldLabels = Object.fromEntries(
        Object.entries(fieldAttrs).flatMap(([field, { customLabel }]) =>
          customLabel ? [[field, customLabel]] : []
        )
      );
      return {
        id,
        title,
        ...(timeFieldName ? { timeFieldName } : {}),
        ...(Object.keys(fieldFormats).length ? { fieldFormats } : {}),
        ...(Object.keys(fieldLabels).length ? { fieldLabels } : {}),
      };
    })
  );
};

const exportDashboard = async (id: string) => {
  const ndjson = await request('/api/saved_objects/_export', {
    method: 'POST',
    body: JSON.stringify({
      objects: [{ type: 'dashboard', id }],
      includeReferencesDeep: false,
    }),
  });
  const dashboard = JSON.parse(ndjson.split('\n')[0]!) as {
    attributes: { title: string; panelsJSON: string };
    references: { name: string; type: string; id: string }[];
  };
  const panels = JSON.parse(dashboard.attributes.panelsJSON) as {
    type: string;
    panelIndex: string;
    embeddableConfig?: { attributes?: Json };
  }[];
  return {
    title: dashboard.attributes.title,
    panels: await Promise.all(
      panels.map(async (panel) => ({
        ...panel,
        visualizationType: await visualizationOf(panel, dashboard.references),
      }))
    ),
  };
};

/** A Lens panel's visualization type, read from the library for a panel saved by reference. */
const visualizationOf = async (
  {
    type,
    panelIndex,
    embeddableConfig,
  }: {
    type: string;
    panelIndex: string;
    embeddableConfig?: { attributes?: Json };
  },
  references: { name: string; type: string; id: string }[]
) => {
  if (type !== 'lens') {
    return undefined;
  }
  const byValue = embeddableConfig?.attributes?.visualizationType;
  if (typeof byValue === 'string') {
    return byValue;
  }
  const reference = references.find(
    ({ name, type: kind }) =>
      kind === 'lens' && name.startsWith(`${panelIndex}:`)
  );
  if (!reference) {
    throw new Error(
      `Lens panel ${panelIndex} has neither attributes nor a library reference.`
    );
  }
  const { attributes } = await api<{
    attributes: { visualizationType?: string };
  }>(`/api/saved_objects/lens/${reference.id}`);
  return attributes.visualizationType;
};

const waitForRender = async (page: Page) => {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const items = [
            ...document.querySelectorAll('[data-render-complete]'),
          ];
          return (
            items.length > 0 &&
            items.every(
              (item) => item.getAttribute('data-render-complete') === 'true'
            )
          );
        }),
      { timeout: 180_000 }
    )
    .toBe(true);
  await page.evaluate(() => document.fonts.ready.then(() => true));
  // Elastic Charts fits metric text after the first layout.
  await page.waitForTimeout(1500);
};

test('capture comparison cases', async ({ browser }) => {
  const samples =
    await api<{ id: string; status: string }[]>('/api/sample_data');
  for (const id of SAMPLE_DATA) {
    if (samples.find((set) => set.id === id)?.status !== 'installed') {
      await api(`/api/sample_data/${id}`, { method: 'POST' });
    }
  }
  const form = new FormData();
  form.append(
    'file',
    new Blob([
      AUTHORED_DASHBOARDS.map((dashboard) =>
        JSON.stringify(dashboardSavedObject(dashboard))
      ).join('\n'),
    ]),
    'dashboards.ndjson'
  );
  // Import answers 200 even when an object fails, so a missing authored dashboard must be caught here.
  const imported = await api<{ success: boolean; errors?: unknown[] }>(
    '/api/saved_objects/_import?overwrite=true',
    { method: 'POST', body: form }
  );
  if (!imported.success) {
    throw new Error(
      `Importing the authored dashboards failed: ${JSON.stringify(imported.errors)}`
    );
  }

  const { saved_objects: dashboards } = await api<{
    saved_objects: { id: string }[];
  }>('/api/saved_objects/_find?type=dashboard&per_page=100');
  const ids = dashboards.map(({ id }) => id).sort();
  const authored = new Set(AUTHORED_DASHBOARDS.map(({ id }) => id));
  const elasticCharts = elasticChartsVersion();
  const capturedWith = {
    playwright: (
      JSON.parse(
        readFileSync(require.resolve('@playwright/test/package.json'), 'utf8')
      ) as { version: string }
    ).version,
    chromium: browser.version(),
  };
  const metadata = await kibanaMetadata();
  const settings = await api<{
    settings: Record<string, { userValue?: string }>;
  }>('/api/kibana/settings');
  const dateFormat =
    settings.settings.dateFormat?.userValue ?? 'MMM D, YYYY @ HH:mm:ss.SSS';

  rmSync(NEXT, { recursive: true, force: true });
  const fonts = await captureFonts(join(NEXT, 'fonts'));
  const written: ComparisonCase[] = [];

  // Kibana follows the browser's color scheme, which each pass emulates.
  await api('/api/kibana/settings', {
    method: 'POST',
    body: JSON.stringify({
      changes: { 'dateFormat:tz': 'UTC', 'theme:darkMode': 'system' },
    }),
  });
  for (const scheme of SCHEMES) {
    const context = await browser.newContext({
      colorScheme: scheme,
      viewport: { width: 1600, height: 3200 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const platform = platformOf(await page.evaluate(() => navigator.platform));
    for (const dashboardId of ids) {
      const { title: dashboardTitle, panels } =
        await exportDashboard(dashboardId);
      const metrics = panels.filter(
        ({ visualizationType }) =>
          visualizationType !== undefined && SUPPORTED.has(visualizationType)
      );
      if (!metrics.length) {
        continue;
      }
      await page.goto(
        `${KIBANA_PAGES}/app/dashboards#/view/${dashboardId}?_g=(time:(from:'${TIME_RANGE.from}',to:'${TIME_RANGE.to}'))`
      );
      await waitForRender(page);

      for (const { panelIndex } of metrics) {
        const panel = page.locator(`[data-test-embeddable-id="${panelIndex}"]`);
        const read = await panel.evaluate(readPanel);
        const fingerprint = await panel.evaluate(
          extractMetricFingerprint,
          NUMERIC_GLYPHS.source
        );
        if (!read || !fingerprint) {
          // A skipped panel would leave the baseline smaller than the last capture's.
          throw new Error(
            `${dashboardTitle} / ${panelIndex}: found no Lens API or metric drawing.`
          );
        }
        const { attributes } = read;
        const references = (attributes.references ?? []) as Json[];
        const id = `${slug(dashboardTitle)}--${slug(panelIndex)}--${scheme}`;
        const directory = join(NEXT, id);
        mkdirSync(directory, { recursive: true });
        await panel.locator('.echMetricContainer').screenshot({
          path: join(directory, 'reference.png'),
          animations: 'disabled',
        });
        const comparison = caseSchema.parse({
          version: 1,
          id,
          title: `${dashboardTitle}: ${typeof attributes.title === 'string' && attributes.title ? attributes.title : panelIndex}`,
          source: {
            dashboard: { id: dashboardId, title: dashboardTitle },
            panelIndex,
            authored: authored.has(dashboardId),
          },
          panel: {
            type: 'lens',
            visualizationType: String(attributes.visualizationType),
          },
          input: {
            savedObject: {
              id: panelIndex,
              type: 'lens',
              references,
              attributes: {
                title: attributes.title ?? '',
                visualizationType: attributes.visualizationType,
                state: attributes.state,
              },
            },
            dataViews: await dataViewMetadata(references),
          },
          data: { layers: layerData(attributes, read) },
          context: {
            scheme,
            timeZone: 'UTC',
            dateFormat,
            locale: 'en',
            deviceScaleFactor: 1,
            platform,
            timeRange: TIME_RANGE,
          },
          provenance: {
            kibana: {
              version: metadata.version,
              build:
                `${metadata.buildNumber} ${metadata.buildSha ?? ''}`.trim(),
            },
            elasticCharts,
            browser: capturedWith,
            fonts: fonts.digests,
            capturedAt: new Date().toISOString(),
          },
          reference: { fingerprint, screenshot: 'reference.png' },
        });
        writeFileSync(
          join(directory, 'case.json'),
          `${JSON.stringify(comparison, null, 2)}\n`
        );
        written.push(comparison);
      }
    }
    await context.close();
  }
  await writeCaseIndex(NEXT, written, fonts.faces);
  expect(written.length).toBeGreaterThan(0);
  rmSync(CASES, { recursive: true, force: true });
  renameSync(NEXT, CASES);
});
