/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { describe, expect, it } from 'vitest';

import { slideJsx } from './jsx';
import { slideDeckFrame, slidesPack } from './pack';
import { slidePrimitiveTypes } from './registry';

const {
  SlideAnnotatedRender,
  SlideRender,
  SlideRenderGrid,
  SlideFanout,
  SlideGraph,
  SlideLanes,
  SlideLayers,
  SlidePipeline,
  SlideSequence,
  SlideTimeline,
  SlideTree,
  SlideBars,
  SlideDelta,
  SlideStat,
  SlideStats,
  SlideCommand,
  SlideDiff,
  SlideDefinitions,
  SlideHeading,
  SlideList,
  SlideRoadmap,
  Composition,
  AgendaSlide,
  SlideBulletList,
  ClosingSlide,
  SlideCode,
  SlideFrame,
  QuoteSlide,
  SectionSlide,
  SlideSource,
  SlideSplitLayout,
  SlideStackLayout,
  StatementSlide,
  TitleSlide,
  toComposition,
} = slideJsx;

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const componentName = (type: string): string =>
  type.charAt(0).toUpperCase() + type.slice(1);

const bullets = createElement(SlideBulletList, { items: ['One call'] });
const code = createElement(SlideCode, { panels: [{ lines: ['curl'] }] });

const bodyOf = (element: ReturnType<typeof createElement>) => {
  const composition = toComposition(createElement(Composition, null, element));
  expect(runtime.validate(composition).errors).toEqual([]);
  return composition.body[0];
};

