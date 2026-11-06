/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PrimitiveNode, z } from '@elastic/isomer-sdk';

import { colorValueSchema, KEY_PART_RULE } from './colors';
import { chartCoreShape } from './core';
import { crossSuperRefine } from './cross_field';
import {
  brushingInteractionsSchemaFor,
  checkInteractions,
  INTERACTION_RULES,
  interactionsCoreShape,
} from './events';
import { portableFormatSchema } from './format';
import {
  checkColumnReferences,
  COLUMN_REF_RULE,
  type ColumnReference,
  columnRefSchema,
} from './references';

// The marker icons Kibana's Lens API format accepts.
const XY_MARKER_ICONS = [
  'alert',
  'asterisk',
  'bell',
  'bolt',
  'bug',
  'circle',
  'editor_comment',
  'flag',
  'heart',
  'map_marker',
  'pin_filled',
  'star_empty',
  'star_filled',
  'tag',
  'triangle',
] as const;

// The per-series statistics the Lens API format's legend accepts.
const XY_LEGEND_STATISTICS = [
  'min',
  'max',
  'avg',
  'median',
  'range',
  'last_value',
  'last_non_null_value',
  'first_value',
  'first_non_null_value',
  'difference',
  'difference_percentage',
  'count',
  'total',
  'standard_deviation',
  'variance',
  'distinct_count',
  'current_and_last_value',
] as const;

const XY_SERIES_KEY_RULE = `A series key, for \`colors.byKey\` and \`interactions.initial.hiddenSeries\`, is the y column id without \`splitBy\`; with \`splitBy\` it is the split cell, prefixed by the y column id and ":" when the layer has more than one y column. The y column id and the split cell are each a key part. ${KEY_PART_RULE}`;

/** The cross-field rules `xyChartSchema` states in its description, one sentence each. */
export const XY_RULES = {
  yType: 'A `y` column is a `number` column.',
  rows: "A layer's `rows` is a `[start, end)` range within `data.rows`, with `start` at most `end`.",
  stack: 'Only `bar` and `area` layers stack.',
  dataLayer: 'At least one layer is a `data` layer.',
  rangeOrder: "An annotation range's `from` is not after its `to`.",
} as const;

const dateOrNumberSchema = z
  .union([z.number(), z.iso.datetime({ offset: true })])
  .describe('Epoch milliseconds or an ISO 8601 date-time.');

const strokeDashSchema = z.enum(['solid', 'dashed', 'dotted']);

const dataLayerSchema = z
  .strictObject({
    kind: z.literal('data'),
    mark: z.enum(['line', 'area', 'bar']),
    stack: z
      .enum(['stacked', 'percentage'])
      .optional()
      .describe(`Absent means unstacked. ${XY_RULES.stack}`),
    x: columnRefSchema
      .optional()
      .describe(
        `The x column. Absent draws every row at one x position. ${COLUMN_REF_RULE}`
      ),
    y: z
      .array(
        z.strictObject({
          column: columnRefSchema,
          axis: z
            .enum(['y', 'y2'])
            .optional()
            .describe('`y2` is the opposite side. Absent means `y`.'),
          color: colorValueSchema
            .optional()
            .describe('The series color when the layer has no `splitBy`.'),
        })
      )
      .min(1)
      .describe(XY_RULES.yType),
    splitBy: columnRefSchema
      .optional()
      .describe('One series per distinct value in this column.'),
    rows: z
      .tuple([z.int().min(0), z.int().min(0)])
      .optional()
      .describe(
        `The rows this layer reads, when layers come from different source tables appended in layer order. Absent means every row. ${XY_RULES.rows}`
      ),
  })
  .describe('Series drawn from columns of `data`.');

const referenceLineSchema = z.strictObject({
  value: z.number().describe('Where the line sits, in the axis domain.'),
  axis: z
    .enum(['x', 'y', 'y2'])
    .optional()
    .describe(
      'Absent means `y`. On a time x axis the value is epoch milliseconds.'
    ),
  label: z.string().optional(),
  format: portableFormatSchema.optional(),
  showText: z.boolean().optional(),
  color: colorValueSchema.optional(),
  fill: z.enum(['above', 'below']).optional(),
  icon: z.enum(XY_MARKER_ICONS).optional(),
  strokeWidth: z.number().min(1).max(10).optional(),
  strokeDash: strokeDashSchema.optional(),
  textPosition: z.enum(['auto', 'left', 'right']).optional(),
});

const referenceLinesLayerSchema = z
  .strictObject({
    kind: z.literal('referenceLines'),
    lines: z.array(referenceLineSchema).min(1),
  })
  .describe(
    'Lines at fixed values. They carry no rows and are never selected.'
  );

const annotationSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('point'),
    at: dateOrNumberSchema,
    label: z.string().optional(),
    text: z.string().optional().describe('Text drawn beside the marker.'),
    color: colorValueSchema.optional(),
    icon: z.enum(XY_MARKER_ICONS).optional(),
    line: z
      .strictObject({
        width: z.number().min(1).max(10),
        dash: strokeDashSchema,
      })
      .optional(),
    hidden: z.boolean().optional(),
  }),
  z.strictObject({
    kind: z.literal('range'),
    from: dateOrNumberSchema,
    to: dateOrNumberSchema,
    label: z.string().optional(),
    color: colorValueSchema.optional(),
    fill: z.enum(['inside', 'outside']).optional(),
    hidden: z.boolean().optional(),
  }),
]);

const annotationsLayerSchema = z
  .strictObject({
    kind: z.literal('annotations'),
    events: z.array(annotationSchema).min(1),
  })
  .describe(
    `Events on the x axis, resolved to fixed times. They carry no rows and are never selected. ${XY_RULES.rangeOrder}`
  );

const axisShape = {
  title: z.string().optional().describe('Absent means no title.'),
  ticks: z.boolean().optional(),
  grid: z.boolean().optional(),
  labelOrientation: z.enum(['horizontal', 'vertical', 'angled']).optional(),
};

const yAxisSchema = z.strictObject({
  ...axisShape,
  scale: z.enum(['linear', 'log', 'sqrt']).optional(),
  domain: z
    .discriminatedUnion('kind', [
      z
        .strictObject({ kind: z.literal('full') })
        .describe(
          'From the data, extended to include zero for bars and areas.'
        ),
      z
        .strictObject({ kind: z.literal('fit') })
        .describe('From the data alone.'),
      z.strictObject({
        kind: z.literal('custom'),
        min: z.number(),
        max: z.number(),
      }),
    ])
    .optional(),
  rounding: z
    .boolean()
    .optional()
    .describe('Round the domain out to readable values. Absent means true.'),
});

const xAxisSchema = z.strictObject({
  ...axisShape,
  scale: z.enum(['ordinal', 'temporal', 'linear']).optional(),
  domain: z
    .discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('fit') }),
      z.strictObject({
        kind: z.literal('custom'),
        min: z.number(),
        max: z.number(),
      }),
    ])
    .optional(),
  rounding: yAxisSchema.shape.rounding,
});

const XY_DESCRIPTION = [
  'Lines, areas and bars over a shared x axis, with reference lines and annotations.',
  XY_SERIES_KEY_RULE,
  ...Object.values(XY_RULES),
].join(' ');

const xyChartObjectSchema = z.object({
  type: z.literal('xyChart'),
  ...chartCoreShape,
  ...interactionsCoreShape,
  interactions: brushingInteractionsSchemaFor(
    ['datum', 'series', 'category', 'legend'],
    {
      hiddenSeries: z
        .array(z.string())
        .optional()
        .describe('Series keys hidden until the reader shows them.'),
    }
  ).optional(),
  orientation: z
    .enum(['vertical', 'horizontal'])
    .optional()
    .describe(
      '`horizontal` puts x on the vertical axis. Absent means `vertical`.'
    ),
  layers: z
    .array(
      z.discriminatedUnion('kind', [
        dataLayerSchema,
        referenceLinesLayerSchema,
        annotationsLayerSchema,
      ])
    )
    .min(1)
    .describe('Drawn in order, so later layers are on top.'),
  axes: z
    .strictObject({
      x: xAxisSchema.optional(),
      y: yAxisSchema.optional(),
      y2: yAxisSchema.optional(),
    })
    .optional(),
  legend: z
    .strictObject({
      visibility: z.enum(['auto', 'visible', 'hidden']).optional(),
      position: z.enum(['top', 'bottom', 'left', 'right']).optional(),
      inside: z
        .enum(['top_left', 'top_right', 'bottom_left', 'bottom_right'])
        .optional()
        .describe('Draws the legend inside the plot at this corner.'),
      layout: z.enum(['grid', 'list']).optional(),
      columns: z.int().min(1).max(5).optional(),
      maxLines: z
        .int()
        .min(1)
        .optional()
        .describe('Lines before a legend item truncates.'),
      size: z.enum(['auto', 's', 'm', 'l', 'xl']).optional(),
      statistics: z
        .array(z.enum(XY_LEGEND_STATISTICS))
        .optional()
        .describe('Values computed per series and shown beside it.'),
      seriesHeader: z.string().optional(),
    })
    .optional(),
  style: z
    .strictObject({
      interpolation: z.enum(['linear', 'smooth', 'stepped']).optional(),
      fitting: z
        .strictObject({
          kind: z.enum([
            'none',
            'zero',
            'linear',
            'carry',
            'lookahead',
            'average',
            'nearest',
          ]),
          emphasize: z.boolean().optional(),
          extend: z.enum(['none', 'zero', 'nearest']).optional(),
        })
        .optional()
        .describe('How lines and areas cross missing values.'),
      points: z.enum(['auto', 'visible', 'hidden']).optional(),
      areaOpacity: z.number().min(0).max(2).optional(),
      areaFill: z.enum(['solid', 'gradient']).optional(),
      barMinimumHeight: z.number().min(0).optional(),
      barValueLabels: z.boolean().optional(),
      partialBuckets: z
        .strictObject({ from: dateOrNumberSchema, to: dateOrNumberSchema })
        .optional()
        .describe(
          'The queried time range. Buckets that cross either edge draw as partial.'
        ),
      currentTime: dateOrNumberSchema
        .optional()
        .describe('Where to draw the current time marker.'),
    })
    .optional(),
});

