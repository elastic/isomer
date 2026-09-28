/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';

import { example, examples, groupsExample } from './examples';
import { markdown, slack, text } from './index';
import { schema, type SlideTableNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const errorPaths = (node: unknown) =>
  runtime
    .validate(compose(node as PrimitiveNode))
    .errors.map(({ path, message }) => `${path}: ${message}`);

const node: SlideTableNode = {
  type: 'slideTable',
  label: 'Surfaces',
  columns: ['Surface', 'Output'],
  rowHeaders: true,
  rows: [
    ['react', 'Elements'],
    ['markdown', 'GFM | pipes'],
  ],
};

describe('slideTable schema', () => {
  it('accepts every example', () => {
    expect(examples.every((entry) => schema.safeParse(entry).success)).toBe(
      true
    );
  });

  it('takes exactly one of rows or groups', () => {
    const { rows: _rows, ...bare } = node;
    expect(errorPaths(bare)).toContainEqual(
      'body[0].body[0].rows: give exactly one of rows or groups'
    );
    expect(
      errorPaths({ ...node, groups: [{ label: 'All', rows: node.rows }] })
    ).toContainEqual(
      'body[0].body[0].groups: give exactly one of rows or groups'
    );
  });

  it('points a short row at the row', () => {
    expect(
      errorPaths({ ...node, rows: [['react', 'Elements'], ['text']] })
    ).toContainEqual(
      'body[0].body[0].rows[1]: every row needs one cell per column (2)'
    );
  });

  it('points a short grouped row at its group', () => {
    const [first, second] = groupsExample.groups ?? [];
    expect(
      errorPaths({
        ...groupsExample,
        groups: [first, { ...second, rows: [['notifier']] }],
      })
    ).toContainEqual(
      'body[0].body[0].groups[1].rows[0]: every row needs one cell per column (3)'
    );
  });

  it('caps rows across all groups at twelve', () => {
    const row = ['a', 'b', 'c'];
    expect(
      errorPaths({
        ...groupsExample,
        groups: [
          { label: 'One', rows: Array(7).fill(row) },
          { label: 'Two', rows: Array(6).fill(row) },
        ],
      })
    ).toContainEqual(
      'body[0].body[0].groups: at most 12 rows across all groups'
    );
  });
});

describe('slideTable output', () => {
  it('pads text columns to the widest cell', () => {
    expect(text(node).split('\n')).toEqual([
      'Surfaces',
      'Surface   Output',
      '--------  -----------',
      'react     Elements',
      'markdown  GFM | pipes',
    ]);
  });

  it('labels each group in text and markdown', () => {
    expect(text(groupsExample)).toMatchInlineSnapshot(`
      "Service        Role                 On call
      -------------  -------------------  ----------------
      EVERY ORDER
      cart-api       Holds the basket     Payments
      ledger         Records the charge   Finance platform
      ONLY ON REFUNDS
      refund-worker  Reverses the charge  Payments
      notifier       Emails the customer  Growth"
    `);
    expect(markdown(groupsExample)).toMatchInlineSnapshot(`
      "**Every order**

      | Service | Role | On call |
      | - | - | - |
      | cart-api | Holds the basket | Payments |
      | ledger | Records the charge | Finance platform |

      **Only on refunds**

      | Service | Role | On call |
      | - | - | - |
      | refund-worker | Reverses the charge | Payments |
      | notifier | Emails the customer | Growth |"
    `);
  });

  it('escapes pipes in markdown cells', () => {
    expect(markdown(node)).toContain('| markdown | GFM \\| pipes |');
  });

  it('keeps row headers bold in the native Slack table', () => {
    const [section, table] = slack(node);
    expect(section).toMatchObject({ type: 'section' });
    expect(table).toMatchObject({
      type: 'table',
      rows: [
        [
          { type: 'raw_text', text: 'Surface' },
          { type: 'raw_text', text: 'Output' },
        ],
        [
          {
            type: 'rich_text',
            elements: [
              {
                elements: [
                  { type: 'text', text: 'react', style: { bold: true } },
                ],
              },
            ],
          },
          { type: 'raw_text', text: 'Elements' },
        ],
        expect.anything(),
      ],
    });
  });

  it('opens each group with a bold label row in Slack', () => {
    const [table] = slack(groupsExample);
    const rows = table?.type === 'table' ? table.rows : [];
    expect(rows[4]).toEqual([
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [
              { type: 'text', text: 'Only on refunds', style: { bold: true } },
            ],
          },
        ],
      },
      { type: 'raw_text', text: '' },
      { type: 'raw_text', text: '' },
    ]);
  });

  it('is reached through the containers above it', () => {
    const { blocks } = runtime.surfaces.slack.render(
      compose({
        type: 'slideSplit',
        left: { items: [node] },
        right: { items: [example] },
      } as PrimitiveNode)
    );
    const tables = blocks.filter((block) => block.type === 'table');
    expect(tables).toHaveLength(2);
    expect(JSON.stringify(tables)).toContain('"bold":true');
  });

  it.each(examples.map((entry, index) => [index, entry] as const))(
    'keeps every authored string on every surface (example %i)',
    (_index, entry) => {
      const composition = compose(entry);
      const outputs = [
        runtime.surfaces.text.render(composition),
        runtime.surfaces.markdown.render(composition),
        JSON.stringify(runtime.surfaces.slack.render(composition).blocks),
      ].map((output) => output.toLowerCase());
      const authored = [
        entry.label,
        ...entry.columns,
        ...(entry.rows ?? []).flat(),
        ...(entry.groups ?? []).flatMap(({ label, rows }) => [
          label,
          ...rows.flat(),
        ]),
      ].filter((value): value is string => Boolean(value));
      for (const value of authored) {
        for (const output of outputs) {
          expect(output).toContain(value.toLowerCase());
        }
      }
    }
  );
});
