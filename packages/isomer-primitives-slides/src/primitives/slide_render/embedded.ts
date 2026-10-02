/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ChildNodeRef,
  type ChildNodeWalker,
  z,
} from '@elastic/isomer-sdk';
import type { ZodType } from 'zod';

import { crossSuperRefine } from '../cross_field';
import { packWalk } from '../pack_walk';

/** Primitive types that hold an embedded body. */
export const EMBEDDING_TYPES: ReadonlySet<string> = new Set([
  'slideAnnotatedRender',
  'slideRender',
  'slideRenderGrid',
]);

type TreePath = (string | number)[];

/** What {@link findNode} found: a path or nothing. */
export type TreeSearch = { kind: 'found'; path: TreePath } | { kind: 'none' };

/** One dotted step of a child path: `field` or `field[index]`. */
const PATH_STEP = /^([^.[\]]+)(?:\[(\d+)\])?$/;

const pathSteps = (path: string): TreePath =>
  path.split('.').flatMap((step) => {
    const match = PATH_STEP.exec(step);
    if (!match) {
      return [step];
    }
    const [, field, index] = match;
    return index === undefined ? [field!] : [field!, Number(index)];
  });

const childrenOf = (node: object, walk: ChildNodeWalker): ChildNodeRef[] => {
  try {
    return walk(node);
  } catch {
    // A node its definition cannot read is a leaf; its own schema reports it.
    return [];
  }
};

/**
 * The first node of `body` or below it, pre-order through the child slots `walk` declares, that `match` accepts, with its path from `body`.
 * Walked without recursion, each node object once. Other fields are data: a node type `walk` does not know is a leaf.
 */
export const findNode = (
  body: unknown,
  walk: ChildNodeWalker,
  match: (node: { type?: unknown }) => boolean
): TreeSearch => {
  interface Entry {
    node: unknown;
    steps: TreePath;
    parent: Entry | undefined;
  }
  const stack: Entry[] = [];
  const pushAll = (entries: readonly Entry[]) => {
    for (let at = entries.length - 1; at >= 0; at -= 1) {
      stack.push(entries[at]!);
    }
  };
  const pathOf = (entry: Entry): TreePath => {
    const parts: TreePath[] = [];
    for (let at: Entry | undefined = entry; at; at = at.parent) {
      parts.push(at.steps);
    }
    return parts.reverse().flat();
  };
  pushAll(
    Array.isArray(body)
      ? (body as unknown[]).map((node, index) => ({
          node,
          steps: [index],
          parent: undefined,
        }))
      : []
  );
  const seen = new Set<object>();
  for (let entry = stack.pop(); entry; entry = stack.pop()) {
    const { node } = entry;
    if (typeof node !== 'object' || node === null || seen.has(node)) {
      continue;
    }
    seen.add(node);
    if (match(node)) {
      return { kind: 'found', path: pathOf(entry) };
    }
    const parent = entry;
    pushAll(
      childrenOf(node, walk).map((child) => ({
        node: child.node,
        steps: pathSteps(child.path),
        parent,
      }))
    );
  }
  return { kind: 'none' };
};

/** The first {@link EMBEDDING_TYPES} node in `body`, through `walk`'s child slots. */
export const findNestedRender = (
  body: unknown,
  walk: ChildNodeWalker = packWalk
): TreeSearch =>
  findNode(
    body,
    walk,
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
