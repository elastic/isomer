/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import type { SlideContentNode } from '../body_node';
import { slideFonts } from '../examples/fonts';
import { slideDeckFrame, slidesPack } from '../pack';
import type { SlideFrameNode } from '../primitives/slide_frame/types';

import { slideOverflow, slideOverlaps } from './overflow';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});
const takumi = createTakumiImageBackend({ fonts: slideFonts });

const layout = (body: SlideContentNode[]) => {
  const frame: SlideFrameNode = { type: 'slideFrame', body };
  const composition: Composition = { type: 'view', body: [frame] };
  return takumi.measure(runtime.surfaces.svg.render(composition));
};

const measure = async (body: SlideContentNode[]) =>
  slideOverflow(await layout(body));

describe('slideOverflow', () => {
  it('finds nothing on a slide that fits', async () => {
    expect(
      await measure([{ type: 'slideHeading', title: 'Refunds settle faster' }])
    ).toBeUndefined();
  });

  it('reports how far content runs past the bottom', async () => {
    const line: SlideContentNode = {
      type: 'slideHeading',
      title: 'One more line of heading',
    };
    const overflow = await measure(Array.from({ length: 12 }, () => line));
    expect(overflow?.bottom).toBeGreaterThan(100);
    expect(overflow?.nodes.at(-1)).toBe(11);
    expect(overflow?.nodes).not.toContain(0);
  });
});

describe('slideOverlaps', () => {
  const heading: SlideContentNode = {
    type: 'slideHeading',
    title: 'Three numbers tell a shift lead whether the path is working',
    lede: 'Each one points at a different station.',
  };
  const stats: SlideContentNode = {
    type: 'slideStats',
    items: [
      {
        label: 'Lines per hour',
        body: 'How fast pickers move through a zone.',
      },
      { label: 'Pick accuracy', body: 'Totes that pass the check scan.' },
      { label: 'Vans on time', body: 'Vans that leave inside their slot.' },
    ],
  };

  it('finds nothing when nodes stack cleanly', async () => {
    expect(slideOverlaps(await layout([heading, stats]))).toEqual([]);
  });

  it('names a squeezed node and the one drawn over it', async () => {
    const list: SlideContentNode = {
      type: 'slideBulletList',
      label: 'What each points at',
      items: [
        'Lines per hour falls when batches are too small or aisles are blocked.',
        'Pick accuracy falls when the merge shelf is short-staffed.',
        'Vans on time falls when the check scan queues back into the merge area.',
        'Every number is reviewed at the handover between shifts.',
      ],
    };
    const [overlap] = slideOverlaps(await layout([heading, stats, list]));
    expect(overlap?.nodes).toEqual([1, 2]);
    expect(overlap?.by).toBeGreaterThan(10);
  });
});
