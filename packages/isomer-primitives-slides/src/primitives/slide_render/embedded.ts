/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';
import type { ZodType } from 'zod';

/** Primitive types that hold an embedded body. */
export const EMBEDDING_TYPES: ReadonlySet<string> = new Set([
  'slideAnnotatedRender',
  'slideRender',
  'slideRenderGrid',
]);

/** How deep {@link findInTree} descends through arrays and objects before it refuses. */
export const TREE_WALK_MAX_DEPTH = 64;

/** How many arrays and objects {@link findInTree} visits before it refuses. */
export const TREE_WALK_MAX_VALUES = 10_000;

type TreePath = (string | number)[];

/** What {@link findInTree} found: a path, nothing, or a limit it stopped at. */
export type TreeSearch =
  | { kind: 'found'; path: TreePath }
  | { kind: 'none' }
  | { kind: 'tooDeep' }
  | { kind: 'tooLarge' };

interface Visit {
  value: object;
  depth: number;
  parent: number;
  key: string | number;
}

/**
 * The first record under `root`, pre-order, that `match` accepts, walked without recursion. `skip` leaves out a record's key; past {@link TREE_WALK_MAX_DEPTH} or {@link TREE_WALK_MAX_VALUES} the walk refuses.
 */
export const findInTree = (
  root: unknown,
  match: (record: Record<string, unknown>) => boolean,
  skip: (record: Record<string, unknown>, key: string) => boolean = () => false
): TreeSearch => {
  if (typeof root !== 'object' || root === null) {
    return { kind: 'none' };
  }
  const visits: Visit[] = [];
  const stack: Visit[] = [{ value: root, depth: 0, parent: -1, key: '' }];
  const pathTo = (index: number): TreePath => {
    const path: TreePath = [];
    for (let at = index; at > 0; at = visits[at]!.parent) {
      path.unshift(visits[at]!.key);
    }
    return path;
  };
  for (let visit = stack.pop(); visit; visit = stack.pop()) {
    if (visit.depth > TREE_WALK_MAX_DEPTH) {
      return { kind: 'tooDeep' };
    }
    if (visits.length === TREE_WALK_MAX_VALUES) {
      return { kind: 'tooLarge' };
    }
    const index = visits.push(visit) - 1;
    const { value, depth } = visit;
    const record = value as Record<string, unknown>;
    if (!Array.isArray(value) && match(record)) {
      return { kind: 'found', path: pathTo(index) };
    }
    const entries: [string | number, unknown][] = Array.isArray(value)
      ? value.map((item, at) => [at, item])
      : Object.entries(record).filter(([key]) => !skip(record, key));
    for (let at = entries.length - 1; at >= 0; at -= 1) {
      const [key, child] = entries[at]!;
      if (typeof child === 'object' && child !== null) {
        stack.push({ value: child, depth: depth + 1, parent: index, key });
      }
    }
  }
  return { kind: 'none' };
};

/** The first {@link EMBEDDING_TYPES} node anywhere inside `value`. */
export const findNestedRender = (value: unknown): TreeSearch =>
  findInTree(
    value,
    ({ type }) => typeof type === 'string' && EMBEDDING_TYPES.has(type)
  );

/** Why a {@link TreeSearch} stopped short, as a validation message; `undefined` when it did not. */
export const treeLimitMessage = (search: TreeSearch): string | undefined =>
  search.kind === 'tooDeep'
    ? `nests deeper than ${TREE_WALK_MAX_DEPTH} levels`
    : search.kind === 'tooLarge'
      ? `holds more than ${TREE_WALK_MAX_VALUES} values`
      : undefined;

/**
 * An embedded body: whole slides, so a `slideFrame` is allowed. It is not a walked child, so its ids are its own and nothing in it renders an anchor.
 */
export const embeddedBody = (bodyNodeSchema: ZodType<unknown>) =>
  z
    .array(bodyNodeSchema)
    .min(1)
    .check(
      z.superRefine((body, ctx) => {
        const search = findNestedRender(body);
        const limit = treeLimitMessage(search);
        if (limit) {
          ctx.addIssue({
            code: 'custom',
            message: `an embedded body cannot be checked: it ${limit}`,
          });
        } else if (search.kind === 'found') {
          ctx.addIssue({
            code: 'custom',
            message: 'an embedded body cannot hold another render',
            path: search.path,
          });
        }
      })
    );
