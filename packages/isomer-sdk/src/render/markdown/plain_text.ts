/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Nodes } from 'mdast';

export const footnoteLabel = ({
  identifier,
  label,
}: {
  identifier: string;
  label?: string | null | undefined;
}): string => `[^${label ?? identifier}]`;

// Takes `unknown` so mdast stays out of the emitted declarations.
export const plainText = (value: unknown): string => {
  const node = value as Nodes;
  if ('value' in node) {
    return node.value;
  }
  if (node.type === 'image') {
    return node.alt ?? '';
  }
  if (node.type === 'footnoteReference') {
    return footnoteLabel(node);
  }
  return 'children' in node ? node.children.map(plainText).join('') : '';
};
