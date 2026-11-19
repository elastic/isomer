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

import { catalog as dataTableCatalog } from '../primitives/data_table/catalog';
import { examples as dataTableExamples } from '../primitives/data_table/examples';
import { schema as dataTableSchema } from '../primitives/data_table/schema';
import { catalog as gaugeCatalog } from '../primitives/gauge/catalog';
import { examples as gaugeExamples } from '../primitives/gauge/examples';
import { schema as gaugeSchema } from '../primitives/gauge/schema';
import { catalog as gridCatalog } from '../primitives/grid/catalog';
import { examples as gridExamples } from '../primitives/grid/examples';
import {
  type GridNode,
  gridSchemaFor,
  schema as gridSchema,
} from '../primitives/grid/schema';
import { catalog as heatmapCatalog } from '../primitives/heatmap/catalog';
import { examples as heatmapExamples } from '../primitives/heatmap/examples';
import { schema as heatmapSchema } from '../primitives/heatmap/schema';
import { catalog as legacyMetricCatalog } from '../primitives/legacy_metric/catalog';
import { examples as legacyMetricExamples } from '../primitives/legacy_metric/examples';
import { schema as legacyMetricSchema } from '../primitives/legacy_metric/schema';
import { catalog as metricCatalog } from '../primitives/metric/catalog';
import { examples as metricExamples } from '../primitives/metric/examples';
import { schema as metricSchema } from '../primitives/metric/schema';
import { catalog as partitionChartCatalog } from '../primitives/partition_chart/catalog';
import { examples as partitionChartExamples } from '../primitives/partition_chart/examples';
import { schema as partitionChartSchema } from '../primitives/partition_chart/schema';
import { catalog as tagCloudCatalog } from '../primitives/tag_cloud/catalog';
import { examples as tagCloudExamples } from '../primitives/tag_cloud/examples';
import { schema as tagCloudSchema } from '../primitives/tag_cloud/schema';
import { catalog as unsupportedCatalog } from '../primitives/unsupported/catalog';
import { examples as unsupportedExamples } from '../primitives/unsupported/examples';
import { schema as unsupportedSchema } from '../primitives/unsupported/schema';
import { catalog as xyChartCatalog } from '../primitives/xy_chart/catalog';
import { examples as xyChartExamples } from '../primitives/xy_chart/examples';
import { schema as xyChartSchema } from '../primitives/xy_chart/schema';

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
    type: 'legacyMetric',
    schema: legacyMetricSchema,
    catalog: legacyMetricCatalog,
    examples: legacyMetricExamples,
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
