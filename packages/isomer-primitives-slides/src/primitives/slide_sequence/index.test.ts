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

import { example, fullExample, shortExample } from './examples';
import { markdown as markdownContent, text } from './index';
import { sequenceMaxActors, sequenceMaxMessages } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const errors = (node: object) =>
  runtime
    .validate(compose(node))
    .errors.map(({ path, message }) => `${path}: ${message}`);

const markdown = (node: Parameters<typeof markdownContent>[0]): string =>
  serializeMarkdown(markdownContent(node));

describe('slideSequence', () => {
  // The fit test measures this, so it holds the most actors and messages a sequence takes.
  it('pins the fullest example at the caps', () => {
    expect(fullExample.actors).toHaveLength(sequenceMaxActors);
    expect(fullExample.messages).toHaveLength(sequenceMaxMessages);
  });

  it('runs no cross-field check once a count is over its cap', () => {
    const found = errors({
      ...shortExample,
      messages: Array.from({ length: sequenceMaxMessages + 1 }, () => ({
        from: 'user',
        to: 'ghost',
        label: 'Boo',
      })),
    });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/^body\[0\]\.body\[0\]\.messages: /);
  });

  it('joins known, distinct actors and uses every actor', () => {
    const [user, site, mail] = shortExample.actors;
    expect(
      errors({
        ...shortExample,
        actors: [user, site, { ...mail, id: 'site' }],
        messages: [
          { from: 'user', to: 'user', label: 'Hello' },
          { from: 'user', to: 'ghost', label: 'Boo' },
        ],
      })
    ).toMatchInlineSnapshot(`
      [
        "body[0].body[0].actors[2].id: duplicate actor id "site"",
        "body[0].body[0].messages[0].to: message from "user" to itself; a message joins two different actors",
        "body[0].body[0].messages[1].to: message to names unknown actor "ghost"",
        "body[0].body[0].actors[1]: actor "site" sends or receives no message",
        "body[0].body[0].actors[2]: actor "site" sends or receives no message",
      ]
    `);
  });

  it('names sender and receiver for assistive technology', () => {
    const { html } = runtime.surfaces.html.render(compose(shortExample));
    expect(html).toContain('role="img" aria-label="user to site"');
  });

  it('renders text and markdown by actor label', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "1. shopper → ● store: Place order
      2. ● store → payments: authorize(card)
      3. payments → ○ bank: Charge request
      4. ○ bank → payments: DECLINED 51
      5. ● store → shopper: Try another card
      6. shopper → ● store: Second card
      7. payments → ● store: Approved"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "1. shopper → ● store: Place order
      2. ● store → payments: \`authorize(card)\`
      3. payments → ○ bank: Charge request
      4. ○ bank → payments: \`DECLINED 51\`
      5. ● store → shopper: Try another card
      6. shopper → ● store: Second card
      7. payments → ● store: Approved"
    `);
  });

  it('renders Slack as an ordered list', () => {
    expect(runtime.surfaces.slack.renderNode(shortExample).blocks)
      .toMatchInlineSnapshot(`
        [
          {
            "elements": [
              {
                "elements": [
                  {
                    "elements": [
                      {
                        "text": "user → ● site: ",
                        "type": "text",
                      },
                      {
                        "text": "Forgot password",
                        "type": "text",
                      },
                    ],
                    "type": "rich_text_section",
                  },
                  {
                    "elements": [
                      {
                        "text": "● site → ○ mail: ",
                        "type": "text",
                      },
                      {
                        "text": "Send reset link",
                        "type": "text",
                      },
                    ],
                    "type": "rich_text_section",
                  },
                  {
                    "elements": [
                      {
                        "text": "○ mail → user: ",
                        "type": "text",
                      },
                      {
                        "text": "Reset email",
                        "type": "text",
                      },
                    ],
                    "type": "rich_text_section",
                  },
                  {
                    "elements": [
                      {
                        "text": "user → ● site: ",
                        "type": "text",
                      },
                      {
                        "style": {
                          "code": true,
                        },
                        "text": "POST /reset",
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
});
