/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PrimitiveNode, z } from '@elastic/isomer-sdk/schema';

import { continuousScaleOf, coordinateOf, MAX_EPOCH } from '../coordinates';
import { isoDateTimeEpoch } from '../iso_date_time';

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
import { glyphSchema } from './icons';
import {
  checkColumnReferences,
  COLUMN_REF_RULE,
  type ColumnReference,
  columnRefSchema,
} from './references';

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

const XY_SERIES_KEY_RULE = `A series key, for \`colors.byKey\` and \`interactions.initial.hiddenSeries\`, is the y column id without \`splitBy\`; with \`splitBy\` it is the split cell, which for a \`date\` column is the first row's cell among those showing one instant, prefixed by the y column id and ":" when the layer has more than one y column or more than one data layer has \`splitBy\`. Series that share a key, such as two layers plotting one y column, share its \`colors.byKey\` entry and hidden state. The y column id and the split cell are each a key part. ${KEY_PART_RULE}`;

/** The cross-field rules `xyChartSchema` states in its description, one sentence each. */
export const XY_RULES = {
  yType: 'A `y` column is a `number` column.',
  sharedX:
    'Every data layer uses the same x column; absent means every row draws at one x position.',
  xCoordinate:
    'On a continuous x scale, stated or inferred from the x column type, each non-missing x cell is a finite number for `linear`, or epoch milliseconds or an ISO 8601 date-time with a UTC offset for `temporal`.',
  singleValued: 'The `x`, `y` and `splitBy` columns are not `multivalue`.',
  dateEncoding:
    'A `date` column holds one encoding: every non-missing value is epoch milliseconds, or every one is an ISO 8601 date-time.',
  rows: "A layer's `rows` is a `[start, end)` range within `data.rows`, with `start` at most `end`.",
  stack: 'Only `bar` and `area` layers stack.',
  dataLayer: 'At least one layer is a `data` layer.',
  rangeOrder: "An annotation range's `from` is not after its `to`.",
  time: 'A time written as a string is an ISO 8601 date-time with a UTC offset, such as `2026-11-03T00:30:00Z`, as a `date` cell is.',
  customDomain:
    'A `custom` axis domain has `min` below `max`, and on a `log` y axis `min` above zero.',
} as const;

const dateOrNumberSchema = z
  .union([
    z.number().min(-MAX_EPOCH).max(MAX_EPOCH),
    z.string().check(
      crossSuperRefine<string>(
        (value, context) => {
          if (
            typeof value === 'string' &&
            isoDateTimeEpoch(value) === undefined
          ) {
            context.addIssue({ code: 'custom', message: XY_RULES.time });
          }
        },
        [XY_RULES.time]
      )
    ),
  ])
  .describe(
    `Epoch milliseconds within the \`Date\` range, ±8.64e15, or an ISO 8601 date-time. ${XY_RULES.time}`
  );

const strokeDashSchema = z.enum(['solid', 'dashed', 'dotted']);

