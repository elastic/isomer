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

/** The attribute {@link nodeAnchor} sets to a node's {@link anchorValue}. */
export const NODE_ANCHOR_ATTRIBUTE = 'data-isomer-node';

/**
 * A node type as its anchor carries it. Every character outside `[A-Za-z0-9_-]`
 * becomes `%<hex code point>;`, so the value survives HTML serialization and
 * parsing unchanged and never throws. A plain identifier stays as it is.
 */
export const anchorValue = (type: string): string =>
  type.replace(/[^\w-]/gu, (char) => `%${char.codePointAt(0)!.toString(16)};`);

const anchorsOn = (context: unknown): boolean =>
  typeof context === 'object' &&
  context !== null &&
  (context as { anchors?: unknown }).anchors === true;

/**
 * Props a `react` renderer spreads on its root element so runtime code can find
 * the node with {@link findNodeElements}. Empty unless `context.anchors` is set.
 *
 * Anything a renderer draws that is not one of its `children` must render with
 * anchors off, or pairing by order drifts.
 */
export const nodeAnchor = (
  context: unknown,
  { type }: { type: string }
): Readonly<Record<string, string>> =>
  anchorsOn(context) ? { [NODE_ANCHOR_ATTRIBUTE]: anchorValue(type) } : {};

/**
 * Runs `render` with `context.anchors` set to `on`, then puts the context's own
 * value back. The write is in place, so identity, prototype, and private state
 * stay as they are. A context that already agrees, or is not an object, is
 * passed as it is; one that refuses the write is copied.
 */
export const withAnchors = <TContext, TResult>(
  context: TContext,
  on: boolean,
  render: (context: TContext) => TResult
): TResult => {
  if (
    typeof context !== 'object' ||
    context === null ||
    anchorsOn(context) === on
  ) {
    return render(context);
  }
  const hadOwn = Object.hasOwn(context, 'anchors');
  const previous: unknown = Reflect.get(context, 'anchors');
  if (!Reflect.set(context, 'anchors', on)) {
    const copy = Object.assign(
      Object.create(Object.getPrototypeOf(context) as object | null) as object,
      context
    );
    Object.defineProperty(copy, 'anchors', {
      value: on,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    return render(copy);
  }
  try {
    return render(context);
  } finally {
    if (!hadOwn && Object.hasOwn(context, 'anchors')) {
      Reflect.deleteProperty(context, 'anchors');
    } else {
      Reflect.set(context, 'anchors', previous);
    }
  }
};

/** The `react`-visible nodes of `body`, pre-order: the order their anchors render in. */
export const anchoredNodes = (
  body: readonly unknown[],
  walk: ChildNodeWalker
): unknown[] =>
  body.flatMap((node) =>
    isVisibleOnSurface(node, 'react')
      ? [
          node,
          ...anchoredNodes(
            walk(node).map((child) => child.node),
            walk
          ),
        ]
      : []
  );

/** A node's `type`, when it has one. */
export const nodeType = (node: unknown): string | undefined => {
  const { type } = node as { type?: unknown };
  return typeof type === 'string' ? type : undefined;
};

/**
 * Each node of `body` whose rendered root carries its anchor, paired by type
 * and order: the k-th `react`-visible node of a type, walked pre-order, is the
 * k-th element anchored with that type in document order. `root` holds one
 * render.
 *
 * Pairing holds because every renderer draws its `children` in the order its
 * definition's `children` returns them. A type whose node and element counts
 * disagree, for instance because one of its nodes rendered nothing, is left
 * out.
 */
export const findNodeElements = (
  root: ParentNode,
  body: readonly unknown[],
  walk: ChildNodeWalker
): Map<unknown, Element> => {
  // Grouped by attribute value, so a type is never read as selector syntax.
  const elementsByValue = new Map<string, Element[]>();
  for (const element of root.querySelectorAll(`[${NODE_ANCHOR_ATTRIBUTE}]`)) {
    const value = element.getAttribute(NODE_ANCHOR_ATTRIBUTE) ?? '';
    const elements = elementsByValue.get(value) ?? [];
    elements.push(element);
    elementsByValue.set(value, elements);
  }
  const nodesByType = new Map<string, unknown[]>();
  for (const node of anchoredNodes(body, walk)) {
    const type = nodeType(node);
    if (type !== undefined) {
      const nodes = nodesByType.get(type) ?? [];
      nodes.push(node);
      nodesByType.set(type, nodes);
    }
  }
  const found = new Map<unknown, Element>();
  for (const [type, nodes] of nodesByType) {
    const elements = elementsByValue.get(anchorValue(type)) ?? [];
    if (elements.length !== nodes.length) {
      continue;
    }
    nodes.forEach((node, index) => found.set(node, elements[index]!));
  }
  return found;
};
