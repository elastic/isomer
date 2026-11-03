/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DataViewMetadata,
  FormLayerPlan,
  HostNeed,
  LensDiagnostic,
  LensPlanResult,
  LensSavedObject,
} from '../schema';
import { issueDiagnostics } from '../schema';

import { checkMath, mathNodeSchema } from './math';
import {
  FORM_OPERATIONS,
  type FormColumn,
  formColumnSchema,
  formDatasourceSchema,
} from './schema';

const DATASOURCE = [
  'savedObject',
  'attributes',
  'state',
  'datasourceStates',
  'formBased',
];

const referencesOf = (column: FormColumn): readonly string[] =>
  'references' in column ? column.references : [];

const refuse = (
  status: 'invalid' | 'unsupported',
  code: string,
  message: string,
  path: readonly (string | number)[]
): { ok: false; result: LensPlanResult } => ({
  ok: false,
  result: { status, diagnostics: [{ code, message, path }] },
});

/** Lens names a form-based layer's data view reference after its layer. */
const referenceName = (layerId: string) =>
  `indexpattern-datasource-layer-${layerId}`;

const needsOf = (columns: readonly FormColumn[]): HostNeed[] => {
  const needs = new Set<HostNeed>();
  for (const column of columns) {
    if (
      column.timeShift !== undefined ||
      column.reducedTimeRange !== undefined ||
      column.timeScale !== undefined ||
      column.operationType === 'time_range' ||
      column.operationType === 'normalize_by_unit'
    ) {
      needs.add('timeRange');
    }
    if (column.operationType === 'now') {
      needs.add('now');
    }
    if (
      column.operationType === 'interval' ||
      (column.operationType === 'date_histogram' &&
        column.params.interval === 'auto')
    ) {
      needs.add('timeRange');
      needs.add('barTarget');
    }
  }
  return [...needs];
};

/** Rejects a reference cycle, returning the path of the column that closes it. */
const findCycle = (
  columns: ReadonlyMap<string, FormColumn>
): string | undefined => {
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (columnId: string): string | undefined => {
    const mark = state.get(columnId);
    if (mark === 'visiting') {
      return columnId;
    }
    if (mark === 'done') {
      return undefined;
    }
    state.set(columnId, 'visiting');
    const column = columns.get(columnId);
    const references = column ? referencesOf(column) : [];
    for (const reference of references) {
      const cycle = visit(reference);
      if (cycle) {
        return cycle;
      }
    }
    state.set(columnId, 'done');
    return undefined;
  };
  for (const columnId of columns.keys()) {
    const cycle = visit(columnId);
    if (cycle) {
      return cycle;
    }
  }
  return undefined;
};