const dataLayerSchema = z
  .strictObject({
    kind: z.literal('data'),
    mark: z
      .enum(['line', 'area', 'bar'])
      .describe('How every series in the layer draws.'),
    stack: z
      .enum(['stacked', 'percentage'])
      .optional()
      .describe(`Absent means unstacked. ${XY_RULES.stack}`),
    x: columnRefSchema
      .optional()
      .describe(
        `The x column. Layers from different source tables share it: each table's x field maps to this one column. ${XY_RULES.sharedX} ${COLUMN_REF_RULE}`
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
  label: z
    .string()
    .optional()
    .describe(
      'Text drawn beside the line. Absent means none, or the formatted `value` when `showText` is true.'
    ),
  format: portableFormatSchema
    .optional()
    .describe(
      'How `value` prints when `showText` is true. Absent means the format of the line’s axis.'
    ),
  showText: z
    .boolean()
    .optional()
    .describe(
      'Prints the formatted `value` beside the line when there is no `label`. Absent means false.'
    ),
  color: colorValueSchema
    .optional()
    .describe('Absent means the chart’s text color.'),
  fill: z
    .enum(['above', 'below'])
    .optional()
    .describe(
      'Shades the plot from the line to the end of its axis: `above` toward larger values, `below` toward smaller. Absent means no shading.'
    ),
  icon: glyphSchema
    .optional()
    .describe('A glyph drawn with the line. Absent means none.'),
  strokeWidth: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .describe('In pixels. Absent means 1.'),
  strokeDash: strokeDashSchema.optional().describe('Absent means `solid`.'),
  textPosition: z
    .enum(['auto', 'left', 'right'])
    .optional()
    .describe(
      'Which side of the line its text sits on. Absent means `auto`, where the renderer chooses.'
    ),
});

const referenceLinesLayerSchema = z
  .strictObject({
    kind: z.literal('referenceLines'),
    lines: z.array(referenceLineSchema).min(1).describe('One line each.'),
  })
  .describe(
    'Lines at fixed values. They carry no rows and are never selected.'
  );

const annotationSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('point'),
    at: dateOrNumberSchema,
    label: z
      .string()
      .optional()
      .describe(
        'Names the event in its tooltip. Absent means the tooltip shows the time alone.'
      ),
    text: z.string().optional().describe('Text drawn beside the marker.'),
    color: colorValueSchema
      .optional()
      .describe('Absent means the chart’s subdued text color.'),
    icon: glyphSchema
      .optional()
      .describe(
        'A glyph for the marker. Absent means the renderer’s default marker.'
      ),
    line: z
      .strictObject({
        width: z.number().min(1).max(10),
        dash: strokeDashSchema,
      })
      .optional()
      .describe(
        'The line drawn at the event: `width` in pixels and its `dash`. Absent means the renderer’s default line.'
      ),
    hidden: z
      .boolean()
      .optional()
      .describe('True leaves the event out. Absent means false.'),
  }),
  z.strictObject({
    kind: z.literal('range'),
    from: dateOrNumberSchema,
    to: dateOrNumberSchema,
    label: z
      .string()
      .optional()
      .describe(
        'Names the range in its tooltip. Absent means the tooltip shows the times alone.'
      ),
    color: colorValueSchema
      .optional()
      .describe('Absent means the chart’s subdued text color.'),
    fill: z
      .enum(['inside', 'outside'])
      .optional()
      .describe(
        '`inside` shades between `from` and `to`; `outside` shades the rest of the plot. Absent means `inside`.'
      ),
    hidden: z
      .boolean()
      .optional()
      .describe('True leaves the range out. Absent means false.'),
  }),
]);

const annotationsLayerSchema = z
  .strictObject({
    kind: z.literal('annotations'),
    events: z
      .array(annotationSchema)
      .min(1)
      .describe('A `point` at one time or a `range` between two.'),
  })
  .describe(
    `Events on the x axis, resolved to fixed times. They carry no rows and are never selected. ${XY_RULES.rangeOrder}`
  );

const axisShape = {
  title: z.string().optional().describe('Absent means no title.'),
  ticks: z
    .boolean()
    .optional()
    .describe(
      'Shows the axis’s tick marks and tick labels. Absent means true.'
    ),
  grid: z
    .boolean()
    .optional()
    .describe('Shows a grid line at each tick. Absent means true.'),
  labelOrientation: z
    .enum(['horizontal', 'vertical', 'angled'])
    .optional()
    .describe(
      'How tick labels turn: `angled` is 45 degrees and `vertical` 90. Absent means `horizontal`. A time x axis on a vertical chart is always `horizontal`.'
    ),
};

const yAxisSchema = z.strictObject({
  ...axisShape,
  scale: z
    .enum(['linear', 'log', 'sqrt'])
    .optional()
    .describe('Absent means `linear`.'),
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
      z
        .strictObject({
          kind: z.literal('custom'),
          min: z.number(),
          max: z.number(),
        })
        .describe(`From \`min\` to \`max\`. ${XY_RULES.customDomain}`),
    ])
    .optional()
    .describe('The values the axis spans. Absent means `full`.'),
  rounding: z
    .boolean()
    .optional()
    .describe('Round the domain out to readable values. Absent means true.'),
});

