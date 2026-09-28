/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import { stripMarks } from '../../render/marks';

import { example, examples, linkedExample } from './examples';
import { markdown, slack, text } from './index';
import { schema, type SlideSectionNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [
    { type: 'slideFrame', tone: 'inverse', body: [node] } as PrimitiveNode,
  ],
});

const authored = ({ number, title, contents }: (typeof examples)[number]) => [
  number,
  title,
  ...contents,
];

describe('slideSection', () => {
  it('rejects hrefs that do not match contents', () => {
    const result = schema.safeParse({ ...example, hrefs: ['#a'] });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ['hrefs'],
      message: '`hrefs` needs one entry per `contents` line',
    });
  });

  it('reports a mismatched hrefs through the runtime', () => {
    const mismatched: SlideSectionNode = { ...example, hrefs: ['#a'] };
    const { errors } = runtime.validate(compose(mismatched));
    expect(JSON.stringify(errors)).toContain(
      '`hrefs` needs one entry per `contents` line'
    );
  });

  it('rejects an unsafe href', () => {
    const result = schema.safeParse({
      ...example,
      hrefs: ['javascript:alert(1)', '#b', '#c'],
    });
    expect(result.error?.issues[0]?.path).toEqual(['hrefs', 0]);
  });

  it('holds one to eight lines', () => {
    expect(schema.safeParse({ ...example, contents: [] }).success).toBe(false);
    expect(
      schema.safeParse({ ...example, contents: Array(9).fill('Line') }).success
    ).toBe(false);
    expect(examples.every((node) => schema.safeParse(node).success)).toBe(true);
  });

  it('renders text, markdown, and Slack', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "02 SETTLEMENT
      1. Refunds settle in two days, not five
      2. The ledger writes before the fraud check
      3. Three batch windows are gone"
    `);
    expect(markdown(linkedExample)).toMatchInlineSnapshot(`
      "# 04 · The incident

      1. [Checkout failed for 41 minutes](#slide-12)
      2. [A certificate expired on **one** gateway](#slide-13)
      3. [Alerts fired, but to the wrong rotation](#slide-14)
      4. [Recovery took one config change](#slide-15)
      5. [What we changed afterwards](#slide-16)"
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
          "text": {
            "text": "1. Refunds settle in two days, not five
      2. The ledger writes before the fraud check
      3. Three batch windows are gone",
            "type": "mrkdwn",
          },
          "type": "section",
        },
      ]
    `);
  });

  it.each(examples.map((node, index) => [index, node] as const))(
    'keeps every authored string on every surface (example %i)',
    (_index, node) => {
      const composition = compose(node);
      const outputs = [
        runtime.surfaces.text.render(composition),
        runtime.surfaces.markdown.render(composition),
        JSON.stringify(runtime.surfaces.slack.render(composition).blocks),
      ].map((output) => output.replace(/[`*]/g, '').toLowerCase());
      for (const value of authored(node)) {
        for (const output of outputs) {
          expect(output).toContain(stripMarks(value).toLowerCase());
        }
      }
    }
  );

  it('renders an unsafe href as plain text', () => {
    const unsafe: SlideSectionNode = {
      ...linkedExample,
      hrefs: ['javascript:alert(1)', '#b', '#c', '#d', '#e'],
    };
    const composition = compose(unsafe);
    const markup = renderToStaticMarkup(
      createElement(() => runtime.surfaces.react.render(composition))
    );
    expect(markup).not.toContain('javascript:');
    expect(markup.match(/<a /g)).toHaveLength(4);
    const md = runtime.surfaces.markdown.renderNode(unsafe);
    expect(md).toContain('1. Checkout failed for 41 minutes\n');
    expect(md).not.toContain('javascript:');
  });
});
