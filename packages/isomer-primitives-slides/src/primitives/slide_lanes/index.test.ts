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

import { example, examples } from './examples';
import { markdown, text } from './index';
import { schema, type SlideLanesNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [node],
});

const authored = ({ lanes, join, notes = [] }: SlideLanesNode): string[] => [
  join,
  ...lanes.flatMap(({ label, steps }) => [label, ...steps]),
  ...notes.flatMap(({ title, body }) => [title, body]),
];

describe('slideLanes', () => {
  it('validates every example', () => {
    for (const node of examples) {
      expect(runtime.validate(compose(node)).errors).toEqual([]);
    }
  });

  it('holds exactly two lanes of one to five steps', () => {
    const [lane] = example.lanes;
    expect(schema.safeParse({ ...example, lanes: [lane] }).success).toBe(false);
    expect(
      schema.safeParse({ ...example, lanes: [lane, lane, lane] }).success
    ).toBe(false);
    expect(
      schema.safeParse({
        ...example,
        lanes: [lane, { ...lane, steps: Array(6).fill('Step') }],
      }).success
    ).toBe(false);
  });

  it('holds up to four notes', () => {
    const [note] = example.notes ?? [];
    expect(
      schema.safeParse({ ...example, notes: Array(5).fill(note) }).success
    ).toBe(false);
  });

  it('renders a line per lane, then the notes', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "Web: Basket → Address → Slot → Review → Place order
      Phone: Call → Agent form → Read back → Confirm → Place order

      Self-serve: The customer picks the slot. Validation runs on every field as they type.
      Assisted: An agent keys the order while the customer waits, then reads it back before placing it."
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "- **Web:** Basket → Address → Slot → Review → Place order
      - **Phone:** Call → Agent form → Read back → Confirm → Place order

      **Self-serve:** The customer picks the slot. Validation runs on every field as they type.

      **Assisted:** An agent keys the order while the customer waits, then reads it back before placing it."
    `);
  });

  it('keeps every authored string on every degraded surface', () => {
    for (const node of examples) {
      const composition = compose(node);
      const outputs = [
        runtime.surfaces.text.render(composition),
        runtime.surfaces.markdown.render(composition),
        JSON.stringify(runtime.surfaces.slack.render(composition).blocks),
      ].map((output) => output.toLowerCase());
      for (const value of authored(node)) {
        for (const output of outputs) {
          expect(output).toContain(value.toLowerCase());
        }
      }
    }
  });
});