const xAxisSchema = z.strictObject({
  ...axisShape,
  scale: z
    .enum(['ordinal', 'temporal', 'linear'])
    .optional()
    .describe(
      'Absent means the x column’s type decides: `temporal` for `date`, `linear` for `number`, else `ordinal`, one position per distinct value.'
    ),
  domain: z
    .discriminatedUnion('kind', [
      z
        .strictObject({ kind: z.literal('fit') })
        .describe('From the data alone.'),
      z
        .strictObject({
          kind: z.literal('custom'),
          min: z.number(),
          max: z.number(),
        })
        .describe(`From \`min\` to \`max\`. ${XY_RULES.customDomain}`),
    ])
    .optional()
    .describe(
      'The values a continuous axis spans. Absent means `fit`. Ignored on an `ordinal` axis.'
    ),
  rounding: yAxisSchema.shape.rounding,
  interval: z
    .number()
    .positive()
    .optional()
    .describe(
      'The bucket width in x units, such as milliseconds on a `temporal` axis, from the aggregation that built the x column. It decides which buckets cross `style.partialBuckets` and how wide an engine draws bars. Absent means the smallest spacing between x values. Ignored on an `ordinal` axis.'
    ),
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
    .optional()
    .describe(
      'Options for each axis. `y2` is the axis on the opposite side from `y`, drawn when a series or reference line uses it.'
    ),
  legend: z
    .strictObject({
      visibility: z
        .enum(['auto', 'visible', 'hidden'])
        .optional()
        .describe(
          '`auto` shows the legend when the chart has more than one series. Absent means `auto`.'
        ),
      position: z
        .enum(['top', 'bottom', 'left', 'right'])
        .optional()
        .describe(
          'The side of the chart the legend sits on. Absent means `right`.'
        ),
      inside: z
        .enum(['top_left', 'top_right', 'bottom_left', 'bottom_right'])
        .optional()
        .describe(
          'Draws the legend inside the plot at this corner, instead of at `position`. Absent means outside the plot.'
        ),
      layout: z
        .enum(['grid', 'list'])
        .optional()
        .describe(
          'How a legend at the `top` or `bottom` flows: `list` runs items along a line, `grid` sets them in columns. Absent means `list`.'
        ),
      columns: z
        .int()
        .min(1)
        .max(5)
        .optional()
        .describe(
          'Columns of items in a legend drawn `inside` the plot. Absent means 1.'
        ),
      maxLines: z
        .int()
        .min(1)
        .optional()
        .describe('Lines before a legend item truncates. Absent means 1.'),
      size: z
        .enum(['auto', 's', 'm', 'l', 'xl'])
        .optional()
        .describe(
          'The room the legend takes: `s` 80, `m` 130, `l` 180 and `xl` 230 pixels; `auto` fits its items. Absent means `auto`.'
        ),
      statistics: z
        .array(z.enum(XY_LEGEND_STATISTICS))
        .optional()
        .describe(
          'Values computed per series and shown beside it, in this order. Absent means none.'
        ),
      seriesHeader: z
        .string()
        .optional()
        .describe('A heading above the series names. Absent means none.'),
    })
    .optional()
    .describe('Where the legend sits and what it lists.'),
  style: z
    .strictObject({
      interpolation: z
        .enum(['linear', 'smooth', 'stepped'])
        .optional()
        .describe(
          'How lines and areas join their points: straight, curved or in steps. Absent means `linear`.'
        ),
      fitting: z
        .strictObject({
          kind: z
            .enum([
              'none',
              'zero',
              'linear',
              'carry',
              'lookahead',
              'average',
              'nearest',
            ])
            .describe(
              'What stands in for a missing value: `none` leaves a gap, `zero` is 0, `linear` a straight line between its neighbors, `carry` the value before it, `lookahead` the value after it, `average` its neighbors’ mean, and `nearest` the closer neighbor’s value.'
            ),
          emphasize: z
            .boolean()
            .optional()
            .describe(
              'Draws fitted stretches at full strength, as measured ones draw. Absent means false: the renderer draws fitted stretches apart from measured ones.'
            ),
          extend: z
            .enum(['none', 'zero', 'nearest'])
            .optional()
            .describe(
              'What a series draws before its first value and after its last: nothing, 0, or the nearest value. Absent means `none`.'
            ),
        })
        .optional()
        .describe(
          'How lines and areas cross missing values. Absent means gaps stay gaps.'
        ),
      points: z
        .enum(['auto', 'visible', 'hidden'])
        .optional()
        .describe(
          'Whether lines and areas mark each value with a point. `auto` shows points where they have room. Absent means `auto`.'
        ),
      areaOpacity: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe(
          'The opacity of area fills, from 0 (transparent) to 1 (opaque). Absent means 0.3.'
        ),
      areaFill: z
        .enum(['solid', 'gradient'])
        .optional()
        .describe(
          '`gradient` fades an area’s fill toward its baseline. Absent means `gradient`.'
        ),
      barMinimumHeight: z
        .number()
        .min(0)
        .optional()
        .describe(
          'The least length a bar with a value draws at, in pixels. Absent means 1.'
        ),
      barValueLabels: z
        .boolean()
        .optional()
        .describe('Prints each bar’s value on it. Absent means false.'),
      partialBuckets: z
        .strictObject({ from: dateOrNumberSchema, to: dateOrNumberSchema })
        .optional()
        .describe(
          'The queried time range. Buckets that cross either edge draw as partial.'
        ),
      currentTime: dateOrNumberSchema
        .optional()
        .describe(
          'Where to draw the current time marker. Absent means no marker.'
        ),
    })
    .optional()
    .describe('Options every series shares.'),
});

