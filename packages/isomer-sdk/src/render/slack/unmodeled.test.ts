/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { PrimitiveNode } from '../../define/primitive_module';
import {
  primitiveConformanceCases,
  type PrimitiveConformanceExample,
  type PrimitiveConformanceHarness,
} from '../../testing/conformance';

import { SLACK_LIMITS, type SlackBlock } from './blocks';
import { renderSlackEnvelope, type SlackEnvelopeDispatcher } from './envelope';
import {
  isModeledSlackBlockType,
  isUnmodeledSlackBlock,
  unmodeledSlackBlock,
} from './unmodeled';

interface SlackCarouselBlock {
  type: 'carousel';
  elements: Array<{
    type: 'card';
    title: { type: 'plain_text'; text: string };
  }>;
}

const carousel = (title: string): SlackCarouselBlock => ({
  type: 'carousel',
  elements: [{ type: 'card', title: { type: 'plain_text', text: title } }],
});

const render = (blocks: readonly SlackBlock[]) =>
  renderSlackEnvelope({ type: 'view', body: [{ type: 'n' }] }, {
    renderText: ({ type }) => type,
    renderMarkdown: ({ type }) => type,
    renderSlack: () => blocks,
  } satisfies SlackEnvelopeDispatcher<{ type: string }>).blocks;

const overlong = 'x'.repeat(SLACK_LIMITS.sectionTextChars + 1);

describe('unmodeledSlackBlock', () => {
  it('returns the block as is, marked by a key JSON never sees', () => {
    const block = unmodeledSlackBlock(carousel('A'));
    expect(JSON.parse(JSON.stringify(block))).toEqual(carousel('A'));
    expect(isUnmodeledSlackBlock(block)).toBe(true);
    expect(isUnmodeledSlackBlock(carousel('A'))).toBe(false);
    expect(isUnmodeledSlackBlock(null)).toBe(false);
  });

  it('refuses a type Isomer models, and checks fields against a given interface', () => {
    // @ts-expect-error Isomer models `divider`.
    unmodeledSlackBlock({ type: 'divider' });
    unmodeledSlackBlock<SlackCarouselBlock>({
      type: 'carousel',
      // @ts-expect-error `card` elements need a `title`.
      elements: [{ type: 'card' }],
    });
    expect(isModeledSlackBlockType('divider')).toBe(true);
  });

  it('knows which types Isomer models', () => {
    expect(isModeledSlackBlockType('section')).toBe(true);
    expect(isModeledSlackBlockType('carousel')).toBe(false);
    expect(isModeledSlackBlockType('toString')).toBe(false);
  });
});

describe('the Slack envelope and blocks it does not fit', () => {
  it('passes an unmodeled block through untouched', () => {
    const block = unmodeledSlackBlock(carousel(overlong));
    const [kept] = render([block]);
    expect(kept).toBe(block);
    expect(JSON.stringify(render([block]))).toBe(
      JSON.stringify([carousel(overlong)])
    );
  });

  it('passes a block of a type it does not model through untouched, wrapped or not', () => {
    const block = carousel(overlong) as unknown as SlackBlock;
    expect(render([block])).toEqual([block]);
  });

  it('fits nothing in a wrapped block of a type it models', () => {
    const type: string = 'section';
    const section = unmodeledSlackBlock({
      type,
      text: { type: 'mrkdwn', text: overlong },
    });
    const spacer = unmodeledSlackBlock({
      type,
      text: { type: 'mrkdwn', text: ' ' },
    });
    const fields = unmodeledSlackBlock({
      type,
      fields: [{ type: 'mrkdwn', text: 'f' }],
    });
    const blocks = render([section, spacer, fields, fields]);
    expect(blocks.filter(isUnmodeledSlackBlock)).toEqual([
      section,
      spacer,
      fields,
      fields,
    ]);
  });

  it('counts an unmodeled block as one toward the block budget', () => {
    const fits = Array.from({ length: SLACK_LIMITS.blocksPerMessage }, () =>
      unmodeledSlackBlock(carousel('A'))
    );
    expect(render(fits)).toHaveLength(SLACK_LIMITS.blocksPerMessage);
    const over = render([...fits, unmodeledSlackBlock(carousel('A'))]);
    expect(over).toHaveLength(SLACK_LIMITS.blocksPerMessage);
    expect(over.at(-1)?.type).toBe('context');
  });
});

describe('unmodeled block conformance case', () => {
  const unmodeledCase = primitiveConformanceCases.find(
    ({ name }) => name === 'wraps only Slack blocks Isomer does not model'
  )!;
  const example = {
    type: 'note',
    exampleIndex: 0,
    node: { type: 'note' },
  } as unknown as PrimitiveConformanceExample;
  const harnessFor = (blocks: readonly SlackBlock[]) =>
    ({
      renderSlack: (_node: PrimitiveNode) => blocks,
    }) as unknown as PrimitiveConformanceHarness;

  it('accepts a wrapped block of a type Isomer does not model', () => {
    expect(() =>
      unmodeledCase.run(
        example,
        harnessFor([unmodeledSlackBlock(carousel('A'))])
      )
    ).not.toThrow();
  });

  it('rejects a wrapped block of a type Isomer models', () => {
    const type: string = 'divider';
    expect(() =>
      unmodeledCase.run(example, harnessFor([unmodeledSlackBlock({ type })]))
    ).toThrow(
      'Isomer models `divider` blocks: return this one without `unmodeledSlackBlock`.'
    );
  });
});
