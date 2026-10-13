/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveExample, PrimitiveNode } from '@elastic/isomer-sdk';
import { primitiveExamples } from '@elastic/isomer-sdk';

/** One example as the Studio lists it. */
export interface StudioExample {
  name: string;
  description?: string;
  node: PrimitiveNode;
}

const IDENTIFIER = /^[\w-]{1,24}$/;

/** Keys whose short, identifier-like string values differ between examples, such as `tone`. */
const distinguishingKeys = (nodes: readonly PrimitiveNode[]): string[] => {
  const values = new Map<string, Set<string>>();

  nodes.forEach((node) =>
    Object.entries(node).forEach(([key, value]) => {
      if (
        key === 'type' ||
        key === 'id' ||
        typeof value !== 'string' ||
        !IDENTIFIER.test(value)
      ) {
        return;
      }
      values.set(key, (values.get(key) ?? new Set()).add(value));
    })
  );

  return [...values].filter(([, seen]) => seen.size > 1).map(([key]) => key);
};

const labelFor = (
  node: PrimitiveNode,
  index: number,
  keys: readonly string[]
): string => {
  const fields = new Map<string, unknown>(Object.entries(node));
  const parts = keys.flatMap((key) => {
    const value = fields.get(key);
    return typeof value === 'string' ? [`${key}: ${value}`] : [];
  });

  return parts.length
    ? `Example ${index + 1} (${parts.join(', ')})`
    : `Example ${index + 1}`;
};

/** A definition's examples, labeling a bare node by the short values that tell it apart from the others. */
export const readExamples = (definition: {
  examples: readonly (PrimitiveNode | PrimitiveExample)[];
}): StudioExample[] => {
  const examples = primitiveExamples(definition);
  const keys = distinguishingKeys(
    examples.filter(({ name }) => name === undefined).map(({ node }) => node)
  );

  return examples.map(({ name, description, node }, index) => ({
    name: name ?? labelFor(node, index, keys),
    ...(description === undefined ? {} : { description }),
    node,
  }));
};
