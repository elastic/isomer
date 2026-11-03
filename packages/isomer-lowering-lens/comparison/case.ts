/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import type { JsonObject } from '../src/json';
import { json } from '../src/schema';

import type { Fingerprint } from './fingerprint';

const jsonObject = z.record(z.string(), json);
const id = z.string().min(1).max(512);

export const PLATFORMS = ['linux', 'mac', 'windows'] as const;

export type Platform = (typeof PLATFORMS)[number];

/** The platform `navigator.platform` names, which a spoofed user agent leaves alone. */
export const platformOf = (platform: string): Platform =>
  /^Mac/.test(platform) ? 'mac' : /^Win/.test(platform) ? 'windows' : 'linux';

const contextSchema = z
  .object({
    scheme: z.enum(['light', 'dark']),
    timeZone: id,
    dateFormat: id,
    locale: id,
    deviceScaleFactor: z.number().positive(),
    /** The browser's platform; text rasterizes to different widths on each. */
    platform: z.enum(PLATFORMS),
    timeRange: z.object({ from: id, to: id }).strict(),
  })
  .strict();

const layerDataSchema = z.discriminatedUnion('kind', [
  /** The Elasticsearch response, as `readResponse` reads it. */
  z
    .object({
      kind: z.literal('esql'),
      query: z.string(),
      response: jsonObject,
    })
    .strict(),
  /** The Datatable Lens logged for the layer, as `readTable` reads it. */
  z.object({ kind: z.literal('form'), datatable: jsonObject }).strict(),
]);

export const caseSchema = z
  .object({
    version: z.literal(1),
    id,
    title: z.string().max(4096),
    source: z
      .object({
        dashboard: z.object({ id, title: z.string().max(4096) }).strict(),
        panelIndex: id,
        /** Authored for comparison rather than shipped with Kibana's sample data. */
        authored: z.boolean(),
      })
      .strict(),
    panel: z
      .object({ type: z.literal('lens'), visualizationType: id })
      .strict(),
    /** What the panel's lowering reads; for Lens, `plan`'s `{ savedObject, dataViews }`. */
    input: jsonObject,
    data: z.object({ layers: z.record(id, layerDataSchema) }).strict(),
    context: contextSchema,
    provenance: z
      .object({
        kibana: z.object({ version: id, build: id }).strict(),
        elasticCharts: id,
        /** The Playwright release and its Chromium build the capture drew Kibana in. */
        browser: z.object({ playwright: id, chromium: id }).strict(),
        /** SHA-256 of each font file Kibana drew with, in `__fixtures__/fonts/`. */
        fonts: z.record(id, id),
      })
      .strict(),
    reference: z
      .object({
        fingerprint: z.custom<Fingerprint>(
          (value) =>
            typeof value === 'object' && value !== null && 'kind' in value
        ),
        /** The panel's drawing as Kibana showed it, beside `case.json`. */
        screenshot: id,
      })
      .strict(),
  })
  .strict();

export type ComparisonCase = z.infer<typeof caseSchema> & { input: JsonObject };
export type CaseContext = ComparisonCase['context'];
export type LayerData = z.infer<typeof layerDataSchema>;

/** One case in four, chosen by panel identity, so no one picks which cases are held out. */
export const isHoldout = ({
  source: { dashboard, panelIndex },
}: Pick<ComparisonCase, 'source'>) => {
  let hash = 0x811c9dc5;
  for (const char of `${dashboard.id}/${panelIndex}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  }
  return hash % 4 === 0;
};
