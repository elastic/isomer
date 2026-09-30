/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideLayout } from '../primitives/layout';
import { referenceHeading, renderedStep } from '../primitives/size.fixtures';
import { longExample as agendaExample } from '../primitives/slide_agenda/examples';
import { fullExample as definitionsExample } from '../primitives/slide_definitions/examples';
import { wideExample as fanoutExample } from '../primitives/slide_fanout/examples';
import { tallestExample } from '../primitives/slide_heading/examples';
import { fullExample as listExample } from '../primitives/slide_list/examples';
import { slideDeckPrimitives } from '../registry';
import { agendaFit } from '../theme/components/agenda';
import {
  definitionsFit,
  definitionsRowFit,
} from '../theme/components/definitions';
import { quoteFit } from '../theme/components/quote';
import { statementFit } from '../theme/components/statement';

import { findings } from './measure';
import { previewSlide } from './preview_slide';

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

  it.each([fanoutExample, listExample, halfWrappedAgenda])(
    '$type below the tallest heading',
    async (node) => {
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
    }
  );
});
