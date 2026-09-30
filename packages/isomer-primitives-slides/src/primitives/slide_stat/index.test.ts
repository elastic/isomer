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

import { example, pendingExample } from './examples';
import { markdown as markdownContent, text } from './index';
import type { SlideStatNode } from './schema';

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

describe('slideStat', () => {
  const everySurface = (node: object): string[] => [
    runtime.surfaces.text.renderNode(node as PrimitiveNode),
    runtime.surfaces.markdown.renderNode(node as PrimitiveNode),
    JSON.stringify(
      runtime.surfaces.slack.renderNode(node as PrimitiveNode).blocks
    ),
  ];

  it('needs a value for a unit', () => {
    expect(errorPaths({ ...pendingExample, unit: 'ms' }))
      .toMatchInlineSnapshot(`
      [
        "body[0].body[0].unit",
      ]
    `);
  });

  it.each([
    ['value', { ...example, value: ' ' }],
    ['unit', { ...example, unit: '\t' }],
  ])('needs a visible character in a %s', (field, node) => {
    expect(errorPaths(node)).toEqual([`body[0].body[0].${field}`]);
    expect(errorPaths({ ...example, [field]: ' x ' })).toEqual([]);
  });

  it('renders text and markdown, with a placeholder for a pending value', () => {
    expect(text(example)).toMatchInlineSnapshot(
      `"2.1 days — Median time from refund request to money back in the customer account, down from five."`
    );
    expect(markdown(example)).toMatchInlineSnapshot(
      `"**2.1 days** — Median time from refund request to money back in the customer account, down from **five**."`
    );
    expect(text(pendingExample)).toMatchInlineSnapshot(
      `"[value pending] — Orders delivered inside the booked slot. The first full month of data lands in May."`
    );
    expect(markdown(pendingExample)).toMatchInlineSnapshot(
      `"_value pending_ — Orders delivered inside the booked slot. The first full month of data lands in May."`
    );
  });

  it('renders Slack as one section', () => {
    expect(runtime.surfaces.slack.renderNode(example).blocks)
      .toMatchInlineSnapshot(`
      [
        {
          "text": {
            "text": "*2.1 days* — Median time from refund request to money back in the customer account, down from *five*.",
            "type": "mrkdwn",
          },
          "type": "section",
        },
      ]
    `);
  });

  describe.each(['*', '_', '~', '`'])('a figure holding %s', (delimiter) => {
    const word = `1${delimiter}2${delimiter}`;

    it.each([
      ['value', { ...example, value: word }],
      ['unit', { ...example, unit: word }],
    ] as const)(
      'prints a %s as literal rich text, not mrkdwn',
      (_name, node) => {
        const [block] = runtime.surfaces.slack.renderNode(node).blocks;
        expect(block).toMatchObject({
          type: 'rich_text',
          elements: [
            {
              elements: [
                {
                  type: 'text',
                  text: [node.value, node.unit].join(' '),
                  style: { bold: true },
                },
                { type: 'text', text: ' — ' },
                { type: 'text' },
                { type: 'text', text: 'five', style: { bold: true } },
                { type: 'text', text: '.' },
              ],
            },
          ],
        });
      }
    );
  });

  it('prints the pending caption on every surface', () => {
    for (const output of everySurface(pendingExample)) {
      expect(output).toContain('value pending');
    }
  });

  it('keeps the pending caption in the rich text past the section limit', () => {
    const body = 'x'.repeat(SLACK_LIMITS.sectionTextChars);
    const node: SlideStatNode = { ...pendingExample, body };
    const [block] = runtime.surfaces.slack.renderNode(node).blocks;
    expect(block?.type).toBe('rich_text');
    expect(JSON.stringify(block)).toContain(
      '{"type":"text","text":"value pending","style":{"italic":true}}'
    );
    expect(JSON.stringify(block)).toContain(body);
  });
});
