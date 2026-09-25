/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';

import { example, examples, traceExample } from './examples';
import { markdown, slack, text } from './index';
import { schema, type SlideCodeNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

/** Every string in Slack blocks, entity-decoded, so authored copy can be found in it. */
const slackText = (value: unknown): string =>
  JSON.stringify(value)
    .match(/"(?:[^"\\]|\\.)*"/g)
    ?.map((literal) => JSON.parse(literal) as string)
    .join('\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&') ?? '';

const panel = (lines: string[], extra: object = {}): SlideCodeNode => ({
  type: 'slideCode',
  panels: [{ lines, ...extra }],
});

const errorPaths = (node: unknown) =>
  runtime
    .validate(compose(node as PrimitiveNode))
    .errors.map(({ path, message }) => `${path}: ${message}`);

describe('slideCode schema', () => {
  it('holds one or two panels of one to sixteen lines', () => {
    expect(schema.safeParse({ type: 'slideCode', panels: [] }).success).toBe(
      false
    );
    const [first] = traceExample.panels;
    expect(
      schema.safeParse({ ...traceExample, panels: [first, first, first] })
        .success
    ).toBe(false);
    expect(schema.safeParse(panel(Array<string>(17).fill('x'))).success).toBe(
      false
    );
    expect(examples.every((node) => schema.safeParse(node).success)).toBe(true);
  });

  it('rejects a highlight past the end of its panel, at that panel', () => {
    expect(
      errorPaths({
        ...traceExample,
        panels: [traceExample.panels[0], { lines: ['one'], highlight: [2] }],
      })
    ).toContainEqual(
      'body[0].body[0].panels[1].highlight: highlight lines must exist in lines'
    );
  });

  it('rejects a multi-line entry', () => {
    expect(errorPaths(panel(['one\ntwo']))).toContainEqual(
      expect.stringMatching(
        /^body\[0\]\.body\[0\]\.panels\[0\]\.lines: one line per entry/
      )
    );
  });
});

describe('slideCode output', () => {
  it('renders text with the caption above the lines', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "refund.ts
      export const refund = async (order: Order) => {
        await ledger.write(order.id, -order.total);
        await fraud.check(order);
        return notify(order.customer);
      };"
    `);
  });

  it('joins two panels with an arrow', () => {
    expect(text(traceExample)).toMatchInlineSnapshot(`
      "config.yaml
      checkout:
        timeout: 30s
        retries: 3

      →

      client.ts
      const client = createClient({
        timeout: config.checkout.timeout,
        retries: config.checkout.retries,
      });"
    `);
    expect(markdown(traceExample)).toMatchInlineSnapshot(`
      "**config.yaml**

      \`\`\`yaml
      checkout:
        timeout: 30s
        retries: 3
      \`\`\`

      →

      **client.ts**

      \`\`\`ts
      const client = createClient({
        timeout: config.checkout.timeout,
        retries: config.checkout.retries,
      });
      \`\`\`"
    `);
  });

  it('renders a Slack code block per panel', () => {
    expect(slack(example)).toMatchInlineSnapshot(`
      [
        {
          "text": {
            "text": "refund.ts
      \`\`\`
      export const refund = async (order: Order) => {
        await ledger.write(order.id, -order.total);
        await fraud.check(order);
        return notify(order.customer);
      };
      \`\`\`",
            "type": "mrkdwn",
          },
          "type": "section",
        },
      ]
    `);
  });

  it('falls back to text for a hostile language token', () => {
    expect(
      markdown(panel(['x'], { language: 'ts\n```\nmalicious' }))
    ).toContain('```text');
  });

  it('lengthens the fence past a backtick run in the body', () => {
    const md = markdown(
      panel(['a ```js', 'console.log(1)', '``` b'], { language: 'md' })
    );
    expect(md).toMatch(/^````md\n/);
    expect(md.trim().endsWith('````')).toBe(true);
  });

  it('keeps a blank line visible on the slide', () => {
    const html = runtime.surfaces.html.render(
      compose(panel(['a', '', 'b']))
    ).html;
    expect(html).toContain('\u00a0');
  });

  it.each(examples.map((node, index) => [index, node] as const))(
    'keeps every authored string on every surface (example %i)',
    (_index, node) => {
      const composition = compose(node);
      const outputs = [
        runtime.surfaces.text.render(composition),
        runtime.surfaces.markdown.render(composition),
        slackText(runtime.surfaces.slack.render(composition).blocks),
      ];
      const authored = node.panels.flatMap(({ file, lines }) => [
        ...(file ? [file] : []),
        ...lines.filter(Boolean),
      ]);
      for (const value of authored) {
        for (const output of outputs) {
          expect(output).toContain(value);
        }
      }
    }
  );
});
