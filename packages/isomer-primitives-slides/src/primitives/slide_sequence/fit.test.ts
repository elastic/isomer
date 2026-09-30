/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { findings, measured, nodeBox, slideOf } from '../../examples/measure';
import { frameContentWidth } from '../../theme/components/frame';
import { sequence, sequenceFit } from '../../theme/components/sequence';
import { scalePx } from '../../theme/scale';
import { layoutContext, renderedStep } from '../size.fixtures';
import { tallestExample } from '../slide_heading/examples';
import { paneWidths } from '../slide_split/pane_layout';

import { fullExample } from './examples';
import { sequenceLoad, sequenceStep, wrapHeight } from './fit';
import { sequenceMaxMessages, type SlideSequenceNode } from './schema';

/** The first `count` messages of {@link fullExample}, with the actors they name. */
const firstMessages = (count: number): SlideSequenceNode => {
  const messages = fullExample.messages.slice(0, count);
  return {
    ...fullExample,
    actors: fullExample.actors.filter(({ id }) =>
      messages.some(({ from, to }) => from === id || to === id)
    ),
    messages,
  };
};

const inSplit = (node: SlideSequenceNode) => ({
  type: 'slideSplit',
  panes: [
    { items: [node] },
    { items: [{ type: 'slideBulletList', items: ['One'] }] },
  ],
});

describe('sequenceStep', () => {
  it('steps down at each budget, on both sides of it', () => {
    expect(sequenceStep(firstMessages(sequenceFit.l), layoutContext())).toBe(
      'l'
    );
    expect(
      sequenceStep(firstMessages(sequenceFit.l + 1), layoutContext())
    ).toBe('m');
    expect(sequenceStep(firstMessages(sequenceFit.m), layoutContext())).toBe(
      'm'
    );
    expect(
      sequenceStep(firstMessages(sequenceFit.m + 1), layoutContext())
    ).toBe('s');
  });

  it('keeps an authored size', () => {
    expect(sequenceStep({ ...fullExample, size: 'l' }, layoutContext())).toBe(
      'l'
    );
  });

  it('takes the whole body on a slide without a heading', () => {
    const node = firstMessages(sequenceFit.m);
    expect(renderedStep('sequence-gapSize', node)).toBe('l');
    expect(renderedStep('sequence-gapSize', node, tallestExample)).toBe('m');
  });

  it('steps down under a crowded heading', () => {
    expect(
      sequenceStep(
        firstMessages(sequenceFit.l),
        layoutContext({ crowding: 1.1 })
      )
    ).toBe('m');
    expect(
      sequenceStep(
        firstMessages(sequenceFit.l + 1),
        layoutContext({ crowding: 0.8 })
      )
    ).toBe('l');
  });
});

// Under the tallest heading crowding is 1, so each step holds exactly its budget.
describe('sequence budgets fit what they allow', () => {
  it.each([
    { step: 'l', count: sequenceFit.l },
    { step: 'm', count: sequenceFit.m },
    { step: 's', count: sequenceMaxMessages },
  ] as const)('$count messages at $step', async ({ step, count }) => {
    const node = firstMessages(count);
    expect(sequenceStep(node, layoutContext())).toBe(step);
    expect(
      await findings(slideOf(tallestExample, { ...node, size: step }))
    ).toEqual([]);
  });
});

