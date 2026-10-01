/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../pack';
import {
  example as pipelineExample,
  fullExample as pipelineFullExample,
  spansExample,
  threeSpansExample,
} from '../primitives/slide_pipeline/examples';
import {
  example as sequenceExample,
  fullExample as sequenceFullExample,
} from '../primitives/slide_sequence/examples';
import {
  fiveItemsExample,
  threeItemsExample,
} from '../primitives/slide_timeline/examples';
import {
  showSlideBuild,
  SLIDE_BUILDS,
  slideBuilds,
  slideBuildsEnhancement,
} from '.';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const slide = (...body: object[]): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body } as PrimitiveNode],
});

const mount = (composition: Composition, enhancements = [SLIDE_BUILDS]) => {
  const { html } = runtime.surfaces.html.render(composition, { enhancements });
  document.body.innerHTML = html;
  return document.body;
};

const visibility = (root: ParentNode): string[] =>
  [...root.querySelectorAll('li')].map(
    (item) => (item as HTMLElement).style.visibility
  );

const two = { type: 'slideBulletList', items: ['One', 'Two'] };
const three = { type: 'slideBulletList', items: ['A', 'B', 'C'] };

describe('slide builds', () => {
  it('counts one click per building part, nested ones included', () => {
    expect(slideBuilds(slide(two, three))).toBe(5);
    expect(
      slideBuilds(
        slide({
          type: 'slideWindow',
          chrome: 'chat',
          title: 'Chat',
          body: [two],
        })
      )
    ).toBe(2);
    expect(slideBuilds(slide({ type: 'slideHeading', title: 'Only' }))).toBe(0);
  });

  it('renders anchors only when builds are requested and apply', () => {
    expect(runtime.surfaces.html.render(slide(two)).html).not.toContain(
      'data-isomer-node'
    );
    expect(
      runtime.surfaces.html.render(
        slide({ type: 'slideHeading', title: 'Only' }),
        { enhancements: [SLIDE_BUILDS] }
      ).html
    ).not.toContain('data-isomer-node');
    expect(
      runtime.surfaces.html.render(slide(two), { enhancements: [SLIDE_BUILDS] })
        .html
    ).toContain('data-isomer-node');
  });

  it('reveals parts in reading order across nodes, and hides them again', () => {
    const composition = slide(two, three);
    const root = mount(composition);
    showSlideBuild(root, composition, 0);
    expect(visibility(root)).toEqual(Array(5).fill('hidden'));
    showSlideBuild(root, composition, 3);
    expect(visibility(root)).toEqual(['', '', '', 'hidden', 'hidden']);
    showSlideBuild(root, composition, 1);
    expect(visibility(root)).toEqual([
      '',
      'hidden',
      'hidden',
      'hidden',
      'hidden',
    ]);
  });

  it('shows again what an earlier call hid, whatever composition is now drawn', () => {
    const composition = slide(two, three);
    const root = mount(composition);
    showSlideBuild(root, composition, 0);
    showSlideBuild(root, slide({ type: 'slideHeading', title: 'Next' }), 0);
    expect(visibility(root)).toEqual(Array(5).fill(''));
  });

  it('builds a slideList one row at a time, with or without terms', () => {
    const plain = {
      type: 'slideList',
      label: 'Facts',
      items: [{ body: 'One' }, { body: 'Two' }],
      footnote: 'Always.',
    };
    const termed = {
      type: 'slideList',
      items: [
        { term: 'A', body: 'One' },
        { body: 'Two' },
        { term: 'C', body: 'Three' },
      ],
    };
    expect(slideBuilds(slide(plain, termed))).toBe(5);
    const composition = slide(plain, termed);
    const root = mount(composition);
    showSlideBuild(root, composition, 3);
    expect(visibility(root)).toEqual(['', '', '', 'hidden', 'hidden']);
    expect(root.textContent).toContain('Facts');
    expect(root.textContent).toContain('Always.');
  });

  it('builds a slideTranscript one turn at a time', () => {
    const composition = slide({
      type: 'slideTranscript',
      label: 'Retry',
      turns: [
        { role: 'user', text: 'Chart revenue.' },
        { role: 'model', text: '{}', format: 'code' },
        { role: 'host', text: 'Rejected.' },
      ],
    });
    expect(slideBuilds(composition)).toBe(3);
    const root = mount(composition);
    showSlideBuild(root, composition, 1);
    expect(visibility(root)).toEqual(['', 'hidden', 'hidden']);
    expect(root.textContent).toContain('Retry');
  });

  it('builds each occurrence of a reused node object on its own', () => {
    const composition = slide(two, two);
    const root = mount(composition);
    showSlideBuild(root, composition, 3);
    expect(visibility(root)).toEqual(['', '', '', 'hidden']);
  });

  it('leaves a node whole when its parts cannot be found, keeping later offsets', () => {
    const composition = slide(two, three);
    const root = mount(composition);
    root.querySelector('ul')!.remove();
    showSlideBuild(root, composition, 3);
    expect(visibility(root)).toEqual(['', 'hidden', 'hidden']);
  });

  it('builds only the host slide in a React render, never an embedded one', () => {
    const composition = slide(two, {
      type: 'slideRender',
      surface: 'react',
      body: [three],
    });
    expect(slideBuilds(composition)).toBe(2);
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    document.body.replaceChildren(container);
    const root = createRoot(container);
    act(() =>
      root.render(
        runtime.surfaces.react.render(composition, {
          enhancements: [slideBuildsEnhancement],
        })
      )
    );
    showSlideBuild(container, composition, 0);
    expect(visibility(container)).toEqual(['hidden', 'hidden', '', '', '']);
    showSlideBuild(container, composition, 1);
    expect(visibility(container)).toEqual(['', 'hidden', '', '', '']);
    act(() => root.unmount());
  });
});

