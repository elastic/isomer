/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { findings, measured, nodeBox, slideOf } from '../../examples/measure';
import type { SlideSize } from '../../theme/variants';
import { openBody } from '../layout';
import {
  example as headingExample,
  tallestExample,
} from '../slide_heading/examples';
import { headingRoom } from '../slide_heading/fit';
import type { SlideHeadingNode } from '../slide_heading/schema';

import { example, placeholderExample } from './examples';
import { legendHeight, legendStep } from './fit';
import type { SlideAnnotatedRenderPin } from './schema';
import type { SlideAnnotatedRenderNode } from './types';

const { pins: dense } = placeholderExample;
const { pins: twoLine } = example;

const wrappedTitle = dense.map((pin, index) =>
  index === 0
    ? { ...pin, title: 'Search filters the rows by store and date' }
    : pin
);

const corners: SlideAnnotatedRenderPin[] = [
  [0, 0],
  [100, 0],
  [0, 100],
  [100, 100],
].map(([x = 0, y = 0], index) => ({
  x,
  y,
  title: `Corner ${index + 1}`,
  body: 'At the edge.',
}));

const under = (heading?: SlideHeadingNode) => ({
  place: (node: SlideAnnotatedRenderNode) =>
    heading ? slideOf(heading, node) : slideOf(node),
  layout: {
    ...openBody,
    height: heading ? headingRoom(heading) : openBody.height,
  },
});

const alone = under();
const belowHeading = under(headingExample);
const belowTallest = under(tallestExample);

describe('legendHeight', () => {
  it.each<
    [SlideSize, string, readonly SlideAnnotatedRenderPin[], typeof alone]
  >([
    ['l', 'two-line bodies', twoLine, alone],
    ['l', 'a wrapped title', wrappedTitle, alone],
    ['m', 'six pins', dense, belowHeading],
    ['m', 'two-line bodies', [...twoLine, ...twoLine], alone],
    ['s', 'six pins', dense, belowTallest],
    ['s', 'two-line bodies', [...twoLine, ...dense.slice(0, 2)], belowTallest],
  ])(
    'matches what takumi draws at %s, with %s',
    async (step, _, pins, { place, layout }) => {
      expect(legendStep(pins, layout)).toBe(step);
      const node = { ...placeholderExample, pins };
      const [grid] = nodeBox(
        await measured(place(node)),
        'slideAnnotatedRender'
      ).children;
      const drawn = grid?.children[1]?.height ?? NaN;
      const estimate = legendHeight(pins, step, layout.width);
      expect(estimate).toBeGreaterThanOrEqual(drawn);
      expect(estimate - drawn).toBeLessThan(1);
    }
  );

  it('holds the most pins at its smallest step under the tallest heading', () => {
    expect(legendHeight(dense, 's', openBody.width)).toBeLessThanOrEqual(
      belowTallest.layout.height
    );
  });
});

describe('pins on the panel edge stay in the room', () => {
  it.each([
    ['alone', alone],
    ['under the tallest heading', belowTallest],
  ])('%s', async (_, { place }) => {
    for (const render of [example.render, placeholderExample.render]) {
      expect(
        await findings(place({ ...example, render, pins: corners }))
      ).toEqual([]);
    }
  });
});

describe('a legend alone stays in the room', () => {
  it.each([
    ['alone', alone],
    ['under the tallest heading', belowTallest],
  ])('%s', async (_, { place }) => {
    const render = {
      ...placeholderExample.render,
      surfaces: ['text' as const],
    };
    expect(await findings(place({ ...placeholderExample, render }))).toEqual(
      []
    );
  });
});
