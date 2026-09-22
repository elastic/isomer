/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// `body_node.ts` and `registry.ts` are both hand-maintained and nothing in the
// build graph forces them to agree; `body_node.ts` says why the union cannot be
// derived. A test file sits outside that cycle, so it can relate the two.

import { assertPackRegistrationComplete } from '@elastic/isomer-sdk/testing';
import { describe, expect, it } from 'vitest';

import type { BodyNode } from './body_node';
import { slideDeckPrimitives, slidePrimitiveTypes } from './registry';

/** Every node type reachable from the registry, via `examples: readonly TNode[]`. */
type Registered = (typeof slideDeckPrimitives)[number]['examples'][number];

// Tuple-wrapped so neither side distributes over the union.
type Assert<T extends true> = T;
type _RegisteredAreDeclared = Assert<
  [Registered] extends [BodyNode] ? true : false
>;
type _DeclaredAreRegistered = Assert<
  [BodyNode] extends [Registered] ? true : false
>;

describe('registry', () => {
  // The type assertions above only relate the two lists to each other; a
  // primitive missing from both leaves them agreeing. This reads the directory.
  it('registers every primitive directory', async () => {
    await assertPackRegistrationComplete({
      primitivesDir: new URL('./primitives/', import.meta.url),
      registered: slideDeckPrimitives,
    });
  });

  it('registers each type once', () => {
    expect(new Set(slidePrimitiveTypes).size).toBe(slidePrimitiveTypes.length);
  });

  it('stays alphabetically sorted', () => {
    expect(slidePrimitiveTypes).toEqual([...slidePrimitiveTypes].sort());
  });
});
