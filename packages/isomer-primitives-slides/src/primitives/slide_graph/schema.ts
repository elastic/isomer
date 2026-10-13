/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';
import { fromChildren } from '@elastic/isomer-sdk/author';

import { graphMaxMain } from '../../theme/components/graph';
import { lineText, wrappedText } from '../authored_text';
import { crossSuperRefine } from '../cross_field';
import { sizeField } from '../size';

export const slideGraphPlacements = ['above', 'below'] as const;

export const slideGraphDirections = ['in', 'out'] as const;

export const slideGraphShape = `slideGraph supports one left-to-right main row of 2–${graphMaxMain} nodes (the nodes without \`placement\`, in order, each joined to the next by an arrow), plus at most one \`above\` and one \`below\` node, each joined by one arrow to the main-row node its \`of\` names`;

const maxNodes = graphMaxMain + slideGraphPlacements.length;

const nodeSchema = z
  .object({
    id: lineText().describe(
      'A unique id, e.g. "cart". An above or below node names a main-row node by it in `of`.'
    ),
    term: lineText().describe('The concept’s name: one or two words.'),
    body: wrappedText().describe(
      'A short sentence defining the term, about six words. `code` and `**strong**` marks are allowed.'
    ),
    emphasis: z
      .boolean()
      .describe(
        'Marks the concept the slide centers on: a bar-weight border and a dot before the term, in primary. Use on one node at most. Defaults to false.'
      )
      .optional(),
    placement: z
      .enum(slideGraphPlacements)
      .describe(
        'Takes the node out of the main row and sets it above or below the main-row node `of` names. Omit for main-row nodes; at most one node each above and below.'
      )
      .optional(),
    of: lineText()
      .describe(
        'The `id` of the main-row node this above or below node sits over or under, joined to it by one arrow. Set with `placement`, and only with it.'
      )
      .optional(),
    direction: z
      .enum(slideGraphDirections)
      .describe(
        'Which way an above or below node’s arrow runs: `in`, the default, from this node to `of`; `out`, from `of` to this node. Only with `placement`.'
      )
      .optional(),
  })
  .strict();

/** Zod schema for {@link SlideGraphNode}. */
export const schema = z
  .object({
    type: z.literal('slideGraph'),
    nodes: fromChildren(
      'node',
      z
        .array(nodeSchema)
        .min(2)
        .max(maxNodes)
        .describe(
          `2–${maxNodes} named concepts. Nodes without \`placement\` form the main row, left to right in array order (2–${graphMaxMain} of them), each joined to the next by an arrow. Add at most one \`placement: "above"\` and one \`placement: "below"\` node, each naming the main-row node it joins in \`of\`.`
        ),
      { text: 'body' }
    ),
    caption: wrappedText()
      .describe(
        'One or two sentences on how the concepts fit together, set in the empty space beside the upper node. `code` and `**strong**` marks are allowed.'
      )
      .optional(),
    size: sizeField(),
  })
  .strict()
  .check(
    crossSuperRefine(
      ({ nodes }, ctx) => {
        if (nodes.length > maxNodes) {
          return;
        }
        const fail = (message: string, path: PropertyKey[]) =>
          ctx.addIssue({
            code: 'custom',
            message: `${message}. ${slideGraphShape}.`,
            path,
          });

        const ids = new Set<string>();
        nodes.forEach(({ id }, index) => {
          if (ids.has(id)) {
            fail(`duplicate node id "${id}"`, ['nodes', index, 'id']);
          }
          ids.add(id);
        });

        nodes
          .map(({ emphasis }, index) => ({ emphasis, index }))
          .filter(({ emphasis }) => emphasis === true)
          .slice(1)
          .forEach(({ index }) =>
            fail('more than one node is emphasized', [
              'nodes',
              index,
              'emphasis',
            ])
          );

        const main = nodes.filter(({ placement }) => placement === undefined);
        if (main.length < 2 || main.length > graphMaxMain) {
          fail(`the main row has ${main.length} nodes`, ['nodes']);
        }
        for (const side of slideGraphPlacements) {
          if (nodes.filter(({ placement }) => placement === side).length > 1) {
            fail(`more than one node is placed ${side}`, ['nodes']);
          }
        }

        const mainIds = new Set(main.map(({ id }) => id));
        nodes.forEach(({ id, placement, of, direction }, index) => {
          if (placement === undefined) {
            for (const [key, value] of [
              ['of', of],
              ['direction', direction],
            ] as const) {
              if (value !== undefined) {
                fail(`the main-row node "${id}" takes no \`${key}\``, [
                  'nodes',
                  index,
                  key,
                ]);
              }
            }
            return;
          }
          if (of === undefined) {
            fail(`the ${placement} node "${id}" needs \`of\``, [
              'nodes',
              index,
            ]);
          } else if (!mainIds.has(of)) {
            fail(
              `the ${placement} node "${id}" names "${of}" in \`of\`, not a main-row node`,
              ['nodes', index, 'of']
            );
          }
        });
      },
      [
        slideGraphShape,
        'Node ids are unique.',
        'At most one node is emphasized.',
        'Set with `placement`, and only with it.',
        'Only with `placement`.',
      ]
    )
  );

export type SlideGraphTerm = z.infer<typeof nodeSchema>;

export type SlideGraphPlacement = (typeof slideGraphPlacements)[number];

/** Named terms in a fixed layout: a main chain, one node above, one below. */
export type SlideGraphNode = z.infer<typeof schema> & PrimitiveNode;

/** Every arrow as `[from, to]` ids: the main row left to right, then each placed node's. */
export const graphEdges = ({
  nodes,
}: Pick<SlideGraphNode, 'nodes'>): (readonly [string, string])[] => {
  const main = nodes
    .filter(({ placement }) => placement === undefined)
    .map(({ id }) => id);
  return [
    ...main.flatMap((from, index) => {
      const to = main[index + 1];
      return to === undefined ? [] : [[from, to] as const];
    }),
    ...nodes.flatMap(({ id, placement, of, direction }) =>
      placement === undefined || of === undefined
        ? []
        : [direction === 'out' ? ([of, id] as const) : ([id, of] as const)]
    ),
  ];
};
