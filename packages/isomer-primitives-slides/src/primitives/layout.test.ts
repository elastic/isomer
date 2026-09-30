/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createPrimitiveDispatcher,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckPrimitives } from '../registry';
import type {
  SlideLayout,
  SlidePackTypes,
  SlideRenderScope,
} from '../render/context';
import { definitionsFit } from '../theme/components/definitions';
import { frameBodyHeight, frameContentWidth } from '../theme/components/frame';
import { quoteFit } from '../theme/components/quote';
import { split } from '../theme/components/split';
import { statementFit } from '../theme/components/statement';
import { title, titleShares } from '../theme/components/title';
import { scalePx } from '../theme/scale';

import { openBody, slideLayout, withLayout } from './layout';
import { lineBox, trackWidth } from './size';
import { referenceHeading } from './size.fixtures';
import { example as agendaExample } from './slide_agenda/examples';
import { example as closingExample } from './slide_closing/examples';
import { react as frameReact } from './slide_frame/react';
import type { SlideFrameNode } from './slide_frame/types';
import { tallestExample } from './slide_heading/examples';
import { headingRoom, referenceRoom } from './slide_heading/fit';
import type { SlideHeadingNode } from './slide_heading/schema';
import { example as sectionExample } from './slide_section/examples';
import { paneWidths } from './slide_split/pane_layout';
import { react as splitReact } from './slide_split/react';
import type { SlideSplitNode } from './slide_split/types';
import { react as stackReact } from './slide_stack/react';
import type { SlideStackNode } from './slide_stack/types';
import type { SlideStatementNode } from './slide_statement/schema';
import { soloExample as titleExample } from './slide_title/examples';
import { react as titleReact } from './slide_title/react';
import type { SlideTitleNode } from './slide_title/types';

const dispatcher = createPrimitiveDispatcher<PrimitiveNode, SlidePackTypes>(
  slideDeckPrimitives
);

/** The layout each leaf under `root` is rendered with, by its `text`. */
const layouts = (root: PrimitiveNode): Map<string, SlideLayout | undefined> => {
  const seen = new Map<string, SlideLayout | undefined>();
  const scope: SlideRenderScope = {
    ...dispatcher,
    renderReact: (node, context): ReactNode => {
      const env = { context: context ?? {}, scope };
      switch (node.type) {
        case 'slideFrame':
          return frameReact(node as SlideFrameNode, env);
        case 'slideSplit':
          return splitReact(node as SlideSplitNode, env);
        case 'slideStack':
          return stackReact(node as SlideStackNode, env);
        case 'slideTitle':
          return titleReact(node as SlideTitleNode, env);
        default: {
          const { text } = node as { text?: string };
          seen.set(text ?? node.type, context?.layout);
          return null;
        }
      }
    },
  };
  renderToStaticMarkup(scope.renderReact(root));
  return seen;
};

const leaf = (text: string): SlideStatementNode => ({
  type: 'slideStatement',
  text,
});

const inFrame = (...body: object[]) =>
  ({ type: 'slideFrame', body }) as PrimitiveNode;

const labelHeight = lineBox(split.label) + scalePx(split.labelGap);

describe('slideLayout', () => {
  it('reads a frame body with nothing above it when no container set one', () => {
    expect(slideLayout(undefined)).toEqual({
      ...openBody,
      crowding: referenceRoom / frameBodyHeight,
    });
  });

  it('is crowding 1 below the tallest heading budgets allow for, and the reference heading', () => {
    for (const heading of [tallestExample, referenceHeading]) {
      expect(headingRoom(heading)).toBe(referenceRoom);
      expect(
        slideLayout(
          withLayout(undefined, { width: 1, height: headingRoom(heading) })
        ).crowding
      ).toBe(1);
    }
  });

  it('is below 1 under a short heading and above 1 under a three-line one', () => {
    const crowdingBelow = (heading: SlideHeadingNode) =>
      slideLayout(
        withLayout(undefined, { width: 1, height: headingRoom(heading) })
      ).crowding;
    expect(
      crowdingBelow({ type: 'slideHeading', title: 'Short' })
    ).toBeLessThan(1);
    expect(
      crowdingBelow({
        type: 'slideHeading',
        title:
          'A title so long that it wraps past two lines and onto a third line, even at the smallest step it can take',
        lede: 'A lede long enough to take two lines of the heading measure at the lede size on the canvas. '.repeat(
          2
        ),
      })
    ).toBeGreaterThan(1);
  });

  it('never sets a negative box, and stays finite when none is left', () => {
    const context = withLayout(undefined, { width: -5, height: -5 });
    expect(context.layout).toEqual({ width: 0, height: 0 });
    expect(slideLayout(context).crowding).toBe(referenceRoom);
  });
});

