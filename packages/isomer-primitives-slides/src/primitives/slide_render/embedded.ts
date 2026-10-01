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

type TreePath = (string | number)[];

/** What {@link findInTree} found: a path or nothing. */
export type TreeSearch = { kind: 'found'; path: TreePath } | { kind: 'none' };

interface Frame {
  value: object;
  /** Own keys of a record; `undefined` for an array, which is read by index. */
  keys: readonly string[] | undefined;
  next: number;
  /** This value's key in its parent. */
  key: string | number;
}

/**
 * The first record under `root`, pre-order, that `match` accepts, walked without recursion one child at a time and each object once. `skip` leaves out a record's key.
 *
 * It sets no budget of its own: the runtime runs `checkInputBudget` before any schema, and a primitive's own `schema` does not parse its body recursively.
 */
export const findInTree = (
  root: unknown,
  match: (record: Record<string, unknown>) => boolean,
  skip: (record: Record<string, unknown>, key: string) => boolean = () => false
): TreeSearch => {
  const frames: Frame[] = [];
  const seen = new Set<object>();
  const enter = (
    value: unknown,
    key: string | number
  ): TreeSearch | undefined => {
    if (typeof value !== 'object' || value === null || seen.has(value)) {
      return undefined;
    }
    seen.add(value);
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
          if (search.kind === 'found') {
            ctx.addIssue({
              code: 'custom',
              message: 'an embedded body cannot hold another render',
              path: search.path,
            });
          }
        },
        [frameRule, nestedRule]
      )
    )
    .describe(`${lead} ${frameRule} Its ids are its own. ${nestedRule}`);
