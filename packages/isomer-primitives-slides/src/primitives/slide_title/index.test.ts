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
import { columnWidth } from '../../theme/components/frame';
import { statement, statementFit } from '../../theme/components/statement';
import { title, titleShares } from '../../theme/components/title';
import { scalePx } from '../../theme/scale';
import { narrowing, sizeForLoad } from '../size';

import { example, examples } from './examples';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [
    { type: 'slideFrame', tone: 'inverse', body: [node] } as PrimitiveNode,
  ],
});

describe('slideTitle', () => {
  it('validates every example inside an inverse frame', () => {
    for (const node of examples) {
      expect(runtime.validate(compose(node)).errors).toEqual([]);
    }
  });

  it('rejects an aside that is not a slide node', () => {
    const { errors } = runtime.validate(
      compose({ ...example, aside: { type: 'nope' } } as PrimitiveNode)
    );
    expect(errors).not.toEqual([]);
  });

  it('rejects the retired fields', () => {
    const { errors } = runtime.validate(
      compose({ type: 'slideTitle', title: 'T', lede: 'L' } as PrimitiveNode)
    );
    expect(errors).not.toEqual([]);
  });

  it('renders its own lines, then the aside', () => {
    const composition = compose(example);
    expect(runtime.surfaces.text.render(composition)).toMatchInlineSnapshot(`
      "A GROCERY DELIVERY PLATFORM
      Crate
      One order. Every store.
      crate n. Everything a customer means to buy, carried from whichever store can fill it.

      ✓ Splits one order across nearby stores.
      ✓ Books one courier for the whole basket.
      ✓ Charges the card once."
    `);
    expect(runtime.surfaces.markdown.render(composition))
      .toMatchInlineSnapshot(`
      "# Crate

      _A grocery delivery platform_

      One order. Every store.

      _crate n._ Everything a customer means to buy, carried from whichever store can fill it.

      - ✓ Splits one order across nearby stores.
      - ✓ Books one courier for the whole basket.
      - ✓ Charges the card once."
    `);
    expect(runtime.surfaces.slack.render(composition).blocks)
      .toMatchInlineSnapshot(`
      [
        {
          "text": {
            "emoji": true,
            "text": "Crate",
            "type": "plain_text",
          },
          "type": "header",
        },
        {
          "elements": [
            {
              "text": "*A grocery delivery platform*",
              "type": "mrkdwn",
            },
          ],
          "type": "context",
        },
        {
          "text": {
            "text": "One order. Every store.",
            "type": "mrkdwn",
          },
          "type": "section",
        },
        {
          "elements": [
            {
              "text": "_crate n._ Everything a customer means to buy, carried from whichever store can fill it.",
              "type": "mrkdwn",
            },
          ],
          "type": "context",
        },
        {
          "elements": [
            {
              "elements": [
                {
                  "elements": [
                    {
                      "text": "✓ ",
                      "type": "text",
                    },
                    {
                      "text": "Splits one order across nearby stores.",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "text": "✓ ",
                      "type": "text",
                    },
                    {
                      "text": "Books one courier for the whole basket.",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "text": "✓ ",
                      "type": "text",
                    },
                    {
                      "text": "Charges the card once.",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
              ],
              "style": "bullet",
              "type": "rich_text_list",
            },
          ],
          "type": "rich_text",
        },
      ]
    `);
  });
});

describe('slideTitle logo', () => {
  const marks = (logo?: boolean): number =>
    runtime.surfaces.html
      .render({
        type: 'view',
        body: [
          {
            type: 'slideFrame',
            tone: 'inverse',
            section: 'Opening',
            sectionNumber: '01',
            ...(logo === undefined ? {} : { logo }),
            body: [example],
          } as PrimitiveNode,
        ],
      })
      .html.split('viewBox="0 0 32 32"').length - 1;

  it('draws the mark on the title and beside the footer by default', () => {
    expect(marks()).toBe(2);
  });

  it('leaves both out when its frame sets `logo: false`', () => {
    expect(marks(false)).toBe(0);
  });
});

describe('slideTitle aside', () => {
  it('sizes its aside against the aside column, not the frame', () => {
    const text = 'x'.repeat(statementFit.l);
    const aside = { type: 'slideStatement', text };
    const step = sizeForLoad(
      undefined,
      text.length *
        narrowing(
          scalePx(statement.maxWidth),
          columnWidth(titleShares, title.columnGap, 1)
        ),
      statementFit
    );
    expect(step).not.toBe('l');
    expect(
      /statement-textSize-(\w+)/.exec(
        runtime.surfaces.html.render(
          compose({ ...example, aside } as PrimitiveNode)
        ).html
      )?.[1]
    ).toBe(step);
  });
});
