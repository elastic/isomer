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

import { example, examples, plainExample } from './examples';
import { markdown as markdownContent, slack, text } from './index';
import { schema, type SlideTranscriptNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const markdown = (node: SlideTranscriptNode): string =>
  serializeMarkdown(markdownContent(node));

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const { roleLabel } = slideDistillery.tokens.transcript;

describe('slideTranscript schema', () => {
  it('holds one to four turns', () => {
    const [first] = example.turns;
    expect(schema.safeParse({ ...example, turns: [] }).success).toBe(false);
    expect(
      schema.safeParse({ ...example, turns: Array(5).fill(first) }).success
    ).toBe(false);
    expect(examples.every((node) => schema.safeParse(node).success)).toBe(true);
  });
});

describe('slideTranscript output', () => {
  it('prefixes each turn with its speaker in text', () => {
    expect(text(example).split('\n')).toEqual([
      'BOOKING A DELIVERY SLOT',
      'User: Deliver my groceries tomorrow morning.',
      'Model: {"action":"book","window":"tomorrow"}',
      'Host: window: expected a start and end time',
      'Model: {"action":"book","window":{"start":"08:00","end":"10:00"}}',
    ]);
  });

  it('breaks a multi-line turn under its speaker', () => {
    expect(text(plainExample).split('\n')).toEqual([
      'User: Why did the nightly build fail?',
      'Model:',
      'The lockfile changed without a version bump.',
      'Run the install step again.',
    ]);
  });

  it.each([
    ['\\n', '\n'],
    ['\\r', '\r'],
    ['\\r\\n', '\r\n'],
    ['U+2028', ' '],
    ['U+2029', ' '],
  ])('breaks a prose turn at %s on every surface', (_name, terminator) => {
    const node: SlideTranscriptNode = {
      type: 'slideTranscript',
      turns: [{ role: 'model', text: `First line.${terminator}Second line.` }],
    };
    expect(text(node)).toBe('Model:\nFirst line.\nSecond line.');
    expect(markdown(node)).toBe('**Model**\n\nFirst line.\\\nSecond line.');
    expect(slack(node)).toEqual([
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*Model*\nFirst line.\nSecond line.' },
      },
    ]);
  });

  it('fences a code turn in markdown and Slack', () => {
    expect(markdown(example)).toContain(
      '**Host**\n\n```text\nwindow: expected a start and end time\n```'
    );
    expect(slack(example)).toContainEqual({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Host*\n```\nwindow: expected a start and end time\n```',
      },
    });
  });

  it('sets the label in capitals, as the slide draws it', () => {
    expect(markdown(example)).toMatch(/^\*\*BOOKING A DELIVERY SLOT\*\*\n\n/);
    expect(slack(example)[0]).toEqual({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: '*BOOKING A DELIVERY SLOT*' }],
    });
  });
});

describe('slideTranscript in the DOM', () => {
  const turnsOf = (node: SlideTranscriptNode) =>
    [
      ...runtime.surfaces.html
        .render(compose(node))
        .html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g),
    ].map(([, inner = '']) =>
      inner.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"')
    );

  it.each(examples.map((node, index) => [index, node] as const))(
    'example %i names each speaker and keeps each line in its text',
    (_index, node) => {
      expect(turnsOf(node)).toEqual(
        node.turns.map(
          ({ role, text: said }) => `${roleLabel[role].value} ${said}`
        )
      );
    }
  );

  it('breaks a turn at any line terminator as at a newline', () => {
    expect(
      turnsOf({
        type: 'slideTranscript',
        turns: [{ role: 'host', text: 'one two\r\nthree' }],
      })
    ).toEqual([`${roleLabel.host.value} one\ntwo\nthree`]);
  });
});