const toTime = (value: number | string): number =>
  typeof value === 'number' ? value : (isoDateTimeEpoch(value) ?? Number.NaN);

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

const checkCustomDomains = (axes: XyChartInput['axes'], context: Issues) => {
  for (const [id, axis] of Object.entries(axes ?? {})) {
    const domain = axis?.domain;
    const log = axis !== undefined && 'scale' in axis && axis.scale === 'log';
    if (
      domain?.kind === 'custom' &&
      (domain.min >= domain.max || (log && domain.min <= 0))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['axes', id, 'domain'],
        message: XY_RULES.customDomain,
      });
    }
  }
};

const dataLayerReferences = (
  layer: DataLayer,
  layerIndex: number
): ColumnReference[] => {
  const base = ['layers', layerIndex];
  return [
    ...(layer.x === undefined
      ? []
      : [{ path: [...base, 'x'], id: layer.x, single: true }]),
    ...(layer.splitBy === undefined
      ? []
      : [{ path: [...base, 'splitBy'], id: layer.splitBy, single: true }]),
    ...layer.y.map(({ column }, yIndex) => ({
      path: [...base, 'y', yIndex, 'column'],
      id: column,
      types: ['number'] as const,
      single: true,
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

const checkSharedX = (layers: readonly XyLayer[], context: Issues) => {
  const first = layers.find(
    (layer): layer is DataLayer => layer.kind === 'data'
  );
  layers.forEach((layer, index) => {
    if (layer.kind === 'data' && layer.x !== first?.x) {
      context.addIssue({
        code: 'custom',
        path: ['layers', index, 'x'],
        message: XY_RULES.sharedX,
      });
    }
  });
};

const checkXCoordinates = (node: XyChartInput, context: Issues) => {
  const dataLayers = node.layers.filter(
    (layer): layer is DataLayer => layer.kind === 'data'
  );
  const x = dataLayers[0]?.x;
  const column = node.data.columns.findIndex(({ id }) => id === x);
  const type = node.data.columns[column]?.type;
  if (type === undefined) {
    return;
  }
  const scale = node.axes?.x?.scale ?? continuousScaleOf(type);
  if (scale !== 'linear' && scale !== 'temporal') {
    return;
  }
  const drawn = (row: number) =>
    dataLayers.some(({ rows }) => {
      const [start, end] = rows ?? [0, node.data.rows.length];
      return row >= start && row < end;
    });
  node.data.rows.forEach((cells, row) => {
    const value = cells[column];
    if (
      drawn(row) &&
      value !== null &&
      value !== undefined &&
      !Array.isArray(value) &&
      coordinateOf(value, scale) === undefined
    ) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'rows', row, column],
        message: XY_RULES.xCoordinate,
      });
    }
  });
};

const checkDateEncodings = ({ data }: XyChartInput, context: Issues) => {
  data.columns.forEach(({ type }, column) => {
    if (type !== 'date') {
      return;
    }
    let encoding: string | undefined;
    data.rows.forEach((cells, row) => {
      for (const value of [cells[column]].flat()) {
        if (typeof value !== 'number' && typeof value !== 'string') {
          continue;
        }
        encoding ??= typeof value;
        if (typeof value !== encoding) {
          context.addIssue({
            code: 'custom',
            path: ['data', 'rows', row, column],
            message: XY_RULES.dateEncoding,
          });
          return;
        }
      }
    });
  });
};

/** An x/y chart: line, area and bar layers over typed data, with reference lines and annotations. */
export const xyChartSchema = xyChartObjectSchema.describe(XY_DESCRIPTION).check(
  crossSuperRefine<XyChartInput>(
    (node, context) => {
      checkSharedX(node.layers, context);
      checkCustomDomains(node.axes, context);
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
        single: XY_RULES.singleValued,
      });
      checkXCoordinates(node, context);
      checkDateEncodings(node, context);
      checkInteractions(node, context, { brushColumns });
    },
    [
      COLUMN_REF_RULE,
      XY_RULES.yType,
      XY_RULES.sharedX,
      XY_RULES.xCoordinate,
      XY_RULES.singleValued,
      XY_RULES.dateEncoding,
      XY_RULES.rows,
      XY_RULES.stack,
      XY_RULES.dataLayer,
      XY_RULES.rangeOrder,
      XY_RULES.customDomain,
      INTERACTION_RULES.brushColumn,
      INTERACTION_RULES.emphasisRows,
    ]
  )
);

/** A validated `xyChart` node. */
export type XyChartNode = z.infer<typeof xyChartSchema> & PrimitiveNode;
