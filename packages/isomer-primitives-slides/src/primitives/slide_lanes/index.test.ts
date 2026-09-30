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
import { slideDistillery } from '../../theme/distillery';

import { example, fourNotesExample, unevenLanesExample } from './examples';
import { markdown as markdownContent, text } from './index';
import { lanesMaxNotes, lanesMaxSteps } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const markdown = (node: Parameters<typeof markdownContent>[0]): string =>
  serializeMarkdown(markdownContent(node));

describe('slideLanes', () => {
  // The fit test measures these, so they hold the most steps and notes lanes take.
  it('pins the fullest examples at the caps', () => {
    expect(
      Math.max(...unevenLanesExample.lanes.map(({ steps }) => steps.length))
    ).toBe(lanesMaxSteps);
    expect(fourNotesExample.notes).toHaveLength(lanesMaxNotes);
  });

  it('holds exactly two lanes of one to five steps', () => {
    const [lane] = example.lanes;
    const paths = (node: object) =>
      runtime.validate(compose(node)).errors.map(({ path }) => path);
    expect(paths({ ...example, lanes: [lane] })).toContain(
      'body[0].body[0].lanes'
    );
    expect(
      paths({
        ...example,
        lanes: [{ ...lane, steps: Array(6).fill('Step') }, lane],
      })
    ).toContain('body[0].body[0].lanes[0].steps');
  });

  it('names the merge for assistive technology', () => {
    const { html } = runtime.surfaces.html.render(compose(example));
    expect(html).toContain(
      `role="img" aria-label="Web and Phone ${slideDistillery.tokens.connector.label.value} Place order"`
    );
  });

  it('renders text and markdown', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "● Web: Basket → Address → Slot → Review → Place order
      Phone: Call → Agent form → Read back → Confirm → Place order

      Self-serve: The customer picks the slot. Validation runs on every field as they type.
      Assisted: An agent keys the order while the customer waits, then reads it back before placing it."
    `);
    expect(markdown(fourNotesExample)).toMatchInlineSnapshot(`
      "- ● **Card:** Tokenize → Authorize → Capture
      - ○ **Wallet:** Redirect → Approve → Callback → Capture

      **Card is instant:** Authorization returns in **one round trip**.

      **Wallet waits:** The customer leaves the page to approve.

      **Same capture:** Both settle through one \`capture\` call.

      **Same refunds:** Refunds never need to know the path."
    `);
  });

  it('renders Slack as a line per lane and a field per note', () => {
    expect(runtime.surfaces.slack.renderNode(fourNotesExample).blocks)
      .toMatchInlineSnapshot(`
        [
          {
            "text": {
              "text": "● *Card:* Tokenize → Authorize → Capture
        ○ *Wallet:* Redirect → Approve → Callback → Capture",
              "type": "mrkdwn",
            },
            "type": "section",
          },
          {
            "text": {
              "text": " ",
              "type": "mrkdwn",
            },
            "type": "section",
          },
          {
            "fields": [
              {
                "text": "*Card is instant*
        Authorization returns in *one round trip*.",
                "type": "mrkdwn",
              },
              {
                "text": "*Wallet waits*
        The customer leaves the page to approve.",
                "type": "mrkdwn",
              },
              {
                "text": "*Same capture*
        Both settle through one \`capture\` call.",
                "type": "mrkdwn",
              },
              {
                "text": "*Same refunds*
        Refunds never need to know the path.",
                "type": "mrkdwn",
              },
            ],
            "type": "section",
          },
        ]
      `);
  });
});