describe('slideFrame layout', () => {
  it('gives every node the whole body when it opens without a heading', () => {
    const seen = layouts(inFrame(leaf('a'), leaf('b')));
    expect(seen.get('a')).toEqual(openBody);
    expect(seen.get('b')).toEqual(openBody);
  });

  it('gives the heading the whole body and what follows the room below it', () => {
    const seen = layouts(inFrame(tallestExample, leaf('a')));
    expect(seen.get('slideHeading')).toEqual(openBody);
    expect(seen.get('a')).toEqual({
      width: frameContentWidth,
      height: referenceRoom,
    });
  });

  it('leaves a heading taller than the body no room, not a negative one', () => {
    const seen = layouts(
      inFrame(
        {
          type: 'slideHeading',
          title: 'A title that runs on '.repeat(40),
          lede: 'A lede that runs on and on. '.repeat(80),
        },
        leaf('a')
      )
    );
    expect(seen.get('a')).toEqual({ width: frameContentWidth, height: 0 });
  });

  it('holds its body at the frame whatever layout it is rendered in', () => {
    const seen = layouts({
      type: 'slideSplit',
      panes: [{ items: [inFrame(leaf('a'))] }, { items: [] }],
    } as PrimitiveNode);
    expect(seen.get('a')).toEqual(openBody);
  });
});

describe('slideSplit layout', () => {
  const panes = (fields: Partial<SlideSplitNode> = {}) =>
    ({
      type: 'slideSplit',
      panes: [{ items: [leaf('left')] }, { items: [leaf('right')] }],
      ...fields,
    }) as PrimitiveNode;

  it('gives each pane its width and the height it is rendered in', () => {
    const seen = layouts(inFrame(referenceHeading, panes()));
    const [left, right] = paneWidths(frameContentWidth, 'even', 'gap');
    expect(seen.get('left')).toEqual({ width: left, height: referenceRoom });
    expect(seen.get('right')).toEqual({ width: right, height: referenceRoom });
  });

  it('takes a label from its own pane and a footnote from both', () => {
    const footnote = 'Holds for every service.';
    const labelled = layouts(
      panes({
        panes: [
          { label: 'Ours', items: [leaf('left')] },
          { items: [leaf('right')] },
        ],
      })
    );
    expect(labelled.get('left')?.height).toBe(frameBodyHeight - labelHeight);
    expect(labelled.get('right')?.height).toBe(frameBodyHeight);

    const noted = layouts(panes({ footnote }));
    const footnoteHeight = scalePx(split.footnoteGap) + lineBox(split.footnote);
    expect(noted.get('left')?.height).toBe(frameBodyHeight - footnoteHeight);
    expect(noted.get('right')?.height).toBe(frameBodyHeight - footnoteHeight);

    const both = layouts(
      panes({
        footnote,
        panes: [
          { label: 'Ours', items: [leaf('left')] },
          { items: [leaf('right')] },
        ],
      })
    );
    expect(both.get('left')?.height).toBe(
      frameBodyHeight - footnoteHeight - labelHeight
    );
  });

  it('counts a footnote that wraps as more than one line', () => {
    const seen = layouts(
      panes({ footnote: 'A footnote that runs on and on. '.repeat(20) })
    );
    expect(seen.get('left')?.height).toBeLessThan(
      frameBodyHeight - scalePx(split.footnoteGap) - 2 * lineBox(split.footnote)
    );
  });

  it('nests: each split narrows and shortens what its parent pane gave it, down to zero', () => {
    const nest = (depth: number): PrimitiveNode =>
      depth === 0
        ? leaf('inner')
        : ({
            type: 'slideSplit',
            ratio: 'aside',
            divider: 'hairline',
            panes: [
              { label: 'Label', items: [nest(depth - 1)] },
              { items: [] },
            ],
          } as PrimitiveNode);
    // A label with no width breaks between every glyph.
    const labelAt = (width: number) =>
      width > 0
        ? labelHeight
        : 'Label'.length * lineBox(split.label) + scalePx(split.labelGap);
    const expected = (depth: number): SlideLayout => {
      let layout = openBody;
      for (let level = 0; level < depth; level += 1) {
        const [width] = paneWidths(layout.width, 'aside', 'hairline');
        layout = { width, height: Math.max(0, layout.height - labelAt(width)) };
      }
      return layout;
    };
    for (const depth of [1, 2, 3]) {
      expect(layouts(nest(depth)).get('inner')).toEqual(expected(depth));
    }
    expect(expected(2).width).toBeGreaterThan(0);
    expect(expected(3).width).toBe(0);
  });
});

