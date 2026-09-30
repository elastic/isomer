/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { describe, expect, it } from 'vitest';

import { codeExample, example } from './examples';
import { markdown as markdownContent, slack, text } from './index';

const markdown = (node: Parameters<typeof markdownContent>[0]): string =>
  serializeMarkdown(markdownContent(node));

describe('slideSource', () => {
  it('renders text, markdown, and Slack behind its prefix', () => {
    expect(text(example)).toMatchInlineSnapshot(
      `"Source · Support tickets tagged “refund”, January to June"`
    );
    expect(markdown(codeExample)).toMatchInlineSnapshot(
      `"_Source · Nightly export of \`orders.csv\`, counted on 3 March_"`
    );
    expect(slack(codeExample)).toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "text": "Source · Nightly export of \`orders.csv\`, counted on 3 March",
              "type": "mrkdwn",
            },
          ],
          "type": "context",
        },
      ]
    `);
  });
});