describe('long actor and message labels', () => {
  const node: SlideSequenceNode = {
    type: 'slideSequence',
    actors: [
      { id: 'web', label: 'checkout frontend service' },
      { id: 'psp', label: 'payment orchestration gateway' },
      { id: 'bank', label: 'bank' },
      { id: 'ledger', label: 'ledger' },
      { id: 'mail', label: 'mail' },
    ],
    messages: [
      {
        from: 'web',
        to: 'psp',
        label: 'Authorize the card for the full basket amount now',
      },
      { from: 'psp', to: 'bank', label: 'Charge' },
      { from: 'bank', to: 'ledger', label: 'Post' },
      { from: 'ledger', to: 'mail', label: 'Notify' },
    ],
  };

  it('counts what wrapping adds, in message rows', () => {
    expect(sequenceLoad(fullExample, 'l', frameContentWidth)).toBe(
      fullExample.messages.length
    );
    const [pane] = paneWidths(frameContentWidth, 'even', 'gap');
    const wrapped = sequenceLoad(node, 'l', pane);
    expect(wrapped).toBeGreaterThan(node.messages.length + 1);
    expect(wrapHeight(node, 's', pane)).toBeLessThan(
      wrapHeight(node, 'l', pane)
    );
  });

  // Lifelines, then actors, then messages, each a label and its arrow.
  it.each([
    { name: 'full width', slide: slideOf(tallestExample, node) },
    { name: 'half a split', slide: slideOf(inSplit(node)) },
  ])('wrap within their spans at $name', async ({ slide }) => {
    const [grid] = nodeBox(await measured(slide), 'slideSequence').children;
    const { length } = node.actors;
    const actors = grid!.children.slice(length, 2 * length);
    actors.slice(1).forEach((actor, index) => {
      const before = actors[index]!;
      expect(before.x + before.width).toBeLessThanOrEqual(
        actor.x - scalePx(sequence.actor.gutter) / 2
      );
    });
    const [message] = grid!.children.slice(2 * length);
    const [label] = message!.children;
    expect(label!.x).toBeGreaterThanOrEqual(message!.x - 1);
    expect(label!.x + label!.width).toBeLessThanOrEqual(
      message!.x + message!.width + 1
    );
    expect(await findings(slide)).toEqual([]);
  });
});

describe('a label set as code, or in a word wider than its span', () => {
  const labelled = (label: string): SlideSequenceNode => ({
    type: 'slideSequence',
    actors: [
      { id: 'app', label: 'app' },
      { id: 'api', label: 'api' },
      { id: 'db', label: 'db' },
    ],
    messages: [
      { from: 'app', to: 'api', label },
      { from: 'api', to: 'db', label: 'Read' },
    ],
    size: 'l',
  });
  const [pane] = paneWidths(frameContentWidth, 'even', 'gap');
  const lineHeight =
    scalePx(sequence.labelSizes.l) * parseFloat(sequence.labelLineHeight.value);
  // Lifelines, then actors, then messages, each a label and its arrow.
  const drawnLines = async (node: SlideSequenceNode): Promise<number> => {
    const [grid] = nodeBox(
      await measured(slideOf(inSplit(node))),
      'slideSequence'
    ).children;
    const [message] = grid!.children.slice(2 * node.actors.length);
    const [label] = message!.children;
    return Math.round(label!.height / lineHeight);
  };

  it.each([
    { label: '`POST /api/v1/payments/authorize/card-token`', lines: 4 },
    { label: '`authorize(card, amount)` then `capture(id)`', lines: 3 },
    { label: 'Supercalifragilisticexpialidocious', lines: 2 },
    {
      label: 'Send https://example.com/orders/1234567890/receipts/latest now',
      lines: 5,
    },
  ])(
    'counts the $lines lines takumi draws of $label',
    async ({ label, lines }) => {
      expect(await drawnLines(labelled(label))).toBe(lines);
      expect(wrapHeight(labelled(label), 'l', pane)).toBe(
        (lines - 1) * lineHeight
      );
    }
  );

  it('measures a line break in an actor as the space it draws', () => {
    const [first, ...rest] = labelled('Read').actors;
    const named = (label: string) =>
      wrapHeight(
        { ...labelled('Read'), actors: [{ ...first!, label }, ...rest] },
        'l',
        pane
      );
    expect(named('checkout\nfrontend\nservice')).toBe(
      named('checkout frontend service')
    );
    expect(named('checkout\nfrontend\nservice')).toBeGreaterThan(0);
  });
});
