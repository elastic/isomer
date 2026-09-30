/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { findings, slideOf } from '../../examples/measure';
import { sequenceFit } from '../../theme/components/sequence';
import { layoutContext, renderedStep } from '../size.fixtures';
import { tallestExample } from '../slide_heading/examples';

import { fullExample } from './examples';
import { sequenceStep } from './fit';
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
