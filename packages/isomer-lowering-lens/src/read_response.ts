/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JSON_LIMITS } from './json';
import type { LensDiagnostic, LensResponseResult } from './schema';
import { esqlResponseSchema, layerPlanSchema, parseArgument } from './schema';

const invalid = (diagnostics: LensDiagnostic[]): LensResponseResult => ({
  status: 'invalid',
  diagnostics,
});

/**
 * Projects a complete ES|QL response (`{ columns, values }`) onto one planned layer's Lens columns, in Lens order.
 * Columns match by response field name, never position or label; cells are kept as they are, nulls and multivalues included.
 */
export const readResponse = (
  layer: unknown,
  response: unknown
): LensResponseResult => {
  const parsedLayer = parseArgument(
    layer,
    layerPlanSchema,
    {
      json: 'lens.response.invalid-json',
      shape: 'lens.response.invalid-layer',
    },
    ['layer']
  );
  if (!parsedLayer.ok) {
    return invalid(parsedLayer.diagnostics);
  }
  const parsedResponse = parseArgument(
    response,
    esqlResponseSchema,
    {
      json: 'lens.response.invalid-json',
      shape: 'lens.response.invalid-shape',
    },
    ['response']
  );
  if (!parsedResponse.ok) {
    return invalid(parsedResponse.diagnostics);
  }
  const { layerId, columns: lensColumns } = parsedLayer.value;
  const {
    columns,
    values,
    is_partial: isPartial,
    is_running: isRunning,
  } = parsedResponse.value;

  if (isRunning === true) {
    return invalid([
      {
        code: 'lens.response.incomplete',
        message: 'A still-running response cannot be projected.',
        path: ['response', 'is_running'],
      },
    ]);
  }
  const positions = new Map(columns.map(({ name }, index) => [name, index]));
  const diagnostics: LensDiagnostic[] = lensColumns.flatMap(
    ({ fieldName }, index) =>
      positions.has(fieldName)
        ? []
        : [
            {
              code: 'lens.response.missing-column',
              message: `The response has no column "${fieldName}".`,
              path: ['layer', 'columns', index, 'fieldName'],
            },
          ]
  );
  // Several Lens columns may read one field, so the table can outgrow the response.
  if (values.length * lensColumns.length > JSON_LIMITS.values) {
    diagnostics.push({
      code: 'lens.response.too-large',
      message: `The table would hold more than ${JSON_LIMITS.values} cells.`,
      path: ['response', 'values'],
    });
  }
  if (diagnostics.length) {
    return invalid(diagnostics);
  }

  const projected = lensColumns.map((lens) => {
    const index = positions.get(lens.fieldName)!;
    return { lens, index, type: columns[index]!.type };
  });
  return {
    status: 'ready',
    table: {
      layerId,
      columns: projected.map(({ lens, type }) => ({ lens, type })),
      rows: values.map((row) => projected.map(({ index }) => row[index]!)),
      partial: isPartial === true,
    },
  };
};
