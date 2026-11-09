/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildAuthoringJsonSchema,
  type Composition,
  createCompositionValidator,
  primitiveExamples,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { contractDefinitions } from './schema.fixtures';

const validate = createCompositionValidator(contractDefinitions);

const view = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [node],
});

const cases = contractDefinitions.flatMap((definition) =>
  primitiveExamples(definition).map(({ name, node }) => ({
    type: definition.type,
    name: name ?? '(unnamed)',
    node,
  }))
);

describe('contract examples', () => {
  it('cover every primitive', () => {
    expect(new Set(cases.map(({ type }) => type))).toEqual(
      new Set([
        'metric',
        'xyChart',
        'dataTable',
        'partitionChart',
        'heatmap',
        'gauge',
        'tagCloud',
        'grid',
        'unsupported',
      ])
    );
  });

  it.each(cases)('$type: $name validates in a composition', ({ node }) => {
    const result = validate(view(node));
    expect(result.errors).toEqual([]);
  });

  it.each(contractDefinitions.map((definition) => definition))(
    '$type: the catalog example validates',
    ({ catalog }) => {
      expect(validate(view(catalog.example as PrimitiveNode)).errors).toEqual(
        []
      );
    }
  );

  it.each(contractDefinitions.map((definition) => definition))(
    '$type: example names are unique',
    (definition) => {
      const names = primitiveExamples(definition).map(({ name }) => name);
      expect(new Set(names).size).toBe(names.length);
    }
  );
});

describe('JSON Schema projection', () => {
  const schema = buildAuthoringJsonSchema(contractDefinitions) as {
    $defs?: Record<string, unknown>;
  };

  it.each([
    'metric',
    'xyChart',
    'dataTable',
    'partitionChart',
    'heatmap',
    'gauge',
    'tagCloud',
    'grid',
    'unsupported',
  ])('projects %s', (type) => {
    expect(schema.$defs?.[type]).toBeDefined();
  });
});

describe('grid nesting', () => {
  it('reports an invalid nested chart at its path inside the grid', () => {
    const result = validate(
      view({
        type: 'grid',
        panels: [
          {
            x: 0,
            y: 0,
            w: 12,
            h: 6,
            node: {
              type: 'metric',
              data: {
                columns: [
                  { id: 'a', label: 'A', type: 'number', role: 'metric' },
                ],
                rows: [[1]],
              },
              value: { column: 'missing' },
            },
          },
        ],
      } as PrimitiveNode)
    );
    expect(result.errors).toEqual([
      expect.objectContaining({
        path: 'body[0].panels[0].node.value.column',
        message: expect.stringContaining('No column is "missing"') as string,
      }),
    ]);
  });

  it('rejects a nested node of a type the composition does not hold', () => {
    const result = validate(
      view({
        type: 'grid',
        panels: [{ x: 0, y: 0, w: 12, h: 6, node: { type: 'nope' } }],
      } as PrimitiveNode)
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.path).toMatch(/^body\[0\]\.panels\[0\]\.node/);
  });
});