const toTime = (value: number | string): number =>
  typeof value === 'number' ? value : Date.parse(value);

type XyChartInput = z.infer<typeof xyChartObjectSchema>;
type XyLayer = XyChartInput['layers'][number];
type DataLayer = Extract<XyLayer, { kind: 'data' }>;
type Issues = z.core.$RefinementCtx<XyChartInput>;

const checkAnnotationRanges = (
  layer: Extract<XyLayer, { kind: 'annotations' }>,
  layerIndex: number,
  context: Issues
) => {
  layer.events.forEach((event, eventIndex) => {
    if (event.kind === 'range' && toTime(event.from) > toTime(event.to)) {
      context.addIssue({
        code: 'custom',
        path: ['layers', layerIndex, 'events', eventIndex],
        message: XY_RULES.rangeOrder,
      });
    }
  });
};

const dataLayerReferences = (
  layer: DataLayer,
  layerIndex: number
): ColumnReference[] => {
  const base = ['layers', layerIndex];
  return [
    ...(layer.x === undefined ? [] : [{ path: [...base, 'x'], id: layer.x }]),
    ...(layer.splitBy === undefined
      ? []
      : [{ path: [...base, 'splitBy'], id: layer.splitBy }]),
    ...layer.y.map(({ column }, yIndex) => ({
      path: [...base, 'y', yIndex, 'column'],
      id: column,
      types: ['number'] as const,
    })),
  ];
};

const checkDataLayer = (
  layer: DataLayer,
  layerIndex: number,
  rowCount: number,
  context: Issues
) => {
  if (layer.stack && layer.mark === 'line') {
    context.addIssue({
      code: 'custom',
      path: ['layers', layerIndex, 'stack'],
      message: XY_RULES.stack,
    });
  }
  if (layer.rows) {
    const [start, end] = layer.rows;
    if (start > end || end > rowCount) {
      context.addIssue({
        code: 'custom',
        path: ['layers', layerIndex, 'rows'],
        message: `${XY_RULES.rows} \`data\` has ${rowCount} rows.`,
      });
    }
  }
};

/** An x/y chart: line, area and bar layers over typed data, with reference lines and annotations. */
export const xyChartSchema = xyChartObjectSchema.describe(XY_DESCRIPTION).check(
  crossSuperRefine<XyChartInput>(
    (node, context) => {
      const references: ColumnReference[] = [];
      const brushColumns: string[] = [];
      let dataLayers = 0;
      node.layers.forEach((layer, index) => {
        if (layer.kind === 'annotations') {
          checkAnnotationRanges(layer, index, context);
        } else if (layer.kind === 'data') {
          dataLayers += 1;
          if (layer.x !== undefined) {
            brushColumns.push(layer.x);
          }
          references.push(...dataLayerReferences(layer, index));
          checkDataLayer(layer, index, node.data.rows.length, context);
        }
      });
      if (dataLayers === 0) {
        context.addIssue({
          code: 'custom',
          path: ['layers'],
          message: XY_RULES.dataLayer,
        });
      }
      checkColumnReferences(node.data, references, context, {
        missing: COLUMN_REF_RULE,
        type: XY_RULES.yType,
      });
      checkInteractions(node, context, { brushColumns });
    },
    [
      COLUMN_REF_RULE,
      XY_RULES.yType,
      XY_RULES.rows,
      XY_RULES.stack,
      XY_RULES.dataLayer,
      XY_RULES.rangeOrder,
      INTERACTION_RULES.brushColumn,
      INTERACTION_RULES.emphasisRows,
    ]
  )
);

/** A validated `xyChart` node. */
export type XyChartNode = z.infer<typeof xyChartSchema> & PrimitiveNode;
