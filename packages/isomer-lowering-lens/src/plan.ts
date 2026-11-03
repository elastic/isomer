/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { planForm } from './form/plan';
import type { JsonValue } from './json';
import { copyPlain, isJsonObject, JSON_LIMITS } from './json';
import type { QueryParamsRefusal } from './params';
import { queryParams } from './params';
import type {
  EsqlLayer,
  LensLayerPlan,
  LensPlanResult,
  LensSavedObject,
} from './schema';
import {
  esqlDatasourceSchema,
  issueDiagnostics,
  LAYER_KEYS,
  MAX_ID_LENGTH,
  parseArgument,
  planInputSchema,
} from './schema';

type Path = readonly (string | number)[];

const STATE = ['savedObject', 'attributes', 'state'];
const DATASOURCE = [...STATE, 'datasourceStates', 'textBased'];

const PARAM_REFUSALS: Record<
  QueryParamsRefusal,
  { status: 'invalid' | 'unsupported'; code: string }
> = {
  syntax: { status: 'invalid', code: 'lens.invalid-esql-query' },
  unnamed: { status: 'unsupported', code: 'lens.unsupported-anonymous-param' },
  positional: {
    status: 'unsupported',
    code: 'lens.unsupported-positional-param',
  },
};

const refuse = (
  status: 'invalid' | 'unsupported',
  code: string,
  message: string,
  path: Path
): LensPlanResult => ({ status, diagnostics: [{ code, message, path }] });

/** The empty state Kibana keeps for a datasource the editor touched but left without layers. */
const isEmptyDatasource = (state: JsonValue | undefined) =>
  isJsonObject(state) &&
  isJsonObject(state.layers) &&
  Object.keys(state.layers).length === 0;

/** A global query native ES|QL Lens leaves behind: empty KQL/Lucene, or a layer's query again (Kibana mirrors the first). */
const isInertGlobalQuery = (
  query: LensSavedObject['attributes']['state']['query'],
  layers: readonly EsqlLayer[]
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
    keys === 'esql' && layers.some((layer) => layer.query?.esql === query.esql)
  );
};

/** `readResponse` copies a layer under {@link JSON_LIMITS}, so a plan it would refuse is refused here instead. */
const fitsReadBudget = (layer: LensLayerPlan) => copyPlain(layer).ok;

const planLayer = (
  layerId: string,
  layer: EsqlLayer
): LensLayerPlan | LensPlanResult => {
  const path = [...DATASOURCE, 'layers', layerId];
  const unknown = Object.keys(layer).filter((key) => !LAYER_KEYS.includes(key));
  if (unknown.length > 0) {
    return refuse(
      'unsupported',
      'lens.unsupported-layer-state',
      `Unknown ES|QL layer state: ${unknown.join(', ')}.`,
      path
    );
  }
  if (layer.errors?.length) {
    return refuse(
      'invalid',
      'lens.layer-errors',
      'Lens saved editor errors with the layer, and shows them instead of drawing it.',
      [...path, 'errors']
    );
  }
  if (layer.table !== undefined) {
    return refuse(
      'unsupported',
      'lens.unsupported-inline-table',
      'The layer draws the inline table Lens saved with it, not its query.',
      [...path, 'table']
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
  const queryPath = [...path, 'query', 'esql'];
  const params = queryParams(layer.query.esql);
  if (!params.ok) {
    const { status, code } = PARAM_REFUSALS[params.reason];
    return refuse(status, code, params.message, queryPath);
  }
  if (params.names.some((name) => name.length > MAX_ID_LENGTH)) {
    return refuse(
      'unsupported',
      'lens.unsupported-param-name',
      `A parameter name is longer than ${MAX_ID_LENGTH} characters.`,
      queryPath
    );
  }
  const planned: LensLayerPlan = {
    kind: 'esql',
    layerId,
    query: { language: 'esql', esql: layer.query.esql },
    columns: layer.columns,
    host: {
      timeField: layer.timeField ?? null,
      params: params.names,
      applyFilters: layer.ignoreGlobalFilters !== true,
    },
  };
  if (!fitsReadBudget(planned)) {
    return refuse(
      'invalid',
      'lens.layer-too-large',
      `The planned layer exceeds the ${JSON_LIMITS.values} value, ${JSON_LIMITS.characters} character or ${JSON_LIMITS.depth} level limit \`readResponse\` reads.`,
      path
    );
  }
  return planned;
};

/** Plans one native ES|QL Lens saved object; `dataViews` is optional metadata for its referenced data views. */
export const plan = (input: unknown): LensPlanResult => {
  const parsed = parseArgument(input, planInputSchema, {
    json: 'lens.invalid-json',
    shape: 'lens.invalid-input',
  });
  if (!parsed.ok) {
    return { status: 'invalid', diagnostics: parsed.diagnostics };
  }
  const { savedObject, dataViews } = parsed.value;
  const { state } = savedObject.attributes;

  const named = Object.keys(state.datasourceStates);
  const datasources = (
    named.length > 1
      ? named.filter((key) => !isEmptyDatasource(state.datasourceStates[key]))
      : named
  ).join();
  if (datasources === 'formBased') {
    return planForm(savedObject, dataViews);
  }
  if (datasources !== 'textBased') {
    return refuse(
      'unsupported',
      'lens.unsupported-datasource',
      'Only one native ES|QL (`textBased`) or form-based (`formBased`) datasource is planned; mixed and other datasources are not.',
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
  const { layers, indexPatternRefs: _runtime, ...extensions } = datasource.data;
  const unknown = Object.keys(extensions);
  if (unknown.length > 0) {
    return refuse(
      'unsupported',
      'lens.unsupported-datasource-state',
      `Unknown ES|QL datasource state: ${unknown.join(', ')}.`,
      DATASOURCE
    );
  }
  const entries = Object.entries(layers);
  if (entries.length === 0) {
    return refuse(
      'invalid',
      'lens.no-layers',
      'The ES|QL datasource has no layers.',
      DATASOURCE
    );
  }
  if (
    !isInertGlobalQuery(
      state.query,
      entries.map(([, layer]) => layer)
    )
  ) {
    return refuse(
      'unsupported',
      'lens.unsupported-global-query',
      'A global query other than empty KQL/Lucene or the layers’ own ES|QL is not planned.',
      [...STATE, 'query']
    );
  }

  const planned: LensLayerPlan[] = [];
  for (const [layerId, layer] of entries) {
    const result = planLayer(layerId, layer);
    if (!('kind' in result)) {
      return result;
    }
    planned.push(result);
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
