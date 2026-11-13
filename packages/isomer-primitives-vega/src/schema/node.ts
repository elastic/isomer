/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The `vega` node's contract. It reaches no Vega: a client that cannot load
// Vega, such as a React Native app, validates nodes with it. The pack's
// primitive adds one check on top, that the spec compiles and parses.

import {
  type ChartData,
  chartDataSchema,
  columnRefSchema,
  lossSchema,
  provenanceSchema,
  selectSchema,
} from '@elastic/isomer-primitives-charts/schema';
import {
  navigationHref,
  type PrimitiveNode,
  requiredString,
  z,
} from '@elastic/isomer-sdk/schema';

import { isResultUrl, resultIssues } from './results';
import { isSpecObject, specIssues } from './spec';
import { TABLE_RULE, tableBindingIssue } from './table';

/**
 * Past this many characters of JSON, a spec is carrying a dataset, not a
 * chart: about 12,000 rows of two numbers. Rendering cost follows the marks
 * drawn, which {@link MAX_DRAWN_ITEMS} bounds; this bounds parsing and memory.
 */
export const MAX_SPEC_CHARS = 250_000;
/** A host's query results, pruned to what the drawing reads; more is a dataset, not a chart's. */
export const MAX_RESULTS_CHARS = 250_000;
/** Rows of `data`. */
export const MAX_DATA_ROWS = 10_000;
/**
 * SVG elements a chart may draw, axes and legends included: one per mark
 * item, and one per line, area or trail, which draw as one path. takumi
 * rasterizes each element, so this bounds an image's time: 5,000 symbols take
 * about 2 s to a 2× PNG. A chart past it draws its fallback note.
 */
export const MAX_DRAWN_ITEMS = 5_000;
export const MAX_RESULTS = 16;
/** At most a 4 by 4 grid, as Kibana's map mode loads for one panel. */
export const MAX_BASEMAP_TILES = 16;
export const MAX_TILE_SRC = 120_000;
/** Only an inline raster, so a tile can never fetch. */
export const TILE_SRC = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;
export const MAX_CHART_SIDE = 4096;
export const MIN_CHART_SIDE = 16;

/** The cross-field rules the node schema states, one sentence each. */
export const VEGA_RULES = {
  table: TABLE_RULE,
  needsData: '`interactions.select` and `interactions.brush` need `data`.',
  brushColumn: 'A `brush` column is a `date` or `number` column of `data`.',
  size: `A spec is at most ${MAX_SPEC_CHARS.toLocaleString('en')} characters of JSON.`,
  dataRows: `\`data\` has at most ${MAX_DATA_ROWS.toLocaleString('en')} rows.`,
  drawnItems: `A chart draws at most ${MAX_DRAWN_ITEMS.toLocaleString('en')} marks, axes and legends included, a line, area or trail counting once; past that it draws a note instead.`,
  resultsSize: `Results are at most ${MAX_RESULTS_CHARS.toLocaleString('en')} characters of JSON.`,
  resultUrl:
    'A data source keeps its `url` only where a `results` entry replaces it.',
  resultPath:
    'Each `results` path names a data entry of the spec: an entry of a Vega `data` array, or a Vega-Lite `data` object.',
} as const;

const NOT_JSON = 'cannot be written as JSON';
const UNREADABLE = 'threw while it was read';

/** Characters of JSON `value` takes, or `undefined` where it cannot be written as JSON, such as a cycle or a BigInt. */
const jsonLength = (value: unknown): number | undefined => {
  try {
    return JSON.stringify(value).length;
  } catch {
    return undefined;
  }
};

const side = (what: string) =>
  z
    .int()
    .min(MIN_CHART_SIDE)
    .max(MAX_CHART_SIDE)
    .optional()
    .describe(
      `The chart's ${what} in CSS pixels, axes and legends included. Absent: the box a container gives it, else 480 × 270.`
    );

const specSchema = z
  .record(z.string(), z.unknown())
  .superRefine((spec, ctx) => {
    const length = jsonLength(spec);
    if (length === undefined) {
      ctx.addIssue({ code: 'custom', message: NOT_JSON });
    } else if (length > MAX_SPEC_CHARS) {
      ctx.addIssue({ code: 'custom', message: VEGA_RULES.size });
    }
  })
  .describe(
    `The Vega or Vega-Lite spec. Data is inline, under \`values\` or Vega-Lite \`datasets\`, or a host result replaces a source's \`url\`; nothing loads by URL, marks cannot link, and Kibana map mode (\`config.kibana.type: "map"\`) is refused. ${VEGA_RULES.size} ${VEGA_RULES.drawnItems} ${VEGA_RULES.resultUrl}`
  );

const resultsSchema = z
  .array(
    z.strictObject({
      path: z
        .array(z.union([z.string().max(100), z.int().min(0)]))
        .min(1)
        .max(16)
        .describe(
          'Path from the spec root to a data entry, such as `["data", 0]`.'
        ),
      values: z
        .unknown()
        .describe(
          "What replaces the entry's `url`: the response as the query returned it, or pruned."
        ),
      scope: z
        .literal('static')
        .describe(
          'What the values serve: `static` holds what a static drawing reads.'
        ),
    })
  )
  .max(MAX_RESULTS)
  .superRefine((results, ctx) => {
    const length = jsonLength(results);
    if (length === undefined) {
      ctx.addIssue({ code: 'custom', message: NOT_JSON });
    } else if (length > MAX_RESULTS_CHARS) {
      ctx.addIssue({ code: 'custom', message: VEGA_RULES.resultsSize });
    }
  })
  .describe(
    `Host-stamped query results, each replacing the \`url\` of the data entry at its \`path\`, so the spec stays as authored. A chart with results draws statically. Models must not set this. ${VEGA_RULES.resultPath} ${VEGA_RULES.resultsSize}`
  );

