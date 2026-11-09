/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// What a chart offers (`interactions`) and what it raises (`ChartEvent`).
// Isomer owns gestures and local inspection; the host owns what an event
// means. Events refer to rows and columns of the node's own `data`, never to
// pixels or an engine's indexes, so every renderer raises the same event.

import {
  type ActionEventRef,
  requiredString,
  z,
} from '@elastic/isomer-sdk/schema';

import { cellSchema, type ChartColumn } from './data';
import { navigationHrefSchema } from './links';
import {
  checkColumnReferences,
  COLUMN_REF_RULE,
  type ColumnReference,
  columnRefSchema,
} from './references';

/** Every part of a chart a reader can select. */
export const SELECT_TARGETS = [
  'datum',
  'series',
  'category',
  'legend',
  'cell',
  'tile',
  'slice',
  'tag',
] as const;

/** What a selection lands on. Each chart states which it offers. */
export type SelectTarget = (typeof SELECT_TARGETS)[number];

/** The cross-field rules the interaction schemas state in their descriptions, one sentence each. */
export const INTERACTION_RULES = {
  brushColumn:
    'A `brush` column is a `date` or `number` column used as `x` by at least one `data` layer.',
  emphasisRows: 'Emphasis rows are indexes into `data.rows`.',
} as const;

/** A static link a chart draws on every surface. */
export const linkSchema = z
  .strictObject({ href: navigationHrefSchema, label: requiredString() })
  .describe(
    'A static link, such as "Open in Kibana", drawn on every surface including images and text.'
  );

const syncSchema = z
  .strictObject({
    cursor: z.boolean().optional(),
    tooltips: z.boolean().optional(),
  })
  .describe(
    'Share the cursor and tooltips with other charts in the composition. Takes effect where a container enables it.'
  );

const INTERACTIONS_DESCRIPTION =
  'What the chart offers a reader. With no `onEvent` from the host, nothing is offered and nothing is raised.';

/** `interactions.select` for a chart offering `targets`. */
export const selectSchema = <
  const TTargets extends readonly [SelectTarget, ...SelectTarget[]],
>(
  targets: TTargets
) =>
  z
    .array(z.enum(targets))
    .optional()
    .describe('What a reader may select. Absent means nothing.');

/** A brush along one continuous x column. */
export const brushSchema = z
  .strictObject({ column: columnRefSchema })
  .describe(
    `Select a range along a continuous x column, typically time. ${INTERACTION_RULES.brushColumn}`
  );

/** The `interactions` schema for a chart with no brush and no persisted view state. */
export const interactionsSchemaFor = <
  const TTargets extends readonly [SelectTarget, ...SelectTarget[]],
>(
  targets: TTargets
) =>
  z
    .strictObject({
      select: selectSchema(targets),
      sync: syncSchema.optional(),
      link: linkSchema.optional(),
    })
    .describe(INTERACTIONS_DESCRIPTION);

/** The `interactions` schema for a chart that brushes along `brush`, with no persisted view state. */
export const brushInteractionsSchemaFor = <
  const TTargets extends readonly [SelectTarget, ...SelectTarget[]],
  TBrush extends z.ZodType,
>(
  targets: TTargets,
  brush: TBrush
) =>
  z
    .strictObject({
      select: selectSchema(targets),
      brush: brush.optional(),
      sync: syncSchema.optional(),
      link: linkSchema.optional(),
    })
    .describe(INTERACTIONS_DESCRIPTION);

/** The `interactions` schema for a chart that brushes and persists view state. */
export const brushingInteractionsSchemaFor = <
  const TTargets extends readonly [SelectTarget, ...SelectTarget[]],
  TInitial extends z.ZodRawShape,
>(
  targets: TTargets,
  initial: TInitial
) =>
  z
    .strictObject({
      select: selectSchema(targets),
      brush: brushSchema.optional(),
      sync: syncSchema.optional(),
      link: linkSchema.optional(),
      initial: z
        .strictObject(initial)
        .optional()
        .describe('The starting view state, where the source persists one.'),
    })
    .describe(INTERACTIONS_DESCRIPTION);

/** Rows drawn with emphasis, each with an optional note. */
export const emphasisSchema = z
  .array(
    z.strictObject({
      rows: z.array(z.int().min(0)).min(1),
      note: z.string().optional(),
    })
  )
  .describe(
    `Rows to highlight statically, such as what an agent is talking about. Drawn on every surface. ${INTERACTION_RULES.emphasisRows}`
  );

/** A chart's parsed `emphasis`. */
export type Emphasis = z.infer<typeof emphasisSchema>;

/** The interaction fields every chart spreads into its schema beside the core. */
export const interactionsCoreShape = {
  emphasis: emphasisSchema.optional(),
};

interface InteractionsInput {
  data: { columns: readonly ChartColumn[]; rows: readonly unknown[] };
  emphasis?: Emphasis | undefined;
  interactions?: object | undefined;
}

