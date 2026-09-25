/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ChildNodeWalker,
  isVisibleOnSurface,
} from '../composition/body_node_base';
import type { PrimitiveRenderContext } from '../define/primitive_module';

/** The attribute {@link nodeAnchor} sets to a node's `type`. */
export const NODE_ANCHOR_ATTRIBUTE = 'data-isomer-node';

/**
 * Props a `react` renderer spreads on its root element so runtime code can find
 * the node with {@link findNodeElements}. Empty unless `context.anchors` is set.
 *
 * Anything a renderer draws that is not one of its `children` must render with
 * `anchors: false`, or pairing by order drifts.
 */
export const nodeAnchor = (
  context: PrimitiveRenderContext | undefined,
  { type }: { type: string }
): Readonly<Record<string, string>> =>
  context?.anchors ? { [NODE_ANCHOR_ATTRIBUTE]: type } : {};

/** The `react`-visible nodes of `body` by type, each list in pre-order. */
export const anchoredNodesByType = (
  body: readonly unknown[],
  walk: ChildNodeWalker
): Map<string, unknown[]> => {
  const byType = new Map<string, unknown[]>();
  const visit = (nodes: readonly unknown[]) => {
    for (const node of nodes) {
      if (!isVisibleOnSurface(node, 'react')) {
        continue;
      }
      const { type } = node as { type?: unknown };
      if (typeof type === 'string') {
        const nodes = byType.get(type) ?? [];
        nodes.push(node);
        byType.set(type, nodes);
      }
      visit(walk(node).map((child) => child.node));
    }
  };
  visit(body);
  return byType;
};

/**
 * Each node of `body` whose rendered root carries its anchor, paired by type
 * and order: the k-th `react`-visible node of a type, walked pre-order, is the
 * k-th element anchored with that type in document order.
 *
 * A type whose node and element counts disagree is left out.
 */
export const findNodeElements = (
  root: ParentNode,
  body: readonly unknown[],
  walk: ChildNodeWalker
): Map<unknown, Element> => {
  // Grouped by attribute value, so a type is never read as selector syntax.
  const elementsByType = new Map<string, Element[]>();
  for (const element of root.querySelectorAll(`[${NODE_ANCHOR_ATTRIBUTE}]`)) {
    const type = element.getAttribute(NODE_ANCHOR_ATTRIBUTE) ?? '';
    const elements = elementsByType.get(type) ?? [];
    elements.push(element);
    elementsByType.set(type, elements);
  }
  const found = new Map<unknown, Element>();
  for (const [type, nodes] of anchoredNodesByType(body, walk)) {
    const elements = elementsByType.get(type) ?? [];
    if (elements.length !== nodes.length) {
      continue;
    }
    nodes.forEach((node, index) => found.set(node, elements[index]!));
  }
  return found;
};
