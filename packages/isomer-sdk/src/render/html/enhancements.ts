/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChildNodeWalker } from '../../composition/body_node_base';
import type { PrimitiveNode } from '../../composition/node';
import type { EnhancementDefinition } from '../../pack/enhancements';

export type { EnhancementDefinition };

/** The requested enhancements the composition actually has content for. */
export const resolveEnhancements = (
  body: readonly PrimitiveNode[],
  requested: readonly string[] | undefined,
  walk: ChildNodeWalker,
  definitions: readonly EnhancementDefinition[]
): ReadonlySet<string> => {
  const wanted = new Set(requested ?? []);
  return new Set(
    definitions
      .filter(({ id }) => wanted.has(id))
      .filter((definition) => definition.appliesTo(body, walk))
      .map(({ id }) => id)
  );
};

/**
 * The script for a resolved enhancement set, deduplicated by id and emitted in
 * definition order so two enhancements cannot fight over ordering.
 */
export const enhancementScript = (
  enhancements: ReadonlySet<string>,
  definitions: readonly EnhancementDefinition[]
): string =>
  definitions
    .filter((definition) => enhancements.has(definition.id))
    .map((definition) => definition.script)
    .join('\n');
