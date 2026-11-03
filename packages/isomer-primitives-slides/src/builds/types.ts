/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExampleNode } from '@elastic/isomer-sdk';

/**
 * How an ordered primitive reveals one part per click. `units` finds each part's elements under the node's anchored root by tag and position, since class names are minified.
 */
export interface SlideBuild<TNode> {
  count: (node: TNode) => number;
  units: (owner: Element, node: TNode) => Element[][];
}

/** Each `li` under `owner`, one part apiece. */
export const listItemUnits = (owner: Element): Element[][] =>
  [...owner.querySelectorAll('li')].map((item) => [item]);

/** `definition` with the {@link SlideBuild} that reveals its parts; `slideBuilds` and `showSlideBuild` find it on the registered definition. */
export const withBuild = <
  TDefinition extends { readonly examples: readonly unknown[] },
>(
  definition: TDefinition,
  build: SlideBuild<ExampleNode<TDefinition['examples'][number]>>
): TDefinition & {
  readonly build: SlideBuild<ExampleNode<TDefinition['examples'][number]>>;
} => ({ ...definition, build });