const planLayer = (
  layerId: string,
  layer: {
    columnOrder: string[];
    columns: Record<string, Record<string, unknown>>;
    incompleteColumns?: Record<string, unknown> | undefined;
    linkToLayers?: string[] | undefined;
    sampling?: number | undefined;
    ignoreGlobalFilters?: boolean | undefined;
  },
  savedObject: LensSavedObject,
  dataViews: readonly DataViewMetadata[],
  layerIds: readonly string[]
):
  | { ok: true; layer: FormLayerPlan }
  | { ok: false; result: LensPlanResult } => {
  const path = [...DATASOURCE, 'layers', layerId];
  const reference = savedObject.references.find(
    ({ name, type }) =>
      name === referenceName(layerId) && type === 'index-pattern'
  );
  if (!reference) {
    return refuse(
      'invalid',
      'lens.form.missing-data-view',
      `Layer "${layerId}" has no "${referenceName(layerId)}" data view reference.`,
      ['savedObject', 'references']
    );
  }
  if (
    Object.values(layer.incompleteColumns ?? {}).some((value) => value != null)
  ) {
    return refuse(
      'unsupported',
      'lens.form.incomplete-column',
      'The layer has a column Lens saved incomplete.',
      [...path, 'incompleteColumns']
    );
  }
  // Lens links a metric's trendline layer to its main layer so the editor
  // removes and re-points them together; each layer still runs on its own.
  const unknownLink = layer.linkToLayers?.find(
    (linked) => !layerIds.includes(linked)
  );
  if (unknownLink !== undefined) {
    return refuse(
      'invalid',
      'lens.form.unknown-linked-layer',
      `The layer links to "${unknownLink}", which the datasource lacks.`,
      [...path, 'linkToLayers']
    );
  }
  const ids = Object.keys(layer.columns);
  const ordered = new Set(layer.columnOrder);
  if (
    ordered.size !== layer.columnOrder.length ||
    ids.length !== ordered.size ||
    ids.some((columnId) => !ordered.has(columnId))
  ) {
    return refuse(
      'invalid',
      'lens.form.column-order',
      'The layer’s `columnOrder` must list each column exactly once.',
      [...path, 'columnOrder']
    );
  }
  const columns = new Map<string, FormColumn>();
  const diagnostics: LensDiagnostic[] = [];
  for (const columnId of layer.columnOrder) {
    const saved = layer.columns[columnId];
    if (!FORM_OPERATIONS.has(String(saved?.operationType))) {
      diagnostics.push({
        code: 'lens.form.unsupported-operation',
        message: `Operation "${String(saved?.operationType)}" is not planned.`,
        path: [...path, 'columns', columnId, 'operationType'],
      });
      continue;
    }
    const parsed = formColumnSchema.safeParse(saved);
    if (!parsed.success) {
      diagnostics.push(
        ...issueDiagnostics('lens.form.invalid-column', parsed.error, [
          ...path,
          'columns',
          columnId,
        ])
      );
      continue;
    }
    columns.set(columnId, parsed.data);
  }
  if (diagnostics.length) {
    return {
      ok: false,
      result: {
        status: diagnostics.some(
          ({ code }) => code === 'lens.form.invalid-column'
        )
          ? 'invalid'
          : 'unsupported',
        diagnostics,
      },
    };
  }
  for (const [columnId, column] of columns) {
    const columnPath = [...path, 'columns', columnId];
    const references = referencesOf(column);
    const missing = references.find((ref) => !columns.has(ref));
    if (missing) {
      return refuse(
        'invalid',
        'lens.form.missing-reference',
        `Column "${columnId}" references "${missing}", which the layer lacks.`,
        [...columnPath, 'references']
      );
    }
    if (column.operationType === 'formula') {
      if (column.params.isFormulaBroken) {
        return refuse(
          'invalid',
          'lens.form.broken-formula',
          `Formula "${column.params.formula ?? ''}" is saved broken.`,
          [...columnPath, 'params', 'isFormulaBroken']
        );
      }
      const [math] = references;
      if (
        references.length !== 1 ||
        columns.get(math ?? '')?.operationType !== 'math'
      ) {
        return refuse(
          'invalid',
          'lens.form.formula-without-math',
          'A formula column must reference exactly one math column.',
          [...columnPath, 'references']
        );
      }
    }
    if (column.operationType === 'math') {
      const { tinymathAst } = column.params;
      const ast = mathNodeSchema.safeParse(tinymathAst);
      if (!ast.success) {
        return refuse(
          'invalid',
          'lens.form.invalid-math',
          'A math column needs its persisted `tinymathAst`; formulas are never reparsed from text.',
          [...columnPath, 'params', 'tinymathAst']
        );
      }
      const checked = checkMath(ast.data);
      if (!checked.ok) {
        return refuse('invalid', 'lens.form.invalid-math', checked.message, [
          ...columnPath,
          'params',
          'tinymathAst',
        ]);
      }
      const unknown = [...checked.variables].find(
        (variable) => !references.includes(variable)
      );
      if (unknown) {
        return refuse(
          'invalid',
          'lens.form.invalid-math',
          `The math reads "${unknown}", which it does not reference.`,
          [...columnPath, 'params', 'tinymathAst']
        );
      }
    }
  }
  const cycle = findCycle(columns);
  if (cycle) {
    return refuse(
      'invalid',
      'lens.form.reference-cycle',
      `Column "${cycle}" references itself.`,
      [...path, 'columns', cycle]
    );
  }
  const metadata = dataViews.find(({ id }) => id === reference.id);
  const needs = needsOf([...columns.values()]);
  const timeField = metadata ? (metadata.timeFieldName ?? null) : null;
  if (!metadata) {
    needs.unshift('dataView');
  } else if (timeField !== null && !needs.includes('timeRange')) {
    needs.unshift('timeRange');
  }
  return {
    ok: true,
    layer: {
      kind: 'form',
      layerId,
      dataView: reference.id,
      linkedTo: layer.linkToLayers ?? [],
      columns: layer.columnOrder.map((columnId) => ({
        ...layer.columns[columnId],
        columnId,
        operationType: columns.get(columnId)!.operationType,
      })),
      host: {
        timeField,
        applyFilters: layer.ignoreGlobalFilters !== true,
        sampling: layer.sampling ?? 1,
        needs,
      },
    },
  };
};

/** Plans a form-based datasource: each layer's validated column graph and host obligations. */
export const planForm = (
  savedObject: LensSavedObject,
  dataViews: readonly DataViewMetadata[]
): LensPlanResult => {
  const datasource = formDatasourceSchema.safeParse(
    savedObject.attributes.state.datasourceStates.formBased
  );
  if (!datasource.success) {
    const unknown = datasource.error.issues.every(
      ({ code }) => code === 'unrecognized_keys'
    );
    return {
      status: unknown ? 'unsupported' : 'invalid',
      diagnostics: issueDiagnostics(
        unknown ? 'lens.form.unsupported-state' : 'lens.form.invalid-layer',
        datasource.error,
        DATASOURCE
      ),
    };
  }
  const entries = Object.entries(datasource.data.layers);
  if (entries.length === 0) {
    return {
      status: 'invalid',
      diagnostics: [
        {
          code: 'lens.no-layers',
          message: 'The form-based datasource has no layers.',
          path: DATASOURCE,
        },
      ],
    };
  }
  const layers: FormLayerPlan[] = [];
  for (const [layerId, layer] of entries) {
    const planned = planLayer(
      layerId,
      layer,
      savedObject,
      dataViews,
      entries.map(([id]) => id)
    );
    if (!planned.ok) {
      return planned.result;
    }
    layers.push(planned.layer);
  }
  const { query, filters = [] } = savedObject.attributes.state;
  return {
    status: 'planned',
    plan: {
      version: 1,
      source: savedObject,
      dataViews: savedObject.references
        .filter(({ type }) => type === 'index-pattern')
        .map((reference) => {
          const metadata = dataViews.find(({ id }) => id === reference.id);
          return metadata ? { reference, metadata } : { reference };
        }),
      query: query ?? null,
      filters,
      layers,
    },
  };
};
