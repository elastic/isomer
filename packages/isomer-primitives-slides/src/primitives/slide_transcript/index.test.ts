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
import { slackText } from '../test_helpers.fixtures';

import { example, examples, plainExample } from './examples';
import { markdown, slack, text } from './index';
import type { SlideTranscriptNode } from './schema';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

describe('slideTranscript', () => {
  it('holds one to four turns', () => {
    const [first] = example.turns;
    expect(schema.safeParse({ ...example, turns: [] }).success).toBe(false);
    expect(
      schema.safeParse({ ...example, turns: Array(5).fill(first) }).success
    ).toBe(false);
    expect(examples.every((node) => schema.safeParse(node).success)).toBe(true);
  });

  it('prefixes each turn with its speaker in text', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "Booking a delivery slot
      User: Deliver my groceries tomorrow morning.
      Model: {"action":"book","window":"tomorrow"}
      Host: window: expected a start and end time
      Model: {"action":"book","window":{"start":"08:00","end":"10:00"}}"
    `);
  });

  it('breaks a multi-line turn under its speaker', () => {
    expect(text(plainExample)).toMatchInlineSnapshot(`
      "User: Why did the nightly build fail?
      Model:
      The lockfile changed without a version bump.
      Run the install step again."
    `);
  });

  it.each([
    ['\\r', '\r'],
    ['\\r\\n', '\r\n'],
    ['U+2028', '\u2028'],
    ['U+2029', '\u2029'],
  ])('breaks a prose turn at %s as at a newline', (_name, terminator) => {
    const node: SlideTranscriptNode = {
      type: 'slideTranscript',
      turns: [{ role: 'model', text: `First line.${terminator}Second line.` }],
    };
    expect(text(node)).toBe('Model:\nFirst line.\nSecond line.');
    expect(markdown(node)).toBe('**Model**\n\nFirst line.\nSecond line.');
    expect(slack(node)).toEqual([
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*Model*\nFirst line.\nSecond line.' },
      },
    ]);
  });

  it('fences code turns in markdown', () => {
    expect(markdown(example)).toContain(
      '**Host**\n\n```text\nwindow: expected a start and end time\n```'
    );
  });

  it('renders one Slack section per turn, code in a block', () => {
    expect(slack(example)).toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "text": "*Booking a delivery slot*",
              "type": "mrkdwn",
            },
          ],
          "type": "context",
        },
        {
          "text": {
            "text": "*User*
      Deliver my groceries tomorrow morning.",
            "type": "mrkdwn",
          },
          "type": "section",
        },
        {
          "text": {
            "text": "*Model*
      \`\`\`
      {"action":"book","window":"tomorrow"}
      \`\`\`",
            "type": "mrkdwn",
          },
          "type": "section",
        },
        {
          "text": {
            "text": "*Host*
      \`\`\`
      window: expected a start and end time
      \`\`\`",
            "type": "mrkdwn",
          },
          "type": "section",
        },
        {
          "text": {
            "text": "*Model*
      \`\`\`
      {"action":"book","window":{"start":"08:00","end":"10:00"}}
      \`\`\`",
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
        slackText(runtime.surfaces.slack.render(composition).blocks),
      ];
      const authored = [
        node.label,
        ...node.turns.map(({ text: said }) => said),
      ].filter((value): value is string => Boolean(value));
      for (const value of authored) {
        for (const output of outputs) {
          expect(output.toLowerCase()).toContain(value.toLowerCase());
        }
      }
    }
  );
});
