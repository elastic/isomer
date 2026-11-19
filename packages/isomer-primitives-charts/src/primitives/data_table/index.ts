/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import {
  type ChartPrimitiveConfig,
  chartPrimitiveParts,
  FAILURE_HEIGHT,
  failureText,
  linkLineHeight,
  resolveForText,
} from '../../render';
import { tableSceneToSlack } from '../../text';
import { defaultChartPrimitiveConfig } from '../defaults';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import type { TableScene } from './scene';
import { type DataTableNode, schema } from './schema';
import { tableHeight } from './size';

export { catalog as dataTableCatalog } from './catalog';
export { examples as dataTableExamples } from './examples';
export {
  type TableAlignment,
  type TableCell,
  type TableColumn,
  type TableOrder,
  type TableRow,
  type TableScene,
} from './scene';
export {
  type DataTableColumn,
  type DataTableNode,
  type DataTableSummary,
  DATA_TABLE_KEY_RULE,
  DATA_TABLE_RULES,
  DATA_TABLE_SUMMARIES,
  schema as dataTableSchema,
} from './schema';

/** The `dataTable` primitive, drawing through `config`. */
export const defineDataTablePrimitive = (config: ChartPrimitiveConfig) => {
  const { sanitize, renderers } = chartPrimitiveParts<DataTableNode>(config);
  const tableScene = (node: DataTableNode) =>
    resolveForText(node, config) as TableScene;
  return definePrimitive({
    type: 'dataTable',
    catalog,
    icon,
    examples,
    schema,
    sanitize,
    metrics: {
      snapshotHeight: (node: DataTableNode) =>
        config.guard(
          node,
          () => {
            const scene = tableScene(node);
            return tableHeight(scene) + linkLineHeight(scene);
          },
          () => FAILURE_HEIGHT
        ),
    },
    renderers: {
      ...renderers,
      slack: (node: DataTableNode, { baseUrl }: { baseUrl?: string }) =>
        config.guard<SlackBlock[]>(
          node,
          () => tableSceneToSlack(tableScene(node), baseUrl),
          () => [
            {
              type: 'rich_text',
              elements: [
                {
                  type: 'rich_text_section',
                  elements: [{ type: 'text', text: failureText(node) }],
                },
              ],
            },
          ]
        ),
    },
  });
};

/** {@link defineDataTablePrimitive} with the pack's defaults. */
export const dataTablePrimitive = defineDataTablePrimitive(
  defaultChartPrimitiveConfig
);