interface InteractionCheckOptions {
  brushColumns?: readonly string[];
  /** Reported for a brush on any other column, in place of `INTERACTION_RULES.brushColumn`. */
  brushRule?: string;
  /** The types a brush column takes. Absent means `date` and `number`. */
  brushTypes?: readonly ('date' | 'number')[];
}

/** Checks emphasis rows and an `xyChart` brush against `data` and its x columns. */
export const checkInteractions = (
  node: InteractionsInput,
  context: z.core.$RefinementCtx<unknown>,
  options: InteractionCheckOptions = {}
): void => {
  const references: ColumnReference[] = [];
  const brush =
    node.interactions && 'brush' in node.interactions
      ? (node.interactions.brush as { column: string } | undefined)
      : undefined;
  if (brush) {
    references.push({
      path: ['interactions', 'brush', 'column'],
      id: brush.column,
      types: options.brushTypes ?? ['date', 'number'],
    });
    if (options.brushColumns && !options.brushColumns.includes(brush.column)) {
      context.addIssue({
        code: 'custom',
        path: ['interactions', 'brush', 'column'],
        message: options.brushRule ?? INTERACTION_RULES.brushColumn,
      });
    }
  }
  checkColumnReferences(node.data, references, context, {
    missing: COLUMN_REF_RULE,
    type: options.brushRule ?? INTERACTION_RULES.brushColumn,
  });
  (node.emphasis ?? []).forEach(({ rows }, index) => {
    rows.forEach((row, rowIndex) => {
      if (row >= node.data.rows.length) {
        context.addIssue({
          code: 'custom',
          path: ['emphasis', index, 'rows', rowIndex],
          message: `${INTERACTION_RULES.emphasisRows} \`data\` has ${node.data.rows.length} rows.`,
        });
      }
    });
  });
};

/** `ActionEventRef.name` for each kind of chart event. */
export const CHART_EVENT_NAMES = {
  select: 'chart.select',
  brush: 'chart.brush',
} as const;

const eventShared = {
  node: requiredString().describe('The `id` of the node that raised it.'),
  description: z
    .string()
    .describe(
      'What the event refers to, in words from the Scene, such as "host.name: web-01 · Count: 1,234".'
    ),
  values: z
    .record(z.string(), cellSchema)
    .describe('The raw value of each referenced column, by column id.'),
};

const selectEventShape = {
  kind: z.literal('select'),
  rows: z
    .array(z.int().min(0))
    .min(1)
    .describe('Indexes into the node’s `data.rows`.'),
  columns: z
    .array(z.string().min(1))
    .describe(
      'The dimension columns that identify the target. Every row in `rows` holds the same value in each.'
    ),
  negate: z
    .boolean()
    .optional()
    .describe('A "filter out" gesture rather than "filter for".'),
  ...eventShared,
};

const selectEventSchema = z.discriminatedUnion('target', [
  z.strictObject({
    ...selectEventShape,
    target: z.enum(['datum', 'series', 'legend']),
    seriesKey: z
      .string()
      .describe(
        'The xyChart series key; it may be empty for an empty split value.'
      ),
    series: z.strictObject({
      layer: z
        .int()
        .min(0)
        .describe('The index of the data layer in `layers`.'),
      y: z.int().min(0).describe('The index of the y entry in that layer.'),
    }),
  }),
  z.strictObject({
    ...selectEventShape,
    target: z.enum(['category', 'cell', 'tile', 'slice', 'tag']),
  }),
]);

/** An event a chart raises: a selection or a brush. */
export const chartEventSchema = z
  .discriminatedUnion('kind', [
    selectEventSchema,
    z.strictObject({
      kind: z.literal('brush'),
      column: z.string().min(1),
      range: z
        .tuple([z.number(), z.number()])
        .describe(
          '`[from, to]` in the column’s units: epoch milliseconds for a date.'
        ),
      ...eventShared,
    }),
  ])
  .describe(
    'A gesture on a chart, as rows and columns of the node’s own `data`. Every renderer raises the same event for the same gesture.'
  );

/** A `select` or `brush` gesture on a chart, in terms of the node's `data`. */
export type ChartEvent = z.infer<typeof chartEventSchema>;

/** The `select` member of {@link ChartEvent}. */
export type ChartSelectEvent = Extract<ChartEvent, { kind: 'select' }>;

/** The `brush` member of {@link ChartEvent}. */
export type ChartBrushEvent = Extract<ChartEvent, { kind: 'brush' }>;

/** Wraps a chart event as the `ActionEventRef` a host's `onEvent` receives. */
export const toActionEvent = (event: ChartEvent): ActionEventRef => ({
  name: CHART_EVENT_NAMES[event.kind],
  context: { ...event },
});

/** The chart event an `ActionEventRef` carries, or `undefined` when it carries none. */
export const readChartEvent = (ref: ActionEventRef): ChartEvent | undefined => {
  const expected = Object.values(CHART_EVENT_NAMES) as string[];
  if (!expected.includes(ref.name)) {
    return undefined;
  }
  const parsed = chartEventSchema.safeParse(ref.context);
  return parsed.success && CHART_EVENT_NAMES[parsed.data.kind] === ref.name
    ? parsed.data
    : undefined;
};
