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
import { example as codeExample } from '../slide_code/examples';
import { authoredStrings, slackText } from '../test_helpers.fixtures';

import { chatExample, example, examples, terminalExample } from './examples';
import { schema } from './schema';
import type { SlideWindowNode } from './types';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const authored = authoredStrings([
  'type',
  'chrome',
  'spacing',
  'tone',
  'language',
  'role',
  'format',
]);

const parity = (node: PrimitiveNode, composition: Composition) => {
  const outputs = [
    runtime.surfaces.text.render(composition),
    runtime.surfaces.markdown.render(composition),
    slackText(runtime.surfaces.slack.render(composition).blocks),
  ];
  for (const value of authored(node)) {
    for (const output of outputs) {
      expect(output.toLowerCase()).toContain(value.toLowerCase());
    }
  }
};

const nestedMessage = 'a window cannot hold another window';

describe('slideWindow schema', () => {
  it('accepts every example', () => {
    expect(examples.every((node) => schema.safeParse(node).success)).toBe(true);
  });

  it('rejects a window directly inside a window', () => {
    const nested: SlideWindowNode = { ...terminalExample, body: [chatExample] };
    const { errors } = runtime.validate(compose(nested));
    expect(
      errors.map(({ path, message }) => `${path}: ${message}`)
    ).toContainEqual(`body[0].body[0].body: ${nestedMessage}`);
  });

  it('rejects a window nested deeper, through a split', () => {
    const result = schema.safeParse({
      ...terminalExample,
      body: [
        {
          type: 'slideSplit',
          left: { items: [codeExample] },
          right: { items: [chatExample] },
        },
      ],
    });
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({ message: nestedMessage, path: ['body'] })
    );
  });

  it('allows a window inside a render’s embedded composition', () => {
    expect(
      schema.safeParse({
        ...terminalExample,
        body: [
          {
            type: 'slideRender',
            surface: 'svg',
            composition: { type: 'view', body: [chatExample] },
          },
        ],
      }).success
    ).toBe(true);
  });
});

describe('slideWindow output', () => {
  it('captions its children with the title on Slack, as a channel', () => {
    const { blocks } = runtime.surfaces.slack.render(compose(example));
    expect(blocks[0]).toEqual({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: '*# checkout-oncall*' }],
    });
    expect(blocks.some((block) => block.type === 'table')).toBe(true);
  });

  it('brackets the title in text', () => {
    expect(runtime.surfaces.text.renderNode(chatExample)).toMatch(
      /^\[Build assistant\]\nUser: Why did the nightly build fail\?/
    );
  });

  it('bolds the title in markdown', () => {
    expect(runtime.surfaces.markdown.renderNode(terminalExample)).toMatch(
      /^\*\*~\/shop — release\*\*\n\n```text\n/
    );
  });

  it.each(examples.map((node, index) => [index, node] as const))(
    'keeps every authored string on every surface (example %i)',
    (_index, node) => parity(node, compose(node))
  );
});