/** Whether the text node reading `text` sits under an element a build hid. */
const hides = (root: ParentNode, text: string): boolean => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let at = walker.nextNode(); at; at = walker.nextNode()) {
    if (at.textContent?.trim() !== text) {
      continue;
    }
    for (
      let element = at.parentElement;
      element;
      element = element.parentElement
    ) {
      if (element.style.visibility === 'hidden') {
        return true;
      }
    }
    return false;
  }
  throw new Error(`no text node reads ${text}`);
};

const mountReact = (composition: Composition) => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.replaceChildren(container);
  const root = createRoot(container);
  act(() =>
    root.render(
      runtime.surfaces.react.render(composition, {
        enhancements: [slideBuildsEnhancement],
      })
    )
  );
  return { container, unmount: () => act(() => root.unmount()) };
};

const mounts = [
  [
    'HTML',
    (composition: Composition) => ({
      container: mount(composition),
      unmount: () => {},
    }),
  ],
  ['React', mountReact],
] as const;

interface BuildCase {
  name: string;
  node: object;
  /** The texts each click reveals, in order. */
  parts: string[][];
  /** Texts shown from the first click. */
  always?: string[];
}

const chip = (title: string) => ({ title });

const buildCases: BuildCase[] = [
  {
    name: 'a pipeline, its end with the last step',
    node: pipelineExample,
    parts: [['Verify'], ['Score'], ['Approve'], ['Settle', 'Ledger entry']],
    always: ['Refund request'],
  },
  {
    name: 'a pipeline at its fewest steps, with empty spans',
    node: {
      type: 'slidePipeline',
      steps: [chip('Plan'), chip('Ship')],
      spans: [],
    },
    parts: [['Plan'], ['Ship']],
  },
  {
    name: 'a pipeline at its most steps',
    node: pipelineFullExample,
    parts: pipelineFullExample.steps.map(({ title }) => [title]),
  },
  {
    name: 'a pipeline with one span, shown with the step it ends on',
    node: {
      type: 'slidePipeline',
      steps: [chip('Pick'), chip('Pack'), chip('Drive')],
      spans: [
        {
          from: 1,
          to: 2,
          tone: 'accent',
          label: 'Courier',
          title: 'Theirs',
          body: 'Out of our hands.',
        },
      ],
    },
    parts: [
      ['Pick'],
      ['Pack'],
      ['Drive', 'Courier', 'Theirs', 'Out of our hands.'],
    ],
  },
  {
    name: 'a pipeline with two spans',
    node: spansExample,
    parts: [
      ['Basket'],
      ['Checkout'],
      ['Payment intent', 'Our app'],
      ['Card network'],
      ['Bank', 'Partners'],
    ],
  },
  {
    name: 'a pipeline at its most spans, two over one step',
    node: threeSpansExample,
    parts: [
      ['Picker'],
      ['Packing', 'Store'],
      ['Van', 'Courier'],
      ['Doorstep', 'App'],
    ],
  },
  {
    name: 'a pipeline with spans authored out of order',
    node: {
      type: 'slidePipeline',
      steps: [chip('A'), chip('B'), chip('C'), chip('D')],
      spans: [
        {
          from: 2,
          to: 3,
          tone: 'accent',
          label: 'Late',
          title: 'Second',
          body: 'Two.',
        },
        {
          from: 0,
          to: 0,
          tone: 'primary',
          label: 'Early',
          title: 'First',
          body: 'One.',
        },
      ],
    },
    parts: [
      ['A', 'Early', 'First', 'One.'],
      ['B'],
      ['C'],
      ['D', 'Late', 'Second', 'Two.'],
    ],
  },
  {
    name: 'a sequence, its actors from the first click',
    node: sequenceExample,
    parts: [
      ['Place order'],
      ['authorize(card)'],
      ['Charge request'],
      ['DECLINED 51'],
      ['Try another card'],
      ['Second card'],
      ['Approved'],
    ],
    always: ['shopper', 'store', 'payments', 'bank'],
  },
  {
    name: 'a sequence at its fewest messages',
    node: {
      type: 'slideSequence',
      actors: [
        { id: 'a', label: 'alpha' },
        { id: 'b', label: 'beta' },
        { id: 'c', label: 'gamma' },
      ],
      messages: [
        { from: 'a', to: 'b', label: 'Ask' },
        { from: 'b', to: 'c', label: 'Pass on' },
      ],
    },
    parts: [['Ask'], ['Pass on']],
    always: ['alpha', 'beta', 'gamma'],
  },
  {
    name: 'a sequence at its most messages',
    node: sequenceFullExample,
    parts: [
      ['Order two ramen'],
      ['hold(24.00)'],
      ['Hold approved'],
      ['New ticket'],
      ['15 min'],
      ['Pick up at 7:40'],
      ['Collect the bag'],
      ['Delivered'],
      ['capture(24.00)'],
      ['Receipt'],
    ],
  },
  {
    name: 'a timeline at its fewest items',
    node: threeItemsExample,
    parts: [
      ['Q1', 'Pilot'],
      ['Q2', 'Region'],
      ['Q3', 'National'],
    ],
  },
  {
    name: 'a timeline at its most items',
    node: fiveItemsExample,
    parts: [['Mon'], ['Tue'], ['Wed'], ['Thu'], ['Fri', 'Follow-up']],
  },
];

