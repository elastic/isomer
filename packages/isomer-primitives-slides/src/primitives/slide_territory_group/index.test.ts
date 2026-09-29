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

import { example } from './examples';
import { markdown as markdownContent, text } from './index';
import { schema } from './schema';

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

describe('slideTerritoryGroup', () => {
  it('holds one to four owners in the two tones', () => {
    expect(schema.safeParse({ ...example, items: [] }).success).toBe(false);
    expect(
      schema.safeParse({ ...example, items: Array(5).fill(example.items[0]) })
        .success
    ).toBe(false);
    const { errors } = runtime.validate(
      compose({
        ...example,
        items: [{ title: 'Ops', body: 'Pager.', tone: 'teal' }],
      })
    );
    expect(errors.map(({ path }) => path)).toContain(
      'body[0].body[0].items[0].tone'
    );
  });

  it('renders text and markdown', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "Payments team: Card capture, fraud checks, and the ledger write.
      Card network: Authorization, chargebacks, and settlement timing."
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "## Payments team

      Card capture, fraud checks, and **the ledger write**.

      ## Card network

      Authorization, chargebacks, and settlement timing."
    `);
  });

  it('renders Slack as one field per owner', () => {
    const { blocks } = runtime.surfaces.slack.render(compose(example));
    expect(blocks).toMatchInlineSnapshot(`
      [
        {
          "fields": [
            {
              "text": "*Payments team*
      Card capture, fraud checks, and *the ledger write*.",
              "type": "mrkdwn",
            },
            {
              "text": "*Card network*
      Authorization, chargebacks, and settlement timing.",
              "type": "mrkdwn",
            },
          ],
          "type": "section",
        },
      ]
    `);
  });
});
