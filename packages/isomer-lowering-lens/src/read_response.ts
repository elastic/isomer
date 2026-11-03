/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyJson } from './json';
import type { LensDiagnostic, LensResponseResult } from './schema';
import {
  esqlResponseSchema,
  issueDiagnostics,
  layerPlanSchema,
} from './schema';

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
  const copiedLayer = copyJson(layer);
  if (!copiedLayer.ok) {
    return invalid([
      {
        code: 'lens.response.invalid-json',
        message: copiedLayer.message,
        path: ['layer'],
      },
    ]);
  }
  const copiedResponse = copyJson(response);
  if (!copiedResponse.ok) {
    return invalid([
      {
        code: 'lens.response.invalid-json',
        message: copiedResponse.message,
        path: ['response'],
      },
    ]);
  }
  const parsedLayer = layerPlanSchema.safeParse(copiedLayer.value);
  if (!parsedLayer.success) {
    return invalid(
      issueDiagnostics('lens.response.invalid-layer', parsedLayer.error, [
        'layer',
      ])
    );
  }
  const parsed = esqlResponseSchema.safeParse(copiedResponse.value);
  if (!parsed.success) {
    return invalid(
      issueDiagnostics('lens.response.invalid-shape', parsed.error, [
        'response',
      ])
    );
  }
  const { layerId, columns: lensColumns } = parsedLayer.data;
  const {
    columns,
    values,
    is_partial: isPartial,
    is_running: isRunning,
  } = parsed.data;

  const diagnostics: LensDiagnostic[] = [];
  if (isPartial === true || isRunning === true) {
    diagnostics.push({
      code: 'lens.response.incomplete',
      message: 'A partial or still-running response cannot be projected.',
      path: ['response', isRunning === true ? 'is_running' : 'is_partial'],
    });
  }
  const positions = new Map<string, number>();
  columns.forEach(({ name }, index) => {
    if (positions.has(name)) {
      diagnostics.push({
        code: 'lens.response.duplicate-column',
        message: `More than one response column is named "${name}".`,
        path: ['response', 'columns', index],
      });
    }
    positions.set(name, index);
  });
  lensColumns.forEach(({ fieldName }, index) => {
    if (!positions.has(fieldName)) {
      diagnostics.push({
        code: 'lens.response.missing-column',
        message: `The response has no column "${fieldName}".`,
        path: ['layer', 'columns', index, 'fieldName'],
      });
    }
  });
  values.forEach((row, index) => {
    if (row.length !== columns.length) {
      diagnostics.push({
        code: 'lens.response.row-width',
        message: `Row ${index} has ${row.length} cells for ${columns.length} columns.`,
        path: ['response', 'values', index],
      });
    }
  });
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
    },
  };
};
