/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTakumiImageBackend,
  type LayoutBox,
} from '@elastic/isomer-image-takumi';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  checkLayout,
  type Composition,
  createChildNodeWalker,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../pack';
import { slideLayout } from '../primitives/layout';
import { referenceHeading, renderedStep } from '../primitives/size.fixtures';
import { longExample as agendaExample } from '../primitives/slide_agenda/examples';
import { fullExample as definitionsExample } from '../primitives/slide_definitions/examples';
import { wideExample as fanoutExample } from '../primitives/slide_fanout/examples';
import { examples as graphExamples } from '../primitives/slide_graph/examples';
import { graphCaptionWidth } from '../primitives/slide_graph/fit';
import type { SlideGraphNode } from '../primitives/slide_graph/schema';
import {
  example as headingExample,
  tallestExample,
} from '../primitives/slide_heading/examples';
import { fullExample as listExample } from '../primitives/slide_list/examples';
import { fullExample as roadmapExample } from '../primitives/slide_roadmap/examples';
import { fullExample as treeExample } from '../primitives/slide_tree/examples';
import { slideDeckPrimitives } from '../registry';
import { agendaFit } from '../theme/components/agenda';
import {
  definitionsFit,
  definitionsRowFit,
} from '../theme/components/definitions';
import { quoteFit } from '../theme/components/quote';
import { statementFit } from '../theme/components/statement';

import { slideFonts } from './fonts';
import { previewSlide } from './preview_slide';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});
const takumi = createTakumiImageBackend({ fonts: slideFonts });
const walk = createChildNodeWalker(runtime.primitives);

const cases = slideDeckPrimitives.flatMap(({ type, examples }) =>
  examples.map((example, index) => ({
    name: `${type} #${index}`,
    slide: previewSlide(example as PrimitiveNode),
  }))
);

/** The fullest count-sized examples, under the heading their load budgets are set against. */
const referenceCases = [agendaExample, definitionsExample].map((example) => {
  const slide = previewSlide(example);
  const frame = slide.body[0] as PrimitiveNode & { body: PrimitiveNode[] };
  return {
    name: `${example.type} below the reference heading`,
    slide: {
      ...slide,
      body: [{ ...frame, body: [referenceHeading, example] }],
    },
  };
});

const findings = async (slide: Composition) =>
  checkLayout(
    await takumi.measure(runtime.surfaces.svg.render(slide, { anchors: true })),
    slide.body,
    walk,
    'svg'
  );

const fits = async ({ slide }: { slide: Composition }) => {
  expect(await findings(slide)).toEqual([]);
};

describe('every example fits its preview slide', () => {
  it.each(cases)('$name', fits);
  it.each(referenceCases)('$name', fits);
});

describe('the largest steps a slide with no heading takes still fit', () => {
  const { crowding } = slideLayout(undefined);
  const prose = (length: number) =>
    'Refunds settle in two days because the ledger writes first and the batch waits. '
      .repeat(Math.ceil(length / 60))
      .slice(0, length)
      .trim();
  const most = (budget: number) => Math.floor(budget / crowding);
  const alone = (node: object): Composition => ({
    type: 'view',
    body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
  });
  const term = (length: number) => ({
    term: 'ledger',
    body: prose(length - 'ledger'.length),
  });

  const steps = (['l', 'm'] as const).flatMap((step) => [
    {
      step,
      variant: 'statement-textSize',
      node: { type: 'slideStatement', text: prose(most(statementFit[step])) },
    },
    {
      step,
      variant: 'quote-textSize',
      node: {
        type: 'slideQuote',
        text: prose(most(quoteFit[step])),
        source: 'A',
      },
    },
    {
      step,
      variant: 'agenda-rowSize',
      node: {
        ...agendaExample,
        sections: agendaExample.sections.slice(0, most(agendaFit[step])),
      },
    },
    {
      step,
      variant: 'definitions-rowSize',
      node: {
        type: 'slideDefinitions',
        items: Array.from({ length: most(definitionsRowFit.l) }, () =>
          term(
            Math.floor(most(definitionsFit[step]) / most(definitionsRowFit.l))
          )
        ),
      },
    },
  ]);

  it.each(steps)('$variant at $step', async ({ step, variant, node }) => {
    expect(renderedStep(variant, node)).toBe(step);
    expect(await findings(alone(node))).toEqual([]);
  });
});

