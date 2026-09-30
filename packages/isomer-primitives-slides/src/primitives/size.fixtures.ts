/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';

import { slideDeckFrame, slidesPack } from '../pack';
import { frameContentWidth } from '../theme/components/frame';

import { slideLayout } from './layout';
import { headingRoom } from './slide_heading/fit';
import type { SlideHeadingNode } from './slide_heading/schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

/** The step in `node`'s `variant` class (`statement-textSize`), alone on a slide or under `heading`. */
export const renderedStep = (
  variant: string,
  node: object,
  heading?: SlideHeadingNode
): string | undefined =>
  new RegExp(`${variant}-(\\w+)`).exec(
    runtime.surfaces.html.render({
      type: 'view',
      body: [
        {
          type: 'slideFrame',
          body: heading ? [heading, node] : [node],
        } as PrimitiveNode,
      ],
    }).html
  )?.[1];

/** A two-line title and lede at `l`: the room load budgets are set against, so its crowding is 1. */
export const referenceHeading: SlideHeadingNode = {
  type: 'slideHeading',
  title: 'Four words carry the rest of this talk about payments today',
  lede: 'Each one names a step money takes between the card and the merchant account, and we will use them on every slide after this one.',
};

/** A three-line heading, which leaves less room below than load budgets assume. */
export const crowdingHeading: SlideHeadingNode = {
  type: 'slideHeading',
  title:
    'A title so long that it wraps past two lines and onto a third line, even at the smallest step it can take',
  lede: 'A lede long enough to take two lines of the heading measure at the lede size on the canvas. A lede long enough to take two lines of the heading measure at the lede size on the canvas.',
};

/** The crowding a frame gives the nodes below `heading`. */
export const crowdingBelow = (heading: SlideHeadingNode): number =>
  slideLayout({
    layout: { width: frameContentWidth, height: headingRoom(heading) },
  }).crowding;
