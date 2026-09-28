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

import { contextWith, isObjectLike } from './context_view';

/** The attribute {@link nodeAnchor} sets to a node's {@link anchorValue}. */
export const NODE_ANCHOR_ATTRIBUTE = 'data-isomer-node';

/**
 * A node type as its anchor carries it. Every character outside `[A-Za-z0-9_-]`
 * becomes `%<hex code point>;`, so the value survives HTML serialization and
 * parsing unchanged and never throws. A plain identifier stays as it is.
 */
export const anchorValue = (type: string): string =>
  type.replace(/[^\w-]/gu, (char) => `%${char.codePointAt(0)!.toString(16)};`);

/** Marks a context whose subtree renders no anchors; see {@link withoutAnchors}. */
const NO_ANCHORS = Symbol.for('isomer.anchors.off');

/**
 * Where an HTML render keeps its anchor decision while it runs. On `globalThis`
 * under a `Symbol.for` key, so an ESM and a CommonJS copy of the SDK share it.
 */
const ACTIVE = Symbol.for('isomer.anchors.active');

type AnchorScope = { [ACTIVE]?: boolean };

const activeAnchors = (): boolean | undefined =>
  (globalThis as AnchorScope)[ACTIVE];

/**
 * Runs `render` with anchors on or off for every {@link nodeAnchor} it reaches,
 * whatever each render context says. The render must be synchronous; the
 * previous state comes back afterwards, even if it throws.
 */
export const withAnchors = <TResult>(
  on: boolean,
  render: () => TResult
): TResult => {
  const scope = globalThis as AnchorScope;
  const outer = scope[ACTIVE];
  scope[ACTIVE] = on;
  try {
    return render();
  } finally {
    if (outer === undefined) {
      delete scope[ACTIVE];
    } else {
      scope[ACTIVE] = outer;
    }
  }
};

/**
 * `context` for content a renderer draws that is not one of its `children`,
 * such as an embedded composition: nothing under it renders an anchor.
 *
 * The result is a view of `context`, not a copy: reads go to `context` itself,
 * with methods bound to it, so getters, methods, private state, and
 * `instanceof` behave as before. The mark survives a context derived from it
 * by spreading. A context that is neither an object nor a function is
 * returned as it is.
 */
export const withoutAnchors = <TContext>(context: TContext): TContext =>
  contextWith(context, NO_ANCHORS, true);

/** A view of `context` whose `anchors` is `on`, for a React render outside the html surface; see {@link withoutAnchors}. */
export const withContextAnchors = <TContext>(
  context: TContext,
  on: boolean
): TContext => contextWith(context, 'anchors', on);

const anchorsOn = (context: unknown): boolean => {
  const carries = isObjectLike(context);
  if (carries && Reflect.get(context, NO_ANCHORS) === true) {
    return false;
  }
  return (
    activeAnchors() ??
    (carries && (context as { anchors?: unknown }).anchors === true)
  );
};

/**
 * Props a `react` renderer spreads on its root element so runtime code can find
 * the node with {@link findNodeElements}. Inside an HTML surface render the
 * surface decides; elsewhere, on the React and `svg` surfaces, `context.anchors`
 * does. Always empty under {@link withoutAnchors}.
 */
export const nodeAnchor = (
  context: unknown,
  { type }: { type: string }
): Readonly<Record<string, string>> =>
  anchorsOn(context) ? { [NODE_ANCHOR_ATTRIBUTE]: anchorValue(type) } : {};

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
 * Every `react`-visible node of `body`, walked pre-order, with the element
 * its anchor marks under `root`: the k-th node of a type pairs with the k-th
 * element anchored with that type in document order. `root` holds one render.
 *
 * Pairing holds because every renderer draws its `children` in the order its
 * definition's `children` returns them. A type whose node and element counts
 * disagree, for instance because one of its nodes rendered nothing, pairs with
 * no element. A node object that appears twice appears twice here, each time
 * with its own element.
 */
export const findNodeElementPairs = (
  root: ParentNode,
  body: readonly unknown[],
  walk: ChildNodeWalker
): { node: unknown; element: Element | undefined }[] => {
  // Grouped by attribute value, so a type is never read as selector syntax.
  const elementsByValue = new Map<string, Element[]>();
  for (const element of root.querySelectorAll(`[${NODE_ANCHOR_ATTRIBUTE}]`)) {
    const value = element.getAttribute(NODE_ANCHOR_ATTRIBUTE) ?? '';
    const elements = elementsByValue.get(value) ?? [];
    elements.push(element);
    elementsByValue.set(value, elements);
  }
  const nodes = anchoredNodes(body, walk);
  const counts = new Map<string, number>();
  for (const node of nodes) {
    const type = nodeType(node);
    if (type !== undefined) {
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
  }
  const seen = new Map<string, number>();
  return nodes.map((node) => {
    const type = nodeType(node);
    if (type === undefined) {
      return { node, element: undefined };
    }
    const index = seen.get(type) ?? 0;
    seen.set(type, index + 1);
    const elements = elementsByValue.get(anchorValue(type)) ?? [];
    return {
      node,
      element:
        elements.length === counts.get(type) ? elements[index] : undefined,
    };
  });
};

/** {@link findNodeElementPairs} as a map from node to element, for a body with no node object reused. */
export const findNodeElements = (
  root: ParentNode,
  body: readonly unknown[],
  walk: ChildNodeWalker
): Map<unknown, Element> =>
  new Map(
    findNodeElementPairs(root, body, walk).flatMap(({ node, element }) =>
      element === undefined ? [] : [[node, element] as const]
    )
  );
