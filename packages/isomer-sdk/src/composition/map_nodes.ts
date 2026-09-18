/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createChildNodeWalker } from './body_node_base';
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

/**
 * Rebuilds `composition`'s body with `fn` applied to every node, including
 * nested children of every container `definitions` describes.
 *
 * Post-order: a container reaches `fn` after its children have been mapped,
 * so `fn` sees the finished replacements in place. `definitions` must span
 * every pack in the composition, as {@link createChildNodeWalker} requires.
 * A child path is the dotted `field` / `field[index]` form the SDK documents
 * (`items[0].node`); any other shape throws `UNSUPPORTED_CHILD_PATH`.
 */
export const mapCompositionNodes = <
  TNode extends PrimitiveNode = PrimitiveNode,
>(
  composition: Composition<TNode>,
  definitions: Parameters<typeof createChildNodeWalker>[0],
  fn: (node: PrimitiveNode) => PrimitiveNode
): Composition<TNode> => {
  const walk = createChildNodeWalker(definitions);
  const mapNode = (node: PrimitiveNode): PrimitiveNode =>
    fn(
      walk(node).reduce<PrimitiveNode>(
        (parent, { node: child, path }) =>
          withValueAt(
            parent,
            path.split('.'),
            mapNode(child as PrimitiveNode),
            path
          ) as PrimitiveNode,
        node
      )
    );
  return {
    ...composition,
    body: composition.body.map((node) => mapNode(node) as TNode),
  };
};
