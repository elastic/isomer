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
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

describe('slideAgenda', () => {
  it('validates every example', () => {
    for (const node of examples) {
      expect(runtime.validate(compose(node)).errors).toEqual([]);
    }
  });

  it('rejects more than one current section', () => {
    const [first, second, ...rest] = example.sections;
    const result = schema.safeParse({
      ...example,
      sections: [
        { ...first, current: true },
        { ...second, current: true },
        ...rest,
      ],
    });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['sections'],
      message: 'at most one section can be current',
    });
  });

  it('holds two to eight sections', () => {
    const [section] = example.sections;
    expect(schema.safeParse({ ...example, sections: [section] }).success).toBe(
      false
    );
    expect(
      schema.safeParse({ ...example, sections: Array(9).fill(section) }).success
    ).toBe(false);
  });

  it('renders text, markdown, and Slack with the current section marked', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "01 Why returns cost us · 3 slides
      02 What customers told us · 4 slides
      03 The new returns flow · 5 slides (you are here)
      04 Rolling it out · 3 slides
      05 Questions · 2 slides"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "- **01** Why returns cost us · 3 slides
      - **02** What customers told us · 4 slides
      - **03** The new returns flow · 5 slides (you are here)
      - **04** Rolling it out · 3 slides
      - **05** Questions · 2 slides"
    `);
    expect(runtime.surfaces.slack.render(compose(example)).blocks)
      .toMatchInlineSnapshot(`
      [
        {
          "text": {
            "text": "- *01* Why returns cost us · 3 slides
      - *02* What customers told us · 4 slides
      - *03* The new returns flow · 5 slides (you are here)
      - *04* Rolling it out · 3 slides
      - *05* Questions · 2 slides",
            "type": "mrkdwn",
          },
          "type": "section",
        },
      ]
    `);
  });
});
