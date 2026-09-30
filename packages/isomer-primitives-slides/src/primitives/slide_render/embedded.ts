/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';
import type { ZodType } from 'zod';

import { crossSuperRefine } from '../cross_field';

/** Primitive types that hold an embedded body. */
export const EMBEDDING_TYPES: ReadonlySet<string> = new Set([
  'slideAnnotatedRender',
  'slideRender',
  'slideRenderGrid',
]);

/** How deep {@link findInTree} descends through arrays and objects before it refuses. */
export const TREE_WALK_MAX_DEPTH = 64;

/** How many values {@link findInTree} examines, children of any type included, before it refuses. */
export const TREE_WALK_MAX_VALUES = 10_000;

type TreePath = (string | number)[];

/** What {@link findInTree} found: a path, nothing, or a limit it stopped at. */
export type TreeSearch =
  | { kind: 'found'; path: TreePath }
  | { kind: 'none' }
  | { kind: 'tooDeep' }
  | { kind: 'tooLarge' };

interface Frame {
  value: object;
  /** Own keys of a record; `undefined` for an array, which is read by index. */
  keys: readonly string[] | undefined;
  next: number;
  /** This value's key in its parent. */
  key: string | number;
}

/**
 * The first record under `root`, pre-order, that `match` accepts, walked without recursion one child at a time. `skip` leaves out a record's key; past {@link TREE_WALK_MAX_DEPTH} levels or {@link TREE_WALK_MAX_VALUES} values the walk refuses.
 */
export const findInTree = (
  root: unknown,
  match: (record: Record<string, unknown>) => boolean,
  skip: (record: Record<string, unknown>, key: string) => boolean = () => false
): TreeSearch => {
  let examined = 0;
  const frames: Frame[] = [];
  const enter = (
    value: unknown,
    key: string | number
  ): TreeSearch | undefined => {
    examined += 1;
    if (examined > TREE_WALK_MAX_VALUES) {
      return { kind: 'tooLarge' };
    }
    if (typeof value !== 'object' || value === null) {
      return undefined;
    }
    if (frames.length > TREE_WALK_MAX_DEPTH) {
      return { kind: 'tooDeep' };
    }
    const array = Array.isArray(value);
    if (!array && match(value as Record<string, unknown>)) {
      return {
        kind: 'found',
        path: [
          ...frames.slice(1).map((frame) => frame.key),
          ...(frames.length > 0 ? [key] : []),
        ],
      };
    }
    frames.push({
      value,
      keys: array ? undefined : Object.keys(value),
      next: 0,
      key,
    });
    return undefined;
  };
  let result = enter(root, '');
  while (!result && frames.length > 0) {
    const frame = frames[frames.length - 1]!;
    const { value, keys } = frame;
    const length = keys ? keys.length : (value as unknown[]).length;
    if (frame.next >= length) {
      frames.pop();
      continue;
    }
    const at = frame.next;
    frame.next += 1;
    if (keys) {
      const record = value as Record<string, unknown>;
      const key = keys[at]!;
      if (!skip(record, key)) {
        result = enter(record[key], key);
      }
    } else {
      result = enter((value as unknown[])[at], at);
    }
  }
  return result ?? { kind: 'none' };
};

/** The first {@link EMBEDDING_TYPES} node anywhere inside `value`. */
export const findNestedRender = (value: unknown): TreeSearch =>
  findInTree(
    value,
    ({ type }) => typeof type === 'string' && EMBEDDING_TYPES.has(type)
  );

/** The walk budget, as a body's description states it. */
export const treeLimitRule = `It nests at most ${TREE_WALK_MAX_DEPTH} levels deep and holds at most ${TREE_WALK_MAX_VALUES} values.`;

/** Why a {@link TreeSearch} stopped short, as a validation message; `undefined` when it did not. */
export const treeLimitMessage = (search: TreeSearch): string | undefined =>
  search.kind === 'tooDeep'
    ? `nests deeper than ${TREE_WALK_MAX_DEPTH} levels`
    : search.kind === 'tooLarge'
      ? `holds more than ${TREE_WALK_MAX_VALUES} values`
      : undefined;

const isFrame = (node: unknown): boolean =>
  typeof node === 'object' &&
  node !== null &&
  (node as { type?: unknown }).type === 'slideFrame';

const frameRule =
  'One `slideFrame` alone, holding a whole slide, or one or more nodes that are not frames.';

const nestedRule =
  'It cannot hold another slideRender, slideRenderGrid, or slideAnnotatedRender.';

/**
 * An embedded body, described as `lead` then its rules. It is not a walked child, so its ids are its own and nothing in it renders an anchor.
 */
export const embeddedBody = (bodyNodeSchema: ZodType<unknown>, lead: string) =>
  z
    .array(bodyNodeSchema)
    .min(1)
    .check(
      crossSuperRefine<unknown[]>(
        (body, ctx) => {
          if (body.length > 1) {
            body.forEach((node, index) => {
              if (isFrame(node)) {
                ctx.addIssue({
                  code: 'custom',
                  message:
                    'a slideFrame must be the only node of an embedded body',
                  path: [index],
                });
              }
            });
          }
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
        },
        [frameRule, nestedRule, treeLimitRule]
      )
    )
    .describe(
      `${lead} ${frameRule} Its ids are its own. ${nestedRule} ${treeLimitRule}`
    );
