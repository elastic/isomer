/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { findings, measured, nodeBox, slideOf } from '../../examples/measure';
import { frameContentWidth } from '../../theme/components/frame';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { openBody, withLayout } from '../layout';
import { renderedStep } from '../size.fixtures';
import { tallestExample } from '../slide_heading/examples';
import { headingRoom } from '../slide_heading/fit';
import { paneWidths } from '../slide_split/pane_layout';

import { example, fullExample, shortExample } from './examples';
import { layersHeight, layersStep } from './fit';
import type { SlideLayer, SlideLayersNode } from './schema';

const oneLine = 'Routes, rate-limits, and authenticates every request';
const twoLines = `${oneLine}, then retries the ones that fail with a backoff that doubles each time`;

const stack = (...bodies: string[]): SlideLayersNode => ({
  type: 'slideLayers',
  layers: bodies.map((body, index): SlideLayer => ({
    name: `Layer ${index + 1}`,
    body,
    owner: 'Platform',
  })),
});

const repeat = (count: number, body: string) =>
  Array.from({ length: count }, () => body);

/** Three layers, the first holding `chips`. */
const chipped = (...chips: string[]): SlideLayersNode => ({
  type: 'slideLayers',
  layers: [
    { name: 'Apps', chips, owner: 'Client' },
    ...stack(oneLine, oneLine).layers,
  ],
});

/** `count` layers of two chips each. */
const allChips = (count: number): SlideLayersNode => ({
  type: 'slideLayers',
  layers: Array.from({ length: count }, (_, index) => ({
    name: `Layer ${index + 1}`,
    chips: ['postgres', 'redis'],
    owner: 'Data team',
  })),
});

const inSplit = (node: SlideLayersNode) => ({
  type: 'slideSplit',
  panes: [
    { items: [node] },
    { items: [{ type: 'slideBulletList', items: ['One'] }] },
  ],
});

const [half] = paneWidths(frameContentWidth, 'even', 'gap');

const inLayout = (width: number, height: number) =>
  withLayout(undefined, { width, height });

const underTallest = inLayout(frameContentWidth, headingRoom(tallestExample));

/** The list, then its bands, each a name, its body or chips, and its owner's cell. */
const drawn = async (slide: Parameters<typeof measured>[0]) => {
  const [list] = nodeBox(await measured(slide), 'slideLayers').children;
  return list!;
};

const overflow = (path: string) => [
  {
    kind: 'overflow',
    path,
    type: 'slideLayers',
    by: expect.any(Number) as number,
  },
];

describe('layersHeight', () => {
  it('shrinks at each smaller step', () => {
    for (const node of [example, fullExample, allChips(4)]) {
      expect(layersHeight(node, 'm', openBody.width)).toBeLessThan(
        layersHeight(node, 'l', openBody.width)
      );
      expect(layersHeight(node, 's', openBody.width)).toBeLessThan(
        layersHeight(node, 'm', openBody.width)
      );
    }
  });

  it('grows with a body that wraps, a chip row, and a name that wraps', () => {
    const base = layersHeight(
      stack(...repeat(3, oneLine)),
      'l',
      openBody.width
    );
    const [first, ...rest] = stack(...repeat(3, oneLine)).layers;
    const grown = [
      stack(twoLines, oneLine, oneLine),
      chipped('ios', 'web'),
      { layers: [{ ...first!, name: 'Identity and access' }, ...rest] },
      { layers: [{ ...first!, name: 'Internationalization' }, ...rest] },
    ];
    for (const node of grown) {
      expect(layersHeight(node, 'l', openBody.width)).toBeGreaterThan(base);
    }
  });

  it('grows as the band narrows', () => {
    const node = stack(...repeat(3, oneLine));
    expect(layersHeight(node, 'l', half)).toBeGreaterThan(
      layersHeight(node, 'l', openBody.width)
    );
  });

  it('measures a line break in a chip as the space it draws', () => {
    const widths = Array.from({ length: 200 }, (_, index) => 700 + index);
    const heights = (chip: string) =>
      widths.map((width) => layersHeight(chipped(chip, 'web'), 'l', width));
    expect(heights('edge\ncache')).toEqual(heights('edge cache'));
    expect(heights('edge\ncache')).not.toEqual(heights('edgecache'));
  });

  it('is unbounded at a step where a chip outgrows its column', () => {
    const node = chipped('elasticsearch-serverless', 'web');
    expect(layersHeight(node, 'l', openBody.width)).toBeLessThan(Infinity);
    expect(layersHeight(node, 'l', half)).toBe(Infinity);
  });

  it.each([
    { name: 'the example', node: example },
    { name: 'the fullest example', node: fullExample },
    { name: 'the shortest example', node: shortExample },
    { name: 'bodies on two lines', node: stack(...repeat(4, twoLines)) },
    { name: 'chips in every layer', node: allChips(6) },
    {
      name: 'code in a body',
      node: stack('Calls `authorize(card)` on every request', oneLine, oneLine),
    },
    {
      name: 'a name broken across lines',
      node: {
        ...stack(...repeat(3, oneLine)),
        layers: [
          { name: 'Internationalization', body: oneLine, owner: 'Platform' },
          ...stack(oneLine, oneLine).layers,
        ],
      },
    },
  ] as { name: string; node: SlideLayersNode }[])(
    'is never less than takumi draws of $name, at any step',
    async ({ node }) => {
      for (const size of slideSizes) {
        const { height } = await drawn(slideOf({ ...node, size }));
        const estimate = layersHeight(node, size, openBody.width);
        expect(estimate).toBeGreaterThanOrEqual(height);
        expect(estimate - height).toBeLessThan(2 * node.layers.length);
      }
    }
  );
});

