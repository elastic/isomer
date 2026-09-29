/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { core } from 'zod';

import {
  childNodePath,
  type ChildNodeWalker,
  createChildNodeWalker,
} from '../composition/body_node_base';
import type { ValidationError } from '../composition/validation_error';
import type { AnyPrimitiveDefinition } from '../define/primitive_module';
import {
  declaredFieldsNote,
  formatPath,
  formatZodIssue,
} from '../define/zod_format';

/** A node an issue path can start from, and its path. */
export type IssueRoot = readonly [node: unknown, path: string];

/**
 * The raw `type` of each node `walk` reaches from `roots`, keyed by its path.
 * The input has failed a schema, so a node whose children cannot be walked adds none.
 */
const nodeTypesByPath = (
  roots: readonly IssueRoot[],
  walk: ChildNodeWalker
): Map<string, unknown> => {
  const types = new Map<string, unknown>();
  const visit = (node: unknown, path: string): void => {
    if (typeof node !== 'object' || node === null) {
      return;
    }
    types.set(path, (node as { type?: unknown }).type);
    let children: ReturnType<ChildNodeWalker>;
    try {
      children = walk(node);
    } catch {
      return;
    }
    children.forEach(({ node: child, path: field }) => {
      visit(child, childNodePath(path, field));
    });
  };
  roots.forEach(([node, path]) => visit(node, path));
  return types;
};

/**
 * Builds the formatter that converts Zod issues with {@link formatZodIssue},
 * each error naming the innermost node its path lands in when that node's type
 * is known, and an unknown key on a node appending {@link declaredFieldsNote}.
 */
export const createNodeIssueFormatter = (
  definitions: readonly AnyPrimitiveDefinition[]
): ((
  roots: readonly IssueRoot[],
  issues: ReadonlyArray<core.$ZodIssue>,
  basePath?: string
) => ValidationError[]) => {
  const walk = createChildNodeWalker(definitions);
  const fieldNotes = new Map(
    definitions.map(({ type, schema }) => [type, declaredFieldsNote(schema)])
  );
  const knownType = (type: unknown): string | undefined =>
    typeof type === 'string' && fieldNotes.has(type) ? type : undefined;
  return (roots, issues, basePath = '') => {
    const nodes = nodeTypesByPath(roots, walk);
    const nodeTypeAt = (segments: readonly PropertyKey[]) =>
      segments
        .reduce(
          (paths, segment) => [...paths, formatPath([segment], paths.at(-1))],
          [basePath]
        )
        .reduce<string | undefined>(
          (found, path) =>
            nodes.has(path) ? knownType(nodes.get(path)) : found,
          undefined
        );
    return issues.map((issue) => {
      const error = formatZodIssue(issue, basePath);
      const nodeType = nodeTypeAt(issue.path);
      if (nodeType === undefined) {
        return error;
      }
      const message =
        issue.code === 'unrecognized_keys' && nodes.get(error.path) === nodeType
          ? `${error.message}; ${fieldNotes.get(nodeType)}`
          : error.message;
      return { ...error, message, nodeType };
    });
  };
};
