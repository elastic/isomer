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
import type { SlideReactEnv } from '../../render/context';
import { stripMarks } from '../../render/marks';

import { example, examples } from './examples';
import { markdown, slack, text } from './index';
import { react } from './react';
import { schema, type SlideClosingNode } from './schema';

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

describe('slideClosing', () => {
  it('rejects an unsafe href', () => {
    const [first] = example.links;
    const result = schema.safeParse({
      ...example,
      links: [{ ...first, href: 'javascript:alert(1)' }],
    });
    expect(result.error?.issues[0]?.path).toEqual(['links', 0, 'href']);
  });

  it('holds one to four links and up to five paths', () => {
    const [link] = example.links;
    const [path] = example.paths ?? [];
    expect(schema.safeParse({ ...example, links: [] }).success).toBe(false);
    expect(
      schema.safeParse({ ...example, links: Array(5).fill(link) }).success
    ).toBe(false);
    expect(
      schema.safeParse({ ...example, paths: Array(6).fill(path) }).success
    ).toBe(false);
    expect(examples.every((node) => schema.safeParse(node).success)).toBe(true);
  });

  it('renders text, markdown, and Slack', () => {
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
    expect(slack(example)).toMatchInlineSnapshot(`
      [
        {
          "text": {
            "emoji": true,
            "text": "Start here",
            "type": "plain_text",
          },
          "type": "header",
        },
        {
          "text": {
            "text": "*Docs*  <https://example.com/ledger/docs|example.com/ledger/docs>
      *Runbook*  <https://example.com/ledger/runbook|example.com/ledger/runbook>",
            "type": "mrkdwn",
          },
          "type": "section",
        },
        {
          "text": {
            "text": "• *Issue a refund*: The refunds guide, then \`POST /refunds\`
      • *Reconcile a day*: The settlement report and its columns
      • *Handle a dispute*: The chargeback flow and its deadlines
      • *Go on call*: The runbook and the escalation list",
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
      const authored = [
        node.title,
        ...node.links.flatMap(({ label, text: shown }) => [label, shown]),
        ...(node.paths ?? []).flatMap(({ title, body }) => [title, body]),
      ];
      for (const value of authored) {
        for (const output of outputs) {
          expect(output).toContain(stripMarks(value).toLowerCase());
        }
      }
    }
  );

  it('renders an unsafe href as plain text', () => {
    const unsafe: SlideClosingNode = {
      ...example,
      links: [
        { label: 'Docs', href: 'javascript:alert(1)', text: 'the docs' },
        { label: 'Source', href: 'https://example.com', text: 'example.com' },
      ],
    };
    const composition = compose(unsafe);
    const markup = renderToStaticMarkup(
      createElement(() => runtime.surfaces.react.render(composition))
    );
    expect(markup).not.toContain('javascript:');
    expect(markup).toContain('the docs');
    expect(markup.match(/<a /g)).toHaveLength(1);
    const md = runtime.surfaces.markdown.renderNode(unsafe);
    expect(md).toContain('**Docs** · the docs');
    expect(md).not.toContain('javascript:');
  });
});

describe('slideClosing view called directly', () => {
  it('applies the href policy without the sanitize hook', () => {
    const unsafe: SlideClosingNode = {
      ...example,
      links: [{ label: 'Docs', href: 'javascript:alert(1)', text: 'the docs' }],
    };
    const env = { context: undefined } as unknown as SlideReactEnv;
    const markup = renderToStaticMarkup(
      createElement(() => react(unsafe, env))
    );
    expect(markup).not.toContain('javascript:');
    expect(markup.match(/<a /g) ?? []).toHaveLength(0);
  });
});
