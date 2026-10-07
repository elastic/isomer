/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AnyPrimitiveDefinition,
  createChildNodeWalker,
  isVisibleOnSurface,
} from '@elastic/isomer-sdk';

/** A node this `snapshot` render measured as 0 because its primitive declares no `metrics.snapshotHeight`. */
export interface SnapshotHeightWarning {
  /** Path of the node within the composition, or `pages[n].…` on `renderPages`. */
  path: string;
  /** Safe to show a user. */
  message: string;
}

/** `JSON.stringify` leaves U+2028 and U+2029 raw, which would split the finding. */
const quoteType = (type: string): string =>
  JSON.stringify(type)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

/**
 * Nodes in `body` that are visible on `snapshot` and declare no `metrics.snapshotHeight`.
 *
 * `prefix` is prepended to each path (`pages[0]` on a paged render, empty for
 * one composition). A node hidden from `snapshot` is skipped with its children.
 */
export const collectSnapshotHeightWarnings = (
  definitions: readonly AnyPrimitiveDefinition[],
  body: readonly unknown[],
  prefix: string
): readonly SnapshotHeightWarning[] => {
  const unmeasured = new Set(
    definitions
      .filter((definition) => !definition.metrics?.snapshotHeight)
      .map((definition) => definition.type)
  );
  if (unmeasured.size === 0) {
    return [];
  }
  const walk = createChildNodeWalker(definitions);
  const warnings: SnapshotHeightWarning[] = [];
  const visit = (node: unknown, path: string): void => {
    if (!isVisibleOnSurface(node, 'snapshot')) {
      return;
    }
    const { type } = node as { type?: unknown };
    if (typeof type === 'string' && unmeasured.has(type)) {
      const full = prefix === '' ? path : `${prefix}.${path}`;
      warnings.push({
        path: full,
        message: `${full} type ${quoteType(type)} declares no snapshotHeight metric and will be measured as 0, sizing the frame short`,
      });
    }
    // Schema-invalid input can throw from `children`. Collect mode still renders.
    let children: ReturnType<typeof walk>;
    try {
      children = walk(node);
    } catch {
      return;
    }
    children.forEach(({ node: child, path: field }) => {
      visit(child, `${path}.${field}`);
    });
  };
  body.forEach((node, index) => {
    visit(node, `body[${index}]`);
  });
  return warnings;
};