const fitsBody = async (slide: Composition): Promise<boolean> =>
  (await findings(slide)).length === 0;

const inFrame = (body: PrimitiveNode[]): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body } as PrimitiveNode],
});

const paneOf = (node: PrimitiveNode): PrimitiveNode =>
  ({
    type: 'slideSplit',
    panes: [
      { label: 'Pane', items: [node] },
      { items: [{ type: 'slideBulletList', items: ['One', 'Two'] }] },
    ],
  }) as PrimitiveNode;

const placements: [string, (node: PrimitiveNode) => Composition][] = [
  ['alone', (node) => inFrame([node])],
  ['under the tallest heading', (node) => inFrame([tallestExample, node])],
  [
    'as a title aside',
    (node) =>
      inFrame([
        { type: 'slideTitle', title: 'Isomer', aside: node } as PrimitiveNode,
      ]),
  ],
  [
    'in a split pane under a heading',
    (node) => inFrame([headingExample, paneOf(node)]),
  ],
  ['in a split pane alone', (node) => inFrame([paneOf(node)])],
];

const widthLoaded = new Set(['slideGraph', 'slideRoadmap', 'slideTimeline']);

interface SizedCase {
  name: string;
  node: PrimitiveNode;
  place: (node: PrimitiveNode) => Composition;
}

const sized: SizedCase[] = slideDeckPrimitives
  .filter(({ type }) => widthLoaded.has(type))
  .flatMap(({ type, examples }) =>
    examples.flatMap((example, index) =>
      placements.map(([where, place]) => ({
        name: `${type} #${index} ${where}`,
        node: example,
        place,
      }))
    )
  );

describe('a picked size fits wherever the smallest does', () => {
  it.each(sized)('$name', async ({ node, place }) => {
    if (await fitsBody(place({ ...node, size: 's' } as PrimitiveNode))) {
      expect(await fitsBody(place(node))).toBe(true);
    }
  });
});

describe('a graph caption is set in the width its step is measured in', () => {
  const captionBox = (box: LayoutBox, start: string): LayoutBox | undefined =>
    box.runs[0]?.text.startsWith(start)
      ? box
      : box.children
          .map((child) => captionBox(child, start))
          .find((found) => found !== undefined);

  it.each(
    graphExamples.filter(
      (node): node is SlideGraphNode & { caption: string } =>
        node.caption !== undefined
    )
  )('$caption', async (node) => {
    const box = await takumi.measure(
      runtime.surfaces.svg.render(inFrame([node]))
    );
    const caption = captionBox(box, node.caption.slice(0, 8));
    expect(caption?.width).toBeCloseTo(
      graphCaptionWidth(node, slideLayout(undefined).width),
      0
    );
  });
});

describe('checkLayout reports a node past the frame body', () => {
  const wrapped =
    'and what it means for every team that ships a service to production across every region we run in today';
  const halfWrappedAgenda = {
    ...agendaExample,
    sections: agendaExample.sections.map((section, index) =>
      index % 2 === 0
        ? { ...section, title: `${section.title} ${wrapped}` }
        : section
    ),
  };

  it.each([
    fanoutExample,
    listExample,
    halfWrappedAgenda,
    roadmapExample,
    treeExample,
  ])('$type below the tallest heading', async (node) => {
    const slide: Composition = {
      type: 'view',
      body: [
        {
          type: 'slideFrame',
          body: [tallestExample, node],
        } as PrimitiveNode,
      ],
    };
    expect(await findings(slide)).toEqual([
      {
        kind: 'overflow',
        path: 'body[0].body[1]',
        type: node.type,
        by: expect.any(Number) as number,
      },
    ]);
  });
});
