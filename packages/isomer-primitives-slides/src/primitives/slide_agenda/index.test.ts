/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import { agendaFit } from '../../theme/components/agenda';
import { frameContentWidth } from '../../theme/components/frame';
import { slideDistillery } from '../../theme/distillery';
import { expectCountBounds } from '../bounds.fixtures';
import { slideLayout } from '../layout';
import { sizeForLoad } from '../size';
import {
  crowdingBelow,
  crowdingHeading,
  referenceHeading,
  renderedStep,
} from '../size.fixtures';

import { example, longExample, outlineExample } from './examples';
import { agendaLines } from './fit';
import { markdown as markdownContent, slack, text } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const markdown = (node: Parameters<typeof markdownContent>[0]): string =>
  serializeMarkdown(markdownContent(node));

const sections = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    number: String(index + 1),
    title: 'Part',
  }));

// Load budgets are set below the reference heading, where crowding is 1.
const stepOf = (node: object): string | undefined =>
  renderedStep('agenda-rowSize', node, referenceHeading);

describe('slideAgenda', () => {
  it('holds two to eight sections, at most one current', () => {
    const paths = (node: object) =>
      runtime.validate(compose(node)).errors.map(({ path }) => path);
    expect(paths({ type: 'slideAgenda', sections: sections(1) })).toContain(
      'body[0].body[0].sections'
    );
    expect(paths({ type: 'slideAgenda', sections: sections(9) })).toContain(
      'body[0].body[0].sections'
    );
    expect(
      paths({
        type: 'slideAgenda',
        sections: sections(3).map((section) => ({ ...section, current: true })),
      })
    ).toContain('body[0].body[0].sections');
  });

  it('marks the current section in words, not colour alone', () => {
    const { html } = runtime.surfaces.html.render(compose(example));
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toContain(slideDistillery.tokens.agenda.here.value);
  });

  it('shows the marker in place of the current count on every surface', () => {
    const counted = {
      type: 'slideAgenda' as const,
      sections: [
        { number: '1', title: 'Before', count: '2 slides' },
        { number: '2', title: 'Now', count: '9 slides', current: true },
      ],
    };
    const here = slideDistillery.tokens.agenda.here.value;
    const surfaces = {
      text: text(counted),
      markdown: markdown(counted),
      slack: JSON.stringify(slack(counted)),
      html: runtime.surfaces.html.render(compose(counted)).html,
    };
    for (const [surface, output] of Object.entries(surfaces)) {
      expect(output, surface).not.toContain('9 slides');
      expect(output.toLowerCase(), surface).toContain(here.toLowerCase());
    }
  });

  it('renders text, markdown, and Slack', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "01 Why returns cost us · 3 slides
      02 What customers told us · 4 slides
      03 The new returns flow · YOU ARE HERE
      04 Rolling it out · 3 slides
      05 Questions · 2 slides"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "- **01** Why returns cost us · 3 slides
      - **02** What customers told us · 4 slides
      - **03** The new returns flow · YOU ARE HERE
      - **04** Rolling it out · 3 slides
      - **05** Questions · 2 slides"
    `);
    expect(slack(outlineExample)).toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "elements": [
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "1",
                      "type": "text",
                    },
                    {
                      "text": " Where the budget went",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "2",
                      "type": "text",
                    },
                    {
                      "text": " What we cut",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "3",
                      "type": "text",
                    },
                    {
                      "text": " What we keep",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
              ],
              "style": "bullet",
              "type": "rich_text_list",
            },
          ],
          "type": "rich_text",
        },
      ]
    `);
  });

  it.each([
    [agendaFit.l, 'l'],
    [agendaFit.m, 'm'],
    [agendaFit.m + 1, 's'],
  ])('sets %i sections at %s under the reference heading', (count, step) => {
    expect(stepOf({ type: 'slideAgenda', sections: sections(count) })).toBe(
      step
    );
  });

  it('keeps an authored size', () => {
    expect(
      stepOf({ type: 'slideAgenda', sections: sections(8), size: 'l' })
    ).toBe('l');
    expect(
      stepOf({ type: 'slideAgenda', sections: sections(2), size: 's' })
    ).toBe('s');
  });

  it('takes the whole body on a slide with no heading', () => {
    const node = { type: 'slideAgenda', sections: sections(agendaFit.m + 1) };
    const step = sizeForLoad(
      undefined,
      agendaFit.m + 1,
      agendaFit,
      slideLayout(undefined).crowding
    );
    expect(stepOf(node)).toBe('s');
    expect(step).not.toBe('s');
    expect(renderedStep('agenda-rowSize', node)).toBe(step);
  });

  it("scales its count by the heading's crowding", () => {
    const node = { type: 'slideAgenda', sections: sections(agendaFit.l) };
    const step = sizeForLoad(
      undefined,
      agendaFit.l,
      agendaFit,
      crowdingBelow(crowdingHeading)
    );
    expect(step).not.toBe('l');
    expect(renderedStep('agenda-rowSize', node, crowdingHeading)).toBe(step);
  });
});

describe('slideAgenda counts and title lines', () => {
  it('holds two to eight sections, as its longest example does', () => {
    expectCountBounds(
      schema,
      example,
      'sections',
      [2, 8],
      { number: '1', title: 'Part' },
      longExample
    );
  });

  it('counts a wrapped title as more than one line', () => {
    const title =
      'What customers told us about returns and refunds in stores and online too';
    const node = {
      type: 'slideAgenda' as const,
      sections: Array.from({ length: agendaFit.l }, (_, index) => ({
        number: String(index + 1),
        title,
      })),
    };
    expect(agendaLines(node.sections, 'l', frameContentWidth)).toBeGreaterThan(
      agendaFit.l
    );
    expect(stepOf(node)).toBe(
      sizeForLoad(
        undefined,
        (at) => agendaLines(node.sections, at, frameContentWidth),
        agendaFit
      )
    );
    expect(stepOf(node)).not.toBe('l');
  });
});
