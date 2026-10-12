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
  AgendaSection,
  ClosingLink,
  ClosingPath,
  Composition,
  SectionItem,
  AgendaSlide,
  SlideBulletList,
  ClosingSlide,
  SlideCode,
  SlideFooter,
  SlideFrame,
  QuoteSlide,
  SectionSlide,
  SlideSource,
  SlideSplitLayout,
  SplitPane,
  SlideStackLayout,
  StatementSlide,
  TitleSlide,
  TitleAside,
  TitleDefinition,
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

describe('slideJsx', () => {
  it('has a component for every registered primitive', () => {
    const missing = slidePrimitiveTypes
      .map(componentName)
      .filter((name) => !(name in slideJsx));
    expect(missing).toEqual([]);
  });

  it('fills split panes from SplitPane children, left then right', () => {
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
            createElement(SplitPane, { label: 'Before' }, code),
            createElement(
              SplitPane,
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
              TitleDefinition,
              { term: 'crate n.' },
              'Everything a customer means to buy.'
            ),
            createElement(TitleAside, null, bullets)
          ),
          createElement(SlideFooter, {
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
          createElement(AgendaSection, {
            number: '01',
            title: 'The problem',
            count: '3 slides',
          }),
          createElement(AgendaSection, {
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
            ClosingLink,
            { label: 'Docs', href: 'https://example.com/docs' },
            'example.com/docs'
          ),
          createElement(
            ClosingPath,
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
          createElement(SectionItem, null, 'Refunds settle in two days'),
          createElement(
            SectionItem,
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

  it('rejects a pane outside a split', () => {
    expect(() =>
      toComposition(
        createElement(
          Composition,
          null,
          createElement(SplitPane, null, bullets)
        )
      )
    ).toThrow();
  });
});