const placements = [
  ['on the slide', (node: object) => slide(node)],
  [
    'in a window',
    (node: object) =>
      slide({
        type: 'slideWindow',
        chrome: 'browser',
        title: 'shop.example',
        body: [node],
      }),
  ],
  [
    'in a split pane',
    (node: object) =>
      slide({
        type: 'slideSplit',
        panes: [
          { items: [{ type: 'slideHeading', title: 'Left' }] },
          { items: [node] },
        ],
      }),
  ],
] as const;

describe('pipeline, sequence, and timeline builds', () => {
  describe.each(buildCases)('$name', ({ node, parts, always = [] }) => {
    it.each(placements)('counts one click per part %s', (_, place) => {
      expect(slideBuilds(place(node))).toBe(parts.length);
    });

    it.each(
      mounts.flatMap(([surface, mountOn]) =>
        placements.map(([where, place]) => ({ surface, mountOn, where, place }))
      )
    )('reveals each part in order on $surface $where', ({ mountOn, place }) => {
      const composition = place(node);
      const { container, unmount } = mountOn(composition);
      for (let step = 0; step <= parts.length; step += 1) {
        showSlideBuild(container, composition, step);
        parts.forEach((texts, index) => {
          for (const text of texts) {
            expect([text, hides(container, text)]).toEqual([
              text,
              index >= step,
            ]);
          }
        });
        for (const text of always) {
          expect([text, hides(container, text)]).toEqual([text, false]);
        }
      }
      unmount();
    });
  });

  it('never builds inside an embedded slide', () => {
    const composition = slide(two, {
      type: 'slideRender',
      surface: 'react',
      body: [pipelineExample, sequenceExample, threeItemsExample],
    });
    expect(slideBuilds(composition)).toBe(2);
    const { container, unmount } = mountReact(composition);
    showSlideBuild(container, composition, 0);
    for (const text of [
      'Verify',
      'Settle',
      'Ledger entry',
      'Place order',
      'Approved',
      'Q1',
      'Q3',
    ]) {
      expect([text, hides(container, text)]).toEqual([text, false]);
    }
    expect(hides(container, 'One')).toBe(true);
    unmount();
  });

  it('leaves text, Markdown, and Slack whole', () => {
    const composition = slide(
      pipelineExample,
      sequenceExample,
      threeItemsExample
    );
    expect(slideBuilds(composition)).toBe(4 + 7 + 3);
    const text = runtime.surfaces.text.render(composition);
    const markdown = runtime.surfaces.markdown.render(composition);
    const slack = JSON.stringify(runtime.surfaces.slack.render(composition));
    for (const authored of ['Settle', 'Ledger entry', 'Approved', 'Q3']) {
      expect(text).toContain(authored);
      expect(markdown).toContain(authored);
      expect(slack).toContain(authored);
    }
  });
});
