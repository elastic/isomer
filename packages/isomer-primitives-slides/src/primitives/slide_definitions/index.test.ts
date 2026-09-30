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
import {
  definitionsFit,
  definitionsSingleColumnMax,
} from '../../theme/components/definitions';
import { sizeForLoad } from '../size';
import { crowdingHeading, renderedStep } from '../size.fixtures';
import { headingCrowding } from '../slide_heading/fit';

import { example, fullExample } from './examples';
import { markdown as markdownContent, slack, text } from './index';

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

const columnsOf = (count: number): number =>
  runtime.surfaces.html
    .render(
      compose({ ...fullExample, items: fullExample.items.slice(0, count) })
    )
    .html.match(/<dl/g)?.length ?? 0;

describe('slideDefinitions', () => {
  it('holds one to six terms', () => {
    const { errors } = runtime.validate(
      compose({ ...example, items: Array(7).fill(example.items[0]) })
    );
    expect(errors.map(({ path }) => path)).toContain('body[0].body[0].items');
  });

  it('splits into two columns past the theme threshold', () => {
    expect(columnsOf(definitionsSingleColumnMax)).toBe(1);
    expect(columnsOf(definitionsSingleColumnMax + 1)).toBe(2);
  });

  it('renders text, markdown, and Slack', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "authorization: The bank holds the funds. Nothing has moved yet.
      capture: The merchant claims the held funds, usually at shipment.
      settlement: The money lands in the merchant account, one to two days later."
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "- **authorization**: The bank holds the funds. **Nothing has moved yet.**
      - **capture**: The merchant claims the held funds, usually at shipment.
      - **settlement**: The money lands in the merchant account, one to two days later."
    `);
    expect(slack(example)).toMatchInlineSnapshot(`
      [
        {
          "fields": [
            {
              "text": "*authorization*
      The bank holds the funds. *Nothing has moved yet.*",
              "type": "mrkdwn",
            },
            {
              "text": "*capture*
      The merchant claims the held funds, usually at shipment.",
              "type": "mrkdwn",
            },
            {
              "text": "*settlement*
      The money lands in the merchant account, one to two days later.",
              "type": "mrkdwn",
            },
          ],
          "type": "section",
        },
      ]
    `);
  });

  describe('size', () => {
    const one = (load: number) => ({
      type: 'slideDefinitions',
      items: [{ term: 'a', body: 'x'.repeat(load - 1) }],
    });
    // Five terms split three and two, so the load is three rows' characters times two columns.
    const split = (rowCharacters: number) => ({
      type: 'slideDefinitions',
      items: Array.from({ length: definitionsSingleColumnMax + 1 }, () => ({
        term: 'a',
        body: 'x'.repeat(rowCharacters - 1),
      })),
    });
    const stepOf = (node: object) => renderedStep('definitions-rowSize', node);

    it.each([
      [definitionsFit.l, 'l'],
      [definitionsFit.l + 1, 'm'],
      [definitionsFit.m, 'm'],
      [definitionsFit.m + 1, 's'],
    ])('sets a load of %i at %s', (load, step) => {
      expect(stepOf(one(load))).toBe(step);
    });

    it('loads two columns by the longer one times two', () => {
      const perRow = definitionsFit.l / 6;
      expect(stepOf(split(perRow))).toBe('l');
      expect(stepOf(split(perRow + 1))).toBe('m');
    });

    it('keeps an authored size', () => {
      expect(stepOf({ ...one(definitionsFit.m + 1), size: 'l' })).toBe('l');
      expect(stepOf({ ...one(10), size: 's' })).toBe('s');
    });

    it("scales its load by the heading's crowding", () => {
      const step = sizeForLoad(
        undefined,
        definitionsFit.l,
        definitionsFit,
        headingCrowding(crowdingHeading)
      );
      expect(step).not.toBe('l');
      expect(
        renderedStep(
          'definitions-rowSize',
          one(definitionsFit.l),
          crowdingHeading
        )
      ).toBe(step);
    });
  });
});