describe('slideJsx', () => {
  it('has a component for every registered primitive', () => {
    const missing = slidePrimitiveTypes
      .map(componentName)
      .filter((name) => !(name in slideJsx));
    expect(missing).toEqual([]);
  });

  it('fills split panes from SlideSplitLayout.Pane children, left then right', () => {
    const composition = toComposition(
      createElement(
        Composition,
        null,
        createElement(
          SlideFrame,
          null,
          createElement(
            SlideSplitLayout,
            { divider: 'arrow' },
            createElement(SlideSplitLayout.Pane, { label: 'Before' }, code),
            createElement(
              SlideSplitLayout.Pane,
              { label: 'After', tone: 'primary' },
              createElement(
                SlideStackLayout,
                { spacing: 'tight' },
                bullets,
                code
              )
            )
          )
        )
      )
    );

    expect(composition.body[0]).toEqual({
      type: 'slideFrame',
      body: [
        {
          type: 'slideSplitLayout',
          divider: 'arrow',
          panes: [
            {
              label: 'Before',
              items: [{ type: 'slideCode', panels: [{ lines: ['curl'] }] }],
            },
            {
              label: 'After',
              tone: 'primary',
              items: [
                {
                  type: 'slideStackLayout',
                  spacing: 'tight',
                  items: [
                    { type: 'slideBulletList', items: ['One call'] },
                    { type: 'slideCode', panels: [{ lines: ['curl'] }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(runtime.validate(composition).errors).toEqual([]);
  });

  it.each([
    ['no', []],
    ['two', [bullets, code]],
  ])('rejects a TitleSlide.Aside with %s slide nodes', (_count, nodes) => {
    expect(() =>
      toComposition(
        createElement(
          Composition,
          null,
          createElement(
            SlideFrame,
            null,
            createElement(
              TitleSlide,
              { title: 'Crate' },
              createElement(TitleSlide.Aside, null, ...nodes)
            )
          )
        )
      )
    ).toThrow(
      expect.objectContaining({
        code: 'UNEXPECTED_CHILDREN',
        message: '<TitleSlide.Aside> takes one slide node.',
      })
    );
  });

  it('fills slide-structure layouts from children', () => {
    const composition = toComposition(
      createElement(
        Composition,
        null,
        createElement(
          SlideFrame,
          { tone: 'inverse', logo: false },
          createElement(
            TitleSlide,
            {
              eyebrow: 'A grocery delivery platform',
              title: 'Crate',
              tagline: 'One order. Every store.',
            },
            createElement(
              TitleSlide.Definition,
              { term: 'crate n.' },
              'Everything a customer means to buy.'
            ),
            createElement(TitleSlide.Aside, null, bullets)
          ),
          createElement(SlideFrame.Footer, {
            brand: 'Ledger',
            section: 'Opening',
            sectionNumber: '01',
            url: 'https://example.com/ledger',
          })
        )
      )
    );

    expect(composition.body[0]).toEqual({
      type: 'slideFrame',
      tone: 'inverse',
      logo: false,
      footer: {
        brand: 'Ledger',
        section: 'Opening',
        sectionNumber: '01',
        url: 'https://example.com/ledger',
      },
      body: [
        {
          type: 'titleSlide',
          eyebrow: 'A grocery delivery platform',
          title: 'Crate',
          tagline: 'One order. Every store.',
          definition: {
            term: 'crate n.',
            text: 'Everything a customer means to buy.',
          },
          aside: { type: 'slideBulletList', items: ['One call'] },
        },
      ],
    });
    expect(runtime.validate(composition).errors).toEqual([]);

    const agenda = toComposition(
      createElement(
        Composition,
        null,
        createElement(
          AgendaSlide,
          null,
          createElement(AgendaSlide.Section, {
            number: '01',
            title: 'The problem',
            count: '3 slides',
          }),
          createElement(AgendaSlide.Section, {
            number: '02',
            title: 'The approach',
            current: true,
          })
        )
      )
    );
    expect(agenda.body[0]).toMatchObject({
      type: 'agendaSlide',
      sections: [
        { number: '01', title: 'The problem', count: '3 slides' },
        { number: '02', title: 'The approach', current: true },
      ],
    });

    const closing = toComposition(
      createElement(
        Composition,
        null,
        createElement(
          ClosingSlide,
          { title: 'Start here' },
          createElement(
            ClosingSlide.Link,
            { label: 'Docs', href: 'https://example.com/docs' },
            'example.com/docs'
          ),
          createElement(
            ClosingSlide.Path,
            { title: 'Write a pack' },
            'Read the guide first'
          )
        )
      )
    );
    expect(closing.body[0]).toEqual({
      type: 'closingSlide',
      title: 'Start here',
      links: [
        {
          label: 'Docs',
          href: 'https://example.com/docs',
          text: 'example.com/docs',
        },
      ],
      paths: [{ title: 'Write a pack', body: 'Read the guide first' }],
    });

    const section = toComposition(
      createElement(
        Composition,
        null,
        createElement(
          SectionSlide,
          { number: '02', title: 'Settlement' },
          createElement(SectionSlide.Item, null, 'Refunds settle in two days'),
          createElement(
            SectionSlide.Item,
            { href: '#slide-12' },
            'The ledger writes first'
          )
        )
      )
    );
    expect(section.body[0]).toEqual({
      type: 'sectionSlide',
      number: '02',
      title: 'Settlement',
      slides: [
        { text: 'Refunds settle in two days' },
        { text: 'The ledger writes first', href: '#slide-12' },
      ],
    });

    expect(
      toComposition(
        createElement(
          Composition,
          null,
          createElement(
            QuoteSlide,
            { source: 'Priya N.' },
            'Ship the boring version first.'
          )
        )
      ).body[0]
    ).toEqual({
      type: 'quoteSlide',
      source: 'Priya N.',
      text: 'Ship the boring version first.',
    });

    expect(
      toComposition(
        createElement(
          Composition,
          null,
          createElement(StatementSlide, null, 'A refund is **a promise**.')
        )
      ).body[0]
    ).toEqual({
      type: 'statementSlide',
      text: 'A refund is **a promise**.',
    });

    expect(
      toComposition(
        createElement(
          Composition,
          null,
          createElement(SlideSource, null, 'Support tickets, January to June')
        )
      ).body[0]
    ).toEqual({
      type: 'slideSource',
      text: 'Support tickets, January to June',
    });
  });

  it('fills text primitives from children', () => {
    expect(
      bodyOf(
        createElement(
          SlideHeading,
          { lede: 'Same ledger, fewer days.' },
          'Refunds settle in **two days**'
        )
      )
    ).toEqual({
      type: 'slideHeading',
      title: 'Refunds settle in **two days**',
      lede: 'Same ledger, fewer days.',
    });

    expect(
      bodyOf(
        createElement(
          SlideBulletList,
          { marker: 'check' },
          createElement(SlideBulletList.Item, null, 'Charges the card once.'),
          createElement(SlideBulletList.Item, null, 'Refunds in `two days`.')
        )
      )
    ).toEqual({
      type: 'slideBulletList',
      marker: 'check',
      items: ['Charges the card once.', 'Refunds in `two days`.'],
    });

    expect(
      bodyOf(
        createElement(
          SlideDefinitions,
          null,
          createElement(
            SlideDefinitions.Definition,
            { term: 'hold' },
            'Money set aside.'
          ),
          createElement(
            SlideDefinitions.Definition,
            { term: 'capture' },
            'Money taken.'
          )
        )
      )
    ).toEqual({
      type: 'slideDefinitions',
      items: [
        { term: 'hold', body: 'Money set aside.' },
        { term: 'capture', body: 'Money taken.' },
      ],
    });

    expect(
      bodyOf(
        createElement(
          SlideList,
          { label: 'Limits', footnote: 'Per merchant.' },
          createElement(SlideList.Item, { term: 'rate' }, '100 a second.'),
          createElement(SlideList.Item, null, 'Retries back off.')
        )
      )
    ).toEqual({
      type: 'slideList',
      label: 'Limits',
      footnote: 'Per merchant.',
      items: [
        { term: 'rate', body: '100 a second.' },
        { body: 'Retries back off.' },
      ],
    });

    expect(
      bodyOf(
        createElement(
          SlideRoadmap,
          null,
          createElement(
            SlideRoadmap.Column,
            { title: 'Now', status: 'Shipped', current: true },
            createElement(
              SlideRoadmap.Item,
              { title: 'Holds' },
              'Set money aside.'
            )
          ),
          createElement(
            SlideRoadmap.Column,
            { title: 'Next', status: 'In design' },
            createElement(
              SlideRoadmap.Item,
              { title: 'Splits' },
              'Pay two stores.'
            )
          )
        )
      )
    ).toEqual({
      type: 'slideRoadmap',
      columns: [
        {
          title: 'Now',
          status: 'Shipped',
          current: true,
          items: [{ title: 'Holds', body: 'Set money aside.' }],
        },
        {
          title: 'Next',
          status: 'In design',
          items: [{ title: 'Splits', body: 'Pay two stores.' }],
        },
      ],
    });
  });

  it('fills code primitives from children', () => {
    expect(
      bodyOf(
        createElement(
          SlideCommand,
          { label: 'Install' },
          'npm  install @elastic/isomer-runtime'
        )
      )
    ).toEqual({
      type: 'slideCommand',
      label: 'Install',
      command: 'npm  install @elastic/isomer-runtime',
    });

    expect(
      bodyOf(
        createElement(
          SlideCode,
          null,
          createElement(
            SlideCode.Panel,
            { file: 'refund.ts', lineNumbers: { highlight: '2' } },
            `
              const refund = async (id) => {
                await ledger.hold(id);

                return ledger.settle(id);
              };
            `
          ),
          createElement(SlideCode.Panel, { lines: ['ledger.settle(id);'] })
        )
      )
    ).toEqual({
      type: 'slideCode',
      panels: [
        {
          file: 'refund.ts',
          lineNumbers: { highlight: '2' },
          lines: [
            'const refund = async (id) => {',
            '  await ledger.hold(id);',
            '',
            '  return ledger.settle(id);',
            '};',
          ],
        },
        { lines: ['ledger.settle(id);'] },
      ],
    });

    expect(
      bodyOf(
        createElement(
          SlideDiff,
          { file: 'refund.ts', remove: '2', add: '3' },
          `
            const refund = (id) => {
              return settle(id);
              return ledger.settle(id);

            };
          `
        )
      )
    ).toEqual({
      type: 'slideDiff',
      file: 'refund.ts',
      remove: '2',
      add: '3',
      text: 'const refund = (id) => {\n  return settle(id);\n  return ledger.settle(id);\n\n};',
    });
  });

  it('fills data primitives from children', () => {
    expect(
      bodyOf(
        createElement(
          SlideStat,
          { value: '2', unit: 'days' },
          'Refunds settle **three days** sooner.'
        )
      )
    ).toEqual({
      type: 'slideStat',
      value: '2',
      unit: 'days',
      body: 'Refunds settle **three days** sooner.',
    });

    expect(
      bodyOf(
        createElement(
          SlideDelta,
          {
            before: { label: 'Before', value: '5 days' },
            after: { label: 'After', value: '2 days' },
          },
          'The ledger writes first.'
        )
      )
    ).toEqual({
      type: 'slideDelta',
      before: { label: 'Before', value: '5 days' },
      after: { label: 'After', value: '2 days' },
      body: 'The ledger writes first.',
    });

    expect(
      bodyOf(
        createElement(
          SlideStats,
          null,
          createElement(
            SlideStats.Stat,
            { value: '41', label: 'Minutes' },
            'Down.'
          ),
          createElement(
            SlideStats.Stat,
            { value: '0', label: 'Lost' },
            'Orders kept.'
          )
        )
      )
    ).toEqual({
      type: 'slideStats',
      items: [
        { value: '41', label: 'Minutes', body: 'Down.' },
        { value: '0', label: 'Lost', body: 'Orders kept.' },
      ],
    });

    expect(
      bodyOf(
        createElement(
          SlideBars,
          null,
          createElement(
            SlideBars.Bar,
            { value: 12, highlight: true },
            'Checkout'
          ),
          createElement(SlideBars.Bar, { value: 4, detail: 'p95' }, 'Search')
        )
      )
    ).toEqual({
      type: 'slideBars',
      items: [
        { label: 'Checkout', value: 12, highlight: true },
        { label: 'Search', value: 4, detail: 'p95' },
      ],
    });
  });

  it('fills diagram primitives from children', () => {
    expect(
      bodyOf(
        createElement(
          SlideFanout,
          { source: 'Order' },
          createElement(
            SlideFanout.Target,
            { name: 'Ledger' },
            'Holds the money.'
          ),
          createElement(
            SlideFanout.Target,
            { name: 'Email', tone: 'accent' },
            'Tells the customer.'
          )
        )
      )
    ).toEqual({
      type: 'slideFanout',
      source: 'Order',
      targets: [
        { name: 'Ledger', body: 'Holds the money.' },
        { name: 'Email', tone: 'accent', body: 'Tells the customer.' },
      ],
    });

    expect(
      bodyOf(
        createElement(
          SlideGraph,
          null,
          createElement(
            SlideGraph.Node,
            { id: 'cart', term: 'Cart' },
            'Items.'
          ),
          createElement(
            SlideGraph.Node,
            { id: 'ledger', term: 'Ledger' },
            'Money.'
          ),
          createElement(
            SlideGraph.Node,
            { id: 'stock', term: 'Stock', placement: 'below', of: 'ledger' },
            'On hand.'
          )
        )
      )
    ).toEqual({
      type: 'slideGraph',
      nodes: [
        { id: 'cart', term: 'Cart', body: 'Items.' },
        { id: 'ledger', term: 'Ledger', body: 'Money.' },
        {
          id: 'stock',
          term: 'Stock',
          body: 'On hand.',
          placement: 'below',
          of: 'ledger',
        },
      ],
    });

    expect(
      bodyOf(
        createElement(
          SlideLanes,
          { join: 'Checkout' },
          createElement(SlideLanes.Lane, {
            label: 'Card',
            steps: ['Authorize'],
          }),
          createElement(SlideLanes.Lane, {
            label: 'Wallet',
            steps: ['Redirect'],
          }),
          createElement(SlideLanes.Note, { title: 'Card' }, 'One step.')
        )
      )
    ).toEqual({
      type: 'slideLanes',
      join: 'Checkout',
      lanes: [
        { label: 'Card', steps: ['Authorize'] },
        { label: 'Wallet', steps: ['Redirect'] },
      ],
      notes: [{ title: 'Card', body: 'One step.' }],
    });

    expect(
      bodyOf(
        createElement(
          SlideLayers,
          null,
          createElement(
            SlideLayers.Layer,
            { name: 'UI', owner: 'Web' },
            'What people see.'
          ),
          createElement(
            SlideLayers.Layer,
            { name: 'API', owner: 'Platform' },
            'Takes orders.'
          ),
          createElement(SlideLayers.Layer, {
            name: 'Ledger',
            owner: 'Payments',
            chips: ['holds'],
          })
        )
      )
    ).toEqual({
      type: 'slideLayers',
      layers: [
        { name: 'UI', owner: 'Web', body: 'What people see.' },
        { name: 'API', owner: 'Platform', body: 'Takes orders.' },
        { name: 'Ledger', owner: 'Payments', chips: ['holds'] },
      ],
    });

    expect(
      bodyOf(
        createElement(
          SlidePipeline,
          null,
          createElement(SlidePipeline.Step, { title: 'Hold' }),
          createElement(SlidePipeline.Step, { title: 'Settle' }),
          createElement(
            SlidePipeline.Span,
            { from: 0, to: 1, tone: 'primary', label: 'Ours', title: 'Ledger' },
            'We own both steps.'
          )
        )
      )
    ).toEqual({
      type: 'slidePipeline',
      steps: [{ title: 'Hold' }, { title: 'Settle' }],
      spans: [
        {
          from: 0,
          to: 1,
          tone: 'primary',
          label: 'Ours',
          title: 'Ledger',
          body: 'We own both steps.',
        },
      ],
    });

    expect(
      bodyOf(
        createElement(
          SlideSequence,
          null,
          createElement(SlideSequence.Actor, { id: 'app' }, 'App'),
          createElement(SlideSequence.Actor, { id: 'api' }, 'API'),
          createElement(SlideSequence.Actor, { id: 'bank' }, 'Bank'),
          createElement(
            SlideSequence.Message,
            { from: 'app', to: 'api' },
            'Pay'
          ),
          createElement(
            SlideSequence.Message,
            { from: 'api', to: 'bank' },
            'Charge'
          )
        )
      )
    ).toEqual({
      type: 'slideSequence',
      actors: [
        { id: 'app', label: 'App' },
        { id: 'api', label: 'API' },
        { id: 'bank', label: 'Bank' },
      ],
      messages: [
        { from: 'app', to: 'api', label: 'Pay' },
        { from: 'api', to: 'bank', label: 'Charge' },
      ],
    });

    const item = (label: string) =>
      createElement(
        SlideTimeline.Item,
        { label, channel: 'Pager', heading: `${label} paged` },
        'On call answered.'
      );
    expect(
      bodyOf(
        createElement(
          SlideTimeline,
          null,
          item('09:00'),
          item('09:05'),
          item('09:41')
        )
      )
    ).toMatchObject({
      type: 'slideTimeline',
      items: [
        {
          label: '09:00',
          channel: 'Pager',
          heading: '09:00 paged',
          body: 'On call answered.',
        },
        { label: '09:05' },
        { label: '09:41' },
      ],
    });

    expect(
      bodyOf(
        createElement(
          SlideTree,
          { root: 'checkout/' },
          createElement(
            SlideTree.Item,
            { name: 'refund.ts' },
            'Issues refunds.'
          )
        )
      )
    ).toEqual({
      type: 'slideTree',
      root: 'checkout/',
      entries: [{ name: 'refund.ts', body: 'Issues refunds.' }],
    });
  });

  it('fills render primitives from children', () => {
    const embedded = [{ type: 'slideHeading', title: 'Embedded' }];
    expect(
      bodyOf(
        createElement(
          SlideAnnotatedRender,
          null,
          createElement(SlideRender, { surface: 'snapshot', body: embedded }),
          createElement(
            SlideAnnotatedRender.Pin,
            { x: 20, y: 30, title: 'Heading' },
            'The claim.'
          )
        )
      )
    ).toEqual({
      type: 'slideAnnotatedRender',
      render: { type: 'slideRender', surface: 'snapshot', body: embedded },
      pins: [{ x: 20, y: 30, title: 'Heading', body: 'The claim.' }],
    });

    expect(
      bodyOf(
        createElement(
          SlideRenderGrid,
          { body: embedded },
          createElement(SlideRenderGrid.Tile, { surface: 'react' }, 'Hosts'),
          createElement(SlideRenderGrid.Tile, { surface: 'slack' }, 'Channels')
        )
      )
    ).toEqual({
      type: 'slideRenderGrid',
      body: embedded,
      tiles: [
        { surface: 'react', caption: 'Hosts' },
        { surface: 'slack', caption: 'Channels' },
      ],
    });
  });

  it('rejects a pane outside a split', () => {
    expect(() =>
      toComposition(
        createElement(
          Composition,
          null,
          createElement(SlideSplitLayout.Pane, null, bullets)
        )
      )
    ).toThrow();
  });
});
