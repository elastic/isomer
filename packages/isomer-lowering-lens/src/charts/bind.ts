/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type MetricNode,
  metricSchema,
} from '@elastic/isomer-primitives-charts/model';
import { z } from 'zod';

import { copyJson, type JsonValue } from '../json';
import {
  anyLayerPlanSchema,
  columnSchema,
  issueDiagnostics,
  type LensDiagnostic,
  type LensTable,
  savedObjectSchema,
} from '../schema';

import { bindMetric } from './metric/bind';
import { metricStateSchema, normalizeMetricState } from './metric/state';

export interface BindOptions {
  /** Gives each breakdown tile an action with this name and its field = value filter. */
  readonly filterAction?: string;
}

export type LensBindResult =
  | { readonly status: 'bound'; readonly node: MetricNode }
  | {
      readonly status: 'invalid' | 'unsupported';
      readonly diagnostics: readonly LensDiagnostic[];
    };

const id = z.string().min(1).max(4096);

const planSchema = z
  .object({
    version: z.literal(1),
    source: savedObjectSchema,
    dataViews: z.array(z.unknown()),
    filters: z.array(
      z.record(
        z.string(),
        z.custom<JsonValue>(() => true)
      )
    ),
    query: z
      .record(
        z.string(),
        z.custom<JsonValue>(() => true)
      )
      .optional(),
    layers: z.array(anyLayerPlanSchema).min(1),
  })
  .strict();

const tableSchema = z
  .object({
    layerId: id,
    columns: z
      .array(z.object({ lens: columnSchema, type: id }).strict())
      .min(1)
      .max(512),
    rows: z.array(z.array(z.custom<JsonValue>(() => true))),
  })
  .strict()
  .check((ctx) => {
    const width = ctx.value.columns.length;
    ctx.value.rows.forEach((row, index) => {
      if (row.length !== width) {
        ctx.issues.push({
          code: 'custom',
          message: `Row has ${row.length} cells for ${width} columns.`,
          path: ['rows', index],
          input: row,
        });
      }
    });
  });

const invalid = (
  code: string,
  message: string,
  path: readonly (string | number)[]
): LensBindResult => ({
  status: 'invalid',
  diagnostics: [{ code, message, path }],
});

const VISUALIZATION = [
  'plan',
  'source',
  'attributes',
  'state',
  'visualization',
];

/**
 * Binds a planned Lens visualization and its validated response tables to an
 * Isomer chart node. Every planned layer the chart reads needs its table.
 */
export const bind = (
  plan: unknown,
  tables: unknown,
  { filterAction }: BindOptions = {}
): LensBindResult => {
  const copiedPlan = copyJson(plan);
  if (!copiedPlan.ok) {
    return invalid('lens.bind.invalid-json', copiedPlan.message, ['plan']);
  }
  const copiedTables = copyJson(tables);
  if (!copiedTables.ok) {
    return invalid('lens.bind.invalid-json', copiedTables.message, ['tables']);
  }
  const parsedPlan = planSchema.safeParse(copiedPlan.value);
  if (!parsedPlan.success) {
    return {
      status: 'invalid',
      diagnostics: issueDiagnostics(
        'lens.bind.invalid-plan',
        parsedPlan.error,
        ['plan']
      ),
    };
  }
  const parsedTables = z.array(tableSchema).safeParse(copiedTables.value);
  if (!parsedTables.success) {
    return {
      status: 'invalid',
      diagnostics: issueDiagnostics(
        'lens.bind.invalid-tables',
        parsedTables.error,
        ['tables']
      ),
    };
  }
  const { source, layers } = parsedPlan.data;
  const read: LensTable[] = parsedTables.data;
  const planned = new Set(layers.map(({ layerId }) => layerId));
  const seen = new Set<string>();
  for (const [index, { layerId }] of read.entries()) {
    if (!planned.has(layerId) || seen.has(layerId)) {
      return invalid(
        'lens.bind.unexpected-table',
        planned.has(layerId)
          ? `Layer "${layerId}" has more than one table.`
          : `Layer "${layerId}" is not in the plan.`,
        ['tables', index, 'layerId']
      );
    }
    seen.add(layerId);
  }

  const { visualizationType, state } = source.attributes;
  if (visualizationType !== 'lnsMetric') {
    return {
      status: 'unsupported',
      diagnostics: [
        {
          code: 'lens.bind.unsupported-visualization',
          message: `The "${visualizationType}" visualization is not bound to a chart yet.`,
          path: ['plan', 'source', 'attributes', 'visualizationType'],
        },
      ],
    };
  }
  const parsedState = metricStateSchema.safeParse(state.visualization);
  if (!parsedState.success) {
    const unknown = parsedState.error.issues.every(
      ({ code }) => code === 'unrecognized_keys'
    );
    return {
      status: unknown ? 'unsupported' : 'invalid',
      diagnostics: issueDiagnostics(
        unknown ? 'lens.metric.unsupported-state' : 'lens.metric.invalid-state',
        parsedState.error,
        VISUALIZATION
      ),
    };
  }
  const bound = bindMetric({
    state: normalizeMetricState(parsedState.data),
    tables: read,
    layers,
    filterAction,
  });
  if (!bound.ok) {
    return { status: bound.status, diagnostics: bound.diagnostics };
  }
  const checked = metricSchema.safeParse(bound.node);
  if (!checked.success) {
    return {
      status: 'unsupported',
      diagnostics: issueDiagnostics(
        'lens.metric.unrepresentable',
        checked.error,
        ['node']
      ),
    };
  }
  return { status: 'bound', node: checked.data };
};
