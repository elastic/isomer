/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import { copyJson } from './json';
import { queryParams } from './params';
import type {
  LensDiagnostic,
  LensLayerPlan,
  LensPlanResult,
  LensSavedObject,
} from './schema';
import {
  dataViewSchema,
  esqlDatasourceSchema,
  issueDiagnostics,
  LAYER_KEYS,
  MAX_ID_LENGTH,
  savedObjectSchema,
} from './schema';

const inputSchema = z
  .object({
    savedObject: savedObjectSchema,
    dataViews: z.array(dataViewSchema).max(512).default([]),
  })
  .strict();

const STATE = ['savedObject', 'attributes', 'state'];
const DATASOURCE = [...STATE, 'datasourceStates', 'textBased'];

const refuse = (
  status: 'invalid' | 'unsupported',
  code: string,
  message: string,
  path: readonly (string | number)[]
): LensPlanResult => ({ status, diagnostics: [{ code, message, path }] });

/** A global query native ES|QL Lens leaves behind: empty KQL/Lucene, or every layer's query again. */
const isInertGlobalQuery = (
  query: LensSavedObject['attributes']['state']['query'],
  layers: readonly { query?: { esql: string } | undefined }[]
): boolean => {
  if (query === undefined) {
    return true;
  }
  const keys = Object.keys(query).sort().join();
  if (keys === 'language,query') {
    return (
      query.query === '' &&
      (query.language === 'kuery' || query.language === 'lucene')
    );
  }
  return (
    keys === 'esql' && layers.every((layer) => layer.query?.esql === query.esql)
  );
};

/** Plans one native ES|QL Lens saved object; `dataViews` is optional metadata for its referenced data views. */
export const plan = (input: unknown): LensPlanResult => {
  const copied = copyJson(input);
  if (!copied.ok) {
    return refuse('invalid', 'lens.invalid-json', copied.message, []);
  }
  const parsed = inputSchema.safeParse(copied.value);
  if (!parsed.success) {
    return {
      status: 'invalid',
      diagnostics: issueDiagnostics('lens.invalid-input', parsed.error),
    };
  }
  const { savedObject, dataViews } = parsed.data;
  const diagnostics: LensDiagnostic[] = [];
  const names = new Set<string>();
  savedObject.references.forEach(({ name }, index) => {
    if (names.has(name)) {
      diagnostics.push({
        code: 'lens.duplicate-reference',
        message: `More than one reference is named "${name}".`,
        path: ['savedObject', 'references', index],
      });
    }
    names.add(name);
  });
  const dataViewIds = new Set<string>();
  dataViews.forEach(({ id }, index) => {
    const isReferenced = savedObject.references.some(
      (reference) => reference.type === 'index-pattern' && reference.id === id
    );
    if (dataViewIds.has(id) || !isReferenced) {
      diagnostics.push({
        code: isReferenced
          ? 'lens.duplicate-data-view'
          : 'lens.unreferenced-data-view',
        message: isReferenced
          ? `Data view "${id}" is described more than once.`
          : `Data view "${id}" is not referenced by the saved object.`,
        path: ['dataViews', index],
      });
    }
    dataViewIds.add(id);
  });
  if (diagnostics.length) {
    return { status: 'invalid', diagnostics };
  }

  const { state } = savedObject.attributes;
  if (Object.keys(state.datasourceStates).join() !== 'textBased') {
    return refuse(
      'unsupported',
      'lens.unsupported-datasource',
      'Only native ES|QL (`textBased`) saved objects are planned; form-based and mixed datasources are not.',
      [...STATE, 'datasourceStates']
    );
  }
  const datasource = esqlDatasourceSchema.safeParse(
    state.datasourceStates.textBased
  );
  if (!datasource.success) {
    return {
      status: 'invalid',
      diagnostics: issueDiagnostics(
        'lens.invalid-esql-layer',
        datasource.error,
        DATASOURCE
      ),
    };
  }
  const { layers, ...extensions } = datasource.data;
  const entries = Object.entries(layers);
  if (entries.length === 0 || Object.keys(extensions).length > 0) {
    return refuse(
      entries.length === 0 ? 'invalid' : 'unsupported',
      entries.length === 0
        ? 'lens.no-layers'
        : 'lens.unsupported-datasource-state',
      entries.length === 0
        ? 'The ES|QL datasource has no layers.'
        : `Unknown ES|QL datasource state: ${Object.keys(extensions).join(', ')}.`,
      DATASOURCE
    );
  }
  if (!isInertGlobalQuery(state.query, Object.values(layers))) {
    return refuse(
      'unsupported',
      'lens.unsupported-global-query',
      'A global query other than empty KQL/Lucene or the layers’ own ES|QL is not planned.',
      [...STATE, 'query']
    );
  }

  const planned: LensLayerPlan[] = [];
  for (const [layerId, layer] of entries) {
    const path = [...DATASOURCE, 'layers', layerId];
    const unknown = Object.keys(layer).filter(
      (key) => !(LAYER_KEYS as readonly string[]).includes(key)
    );
    if (unknown.length > 0) {
      return refuse(
        'unsupported',
        'lens.unsupported-layer-state',
        `Unknown ES|QL layer state, such as an inline table: ${unknown.join(', ')}.`,
        path
      );
    }
    if (!layer.query) {
      return refuse(
        'invalid',
        'lens.missing-esql-query',
        'The layer has no ES|QL query.',
        path
      );
    }
    const columnIds = layer.columns.map(({ columnId }) => columnId);
    const duplicate = columnIds.findIndex(
      (columnId, index) => columnIds.indexOf(columnId) !== index
    );
    if (duplicate !== -1) {
      return refuse(
        'invalid',
        'lens.duplicate-column',
        `Column "${columnIds[duplicate]}" appears more than once.`,
        [...path, 'columns', duplicate]
      );
    }
    const partial = layer.columns.findIndex(
      ({ params }) => params?.dropPartials === true
    );
    if (partial !== -1) {
      return refuse(
        'unsupported',
        'lens.unsupported-drop-partials',
        'Dropping partial buckets is not planned.',
        [...path, 'columns', partial, 'params', 'dropPartials']
      );
    }
    const params = queryParams(layer.query.esql);
    if (!params) {
      return refuse(
        'unsupported',
        'lens.unsupported-anonymous-param',
        'An anonymous `?` parameter can only be bound by position.',
        [...path, 'query', 'esql']
      );
    }
    const long = params.find((name) => name.length > MAX_ID_LENGTH);
    if (long !== undefined) {
      return refuse(
        'unsupported',
        'lens.unsupported-param-name',
        `A parameter name is longer than ${MAX_ID_LENGTH} characters.`,
        [...path, 'query', 'esql']
      );
    }
    planned.push({
      layerId,
      query: { language: 'esql', esql: layer.query.esql },
      columns: layer.columns,
      host: {
        timeField: layer.timeField ?? null,
        params,
        applyFilters: layer.ignoreGlobalFilters !== true,
      },
    });
  }

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
      filters: state.filters ?? [],
      layers: planned,
    },
  };
};
