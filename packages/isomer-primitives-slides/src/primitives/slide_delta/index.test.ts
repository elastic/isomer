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
import { openBody } from '../layout';
import { renderedStep } from '../size.fixtures';
import { paneWidths } from '../slide_split/pane_layout';

import { example, pendingExample, wideExample } from './examples';
import { markdown as markdownContent, text } from './index';
import { deltaValueSize } from './react';

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

const html = (node: object): string =>
  runtime.surfaces.html.render(compose(node)).html;

describe('slideDelta', () => {
  const everySurface = (node: object): string[] => [
    runtime.surfaces.text.renderNode(node as PrimitiveNode),
    runtime.surfaces.markdown.renderNode(node as PrimitiveNode),
    JSON.stringify(
      runtime.surfaces.slack.renderNode(node as PrimitiveNode).blocks
    ),
  ];

  it.each([
    ['before.value', { ...example, before: { ...example.before, value: ' ' } }],
    ['change', { ...example, change: ' ' }],
  ])('needs a visible character in %s', (field, node) => {
    expect(errorPaths(node)).toEqual([`body[0].body[0].${field}`]);
  });

  it('states a change only between two values', () => {
    expect(errorPaths({ ...pendingExample, change: '+3' }))
      .toMatchInlineSnapshot(`
      [
        "body[0].body[0].change",
      ]
    `);
  });

  it('renders text and markdown', () => {
    expect(text(example)).toMatchInlineSnapshot(
      `"OLD CHECKOUT 4.2s → NEW CHECKOUT 1.1s. −74%: Median time from Pay to the confirmation page, measured over the same two weeks of traffic."`
    );
    expect(markdown(example)).toMatchInlineSnapshot(
      `"**OLD CHECKOUT** 4.2s → **NEW CHECKOUT** 1.1s. **−74%**: Median time from **Pay** to the confirmation page, measured over the same two weeks of traffic."`
    );
    expect(text(pendingExample)).toMatchInlineSnapshot(
      `"BEFORE THE MOVE 38 → AFTER THE MOVE [value pending]. Support tickets per thousand orders; the first full month on the new warehouse closes on the 30th."`
    );
  });

  it('renders Slack as one rich text line', () => {
    expect(runtime.surfaces.slack.renderNode(pendingExample).blocks)
      .toMatchInlineSnapshot(`
        [
          {
            "elements": [
              {
                "elements": [
                  {
                    "style": {
                      "bold": true,
                    },
                    "text": "BEFORE THE MOVE",
                    "type": "text",
                  },
                  {
                    "text": " ",
                    "type": "text",
                  },
                  {
                    "text": "38",
                    "type": "text",
                  },
                  {
                    "text": " → ",
                    "type": "text",
                  },
                  {
                    "style": {
                      "bold": true,
                    },
                    "text": "AFTER THE MOVE",
                    "type": "text",
                  },
                  {
                    "text": " ",
                    "type": "text",
                  },
                  {
                    "style": {
                      "italic": true,
                    },
                    "text": "value pending",
                    "type": "text",
                  },
                  {
                    "text": ". ",
                    "type": "text",
                  },
                  {
                    "text": "Support tickets per thousand orders; the first full month on the new warehouse closes on the 30th.",
                    "type": "text",
                  },
                ],
                "type": "rich_text_section",
              },
            ],
            "type": "rich_text",
          },
        ]
      `);
  });

  it('names the arrow for assistive technology', () => {
    expect(html(example)).toContain('role="img" aria-label="leads to"');
  });

  it('uppercases labels on every surface but keeps code in its case', () => {
    const node = {
      ...example,
      before: { ...example.before, label: 'Old `api` **path**' },
    };
    expect(text(node)).toContain('OLD api PATH 4.2s');
    expect(markdown(node)).toContain('**OLD `api` PATH**');
  });

  describe('value size', () => {
    const pair = (value: string) => ({
      ...example,
      before: { label: 'Before', value },
      after: { label: 'After', value: '0' },
    });

    it.each([
      ['000', 'l'],
      ['0000', 'm'],
      ['00000', 's'],
    ] as const)('%s takes %s', (value, step) => {
      expect(deltaValueSize(pair(value), openBody.width)).toBe(step);
    });

    it('sizes both values by the wider', () => {
      expect(
        deltaValueSize(
          { ...pair('0'), after: { label: 'After', value: '00000' } },
          openBody.width
        )
      ).toBe('s');
    });

    it('keeps an authored size', () => {
      expect(
        deltaValueSize({ ...pair('00000'), size: 'l' }, openBody.width)
      ).toBe('l');
    });

    it('draws the wide example at the smallest step', () => {
      expect(deltaValueSize(wideExample, openBody.width)).toBe('s');
    });

    it('keeps the note beside the pair while a step fits, and wraps it under the pair past that', () => {
      const [pane] = paneWidths(openBody.width, 'even', 'gap');
      expect(deltaValueSize(pair('000'), openBody.width)).toBe('l');
      expect(deltaValueSize(pair('0'), pane)).toBe('l');
      expect(deltaValueSize(pair('00'), pane)).toBe('m');
      expect(deltaValueSize(pair('000'), pane)).toBe('s');
    });

    it('measures a label wider than its value, and a placeholder for a missing value', () => {
      const long = 'Before the warehouse moved';
      expect(
        deltaValueSize(
          { ...pair('0'), before: { label: long, value: '0' } },
          openBody.width
        )
      ).toBe(deltaValueSize(pair('0'), openBody.width));
      expect(
        deltaValueSize(
          { ...pair('0'), before: { label: long.repeat(4), value: '0' } },
          openBody.width
        )
      ).toBe('s');
      expect(
        deltaValueSize({ ...pair('0'), before: { label: 'Before' } }, 400)
      ).toBe('s');
    });

    it('measures its values across a split pane and a title aside', () => {
      const node = pair('000');
      const [pane] = paneWidths(openBody.width, 'even', 'gap');
      const bullets = { type: 'slideBulletList', items: ['One'] };
      expect(renderedStep('delta-valueSize', node)).toBe('l');
      expect(deltaValueSize(node, pane)).not.toBe('l');
      expect(
        renderedStep('delta-valueSize', {
          type: 'slideSplit',
          panes: [{ items: [node] }, { items: [bullets] }],
        })
      ).toBe(deltaValueSize(node, pane));
      expect(
        renderedStep('delta-valueSize', {
          type: 'slideTitle',
          title: 'Payments',
          aside: node,
        })
      ).not.toBe('l');
    });
  });
  it('prints the pending caption on every surface', () => {
    for (const output of everySurface(pendingExample)) {
      expect(output).toContain('value pending');
    }
  });
});