const basemapSchema = z
  .strictObject({
    tiles: z
      .array(
        z.strictObject({
          src: z.string().max(MAX_TILE_SRC).regex(TILE_SRC),
          x: z.number(),
          y: z.number(),
          width: z.number().positive().max(MAX_CHART_SIDE),
          height: z.number().positive().max(MAX_CHART_SIDE),
        })
      )
      .max(MAX_BASEMAP_TILES)
      .describe(
        "Inline PNG, JPEG or WebP `data:` tiles in the chart's pixel frame."
      ),
    attribution: z.string().max(400).optional(),
  })
  .describe(
    'Host-stamped map tiles drawn beneath the chart, as Kibana map mode draws a Vega layer over its basemap. A chart with a basemap draws statically. Models must not set this.'
  );

const interactionsSchema = z
  .strictObject({
    select: selectSchema(['mark']),
    brush: z
      .strictObject({
        column: columnRefSchema,
        signal: requiredString().describe(
          'The Vega signal holding the brushed `[from, to]`, in the column’s units. Each new value raises a brush.'
        ),
      })
      .optional()
      .describe(
        `Raise a brush from a signal the spec updates. ${VEGA_RULES.brushColumn}`
      ),
    link: z
      .strictObject({ href: navigationHref(), label: requiredString() })
      .optional()
      .describe(
        'A static link, such as "Open in Kibana", drawn on every surface including images and text.'
      ),
  })
  .describe(
    `What the chart offers a reader. With no \`onEvent\` from the host, nothing is raised. ${VEGA_RULES.needsData}`
  );

const vegaObjectSchema = z.object({
  type: z.literal('vega'),
  mode: z
    .enum(['vega', 'vega-lite'])
    .describe('Which grammar `spec` is written in.'),
  spec: specSchema,
  title: z.string().optional(),
  description: requiredString().describe(
    'One sentence saying what the chart shows: the alt text, and the summary on text surfaces.'
  ),
  data: chartDataSchema
    .optional()
    .describe(
      `A typed table the chart draws, the table text surfaces show, and selections refer to. ${VEGA_RULES.table} ${VEGA_RULES.dataRows}`
    ),
  width: side('width'),
  height: side('height'),
  interactions: interactionsSchema.optional(),
  results: resultsSchema.optional(),
  basemap: basemapSchema.optional(),
  source: provenanceSchema.optional(),
  losses: z.array(lossSchema).optional(),
});

type VegaObject = z.infer<typeof vegaObjectSchema>;

const crossFieldIssues = (node: VegaObject, ctx: z.core.$RefinementCtx) => {
  if (!isSpecObject(node.spec)) {
    return;
  }
  for (const { path, message } of specIssues(node.spec)) {
    if (!isResultUrl(path, node.results)) {
      ctx.addIssue({ code: 'custom', path: ['spec', ...path], message });
    }
  }
  for (const { path } of resultIssues(node.spec, node.results ?? [])) {
    ctx.addIssue({
      code: 'custom',
      path: [...path],
      message: VEGA_RULES.resultPath,
    });
  }
  const { data, interactions } = node;
  if (data && data.rows.length > MAX_DATA_ROWS) {
    ctx.addIssue({
      code: 'custom',
      path: ['data', 'rows'],
      message: VEGA_RULES.dataRows,
    });
  }
  if (data) {
    const issue = tableBindingIssue(node.mode, node.spec);
    if (issue) {
      ctx.addIssue({ code: 'custom', ...issue });
    }
  } else {
    for (const key of ['select', 'brush'] as const) {
      if (interactions?.[key] !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['interactions', key],
          message: VEGA_RULES.needsData,
        });
      }
    }
  }
  const brush = interactions?.brush;
  if (data && brush) {
    const column = data.columns.find(({ id }) => id === brush.column);
    if (!column || (column.type !== 'date' && column.type !== 'number')) {
      ctx.addIssue({
        code: 'custom',
        path: ['interactions', 'brush', 'column'],
        message: VEGA_RULES.brushColumn,
      });
    }
  }
};

/**
 * The `vega` node: a Vega or Vega-Lite spec with its data inline. Checks the
 * spec's shape and every cross-field rule, but not that Vega can parse it; the
 * pack's primitive adds that.
 */
export const vegaSchema = vegaObjectSchema
  .check(
    z.superRefine<VegaObject>((node, ctx) => {
      try {
        crossFieldIssues(node, ctx);
      } catch {
        // Zod runs this only on well-formed input, so a throw comes from a getter or a proxy.
        ctx.addIssue({ code: 'custom', message: UNREADABLE });
      }
    })
  )
  .describe(
    'A chart drawn by the Vega runtime from a Vega or Vega-Lite spec with inline data, for a chart no simpler primitive can draw, such as a Kibana Vega panel.'
  );

/** A validated `vega` node. */
export type VegaNode = z.infer<typeof vegaSchema> & PrimitiveNode;

/** A node's `data`, when it has one. */
export type VegaData = ChartData;
