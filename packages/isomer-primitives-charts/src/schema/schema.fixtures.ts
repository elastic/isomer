/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The contracts carry no renderers, so tests define each primitive with inert
// ones to put the schemas through the SDK's own composition, validation and
// JSON Schema projection.

import {
  type AnyPrimitiveDefinition,
  definePrimitive,
  z,
} from '@elastic/isomer-sdk';

import {
  gridCatalog,
  metricCatalog,
  unsupportedCatalog,
  xyChartCatalog,
} from './catalog';
import { gridExamples } from './examples/grid';
import { metricExamples } from './examples/metric';
import { unsupportedExamples } from './examples/unsupported';
import { xyChartExamples } from './examples/xy_chart';
import { type GridNode, gridSchema, gridSchemaFor } from './grid';
import { metricSchema } from './metric';
import { unsupportedSchema } from './unsupported';
import { xyChartSchema } from './xy_chart';

const renderers = {
  react: () => null,
  text: () => '',
  markdown: () => [],
};

export const contractDefinitions: readonly AnyPrimitiveDefinition[] = [
  definePrimitive({
    type: 'metric',
    schema: metricSchema,
    catalog: metricCatalog,
    examples: metricExamples,
    renderers,
  }),
  definePrimitive({
    type: 'xyChart',
    schema: xyChartSchema,
    catalog: xyChartCatalog,
    examples: xyChartExamples,
    renderers,
  }),
  definePrimitive<GridNode>({
    type: 'grid',
    schema: gridSchema,
    schemaFor: (bodyNode: z.ZodType<unknown>) => gridSchemaFor(bodyNode),
    catalog: gridCatalog,
    examples: gridExamples,
    children: (node) => [
      ...node.panels.map((panel, index) => ({
        node: panel.node,
        path: `panels[${index}].node`,
      })),
      ...(node.sections ?? []).flatMap((section, sectionIndex) =>
        section.panels.map((panel, index) => ({
          node: panel.node,
          path: `sections[${sectionIndex}].panels[${index}].node`,
        }))
      ),
    ],
    renderers,
  }),
  definePrimitive({
    type: 'unsupported',
    schema: unsupportedSchema,
    catalog: unsupportedCatalog,
    examples: unsupportedExamples,
    renderers,
  }),
];

export const nodeSchemaOf = (type: string): z.ZodType => {
  const definition = contractDefinitions.find(
    (candidate) => candidate.type === type
  );
  if (!definition) {
    throw new Error(`no contract for ${type}`);
  }
  return definition.schema;
};
