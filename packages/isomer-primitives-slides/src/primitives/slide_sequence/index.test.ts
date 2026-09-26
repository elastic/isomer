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

import { example, examples, fullExample } from './examples';
import { markdown, text } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [node],
});

const messages = (value: unknown): string[] =>
  schema.safeParse(value).error?.issues.map(({ message }) => message) ?? [];

describe('slideSequence', () => {
  it('validates every example', () => {
    for (const node of examples) {
      expect(runtime.validate(compose(node)).errors).toEqual([]);
    }
  });

  it('holds three to five actors and up to ten messages', () => {
    const [first, second] = example.actors;
    expect(
      schema.safeParse({ ...example, actors: [first, second] }).success
    ).toBe(false);
    expect(
      schema.safeParse({
        ...fullExample,
        actors: [...fullExample.actors, { id: 'extra', label: 'extra' }],
      }).success
    ).toBe(false);
    expect(
      schema.safeParse({
        ...fullExample,
        messages: [...fullExample.messages, fullExample.messages[0]],
      }).success
    ).toBe(false);
  });

  it('rejects duplicate ids, unknown actors, self-messages, and idle actors', () => {
    const [first, ...rest] = example.actors;
    expect(
      messages({ ...example, actors: [first, ...rest, { ...first }] })
    ).toContain('duplicate actor id "shopper"');
    expect(
      messages({
        ...example,
        messages: [
          ...example.messages,
          { from: 'store', to: 'courier', label: 'Ship it' },
        ],
      })
    ).toEqual(['message to names unknown actor "courier"']);
    expect(
      messages({
        ...example,
        messages: [
          ...example.messages,
          { from: 'store', to: 'store', label: 'Log it' },
        ],
      })
    ).toEqual([
      'message from "store" to itself; a message joins two different actors',
    ]);
    expect(
      messages({
        ...example,
        messages: example.messages.filter(
          ({ from, to }) => from !== 'bank' && to !== 'bank'
        ),
      })
    ).toEqual(['actor "bank" sends or receives no message']);
  });

  it('reports a rule across fields alongside a field that fails', () => {
    const [first, ...rest] = example.actors;
    expect(
      messages({
        ...example,
        actors: [{ ...first, tone: 'green' }, ...rest],
        messages: [
          ...example.messages,
          { from: 'store', to: 'store', label: 'Log it' },
        ],
      })
    ).toEqual([
      expect.stringContaining('expected one of'),
      'message from "store" to itself; a message joins two different actors',
    ]);
  });

  it('reads past a field too malformed for its rules', () => {
    expect(() =>
      schema.safeParse({ ...example, messages: 'none' })
    ).not.toThrow();
  });

  it('renders numbered lines with actor labels, mono labels as code in markdown', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "1. shopper → store: Place order
      2. store → payments: authorize(card)
      3. payments → bank: Charge request
      4. bank → payments: DECLINED 51
      5. store → shopper: Try another card
      6. shopper → store: Second card
      7. payments → store: Approved"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "1. shopper → store: Place order
      2. store → payments: \`authorize(card)\`
      3. payments → bank: Charge request
      4. bank → payments: \`DECLINED 51\`
      5. store → shopper: Try another card
      6. shopper → store: Second card
      7. payments → store: Approved"
    `);
  });

  it('strips marks from prose labels in text and keeps them in markdown', () => {
    expect(text(fullExample)).toContain('5. kitchen → app: Ready in 15 min');
    expect(markdown(fullExample)).toContain(
      '5. kitchen → app: Ready in **15 min**'
    );
  });
});
