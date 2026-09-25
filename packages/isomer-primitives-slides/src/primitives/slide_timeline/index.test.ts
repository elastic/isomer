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
import { schema, type SlideTimelineNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [node],
});

const authored = ({ items }: SlideTimelineNode): string[] =>
  items.flatMap(({ label, channel, heading, body }) => [
    label,
    channel,
    heading,
    body,
  ]);

describe('slideTimeline', () => {
  it('validates every example', () => {
    for (const node of examples) {
      expect(runtime.validate(compose(node)).errors).toEqual([]);
    }
  });

  it('rejects more than one current item', () => {
    const [first, second, ...rest] = example.items;
    const result = schema.safeParse({
      ...example,
      items: [
        { ...first, current: true },
        { ...second, current: true },
        ...rest,
      ],
    });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['items'],
      message: 'at most one item can be current',
    });
  });

  it('holds three to five items', () => {
    const [item] = example.items;
    expect(schema.safeParse({ ...example, items: [item, item] }).success).toBe(
      false
    );
    expect(
      schema.safeParse({ ...example, items: Array(6).fill(item) }).success
    ).toBe(false);
  });

  it('renders text and markdown with the current item marked', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "2019 · Phone. “Can I order by calling the store?” Staff took orders by hand and keyed them in after close.
      2021 · Web. “Let me build a basket online.” The site worked, but substitutions still needed a phone call.
      2023 · App. “Tell me when my driver is close.” Live tracking shipped; the substitution flow stayed on the web.
      2025 · Chat (now). “Just swap the oat milk if it is out.” Customers now approve substitutions in a message, not a form."
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "- **2019 · Phone.** “Can I order by calling the store?” Staff took orders by hand and keyed them in after close.
      - **2021 · Web.** “Let me build a basket online.” The site worked, but substitutions still needed a phone call.
      - **2023 · App.** “Tell me when my driver is close.” Live tracking shipped; the substitution flow stayed on the web.
      - **2025 · Chat (now).** “Just swap the oat milk if it is out.” Customers now approve substitutions in a message, not a form."
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
