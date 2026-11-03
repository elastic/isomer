/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricNode } from '@elastic/isomer-primitives-charts/model';

import { bind } from '../src/charts/index';
import { plan, readResponse, readTable } from '../src/index';
import type { LensDiagnostic, LensPlan, LensTable } from '../src/schema';

import type { ComparisonCase } from './case';

export type Replay =
  | {
      status: 'refused';
      stage: 'plan' | 'data' | 'bind';
      diagnostics: LensDiagnostic[];
      planned?: LensPlan;
    }
  | {
      status: 'bound';
      planned: LensPlan;
      tables: LensTable[];
      node: MetricNode;
    };

/** Plans a case's saved state, reads its captured data back, and binds it, as a host would. */
export const replay = ({ input, data, context }: ComparisonCase): Replay => {
  const planned = plan(input);
  if (planned.status !== 'planned') {
    return {
      status: 'refused',
      stage: 'plan',
      diagnostics: [...planned.diagnostics],
    };
  }
  const tables: LensTable[] = [];
  const diagnostics: LensDiagnostic[] = [];
  for (const layer of planned.plan.layers) {
    const captured = data.layers[layer.layerId];
    if (!captured) {
      diagnostics.push({
        code: 'comparison.missing-layer-data',
        message: `The case has no captured data for layer "${layer.layerId}".`,
        path: ['data', 'layers', layer.layerId],
      });
      continue;
    }
    const read =
      layer.kind === 'esql' && captured.kind === 'esql'
        ? readResponse(layer, captured.response)
        : layer.kind === 'form' && captured.kind === 'form'
          ? readTable(layer, captured.datatable)
          : undefined;
    if (!read) {
      diagnostics.push({
        code: 'comparison.layer-kind-mismatch',
        message: `Layer "${layer.layerId}" is planned as ${layer.kind} but captured as ${captured.kind}.`,
        path: ['data', 'layers', layer.layerId],
      });
    } else if (read.status === 'ready') {
      tables.push(read.table);
    } else {
      diagnostics.push(...read.diagnostics);
    }
  }
  if (diagnostics.length) {
    return {
      status: 'refused',
      stage: 'data',
      diagnostics,
      planned: planned.plan,
    };
  }
  const bound = bind(planned.plan, tables, {
    filterAction: 'lens/filter',
    dates: { format: context.dateFormat, timeZone: context.timeZone },
  });
  if (bound.status !== 'bound') {
    return {
      status: 'refused',
      stage: 'bind',
      diagnostics: [...bound.diagnostics],
      planned: planned.plan,
    };
  }
  return { status: 'bound', planned: planned.plan, tables, node: bound.node };
};
