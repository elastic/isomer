/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { chartsPack } from './pack';
import { metricSchema } from './schema';

const runtime = createIsomerRuntime({ packs: [chartsPack] });

const SCHEMA_ENTRY = '@elastic/isomer-primitives-charts/schema';

/** Each primitive page and the node type its examples declare. */
const PAGES = {
  'metric.md': 'MetricNode',
  'legacy-metric.md': 'LegacyMetricNode',
  'xy-chart.md': 'XyChartNode',
  'data-table.md': 'DataTableNode',
  'partition-chart.md': 'PartitionChartNode',
  'heatmap.md': 'HeatmapNode',
  'gauge.md': 'GaugeNode',
  'tag-cloud.md': 'TagCloudNode',
  'grid.md': 'GridNode',
  'unsupported.md': 'UnsupportedNode',
};

type Scope = ReadonlyMap<string, unknown>;

/**
 * The value of an expression that is plain data, or the name of a `const`
 * in `scope`; anything else throws.
 */
const literal = (node: ts.Expression, scope: Scope): unknown => {
  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(
      node.properties.map((property) => {
        if (
          !ts.isPropertyAssignment(property) ||
          ts.isComputedPropertyName(property.name)
        ) {
          throw new Error(`Not plain data: ${property.getText()}`);
        }
        return [property.name.text, literal(property.initializer, scope)];
      })
    );
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((element) => literal(element, scope));
  }
  if (ts.isStringLiteral(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(node.operand)
  ) {
    return -Number(node.operand.text);
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }
  if (ts.isIdentifier(node) && scope.has(node.text)) {
    return scope.get(node.text);
  }
  throw new Error(`Not plain data: ${node.getText()}`);
};

interface Example {
  /** The modules the block imports from. */
  from: string[];
  /** The type its last `const`, the example, is annotated with. */
  typeName: string | undefined;
  value: unknown;
}

/** A block of imports and `const`s of plain data, the last one the example. */
const exampleOf = (page: string, block: string): Example => {
  const { statements } = ts.createSourceFile(
    page,
    block,
    ts.ScriptTarget.Latest,
    true
  );
  const scope = new Map<string, unknown>();
  const example: Example = { from: [], typeName: undefined, value: undefined };
  for (const statement of statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      example.from.push(statement.moduleSpecifier.text);
    } else if (ts.isVariableStatement(statement)) {
      for (const { name, type, initializer } of statement.declarationList
        .declarations) {
        if (!initializer) {
          throw new Error(`${page}: ${name.getText()} is unset.`);
        }
        example.typeName = type?.getText();
        example.value = literal(initializer, scope);
        scope.set(name.getText(), example.value);
      }
    } else {
      throw new Error(
        `${page}: not an import or a const: ${statement.getText()}`
      );
    }
  }
  return example;
};

/** The `ts` blocks of a docs page that follow a `<!-- marker -->` line. */
const examplesIn = (page: string, marker: string): Example[] =>
  [
    ...readFileSync(join(__dirname, '..', 'docs', page), 'utf8').matchAll(
      new RegExp(
        `^<!-- ${marker} -->\\n\\n\`\`\`ts\\n([\\s\\S]*?)^\`\`\``,
        'gm'
      )
    ),
  ].map(([, block = '']) => exampleOf(page, block));

const errorsOf = (node: unknown) =>
  runtime
    .validate({ type: 'view', body: [node as never] })
    .errors.map(({ path, message }) => `${path}: ${message}`);

describe('docs examples', () => {
  describe.each(Object.entries(PAGES))('%s', (page, typeName) => {
    const examples = examplesIn(page, 'node-example');

    it('holds a minimal and a realistic node', () => {
      expect(
        examples.map((example) => [example.from, example.typeName])
      ).toEqual([
        [[SCHEMA_ENTRY], typeName],
        [[SCHEMA_ENTRY], typeName],
      ]);
    });

    it('holds nodes that validate in a composition', () => {
      expect(examples.map(({ value }) => errorsOf(value))).toEqual([[], []]);
    });
  });

  it('core.md holds a data block that validates in a table', () => {
    const examples = examplesIn('core.md', 'data-example');

    expect(examples.map((example) => [example.from, example.typeName])).toEqual(
      [[[SCHEMA_ENTRY], 'ChartData']]
    );
    expect(
      examples.map(({ value }) => errorsOf({ type: 'dataTable', data: value }))
    ).toEqual([[]]);
  });

  it('index.md is right that a stand-alone parse strips what a runtime rejects', () => {
    const [minimal] = examplesIn('metric.md', 'node-example');
    const node = {
      ...(minimal?.value as object),
      id: 'requests',
      titel: 'Requests',
    };

    const parsed = metricSchema.safeParse(node);
    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty('id');
    expect(parsed.data).not.toHaveProperty('titel');

    expect(errorsOf(node)).toEqual([
      expect.stringContaining('unrecognized key(s): titel'),
    ]);
  });
});
