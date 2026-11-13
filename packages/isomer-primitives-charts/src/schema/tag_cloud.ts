/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PrimitiveNode, z } from '@elastic/isomer-sdk/schema';

import { KEY_PART_RULE } from './colors';
import { chartCoreShape } from './core';
import { crossSuperRefine } from './cross_field';
import {
  checkInteractions,
  INTERACTION_RULES,
  interactionsCoreShape,
  interactionsSchemaFor,
} from './events';
import {
  checkColumnReferences,
  COLUMN_REF_RULE,
  type ColumnReference,
  columnRefSchema,
} from './references';

/** The cross-field rules `tagCloudSchema` states in its description, one sentence each. */
export const TAG_CLOUD_RULES = {
  metricType: 'The `metric` column is a `number` column.',
  singleValued: 'The `tags` and `metric` columns are not `multivalue`.',
  distinct: 'The `tags` and `metric` columns are two different columns.',
  fontSizes: '`fontSize.min` is at most `fontSize.max`.',
} as const;

/** What a `colors.byKey` key names in a `tagCloud`. */
export const TAG_CLOUD_KEY_RULE = `A \`colors.byKey\` key names a tag by its \`tags\` cell. ${KEY_PART_RULE}`;

const TAG_CLOUD_DESCRIPTION = [
  'Words sized by value, as Lens’s tag cloud draws them: one word per row, its text the `tags` cell as displayed, its size from `fontSize.min` for the smallest `metric` value to `fontSize.max` for the largest, along `scale`. A missing value draws at the smallest size. A word with no `colors.byKey` entry takes the default categorical palette by its row. Words that do not fit are left out.',
  TAG_CLOUD_KEY_RULE,
  ...Object.values(TAG_CLOUD_RULES),
].join(' ');

const tagCloudObjectSchema = z.object({
  type: z.literal('tagCloud'),
  ...chartCoreShape,
  ...interactionsCoreShape,
  interactions: interactionsSchemaFor(['tag'])
    .optional()
    .describe(
      'What the chart offers a reader. `tag` selects a word, by its `tags` cell. With no `onEvent` from the host, nothing is offered and nothing is raised.'
    ),
  tags: z
    .strictObject({
      column: columnRefSchema.describe(
        `The column whose cells are the words. ${COLUMN_REF_RULE}`
      ),
    })
    .describe('The words.'),
  metric: z
    .strictObject({
      column: columnRefSchema.describe(
        `The column whose values size the words. ${TAG_CLOUD_RULES.metricType}`
      ),
    })
    .describe(`What sizes each word. ${TAG_CLOUD_RULES.singleValued}`),
  scale: z
    .enum(['linear', 'log', 'squareRoot'])
    .optional()
    .describe(
      'How a value’s place between the smallest and largest becomes a font size: in proportion, by its base-2 logarithm, or by its square root. Absent means `linear`.'
    ),
  orientation: z
    .enum(['single', 'rightAngled', 'multiple'])
    .optional()
    .describe(
      '`single` sets every word horizontally; `rightAngled` turns some a quarter turn; `multiple` turns them to one of 12 angles from horizontal to a quarter turn the other way. Each word’s angle follows from its text. Absent means `single`.'
    ),
  fontSize: z
    .strictObject({
      min: z
        .number()
        .positive()
        .optional()
        .describe('In pixels. Absent means 18.'),
      max: z
        .number()
        .positive()
        .optional()
        .describe('In pixels. Absent means 72.'),
    })
    .optional()
    .describe(`The font sizes words range over. ${TAG_CLOUD_RULES.fontSizes}`),
  showLabel: z
    .boolean()
    .optional()
    .describe(
      'Write "_tags label_ - _metric label_" under the cloud. Absent means true.'
    ),
});

type TagCloudInput = z.infer<typeof tagCloudObjectSchema>;

/** A tag cloud: words sized by value. */
export const tagCloudSchema = tagCloudObjectSchema
  .describe(TAG_CLOUD_DESCRIPTION)
  .check(
    crossSuperRefine<TagCloudInput>(
      (node, context) => {
        const references: ColumnReference[] = [
          { path: ['tags', 'column'], id: node.tags.column, single: true },
          {
            path: ['metric', 'column'],
            id: node.metric.column,
            types: ['number'] as const,
            single: true,
          },
        ];
        checkColumnReferences(node.data, references, context, {
          missing: COLUMN_REF_RULE,
          type: TAG_CLOUD_RULES.metricType,
          single: TAG_CLOUD_RULES.singleValued,
        });
        if (node.tags.column === node.metric.column) {
          context.addIssue({
            code: 'custom',
            path: ['metric', 'column'],
            message: TAG_CLOUD_RULES.distinct,
          });
        }
        const { min = 18, max = 72 } = node.fontSize ?? {};
        if (min > max) {
          context.addIssue({
            code: 'custom',
            path: ['fontSize'],
            message: TAG_CLOUD_RULES.fontSizes,
          });
        }
        checkInteractions(node, context);
      },
      [
        COLUMN_REF_RULE,
        TAG_CLOUD_RULES.metricType,
        TAG_CLOUD_RULES.singleValued,
        TAG_CLOUD_RULES.distinct,
        TAG_CLOUD_RULES.fontSizes,
        INTERACTION_RULES.emphasisRows,
      ]
    )
  );

/** A validated `tagCloud` node. */
export type TagCloudNode = z.infer<typeof tagCloudSchema> & PrimitiveNode;
