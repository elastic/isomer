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
import { slideDistillery } from '../../theme/distillery';
import { example as codeExample } from '../slide_code/examples';

import { arrowExample, example, examples, stackedExample } from './examples';
import { slideSplitPrimitive } from './index';
import { schema } from './schema';
import type { SlideSplitNode } from './types';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const bullets = { type: 'slideBulletList', items: ['Point.'] };

describe('slideSplit schema', () => {
  it('accepts every example', () => {
    expect(examples.every((node) => schema.safeParse(node).success)).toBe(true);
  });

  it('holds exactly two panes of one to six nodes', () => {
    const [left] = example.panes;
    expect(schema.safeParse({ ...example, panes: [left] }).success).toBe(false);
    expect(
      schema.safeParse({ ...example, panes: [left, left, left] }).success
    ).toBe(false);
    expect(
      schema.safeParse({ ...example, panes: [left, { items: [] }] }).success
    ).toBe(false);
    expect(
      schema.safeParse({
        ...example,
        panes: [left, { items: Array(7).fill(bullets) }],
      }).success
    ).toBe(false);
  });

  it('rejects a bare string item', () => {
    const { errors } = runtime.validate(
      compose({
        ...example,
        panes: [example.panes[0], { items: ['Statement.'] }],
      } as PrimitiveNode)
    );
    expect(errors.map(({ path }) => path)).toContainEqual(
      expect.stringMatching(/^body\[0\]\.body\[0\]\.panes\[1\]\.items\[0\]/)
    );
  });

  it('rejects a tone on a pane with no label, which it would color', () => {
    const { errors } = runtime.validate(
      compose({
        ...example,
        panes: [{ tone: 'primary', items: [bullets] }, example.panes[1]],
      } as PrimitiveNode)
    );
    expect(errors.map(({ path, message }) => `${path}: ${message}`)).toEqual([
      'body[0].body[0].panes[0].tone: tone colors the label, so it needs one',
    ]);
  });

  it('reports an invalid node item at its index', () => {
    const { errors } = runtime.validate(
      compose({
        ...stackedExample,
        panes: [
          stackedExample.panes[0],
          { items: [bullets, { type: 'slideCode', panels: [] }] },
        ],
      } as PrimitiveNode)
    );
    expect(errors.map(({ path }) => path)).toContainEqual(
      expect.stringMatching(/^body\[0\]\.body\[0\]\.panes\[1\]\.items\[1\]/)
    );
  });
});

describe('slideSplit children', () => {
  it('yields each pane item at its path', () => {
    expect(
      slideSplitPrimitive.children?.(stackedExample).map(({ path }) => path)
    ).toEqual(['panes[0].items[0]', 'panes[1].items[0]', 'panes[1].items[1]']);
  });

  it('has its own content only with a label or footnote', () => {
    const nodesOnly: SlideSplitNode = {
      type: 'slideSplit',
      panes: [{ items: [codeExample] }, { items: [codeExample] }],
    };
    expect(slideSplitPrimitive.hasOwnContent?.(nodesOnly)).toBe(false);
    expect(slideSplitPrimitive.hasOwnContent?.(example)).toBe(true);
  });
});

describe('slideSplit output', () => {
  it('names an arrow divider for assistive technology', () => {
    const { label } = slideDistillery.tokens.connector;
    expect(runtime.surfaces.html.render(compose(arrowExample)).html).toContain(
      `role="img" aria-label="${label.value}"`
    );
  });

  it('keeps an arrow divider between the panes on every text surface', () => {
    const arrow = slideDistillery.tokens.split.arrowGlyph.value;
    const composition = compose(arrowExample);
    for (const output of [
      runtime.surfaces.text.render(composition),
      runtime.surfaces.markdown.render(composition),
    ]) {
      expect(output).toContain(`\n\n${arrow}\n\n`);
    }
    expect(runtime.surfaces.slack.render(composition).blocks).toContainEqual({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: arrow }],
    });
    expect(runtime.surfaces.text.render(compose(example))).not.toContain(arrow);
  });

  it('renders each pane under its label, and nodes as themselves', () => {
    expect(runtime.surfaces.text.renderNode(stackedExample))
      .toMatchInlineSnapshot(`
      "BEFORE
      × Five batch windows.
      × Manual retries.

      ● AFTER
      - One nightly run.

      npm run settle -- --nightly"
    `);
    expect(runtime.surfaces.markdown.renderNode(stackedExample))
      .toMatchInlineSnapshot(`
      "## Before

      - × Five batch windows.
      - × Manual retries.

      ## ● After

      - One nightly run.

      \`\`\`
      npm run settle -- --nightly
      \`\`\`"
    `);
    expect(runtime.surfaces.slack.renderNode(stackedExample).blocks)
      .toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "text": "*BEFORE*",
              "type": "mrkdwn",
            },
          ],
          "type": "context",
        },
        {
          "elements": [
            {
              "elements": [
                {
                  "elements": [
                    {
                      "text": "× ",
                      "type": "text",
                    },
                    {
                      "text": "Five batch windows.",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "text": "× ",
                      "type": "text",
                    },
                    {
                      "text": "Manual retries.",
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
        {
          "elements": [
            {
              "text": "*● AFTER*",
              "type": "mrkdwn",
            },
          ],
          "type": "context",
        },
        {
          "elements": [
            {
              "elements": [
                {
                  "elements": [
                    {
                      "text": "One nightly run.",
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
        {
          "text": {
            "text": " ",
            "type": "mrkdwn",
          },
          "type": "section",
        },
        {
          "text": {
            "text": "\`\`\`
      npm run settle -- --nightly
      \`\`\`",
            "type": "mrkdwn",
          },
          "type": "section",
        },
      ]
    `);
  });
});
