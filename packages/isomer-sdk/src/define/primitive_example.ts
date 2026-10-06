/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '../composition/node';

/** A published example with a name hosts can list it by. */
export interface PrimitiveExample<TNode extends PrimitiveNode = PrimitiveNode> {
  /** Short and unique within the primitive, such as `Warning tone`. */
  name: string;
  /** What the example demonstrates. */
  description?: string;
  node: TNode;
  /** Never set: an entry is a bare node exactly when it has a `type`. */
  type?: never;
}

/** An entry of `examples` read as one shape; `name` is absent for a bare node. */
export interface NormalizedPrimitiveExample<
  TNode extends PrimitiveNode = PrimitiveNode,
> {
  name?: string;
  description?: string;
  node: TNode;
}

/** The node type an `examples` entry holds. */
export type ExampleNode<TEntry> =
  TEntry extends PrimitiveExample<infer TNode> ? TNode : TEntry;

interface WithExamples {
  readonly examples: readonly (PrimitiveNode | PrimitiveExample)[];
}

/** Distributes over a union of definitions, so a mixed registry keeps every node type. */
type NodeOf<TDefinition extends WithExamples> = ExampleNode<
  TDefinition['examples'][number]
>;

const isPrimitiveExample = (
  entry: PrimitiveNode | PrimitiveExample
): entry is PrimitiveExample => !('type' in entry) && 'node' in entry;

const normalize = (
  entry: PrimitiveNode | PrimitiveExample
): NormalizedPrimitiveExample => {
  if (!isPrimitiveExample(entry)) {
    return { node: entry };
  }
  const { name, description, node } = entry;
  return description === undefined
    ? { name, node }
    : { name, description, node };
};

/** A definition's examples, bare or named, as {@link NormalizedPrimitiveExample}s. */
export const primitiveExamples = <TDefinition extends WithExamples>({
  examples,
}: TDefinition): NormalizedPrimitiveExample<NodeOf<TDefinition>>[] =>
  examples.map(normalize) as NormalizedPrimitiveExample<NodeOf<TDefinition>>[];

/** A definition's example nodes, without names. */
export const exampleNodes = <TDefinition extends WithExamples>({
  examples,
}: TDefinition): NodeOf<TDefinition>[] =>
  examples.map((entry) => normalize(entry).node) as NodeOf<TDefinition>[];
