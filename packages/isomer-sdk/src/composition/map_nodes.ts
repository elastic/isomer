/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChildNodeRef, ChildNodeWalker } from './body_node_base';
import type { Composition } from './composition';
import { IsomerError } from './error';
import type { PrimitiveNode } from './node';

/** One dotted step of a child path: `field` or `field[index]`. */
const PATH_STEP = /^([A-Za-z_$][\w$]*)(?:\[(\d+)\])?$/;

const unsupportedPath = (path: string): IsomerError =>
  new IsomerError(
    'UNSUPPORTED_CHILD_PATH',
    `mapCompositionNodes: cannot rewrite child at path "${path}"; expected dotted "field" or "field[index]" steps`
  );

/** `parent` with the value at `steps` replaced, every touched object and array copied. */
const withValueAt = (
  parent: unknown,
  steps: readonly string[],
  value: unknown,
  path: string
): unknown => {
  const [step, ...rest] = steps;
  const match = step === undefined ? null : PATH_STEP.exec(step);
  if (!match || typeof parent !== 'object' || parent === null) {
    throw unsupportedPath(path);
  }
  const field = match[1] as string;
  const record = parent as Record<string, unknown>;
  if (match[2] === undefined) {
    const next =
      rest.length === 0 ? value : withValueAt(record[field], rest, value, path);
    return { ...record, [field]: next };
  }
  const index = Number(match[2]);
  const current = record[field];
  if (!Array.isArray(current)) {
    throw unsupportedPath(path);
  }
  const array = [...(current as unknown[])];
  array[index] =
    rest.length === 0 ? value : withValueAt(array[index], rest, value, path);
  return { ...record, [field]: array };
};

/** A node being mapped: its children, how many are done, and its copy so far. */
interface Frame {
  node: PrimitiveNode;
  children: ChildNodeRef[];
  next: number;
  result: PrimitiveNode;
}

/**
 * Rebuilds `composition`'s body with `fn` applied to every node, including
 * the nested children `walk` yields.
 *
 * Post-order: a container reaches `fn` after its children have been mapped,
 * so `fn` sees the finished replacements in place. Build `walk` with
 * `createChildNodeWalker` over every pack in the composition.
 * A child path is the dotted `field` / `field[index]` form the SDK documents
 * (`items[0].node`); any other shape throws `UNSUPPORTED_CHILD_PATH`.
 * Walked without recursion, so depth is bounded by memory, not the call stack; a node nested in itself throws `CYCLIC_COMPOSITION`.
 */
export const mapCompositionNodes = <
  TNode extends PrimitiveNode = PrimitiveNode,
>(
  composition: Composition<TNode>,
  walk: ChildNodeWalker,
  fn: (node: PrimitiveNode) => PrimitiveNode
): Composition<TNode> => {
  const mapNode = (root: PrimitiveNode): PrimitiveNode => {
    const open = new Set<PrimitiveNode>();
    const stack: Frame[] = [];
    const enter = (node: PrimitiveNode) => {
      if (open.has(node)) {
        throw new IsomerError(
          'CYCLIC_COMPOSITION',
          'mapCompositionNodes: a node is nested in itself'
        );
      }
      open.add(node);
      stack.push({ node, children: walk(node), next: 0, result: node });
    };
    enter(root);
    for (;;) {
      const frame = stack[stack.length - 1]!;
      const child = frame.children[frame.next];
      if (child) {
        enter(child.node as PrimitiveNode);
        continue;
      }
      stack.pop();
      open.delete(frame.node);
      const mapped = fn(frame.result);
      const parent = stack[stack.length - 1];
      if (!parent) {
        return mapped;
      }
      const { path } = parent.children[parent.next]!;
      parent.result = withValueAt(
        parent.result,
        path.split('.'),
        mapped,
        path
      ) as PrimitiveNode;
      parent.next += 1;
    }
  };
  return {
    ...composition,
    body: composition.body.map((node) => mapNode(node) as TNode),
  };
};
