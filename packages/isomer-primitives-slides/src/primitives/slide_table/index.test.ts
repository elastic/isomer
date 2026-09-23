/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import type { SlideFrameNode } from '../slide_frame';

import { markdown, slack, text } from './index';
import { schema, type SlideTableNode } from './schema';

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

describe('slideTable', () => {
  it('rejects a row with the wrong number of cells', () => {
    const result = schema.safeParse({ ...node, rows: [['react']] });
    expect(result.success).toBe(false);
  });

  it('pads text columns to the widest cell', () => {
    expect(text(node).split('\n')).toEqual([
      'Surfaces',
      'Surface   Output',
      '--------  -----------',
      'react     Elements',
      'markdown  GFM | pipes',
    ]);
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

  it('is reached through the containers above it', () => {
    const runtime = createIsomerRuntime({
      packs: [slidesPack],
      frames: { slide: slideDeckFrame },
    });
    const frame: SlideFrameNode = {
      type: 'slideFrame',
      chapter: 'Surfaces',
      footer: 'Elastic',
      body: [{ type: 'slideSplit', left: [node], right: [node] }],
    };
    const { blocks } = runtime.surfaces.slack.render({
      type: 'view',
      body: [frame],
    });
    const tables = blocks.filter((block) => block.type === 'table');
    expect(tables).toHaveLength(2);
    expect(JSON.stringify(tables)).toContain('"bold":true');
  });
});
