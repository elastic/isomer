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

import { example, linkOnlyExample } from './examples';
import { markdown as markdownContent, slack, text } from './index';

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
  ...linkOnlyExample,
  links: [{ label: 'Chat', href: 'javascript:alert(1)', text: 'chat' }],
};

describe('slideClosing', () => {
  it('holds one to four links', () => {
    const { errors } = runtime.validate(
      compose({ ...linkOnlyExample, links: Array(5).fill(example.links[0]) })
    );
    expect(errors.map(({ path }) => path)).toContain('body[0].body[0].links');
  });

  it('renders text, markdown, and Slack with paths', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "START HERE

      Docs: example.com/ledger/docs
      Runbook: example.com/ledger/runbook

      - Issue a refund: The refunds guide, then POST /refunds
      - Reconcile a day: The settlement report and its columns
      - Handle a dispute: The chargeback flow and its deadlines
      - Go on call: The runbook and the escalation list"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "# Start here

      **Docs** · [example.com/ledger/docs](https://example.com/ledger/docs)

      **Runbook** · [example.com/ledger/runbook](https://example.com/ledger/runbook)

      - **Issue a refund**: The refunds guide, then \`POST /refunds\`
      - **Reconcile a day**: The settlement report and its columns
      - **Handle a dispute**: The chargeback flow and its deadlines
      - **Go on call**: The runbook and the escalation list"
    `);
    expect(
      slack({
        ...linkOnlyExample,
        paths: [{ title: 'Issue a refund', body: 'The guide, then `POST`' }],
      })
    ).toMatchInlineSnapshot(`
      [
        {
          "text": {
            "emoji": true,
            "text": "Thank you",
            "type": "plain_text",
          },
          "type": "header",
        },
        {
          "text": {
            "text": "*Questions*  <mailto:payments@example.com|payments@example.com>",
            "type": "mrkdwn",
          },
          "type": "section",
        },
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
                      "text": "Issue a refund",
                      "type": "text",
                    },
                    {
                      "text": ": ",
                      "type": "text",
                    },
                    {
                      "text": "The guide, then ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "code": true,
                      },
                      "text": "POST",
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

  it('prints an address the link text does not already show', () => {
    expect(
      text({
        ...linkOnlyExample,
        links: [{ label: 'Docs', href: '/docs', text: 'The docs' }],
      })
    ).toMatchInlineSnapshot(`
      "THANK YOU

      Docs: The docs (/docs)"
    `);
  });

  it('sets a link whose href is unsafe as plain text', () => {
    expect(runtime.surfaces.markdown.renderNode(unsafe)).toMatchInlineSnapshot(`
      "# Thank you

      **Chat** · chat"
    `);
    const { html } = runtime.surfaces.html.render(compose(unsafe));
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<a ');
  });
});
