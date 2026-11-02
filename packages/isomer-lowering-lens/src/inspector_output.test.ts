/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { inspectorOutput } from './inspector_output';
import { plan } from './plan';
import { readResponse } from './read_response';

describe('inspectorOutput', () => {
  it.each([
    null,
    'quoted "text"\n\t',
    42,
    true,
    [],
    {},
    { rows: [[null, ['a', 'b'], 0]], metadata: { label: 'Total' } },
  ])('matches pretty JSON for bounded results', (value) => {
    expect(inspectorOutput(value)).toEqual({
      text: JSON.stringify(value, null, 2),
    });
  });

  it('counts exact escaped output and accepts the display limit without truncation', () => {
    expect(inspectorOutput('x'.repeat(99_998))).toEqual({
      text: `"${'x'.repeat(99_998)}"`,
    });
    expect(inspectorOutput('x'.repeat(99_999))).toHaveProperty('error');
    expect(inspectorOutput('\n'.repeat(50_000))).toHaveProperty('error');
  });

  it('rejects projected output expansion from valid bounded inputs without stringifying it', () => {
    const query = {
      layerId: 'native',
      query: { language: 'esql', esql: 'FROM logs' },
      context: { ignoreGlobalFilters: false },
      columns: Array.from({ length: 512 }, (_, index) => ({
        columnId: `id-${index}`,
        fieldName: 'message',
      })),
    };
    const result = readResponse(query, {
      columns: [{ name: 'message', type: 'keyword' }],
      values: Array.from({ length: 19 }, () => ['x'.repeat(100_000)]),
    });
    expect(result.status).toBe('ready');
    expect(inspectorOutput(result)).toHaveProperty(
      'error',
      expect.stringContaining('display budget')
    );
  });

  it('rejects expanded metadata references in a valid plan without losing the plan', () => {
    const result = plan({
      savedObject: {
        id: 'native',
        type: 'lens',
        references: Array.from({ length: 512 }, (_, index) => ({
          id: 'view',
          type: 'index-pattern',
          name: `ref-${index}`,
        })),
        attributes: {
          title: 'Metadata replay',
          visualizationType: 'lnsXY',
          state: {
            visualization: {},
            datasourceStates: {
              textBased: {
                layers: {
                  native: {
                    query: { esql: 'FROM logs' },
                    columns: [{ columnId: 'id', fieldName: 'message' }],
                  },
                },
              },
            },
          },
        },
      },
      dataViews: [
        {
          id: 'view',
          title: 'logs-*',
          fieldFormats: { message: { pattern: 'x'.repeat(100_000) } },
        },
      ],
    });
    expect(result.status).toBe('planned');
    expect(inspectorOutput(result)).toHaveProperty('error');
  });
});
