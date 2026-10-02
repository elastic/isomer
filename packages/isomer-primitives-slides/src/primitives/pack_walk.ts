/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A schema cannot import the registry, which imports every schema, so `definePrimitive` records each definition here instead.

import {
  type ChildNodeWalker,
  createChildNodeWalker,
} from '@elastic/isomer-sdk';

type WalkedDefinition = Parameters<typeof createChildNodeWalker>[0][number];

const defined: WalkedDefinition[] = [];
let walker: ChildNodeWalker | undefined;

export const recordDefinition = (definition: WalkedDefinition): void => {
  defined.push(definition);
  walker = undefined;
};

/** The child slots of every primitive this pack defines; another pack's node is a leaf. */
export const packWalk: ChildNodeWalker = (node) =>
  (walker ??= createChildNodeWalker(defined))(node);
