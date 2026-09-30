/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';
import { describe, expect, it } from 'vitest';

import { slideJsx } from '../../jsx';
import { slideDeckFrame, slidesPack } from '../../pack';
import { columns } from '../../theme/components/columns';
import { frameContentWidth } from '../../theme/components/frame';
import { slideDistillery } from '../../theme/distillery';
import { scalePx } from '../../theme/scale';
import { slideLayout } from '../layout';
import { widestWord } from '../size';
import { referenceHeading, renderedStep } from '../size.fixtures';
import { referenceRoom } from '../slide_heading/fit';

import { example, plainExample, wideExample } from './examples';
import { columnInnerWidth, columnsHeadHeight, columnsStep } from './fit';
import { markdown, slack, text } from './index';
import { schema, type SlideColumnsNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const { highlightLabel } = slideDistillery.tokens.columns;

// The frame body below a two-line title and lede, where load budgets hold at crowding 1.
const full = slideLayout({
  layout: { width: frameContentWidth, height: referenceRoom },
});

// Two columns of `A` and `n` characters, and a footnote of `c` and `k`: a load of 2(1 + n) + 1 + k.
const loaded = (n: number, k: number): SlideColumnsNode => ({
  type: 'slideColumns',
  items: [
    { title: 'A', body: 'x'.repeat(n) },
    { title: 'A', body: 'x'.repeat(n) },
  ],
  footnote: { code: 'c', text: 'y'.repeat(k) },
});

describe('slideColumns schema', () => {
  it('holds two to four columns, and the fit test measures four', () => {
    expect(wideExample.items).toHaveLength(4);
    const [first] = example.items;
    expect(schema.safeParse({ ...example, items: [first] }).success).toBe(
      false
    );
    expect(
      schema.safeParse({ ...example, items: Array(4).fill(first) }).success
    ).toBe(true);
    expect(
      schema.safeParse({ ...example, items: Array(5).fill(first) }).success
    ).toBe(false);
  });

  it('takes a highlight only as an index into items', () => {
    const { errors } = runtime.validate(
      compose({ ...plainExample, highlight: 2 })
    );
    expect(errors.map(({ path, message }) => `${path}: ${message}`)).toEqual([
      'body[0].body[0].highlight: must be an index into `items`',
    ]);
    expect(schema.safeParse({ ...plainExample, highlight: 1 }).success).toBe(
      true
    );
  });
});

describe('slideColumns size', () => {
  it.each([
    [198, 1, 'l'],
    [198, 2, 'm'],
    [258, 1, 'm'],
    [258, 2, 's'],
  ] as const)('a load from %i and %i takes %s', (n, k, step) => {
    expect(columnsStep(loaded(n, k), full)).toBe(step);
  });

  it('keeps an authored size', () => {
    expect(columnsStep({ ...loaded(258, 2), size: 'l' })).toBe('l');
    expect(columnsStep({ ...loaded(0, 0), size: 's' })).toBe('s');
  });

  it('steps down under a crowded heading', () => {
    expect(columnsStep(loaded(198, 1), { ...full, crowding: 1.1 })).toBe('m');
  });

  it('steps down in a layout narrower than the frame body', () => {
    expect(columnsStep(loaded(198, 1), full)).toBe('l');
    expect(
      columnsStep(loaded(198, 1), { ...full, width: full.width - 20 })
    ).toBe('m');
  });

  it('reads the layout a window or split pane gives it', () => {
    const node = loaded(198, 1);
    expect(renderedStep('columns-titleSize', node, referenceHeading)).toBe('l');
    const inWindow = {
      type: 'slideWindow',
      chrome: 'browser',
      title: 'shop.example',
      body: [node],
    };
    expect(
      renderedStep('columns-titleSize', inWindow, referenceHeading)
    ).not.toBe('l');
    const inPane = {
      type: 'slideSplit',
      panes: [
        { items: [node] },
        { items: [{ type: 'slideStatement', text: 'x' }] },
      ],
    };
    expect(renderedStep('columns-titleSize', inPane, referenceHeading)).toBe(
      's'
    );
  });

  it('steps down until no title word breaks in its column', () => {
    const node = {
      ...loaded(0, 0),
      items: [
        { title: 'Observability', body: 'x' },
        { title: 'B', body: 'x' },
      ],
    };
    const word = widestWord('Observability', columns.title.tracking);
    // The layout width whose two columns are exactly as wide as the word at `step`.
    const snug = (step: 'l' | 'm') =>
      2 * word * scalePx(columns.titleSizes[step]) +
      (full.width - 2 * columnInnerWidth(2, full.width));
    expect(columnsStep(node, { ...full, width: snug('l') })).toBe('l');
    expect(columnsStep(node, { ...full, width: snug('l') - 1 })).toBe('m');
    expect(columnsStep(node, { ...full, width: snug('m') })).toBe('m');
    expect(columnsStep(node, { ...full, width: snug('m') - 1 })).toBe('s');
    expect(
      columnsStep({ ...node, size: 'l' }, { ...full, width: snug('m') - 1 })
    ).toBe('l');
  });

  it('wraps titles at the width its layout gives each column', () => {
    const node = {
      ...loaded(0, 0),
      items: [
        { title: 'A title long enough to wrap', body: 'x' },
        { title: 'B', body: 'x' },
      ],
    };
    expect(columnsHeadHeight(node.items, 'l', full)).toBeLessThan(
      columnsHeadHeight(node.items, 'l', { ...full, width: full.width / 3 })
    );
  });
});

describe('slideColumns output', () => {
  it('names the highlighted column on every surface', () => {
    const label = highlightLabel.value;
    expect(runtime.surfaces.html.render(compose(plainExample)).html).toContain(
      `role="img" aria-label="${label}"`
    );
    expect(text(plainExample)).toContain(`Buy it · ${label}`);
    expect(serializeMarkdown(markdown(plainExample))).toContain(
      `## Buy it · ${label}`
    );
    expect(JSON.stringify(slack(plainExample))).toContain(
      `*Buy it* · ${label}`
    );
    expect(text(example)).not.toContain(label);
  });

  it('renders text and markdown', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "Canary
      1% · 10% · 50%
      A slice of traffic takes the new build first, so a bad release hurts few customers.

      Blue-green
      blue · green
      Two full fleets. The switch is instant, and so is the way back.

      Rolling
      zone-a · zone-b · zone-c · zone-d
      One zone at a time, with no spare capacity to pay for.

      auto-rollback returns any of the three to the last healthy build."
    `);
    expect(serializeMarkdown(markdown(plainExample))).toMatchInlineSnapshot(`
      "## Build it

      Six weeks for two engineers, and the pricing rules stay ours.

      ## Buy it · Recommended

      Live next sprint, at the cost of a fee on every order."
    `);
  });

  it('renders Slack as one field per column and the footnote as context', () => {
    expect(slack(example)).toMatchInlineSnapshot(`
      [
        {
          "fields": [
            {
              "text": "*Canary*
      \`1%\` · \`10%\` · \`50%\`
      A slice of traffic takes the new build first, so a bad release hurts few customers.",
              "type": "mrkdwn",
            },
            {
              "text": "*Blue-green*
      \`blue\` · \`green\`
      Two full fleets. The switch is instant, and so is the way back.",
              "type": "mrkdwn",
            },
            {
              "text": "*Rolling*
      \`zone-a\` · \`zone-b\` · \`zone-c\` · \`zone-d\`
      One zone at a time, with no spare capacity to pay for.",
              "type": "mrkdwn",
            },
          ],
          "type": "section",
        },
        {
          "elements": [
            {
              "text": "\`auto-rollback\` returns any of the three to the last healthy build.",
              "type": "mrkdwn",
            },
          ],
          "type": "context",
        },
      ]
    `);
  });

  // A field is `*A*`, a line break, then the body.
  const fieldAt = (length: number): SlideColumnsNode => ({
    type: 'slideColumns',
    items: [
      { title: 'A', body: 'x'.repeat(length - 4) },
      { title: 'B', body: 'Short.' },
    ],
  });

  it('keeps a column at the field limit a field, and one past it whole in rich text', () => {
    const limit = SLACK_LIMITS.sectionFieldChars;
    const [atLimit] = slack(fieldAt(limit));
    expect(atLimit?.type).toBe('section');
    const [past] = slack(fieldAt(limit + 1));
    expect(past?.type).toBe('rich_text');
    expect(JSON.stringify(past)).toContain('x'.repeat(limit - 3));
  });

  // The context is `` `c` ``, a space, then the text.
  const footnoteAt = (length: number): SlideColumnsNode => ({
    ...plainExample,
    footnote: { code: 'c', text: 'y'.repeat(length - 4) },
  });

  it('keeps a footnote at the context limit a context, and one past it whole in rich text', () => {
    const limit = SLACK_LIMITS.contextElementChars;
    expect(slack(footnoteAt(limit))[1]?.type).toBe('context');
    const past = slack(footnoteAt(limit + 1))[1];
    expect(past?.type).toBe('rich_text');
    expect(JSON.stringify(past)).toContain('y'.repeat(limit - 3));
  });

  it('keeps a backtick in a tag or code whole in rich text', () => {
    const blocks = slack({
      ...plainExample,
      items: [
        { ...plainExample.items[0]!, tags: ['a`b'] },
        plainExample.items[1]!,
      ],
      footnote: { code: 'c`d', text: 'Why.' },
    });
    expect(blocks.map(({ type }) => type)).toEqual(['rich_text', 'rich_text']);
    expect(JSON.stringify(blocks)).toContain('a`b');
    expect(JSON.stringify(blocks)).toContain('c`d');
  });
});

describe('slideColumns JSX', () => {
  it('fills columns from SlideColumn children, with text as the body', () => {
    const { SlideColumn, SlideColumns } = slideJsx;
    const node = slideJsx.toComposition(
      createElement(
        slideJsx.Composition,
        null,
        createElement(
          SlideColumns,
          { highlight: 1 },
          createElement(
            SlideColumn,
            { title: 'Poll' },
            'Lags by one interval.'
          ),
          createElement(SlideColumn, { title: 'Push' }, 'Immediate.')
        )
      )
    ).body[0];
    expect(node).toEqual({
      type: 'slideColumns',
      highlight: 1,
      items: [
        { title: 'Poll', body: 'Lags by one interval.' },
        { title: 'Push', body: 'Immediate.' },
      ],
    });
  });
});
