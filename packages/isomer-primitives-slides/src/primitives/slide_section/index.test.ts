/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import { frameContentWidth } from '../../theme/components/frame';
import { section, sectionShares } from '../../theme/components/section';
import { expectCountBounds } from '../bounds.fixtures';
import { sizeForLines, trackWidth } from '../size';

import { example, linkedExample, longExample } from './examples';
import { markdown as markdownContent, slack, text } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [
    { type: 'slideFrame', tone: 'inverse', body: [node] } as PrimitiveNode,
  ],
});

const markdown = (node: Parameters<typeof markdownContent>[0]): string =>
  serializeMarkdown(markdownContent(node));

const unsafe = {
  ...linkedExample,
  contents: linkedExample.contents.slice(0, 2),
  hrefs: ['#slide-12', 'javascript:alert(1)'],
};

describe('slideSection', () => {
  it('needs one href per contents line', () => {
    const { errors } = runtime.validate(
      compose({ ...linkedExample, hrefs: ['#slide-12'] })
    );
    expect(errors.map(({ path }) => path)).toContain('body[0].body[0].hrefs');
  });

  it('renders text, markdown, and Slack', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "02 · SETTLEMENT
      1. Refunds settle in two days, not five
      2. The ledger writes before the fraud check
      3. Three batch windows are gone"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "# 02 · Settlement

      1. Refunds settle in two days, not five
      2. The ledger writes before the fraud check
      3. Three batch windows are gone"
    `);
    expect(slack(example)).toMatchInlineSnapshot(`
      [
        {
          "text": {
            "emoji": true,
            "text": "02 · Settlement",
            "type": "plain_text",
          },
          "type": "header",
        },
        {
          "elements": [
            {
              "elements": [
                {
                  "elements": [
                    {
                      "text": "Refunds settle in two days, not five",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "text": "The ledger writes before the fraud check",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "text": "Three batch windows are gone",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
              ],
              "style": "ordered",
              "type": "rich_text_list",
            },
          ],
          "type": "rich_text",
        },
      ]
    `);
  });

  it('links each line that has an href in markdown and HTML', () => {
    expect(markdown(linkedExample)).toMatchInlineSnapshot(`
      "# 04 · The incident

      1. [Checkout failed for 41 minutes](#slide-12)
      2. [A certificate expired on **one** gateway](#slide-13)
      3. [Alerts fired, but to the wrong rotation](#slide-14)
      4. [Recovery took one config change](#slide-15)
      5. [What we changed afterwards](#slide-16)"
    `);
    expect(runtime.surfaces.html.render(compose(linkedExample)).html).toContain(
      'href="#slide-13"'
    );
  });

  it('links only an absolute URL in Slack', () => {
    const blocks = JSON.stringify(
      slack({
        ...example,
        contents: ['Anchored', 'Hosted'],
        hrefs: ['#slide-12', 'https://example.com/deck/13'],
      })
    );
    expect(blocks).not.toContain('#slide-12');
    expect(blocks).toContain('"url":"https://example.com/deck/13"');
  });

  it('sets a line whose href is unsafe as plain text', () => {
    expect(
      runtime.surfaces.markdown.renderNode(unsafe, {
        onValidationError: 'collect',
      })
    ).toMatchInlineSnapshot(`
      "# 04 · The incident

      1. [Checkout failed for 41 minutes](#slide-12)
      2. A certificate expired on **one** gateway"
    `);
    const { html } = runtime.surfaces.html.render(compose(unsafe));
    expect(html).not.toContain('javascript:');
    expect(html.match(/<a /g)).toHaveLength(1);
  });

  it('reads its number and title apart in the heading', () => {
    const { html } = runtime.surfaces.html.render(compose(example));
    expect(
      /<h1[^>]*>(.*?)<\/h1>/.exec(html)?.[1]?.replace(/<[^>]+>/g, '')
    ).toBe('02 Settlement');
  });

  describe('title size', () => {
    const titleOf = (length: number) =>
      'Part '.repeat(46).slice(0, length).trim();
    const stepOf = (title: string, size?: string) =>
      /section-titleSize-(\w+)/.exec(
        runtime.surfaces.html.render(compose({ ...example, title, size })).html
      )?.[1];
    const measured = (title: string) =>
      sizeForLines(
        undefined,
        title,
        section.title.tracking,
        trackWidth(frameContentWidth, sectionShares, section.columnGap),
        section.titleSizes
      );
    const flips = Array.from({ length: 220 }, (_, index) => index + 2).filter(
      (length) => measured(titleOf(length)) !== measured(titleOf(length - 1))
    );

    it('steps down at each boundary of its column width', () => {
      expect(flips.map((length) => measured(titleOf(length)))).toEqual([
        'm',
        's',
      ]);
      for (const length of flips) {
        expect(stepOf(titleOf(length - 1))).toBe(measured(titleOf(length - 1)));
        expect(stepOf(titleOf(length))).toBe(measured(titleOf(length)));
      }
    });

    it('keeps an authored size', () => {
      expect(stepOf(titleOf(200), 'l')).toBe('l');
      expect(stepOf('Part', 's')).toBe('s');
    });
  });
});

describe('slideSection counts', () => {
  it('holds one to eight lines, as its longest example does', () => {
    expectCountBounds(schema, example, 'contents', [1, 8], 'One', longExample);
  });

  it('holds no more hrefs than lines', () => {
    const lines = Array(8).fill('One');
    expect(
      schema.safeParse({
        ...example,
        contents: lines,
        hrefs: Array(8).fill('#a'),
      }).success
    ).toBe(true);
    expect(
      schema.safeParse({
        ...example,
        contents: lines,
        hrefs: Array(9).fill('#a'),
      }).success
    ).toBe(false);
  });

  it('numbers its lines in HTML as text, Markdown, and Slack do', () => {
    const { html } = runtime.surfaces.html.render(compose(example));
    expect(html.replace(/<[^>]+>/g, '')).toContain(
      '1.Refunds settle in two days'
    );
    expect(text(example)).toContain('1. Refunds settle in two days');
  });
});
