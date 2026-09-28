/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideContentNode } from '../../body_node';

import type { SlideSplitSide } from './types';

/** A run of adjacent statements, or one node, with each item's index in `items`. */
export type SplitBlock =
  | { kind: 'statements'; statements: { text: string; index: number }[] }
  | { kind: 'node'; node: SlideContentNode; index: number };

/** Groups a side's items so adjacent statements share one list. */
export const splitBlocks = ({ items }: SlideSplitSide): SplitBlock[] =>
  items.reduce<SplitBlock[]>((blocks, item, index) => {
    const last = blocks.at(-1);
    if (typeof item !== 'string') {
      return [...blocks, { kind: 'node', node: item, index }];
    }
    if (last?.kind === 'statements') {
      last.statements.push({ text: item, index });
      return blocks;
    }
    return [
      ...blocks,
      { kind: 'statements', statements: [{ text: item, index }] },
    ];
  }, []);

/** A side's node items, with their paths under `side`. */
export const sideNodes = (
  { items }: SlideSplitSide,
  side: 'left' | 'right'
): { node: SlideContentNode; path: string }[] =>
  items.flatMap((item, index) =>
    typeof item === 'string'
      ? []
      : [{ node: item, path: `${side}.items[${index}]` }]
  );
