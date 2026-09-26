/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';

import { example, examples, menuExample } from './examples';
import { markdown, text } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [node],
});

describe('slideQuadrant', () => {
  it('validates every example', () => {
    for (const node of examples) {
      expect(runtime.validate(compose(node)).errors).toEqual([]);
    }
  });

  it('holds exactly four quadrants of up to four items', () => {
    const [first, ...rest] = example.quadrants;
    expect(schema.safeParse({ ...example, quadrants: rest }).success).toBe(
      false
    );
    expect(
      schema.safeParse({ ...example, quadrants: [first, first, ...rest] })
        .success
    ).toBe(false);
    expect(
      schema.safeParse({
        ...example,
        quadrants: [{ ...first, items: Array(5).fill('chip') }, ...rest],
      }).success
    ).toBe(false);
  });

  it('renders the axes, then each quadrant with its place', () => {
    expect(text(menuExample)).toMatchInlineSnapshot(`
      "y: Slow → Popular · x: Thin margin → Rich margin
      Plowhorses (high y, low x): drip, bagel, muffin, tea
      Stars (high y, high x): latte, cold brew
      Dogs (low y, low x)
      Puzzles (low y, high x): matcha, affogato, cortado"
    `);
    expect(markdown(menuExample)).toMatchInlineSnapshot(`
      "y: Slow → Popular · x: Thin margin → Rich margin

      - **Plowhorses** (high y, low x): drip, bagel, muffin, tea
      - **Stars** (high y, high x): latte, cold brew
      - **Dogs** (low y, low x)
      - **Puzzles** (low y, high x): matcha, affogato, cortado"
    `);
  });
});
