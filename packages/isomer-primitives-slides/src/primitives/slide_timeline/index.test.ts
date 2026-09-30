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
import { timelineFit } from '../../theme/components/timeline';

import { example, fiveItemsExample, threeItemsExample } from './examples';
import {
  timelineHeadingLineCount,
  timelineHeadingLines,
  timelineLoad,
  timelineStep,
} from './fit';
import { markdown as markdownContent, slack, text } from './index';
import { schema, type SlideTimelineNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const markdown = (node: SlideTimelineNode): string =>
  serializeMarkdown(markdownContent(node));

describe('slideTimeline', () => {
  it('holds three to five items', () => {
    const [item] = example.items;
    expect(schema.safeParse({ ...example, items: [item, item] }).success).toBe(
      false
    );
    // The fit test measures `fiveItemsExample` as the most items a timeline takes.
    expect(schema.safeParse(fiveItemsExample).success).toBe(true);
    expect(
      schema.safeParse({
        ...fiveItemsExample,
        items: [...fiveItemsExample.items, item],
      }).success
    ).toBe(false);
    expect(
      schema.safeParse({ ...example, items: Array(6).fill(item) }).success
    ).toBe(false);
  });

  it('rejects more than one current item', () => {
    const [first, second, ...rest] = example.items;
    const { errors } = runtime.validate(
      compose({
        ...example,
        items: [
          { ...first, current: true },
          { ...second, current: true },
          ...rest,
        ],
      })
    );
    expect(errors.map(({ path, message }) => `${path}: ${message}`)).toEqual([
      'body[0].body[0].items: at most one item can be current',
    ]);
  });

  it('skips the current rule once items are over their cap', () => {
    const [item] = example.items;
    const items = Array(10_000).fill({ ...item, current: true });
    expect(
      schema
        .safeParse({ ...example, items })
        .error?.issues.map(({ path }) => path)
    ).toEqual([['items']]);
  });

  it('sizes every heading to the tallest, up to the lines the row can match', () => {
    expect(timelineHeadingLineCount(['Short.', 'Short.', 'Short.'], 'l')).toBe(
      1
    );
    expect(
      timelineHeadingLineCount(['Short.', 'Short.', 'word '.repeat(200)], 'l')
    ).toBe(timelineHeadingLines.length);
  });

  it('marks the current item for assistive technology and with a cue', () => {
    const { html } = runtime.surfaces.html.render(compose(example));
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html.match(/role="img" aria-label="Current"/g)).toHaveLength(1);
  });

  it('renders text and markdown with the current item marked', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "2019 · PHONE. “Can I order by calling the store?” Staff took orders by hand and keyed them in after close.
      2021 · WEB. “Let me build a basket online.” The site worked, but substitutions still needed a phone call.
      2023 · APP. “Tell me when my driver is close.” Live tracking shipped; the substitution flow stayed on the web.
      ● 2025 · CHAT. “Just swap the oat milk if it is out.” Customers now approve substitutions in a message, not a form."
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "- **2019 · PHONE.** “Can I order by calling the store?” Staff took orders by hand and keyed them in after close.
      - **2021 · WEB.** “Let me build a basket online.” The site worked, but substitutions still needed a phone call.
      - **2023 · APP.** “Tell me when my driver is close.” Live tracking shipped; the substitution flow stayed **on the web**.
      - **● 2025 · CHAT.** “Just swap the oat milk if it is out.” Customers now approve substitutions in a message, not a form."
    `);
  });

  it('renders Slack as a native list', () => {
    expect(slack(threeItemsExample)).toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "elements": [
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "Q1 · PILOT.",
                      "type": "text",
                    },
                    {
                      "text": " “",
                      "type": "text",
                    },
                    {
                      "text": "Can two stores share one picker queue?",
                      "type": "text",
                    },
                    {
                      "text": "” ",
                      "type": "text",
                    },
                    {
                      "text": "Pick times fell by a fifth in the pilot stores.",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "Q2 · REGION.",
                      "type": "text",
                    },
                    {
                      "text": " “",
                      "type": "text",
                    },
                    {
                      "text": "Roll it out across the north.",
                      "type": "text",
                    },
                    {
                      "text": "” ",
                      "type": "text",
                    },
                    {
                      "text": "Twelve stores moved over in six weeks.",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "Q3 · NATIONAL.",
                      "type": "text",
                    },
                    {
                      "text": " “",
                      "type": "text",
                    },
                    {
                      "text": "Make it the ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "code": true,
                      },
                      "text": "default",
                      "type": "text",
                    },
                    {
                      "text": " everywhere.",
                      "type": "text",
                    },
                    {
                      "text": "” ",
                      "type": "text",
                    },
                    {
                      "text": "The old queue was switched off in September.",
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

  const fourItems = (load: number): SlideTimelineNode => ({
    ...example,
    items: example.items.map((item) => ({
      ...item,
      heading: 'x'.repeat(Math.ceil(load / 4) - 1),
      body: 'y',
    })),
  });

  it('loads the longest item times the item count', () => {
    expect(timelineLoad(fourItems(400))).toBe(400);
  });

  it('steps down at each budget, under crowding, and in a narrower box, unless sized', () => {
    const edge = (load: number) => timelineStep(fourItems(load), undefined);
    expect(edge(timelineFit.l)).toBe('l');
    expect(edge(timelineFit.l + 4)).toBe('m');
    expect(edge(timelineFit.m)).toBe('m');
    expect(edge(timelineFit.m + 4)).toBe('s');
    expect(timelineStep(fourItems(timelineFit.l), { crowding: 1.1 })).toBe('m');
    expect(
      timelineStep(fourItems(timelineFit.l), {
        width: frameContentWidth * 0.95,
      })
    ).toBe('m');
    expect(
      timelineStep(
        { ...fourItems(timelineFit.m + 4), size: 'l' },
        { crowding: 3 }
      )
    ).toBe('l');
  });
});