describe('slideTitle and slideStack layout', () => {
  it('gives a title aside its column and the height the title has', () => {
    const seen = layouts(
      inFrame({ type: 'slideTitle', title: 'Crate', aside: leaf('aside') })
    );
    expect(seen.get('aside')).toEqual({
      width: trackWidth(frameContentWidth, titleShares, title.columnGap, 1),
      height: frameBodyHeight,
    });
  });

  it('passes a stack its own layout', () => {
    const seen = layouts(
      inFrame(referenceHeading, {
        type: 'slideStack',
        items: [leaf('a'), leaf('b')],
      })
    );
    expect(seen.get('a')).toEqual({
      width: frameContentWidth,
      height: referenceRoom,
    });
    expect(seen.get('b')).toEqual(seen.get('a'));
  });
});

describe('auto-sizing primitives read the layout they are given', () => {
  const stepIn = (
    node: PrimitiveNode,
    pattern: RegExp,
    layout?: SlideLayout
  ): string | undefined =>
    pattern.exec(
      renderToStaticMarkup(
        dispatcher.renderReact(node, layout && withLayout({}, layout))
      )
    )?.[1];
  const narrow: SlideLayout = { width: 480, height: frameBodyHeight };
  const short: SlideLayout = { width: frameContentWidth, height: 120 };
  const line = 'x'.repeat(60);

  const cases = [
    [
      'statement-textSize',
      { type: 'slideStatement', text: 'x'.repeat(statementFit.l) },
      [narrow, short],
    ],
    [
      'quote-textSize',
      { type: 'slideQuote', text: 'x'.repeat(quoteFit.l), source: 'A' },
      [narrow, short],
    ],
    [
      'definitions-rowSize',
      {
        type: 'slideDefinitions',
        items: [{ term: 't', body: 'x'.repeat(definitionsFit.l - 1) }],
      },
      [narrow, short],
    ],
    ['agenda-rowSize', agendaExample, [narrow, short]],
    ['section-titleSize', sectionExample, [narrow]],
    ['closing-titleSize', closingExample, [narrow]],
    ['title-titleSize', titleExample, [narrow]],
    ['code', { type: 'slideCode', panels: [{ lines: [line] }] }, [narrow]],
  ] as [string, PrimitiveNode, SlideLayout[]][];
  const patternOf = (variant: string) =>
    new RegExp(`${variant}-(l|m|s|regular|dense)\\b`);

  it.each(cases)(
    '%s steps down in a smaller layout',
    (variant, node, smaller) => {
      const pattern = patternOf(variant);
      const open = stepIn(node, pattern);
      expect(open).toMatch(/^(l|regular)$/);
      expect(stepIn(node, pattern, openBody)).toBe(open);
      for (const layout of smaller) {
        expect(stepIn(node, pattern, layout)).not.toBe(open);
      }
    }
  );

  it.each(cases)(
    '%s takes its smallest step with no room at all',
    (variant, node) => {
      expect(stepIn(node, patternOf(variant), { width: 0, height: 0 })).toMatch(
        /^(s|dense)$/
      );
    }
  );
});