describe('layersStep', () => {
  it.each(['l', 'm'] as const)(
    'takes %s at the height it needs there, and the next step one pixel short',
    (step) => {
      const height = layersHeight(fullExample, step, openBody.width);
      expect(layersStep(fullExample, inLayout(openBody.width, height))).toBe(
        step
      );
      expect(
        layersStep(fullExample, inLayout(openBody.width, height - 1))
      ).toBe(slideSizes[slideSizes.indexOf(step) + 1]);
    }
  );

  it('takes s, the smallest step, where nothing fits', () => {
    expect(layersStep(fullExample, inLayout(openBody.width, 1))).toBe('s');
    expect(
      layersStep(
        chipped('elasticsearch-serverless', 'web'),
        inLayout(half, openBody.height)
      )
    ).toBe('s');
  });

  it('keeps an authored size', () => {
    expect(layersStep({ ...fullExample, size: 'l' }, inLayout(1, 1))).toBe('l');
    expect(layersStep({ ...shortExample, size: 's' }, undefined)).toBe('s');
  });

  it('takes the whole body on a slide without a heading', () => {
    const node = stack(...repeat(5, oneLine));
    expect(renderedStep('layers-listSize', node)).toBe('l');
    expect(renderedStep('layers-listSize', node, tallestExample)).toBe('m');
  });
});

describe('layers steps fit what they allow', () => {
  it.each([
    { step: 'l', node: stack(...repeat(4, oneLine)) },
    { step: 'l', node: stack(...repeat(3, twoLines)) },
    { step: 'l', node: allChips(4) },
    { step: 'm', node: stack(...repeat(5, oneLine)) },
    { step: 'm', node: stack(...repeat(6, oneLine)) },
    { step: 'm', node: stack(...repeat(4, twoLines)) },
    { step: 'm', node: example },
    { step: 's', node: allChips(6) },
    { step: 's', node: fullExample },
  ] as { step: SlideSize; node: SlideLayersNode }[])(
    '$node.layers.length layers take $step under the tallest heading',
    async ({ step, node }) => {
      expect(layersStep(node, underTallest)).toBe(step);
      expect(await findings(slideOf(tallestExample, node))).toEqual([]);
    }
  );

  it.each([
    { node: stack(...repeat(5, oneLine)), larger: 'l' },
    { node: allChips(6), larger: 'm' },
  ] as { node: SlideLayersNode; larger: SlideSize }[])(
    '$node.layers.length layers run past the body one step larger, at $larger',
    async ({ node, larger }) => {
      expect(
        await findings(slideOf(tallestExample, { ...node, size: larger }))
      ).toEqual(overflow('body[0].body[1]'));
    }
  );

  it('in half a split', async () => {
    const node = stack(...repeat(4, 'Cache'));
    expect(layersStep(node, inLayout(half, headingRoom(tallestExample)))).toBe(
      'l'
    );
    expect(await findings(slideOf(tallestExample, inSplit(node)))).toEqual([]);
  });
});

describe('a chip, an owner, or a word too wide for its column', () => {
  it('pushes the owner past the band, where it is reported, rather than under a chip', async () => {
    const slide = slideOf(inSplit(chipped('elasticsearch-serverless', 'web')));
    const [band] = (await drawn(slide)).children;
    const [, chips, owner] = band!.children;
    const [chip] = chips!.children;
    expect(chip!.x + chip!.width).toBeLessThanOrEqual(owner!.x);
    expect(await findings(slide)).toEqual(
      overflow('body[0].body[0].panes[0].items[0]')
    );
  });

  it('keeps an owner wider than the band clear of its chips, and reports it', async () => {
    const [first, ...rest] = chipped('ios', 'android', 'web').layers;
    const slide = slideOf(
      inSplit({
        type: 'slideLayers',
        layers: [
          { ...first!, owner: 'Platform engineering group', tone: 'primary' },
          ...rest,
        ],
      })
    );
    const [band] = (await drawn(slide)).children;
    const [, chips, owner] = band!.children;
    const [text] = owner!.children;
    expect(chips!.x + chips!.width).toBeLessThanOrEqual(text!.x);
    expect(await findings(slide)).toEqual(
      overflow('body[0].body[0].panes[0].items[0]')
    );
  });

  it('breaks a long word of a body inside its column, clear of the owner', async () => {
    const slide = slideOf(
      inSplit(
        stack(
          'See https://example.com/platform/gateway/rate-limits for every rule',
          oneLine,
          oneLine
        )
      )
    );
    const [band] = (await drawn(slide)).children;
    const [, body, owner] = band!.children;
    expect(
      Math.max(...(body!.runs ?? []).map(({ x, width }) => x + width))
    ).toBeLessThanOrEqual(owner!.x + 1);
  });

  it('draws a word of a name wider than its column on two lines', async () => {
    const [first, ...rest] = stack(...repeat(3, oneLine)).layers;
    const slide = slideOf(tallestExample, {
      type: 'slideLayers',
      layers: [{ ...first!, name: 'Internationalization' }, ...rest],
      size: 'l',
    });
    const [broken, whole] = (await drawn(slide)).children.map(
      ({ children: [name] }) => name!
    );
    expect(broken!.height).toBe(2 * whole!.height);
  });
});
