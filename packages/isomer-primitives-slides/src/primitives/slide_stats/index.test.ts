/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import { openBody } from '../layout';
import { renderedStep } from '../size.fixtures';
import { paneWidths } from '../slide_split/pane_layout';

import { example, pendingExample } from './examples';
import { markdown as markdownContent, text } from './index';
import { statsValueSize } from './react';
import type { SlideStatsNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const errorPaths = (node: object) =>
  runtime.validate(compose(node)).errors.map(({ path }) => path);

const markdown = (node: Parameters<typeof markdownContent>[0]): string =>
  serializeMarkdown(markdownContent(node));

describe('slideStats', () => {
  const everySurface = (node: object): string[] => [
    runtime.surfaces.text.renderNode(node as PrimitiveNode),
    runtime.surfaces.markdown.renderNode(node as PrimitiveNode),
    JSON.stringify(
      runtime.surfaces.slack.renderNode(node as PrimitiveNode).blocks
    ),
  ];

  it('holds two to four numbers, each unit with a value', () => {
    const [first] = example.items;
    expect(errorPaths({ ...example, items: [first] })).toMatchInlineSnapshot(`
      [
        "body[0].body[0].items",
      ]
    `);
    expect(errorPaths({ ...example, items: [...example.items, first, first] }))
      .toMatchInlineSnapshot(`
      [
        "body[0].body[0].items",
      ]
    `);
    expect(
      errorPaths({
        ...example,
        items: [{ ...first, value: undefined, unit: 'ms' }, first],
      })
    ).toMatchInlineSnapshot(`
      [
        "body[0].body[0].items[0].unit",
      ]
    `);
  });

  it.each(['value', 'unit'])('needs a visible character in a %s', (field) => {
    const [first, ...rest] = example.items;
    const with_ = (text: string) => ({
      ...example,
      items: [{ ...first!, value: '3', [field]: text }, ...rest],
    });
    expect(errorPaths(with_(' '))).toEqual([
      `body[0].body[0].items[0].${field}`,
    ]);
    expect(errorPaths(with_(' 3 '))).toEqual([]);
  });

  it('renders text and markdown', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "3 Regions: Checkout now runs active-active in each of them.
      40 ms p99 latency: Measured at the edge during the spring sale peak.
      0 Failed payments: Across two regional failovers in the same week."
    `);
    expect(markdown(pendingExample)).toMatchInlineSnapshot(`
      "- _value pending_ On time: Orders delivered inside the booked slot.
      - _value pending_ Substitutions: Items swapped for an approved replacement.
      - _value pending_ Refunds: Orders refunded in part or in full.
      - **4.8** Rating: Average driver rating, the one number already in."
    `);
  });

  it('renders Slack as one field per number', () => {
    expect(runtime.surfaces.slack.renderNode(pendingExample).blocks)
      .toMatchInlineSnapshot(`
        [
          {
            "fields": [
              {
                "text": "_value pending_ On time: Orders delivered inside the booked slot.",
                "type": "mrkdwn",
              },
              {
                "text": "_value pending_ Substitutions: Items swapped for an approved replacement.",
                "type": "mrkdwn",
              },
              {
                "text": "_value pending_ Refunds: Orders refunded in part or in full.",
                "type": "mrkdwn",
              },
              {
                "text": "*4.8* Rating: Average driver rating, the one number already in.",
                "type": "mrkdwn",
              },
            ],
            "type": "section",
          },
        ]
      `);
  });

  describe('value size', () => {
    const row = (
      count: number,
      value: string,
      unit?: string
    ): SlideStatsNode => ({
      type: 'slideStats',
      items: Array.from({ length: count }, () => ({
        value,
        ...(unit ? { unit } : {}),
        label: 'Label',
        body: 'Body.',
      })),
    });

    it.each([
      [2, '000000', undefined, 'l'],
      [2, '0000000', undefined, 'm'],
      [2, '000000000', undefined, 'm'],
      [2, '0000000000', undefined, 's'],
      [3, '000', undefined, 'l'],
      [3, '0000', undefined, 'm'],
      [3, '00000', undefined, 'm'],
      [3, '000000', undefined, 's'],
      [3, '00', 'ms', 'l'],
      [3, '000', 'ms', 'm'],
      [4, '00', undefined, 'l'],
      [4, '000', undefined, 'm'],
      [4, '0000', undefined, 'm'],
      [4, '00000', undefined, 's'],
    ] as const)('%i values of %s %s take %s', (count, value, unit, step) => {
      expect(statsValueSize(row(count, value, unit), openBody.width)).toBe(
        step
      );
    });

    it('takes the widest value’s step for the whole row', () => {
      const node = row(3, '0');
      node.items[1] = { ...node.items[1]!, value: '000000' };
      expect(statsValueSize(node, openBody.width)).toBe('s');
    });

    it('keeps an authored size', () => {
      expect(
        statsValueSize({ ...row(4, '00000'), size: 'l' }, openBody.width)
      ).toBe('l');
    });

    it('fills four columns in the pending example, the most a row holds', () => {
      expect(pendingExample.items).toHaveLength(4);
    });

    it('measures its columns across a split pane and a title aside', () => {
      const node = row(2, '000000');
      const [pane] = paneWidths(openBody.width, 'even', 'gap');
      const bullets = { type: 'slideBulletList', items: ['One'] };
      expect(renderedStep('stats-valueSize', node)).toBe('l');
      expect(statsValueSize(node, pane)).not.toBe('l');
      expect(
        renderedStep('stats-valueSize', {
          type: 'slideSplit',
          panes: [{ items: [node] }, { items: [bullets] }],
        })
      ).toBe(statsValueSize(node, pane));
      expect(
        renderedStep('stats-valueSize', {
          type: 'slideTitle',
          title: 'Payments',
          aside: node,
        })
      ).not.toBe('l');
    });

    it('sizes a missing value as the largest step', () => {
      expect(statsValueSize(pendingExample, openBody.width)).toBe('l');
    });
  });
  it('keeps the pending caption in the rich text past the field limit', () => {
    const body = 'x'.repeat(SLACK_LIMITS.sectionFieldChars);
    const [first, ...rest] = pendingExample.items;
    const node: SlideStatsNode = {
      ...pendingExample,
      items: [{ ...first!, body }, ...rest],
    };
    const [block] = runtime.surfaces.slack.renderNode(node).blocks;
    expect(block?.type).toBe('rich_text');
    expect(JSON.stringify(block)).toContain(
      '{"type":"text","text":"value pending","style":{"italic":true}}'
    );
    expect(JSON.stringify(block)).toContain(body);
  });

  it('prints the pending caption on every surface', () => {
    for (const output of everySurface(pendingExample)) {
      expect(output).toContain('value pending');
    }
  });
});
