/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChildNodeWalker,
  Composition,
  EnhancementDefinition,
} from '@elastic/isomer-sdk';

/** Registered enhancements whose `appliesTo` gate passes for `body`; a gate that throws on an invalid draft does not. */
export const applicableEnhancements = (
  definitions: readonly EnhancementDefinition[],
  body: Composition['body'],
  walk: ChildNodeWalker
): EnhancementDefinition[] =>
  definitions.filter((definition) => {
    try {
      return definition.appliesTo(body, walk);
    } catch {
      return false;
    }
  });
