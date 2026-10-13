/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CalloutNode, DividerNode } from '../fixtures/components_pack';

import { readExamples } from './read_examples';

const labeled: DividerNode = { type: 'divider', label: 'Evidence' };

describe('readExamples', () => {
  it('labels bare nodes by the short values that tell them apart', () => {
    const warning: CalloutNode = {
      type: 'callout',
      tone: 'warning',
      body: 'A long sentence that is not a label.',
    };
    const danger: CalloutNode = {
      type: 'callout',
      tone: 'danger',
      body: 'Another long sentence.',
    };
    expect(
      readExamples({ examples: [warning, danger] }).map(({ name }) => name)
    ).toEqual(['Example 1 (tone: warning)', 'Example 2 (tone: danger)']);
  });

  it('falls back to a numbered label when nothing differs', () => {
    const [example] = readExamples({ examples: [{ type: 'divider' }] });
    expect(example).toEqual({ name: 'Example 1', node: { type: 'divider' } });
  });

  it('keeps named examples as given', () => {
    expect(
      readExamples({
        examples: [
          { name: 'Labeled', description: 'With a label.', node: labeled },
        ],
      })
    ).toEqual([
      { name: 'Labeled', description: 'With a label.', node: labeled },
    ]);
  });

  it('numbers bare nodes by position among named ones', () => {
    const examples = readExamples({
      examples: [{ name: 'Labeled', node: labeled }, { type: 'divider' }],
    });
    expect(examples.map(({ name }) => name)).toEqual(['Labeled', 'Example 2']);
  });
});
