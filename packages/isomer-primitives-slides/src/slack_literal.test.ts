/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from './pack';
import { slideDeckPrimitives } from './registry';
import { alteredInCodeBlock, hasMrkdwnDelimiter } from './render';

// Text that `mrkdwn` would read as formatting or markup reaches Slack as literal rich text, as authored.

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const schemas = new Map<string, (typeof slideDeckPrimitives)[number]['schema']>(
  slideDeckPrimitives.map(({ type, schema }) => [type, schema])
);

/** Every text element of the node's `rich_text` blocks, and every `mrkdwn` string it sends. */
const texts = (node: PrimitiveNode) => {
  const blocks = runtime.surfaces.slack.renderNode(node).blocks;
  const rich: string[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (value && typeof value === 'object') {
      const { type, text } = value as { type?: unknown; text?: unknown };
      if (type === 'text' && typeof text === 'string') {
        rich.push(text);
      }
      Object.values(value).forEach(walk);
    }
  };
  walk(blocks.filter(({ type }) => type === 'rich_text'));
  const mrkdwn = JSON.stringify(
    blocks.filter(({ type }: SlackBlock) => type !== 'rich_text')
  );
  return { rich, mrkdwn };
};

type Case = [string, (text: string) => PrimitiveNode];

const code: Case[] = [
  ['slideCommand command', (text) => ({ type: 'slideCommand', command: text })],
  [
    'slideDiff lines',
    (text) => ({ type: 'slideDiff', lines: [{ text, op: 'add' }] }),
  ],
  [
    'slideCode lines',
    (text) => ({ type: 'slideCode', panels: [{ lines: [text] }] }),
  ],
  [
    'slideTranscript code turn',
    (text) => ({
      type: 'slideTranscript',
      turns: [{ role: 'host', format: 'code', text }],
    }),
  ],
];

const prose: Case[] = [
  [
    'slideCommand label',
    (text) => ({ type: 'slideCommand', label: text, command: 'ls' }),
  ],
  [
    'slideDiff file',
    (text) => ({ type: 'slideDiff', file: text, lines: [{ text: 'x' }] }),
  ],
  [
    'slideCode file',
    (text) => ({ type: 'slideCode', panels: [{ file: text, lines: ['x'] }] }),
  ],
  [
    'slideTranscript label',
    (text) => ({
      type: 'slideTranscript',
      label: text,
      turns: [{ role: 'user', text: 'Hi' }],
    }),
  ],
  [
    'slideTranscript prose turn',
    (text) => ({ type: 'slideTranscript', turns: [{ role: 'user', text }] }),
  ],
];

const valid = (node: PrimitiveNode) =>
  expect(schemas.get(node.type)?.safeParse(node).success).toBe(true);

describe('Slack code keeps what a code block would change', () => {
  it.each(
    code.flatMap(([name, node]) =>
      ['echo ```', 'if a <b> then', 'x &amp; y', 'a &lt; b'].map(
        (text) => [name, text, node] as const
      )
    )
  )('%s: %j', (_name, text, node) => {
    const built = node(text);
    valid(built);
    const { rich, mrkdwn } = texts(built);
    expect(rich.join('\n')).toContain(text);
    expect(mrkdwn).not.toContain('```');
  });

  it.each(code)(
    '%s stays a code block when nothing would change',
    (_name, node) => {
      const { rich, mrkdwn } = texts(node('a => b > c && d'));
      expect(rich).toEqual([]);
      expect(mrkdwn).toContain('a => b > c && d');
    }
  );
});

describe('Slack prose keeps every mrkdwn delimiter literal', () => {
  it.each(
    prose.flatMap(([name, node]) =>
      [
        'Use * literally',
        'snake_case_name',
        'a ~ b ~ c',
        'the ` key',
        '*bold* _it_',
      ].map((text) => [name, text, node] as const)
    )
  )('%s: %j', (_name, text, node) => {
    const built = node(text);
    valid(built);
    const { rich, mrkdwn } = texts(built);
    // Labels print in capitals on every surface.
    const shown = _name.endsWith('label') ? text.toUpperCase() : text;
    expect(rich.join('')).toContain(shown);
    expect(mrkdwn).not.toContain(shown);
  });
});

describe('Slack literal checks', () => {
  it('read a long input in linear time', () => {
    const started = performance.now();
    expect(alteredInCodeBlock(`${'&amp'.repeat(100_000)}\``)).toBe(false);
    expect(hasMrkdwnDelimiter('x'.repeat(100_000))).toBe(false);
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});
