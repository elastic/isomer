/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { z } from '@elastic/isomer-sdk';

import { graphMaxMain } from '../../theme/components/graph';
import { lineText, wrappedText } from '../authored_text';
import { crossSuperRefine } from '../cross_field';
import { sizeField } from '../size';

export const slideGraphPlacements = ['above', 'below'] as const;

export const slideGraphShape = `slideGraph supports one left-to-right main row of 2–${graphMaxMain} nodes (the nodes without \`placement\`, in order, joined by edges [main[i], main[i + 1]]), plus at most one \`above\` and one \`below\` node, each joined to one main-row node by a single edge`;

const maxNodes = graphMaxMain + slideGraphPlacements.length;
const maxEdges = graphMaxMain - 1 + slideGraphPlacements.length;

/** `[from, to]` as a key no id text can collide with. */
const edgeKey = (from: string, to: string): string =>
  JSON.stringify([from, to]);

const nodeSchema = z
  .object({
    id: lineText().describe('A unique id that `edges` refer to, e.g. "cart".'),
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
        'Takes the node out of the main row and sets it above or below the main-row node it has an edge with. Omit for main-row nodes; at most one node each above and below.'
      )
      .optional(),
  })
  .strict();

/** Zod schema for {@link SlideGraphNode}. */
export const schema = z
  .object({
    type: z.literal('slideGraph'),
    nodes: z
      .array(nodeSchema)
      .min(2)
      .max(maxNodes)
      .describe(
        `2–${maxNodes} named concepts. Nodes without \`placement\` form the main row, left to right in array order (2–${graphMaxMain} of them). Add at most one \`placement: "above"\` and one \`placement: "below"\` node.`
      ),
    edges: z
      .array(
        z
          .tuple([
            lineText().describe('The `id` the arrow starts from.'),
            lineText().describe('The `id` the arrow points at.'),
          ])
          .describe('`[from, to]` node ids; the arrow points at `to`.')
      )
      .min(1)
      .max(maxEdges)
      .describe(
        'Arrows between nodes. Include exactly [main[i], main[i + 1]] for each neighboring pair in the main row, plus one edge per above or below node to the main-row node it sits over or under, in either direction. No other edges are drawn, so none are allowed.'
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
      ({ nodes, edges }, ctx) => {
        if (nodes.length > maxNodes || edges.length > maxEdges) {
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

        const mainIds = main.map(({ id }) => id);
        const links = mainIds.flatMap((from, index) => {
          const to = mainIds[index + 1];
          return to === undefined ? [] : [[from, to] as const];
        });
        const chain = new Set(links.map(([from, to]) => edgeKey(from, to)));
        const seen = new Set<string>();
        const attached = new Map<string, number>();
        edges.forEach(([from, to], index) => {
          const path = ['edges', index];
          const unknown = [from, to].find((id) => !ids.has(id));
          if (unknown !== undefined) {
            fail(`edge [${from}, ${to}] names unknown node "${unknown}"`, path);
            return;
          }
          const key = edgeKey(from, to);
          if (seen.has(key)) {
            fail(`edge [${from}, ${to}] is repeated`, path);
            return;
          }
          seen.add(key);
          if (chain.has(key)) {
            return;
          }
          const [offRow, ...rest] = [from, to].filter(
            (id) => !mainIds.includes(id)
          );
          if (offRow === undefined || rest.length > 0) {
            fail(`edge [${from}, ${to}] does not fit the layout`, path);
            return;
          }
          attached.set(offRow, (attached.get(offRow) ?? 0) + 1);
        });

        links.forEach(([from, to]) => {
          if (!seen.has(edgeKey(from, to))) {
            fail(`missing main-row edge [${from}, ${to}]`, ['edges']);
          }
        });
        nodes.forEach(({ id, placement }, index) => {
          if (placement !== undefined && attached.get(id) !== 1) {
            fail(
              `the ${placement} node "${id}" needs exactly one edge to a main-row node`,
              ['nodes', index]
            );
          }
        });
      },
      [
        slideGraphShape,
        'Node ids are unique.',
        'Every edge names a node id.',
        'No edge repeats.',
        'At most one node is emphasized.',
      ]
    )
  );

export type SlideGraphTerm = z.infer<typeof nodeSchema>;

export type SlideGraphPlacement = (typeof slideGraphPlacements)[number];

/** Named terms in a fixed layout: a main chain, one node above, one below. */
export type SlideGraphNode = z.infer<typeof schema> & PrimitiveNode;
