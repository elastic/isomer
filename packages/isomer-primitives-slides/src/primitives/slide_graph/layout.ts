/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideGraphNode, SlideGraphTerm } from './schema';

/** A node off the main row and how it joins the row. */
export interface GraphBranch {
  term: SlideGraphTerm;
  /** Index into {@link GraphLayout.main} of the node it joins. */
  at: number;
  /** True when the arrow points into the main row. */
  inward: boolean;
}

/** A validated {@link SlideGraphNode} resolved into its fixed template. */
export interface GraphLayout {
  main: SlideGraphTerm[];
  above?: GraphBranch | undefined;
  below?: GraphBranch | undefined;
}

const branch = (
  { nodes, edges }: SlideGraphNode,
  main: SlideGraphTerm[],
  side: 'above' | 'below'
): GraphBranch | undefined => {
  const term = nodes.find(({ placement }) => placement === side);
  if (term === undefined) {
    return undefined;
  }
  const { id } = term;
  const edge = edges.find(([from, to]) => from === id || to === id);
  if (edge === undefined) {
    return undefined;
  }
  const [from, to] = edge;
  const inward = from === id;
  const at = main.findIndex((node) => node.id === (inward ? to : from));
  return at === -1 ? undefined : { term, at, inward };
};

/** Resolves a {@link SlideGraphNode} into its main row and optional above and below branches. */
export const graphLayout = (node: SlideGraphNode): GraphLayout => {
  const main = node.nodes.filter(({ placement }) => placement === undefined);
  return {
    main,
    above: branch(node, main, 'above'),
    below: branch(node, main, 'below'),
  };
};
