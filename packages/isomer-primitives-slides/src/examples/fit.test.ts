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
import { denseExample as barsExample } from '../primitives/slide_bars/examples';
import { fullExample as definitionsExample } from '../primitives/slide_definitions/examples';
import { wideExample as fanoutExample } from '../primitives/slide_fanout/examples';
import { tallestExample } from '../primitives/slide_heading/examples';
import { fullExample as listExample } from '../primitives/slide_list/examples';
import {
  fullExample as matrixFullExample,
  pairExample,
} from '../primitives/slide_matrix/examples';
import {
  example as quadrantExample,
  fullExample as quadrantFullExample,
} from '../primitives/slide_quadrant/examples';
import type { SlideQuadrantNode } from '../primitives/slide_quadrant/schema';
import {
  example as tableExample,
  fullExample as tableFullExample,
} from '../primitives/slide_table/examples';
import { tableSize } from '../primitives/slide_table/fit';
import type { SlideTableNode } from '../primitives/slide_table/schema';
import { slideDeckPrimitives } from '../registry';
import { agendaFit } from '../theme/components/agenda';
import {
  definitionsFit,
  definitionsRowFit,
} from '../theme/components/definitions';
import { matrixFit } from '../theme/components/matrix';
import { quadrantFit } from '../theme/components/quadrant';
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
  const [, typical = []] = tableExample.rows ?? [];
  const tableRows = (count: number): SlideTableNode => ({
    ...tableExample,
    rows: Array.from({ length: count }, () => [...typical]),
  });
  const quadrantWith = (items: number): SlideQuadrantNode => {
    const top = Math.ceil(items / 2);
    const bottom = items - top;
    return {
      ...quadrantExample,
      quadrants: [top, top, bottom, bottom].map((count, index) => ({
        label: `Cell ${index}`,
        items: Array.from({ length: count }, (_, item) => `item ${item}`),
      })),
    };
  };
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
    {
      step,
      variant: 'matrix-cellPadding',
      node: {
        ...pairExample,
        rows: Array.from(
          {
            length: Math.min(
              matrixFullExample.rows.length,
              most(matrixFit[step])
            ),
          },
          () => pairExample.rows[0]!
        ),
      },
    },
    {
      step,
      variant: 'quadrant-cellSize',
      node: quadrantWith(
        Math.min(
          2 * (quadrantFullExample.quadrants[0]?.items.length ?? 0),
          most(quadrantFit[step])
        )
      ),
    },
    {
      step,
      variant: 'table-headStep',
      node: tableRows(
        Math.max(
          ...Array.from(
            { length: tableFullExample.rows?.length ?? 0 },
            (_, index) => index + 1
          ).filter((count) => tableSize(tableRows(count)) === step)
        )
      ),
    },
  ]);

  const statsRow = (count: number, value: string, unit?: string) => ({
    type: 'slideStats',
    items: Array.from({ length: count }, () => ({
      value,
      ...(unit ? { unit } : {}),
      label: 'Label',
      body: 'Body.',
    })),
  });
  const figures = [
    { step: 'l', variant: 'bars-labelSize', node: barsExample },
    { step: 'l', variant: 'stats-valueSize', node: statsRow(2, '000000') },
    { step: 'l', variant: 'stats-valueSize', node: statsRow(3, '00', 'ms') },
    { step: 'l', variant: 'stats-valueSize', node: statsRow(4, '00') },
    {
      step: 'l',
      variant: 'delta-valueSize',
      node: {
        type: 'slideDelta',
        before: { label: 'Before', value: '0000' },
        after: { label: 'After', value: '0' },
        body: 'Body.',
      },
    },
  ] as const;

  it.each([...steps, ...figures])(
    '$variant at $step',
    async ({ step, variant, node }) => {
      expect(renderedStep(variant, node)).toBe(step);
      expect(await findings(alone(node))).toEqual([]);
    }
  );
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
    { ...barsExample, size: 'l' },
    tableFullExample,
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
