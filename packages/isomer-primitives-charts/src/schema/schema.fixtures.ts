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
  dataTableCatalog,
  gaugeCatalog,
  gridCatalog,
  heatmapCatalog,
  metricCatalog,
  partitionChartCatalog,
  tagCloudCatalog,
  unsupportedCatalog,
  xyChartCatalog,
} from './catalog';
import { dataTableSchema } from './data_table';
import { dataTableExamples } from './examples/data_table';
import { gaugeExamples } from './examples/gauge';
import { gridExamples } from './examples/grid';
import { heatmapExamples } from './examples/heatmap';
import { metricExamples } from './examples/metric';
import { partitionChartExamples } from './examples/partition_chart';
import { tagCloudExamples } from './examples/tag_cloud';
import { unsupportedExamples } from './examples/unsupported';
import { xyChartExamples } from './examples/xy_chart';
import { gaugeSchema } from './gauge';
import { type GridNode, gridSchema, gridSchemaFor } from './grid';
import { heatmapSchema } from './heatmap';
import { metricSchema } from './metric';
import { partitionChartSchema } from './partition_chart';
import { tagCloudSchema } from './tag_cloud';
import { unsupportedSchema } from './unsupported';
import { xyChartSchema } from './xy_chart';

const renderers = {
  react: () => null,
  text: () => '',
  markdown: () => [],
};

/** Each chart contract as a primitive definition with stub renderers, for validating nodes in tests. */
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
  definePrimitive({
    type: 'dataTable',
    schema: dataTableSchema,
    catalog: dataTableCatalog,
    examples: dataTableExamples,
    renderers,
  }),
  definePrimitive({
    type: 'partitionChart',
    schema: partitionChartSchema,
    catalog: partitionChartCatalog,
    examples: partitionChartExamples,
    renderers,
  }),
  definePrimitive({
    type: 'heatmap',
    schema: heatmapSchema,
    catalog: heatmapCatalog,
    examples: heatmapExamples,
    renderers,
  }),
  definePrimitive({
    type: 'gauge',
    schema: gaugeSchema,
    catalog: gaugeCatalog,
    examples: gaugeExamples,
    renderers,
  }),
  definePrimitive({
    type: 'tagCloud',
    schema: tagCloudSchema,
    catalog: tagCloudCatalog,
    examples: tagCloudExamples,
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

/** The node schema of the contract named `type`. */
export const nodeSchemaOf = (type: string): z.ZodType => {
  const definition = contractDefinitions.find(
    (candidate) => candidate.type === type
  );
  if (!definition) {
    throw new Error(`no contract for ${type}`);
  }
  return definition.schema;
};
