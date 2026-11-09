/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { describe, expect, it } from 'vitest';

import { xyTimeSeriesScene } from '../scene/examples';
import type { XyScene } from '../scene/types';

import { sceneToMarkdown, sceneToText } from './scene_text';

// One empty column between two shown ones; a cell holding the empty-value text.
const withEmpty: XyScene = {
  ...xyTimeSeriesScene,
  summary: 'Count by host.',
  table: {
    columns: [
      {
        id: 'host',
        label: 'host.name',
        type: 'string',
        role: 'dimension',
        empty: false,
      },
      {
        id: 'note',
        label: 'Note',
        type: 'string',
        role: 'dimension',
        empty: true,
      },
      {
        id: 'count',
        label: 'Count | all',
        type: 'number',
        role: 'metric',
        empty: false,
      },
    ],
    rows: [
      {
        row: 0,
        cells: ['web-01', '(empty)', '12'],
        values: ['web-01', '', 12],
      },
      { row: 1, cells: ['(empty)', '(empty)', '3'], values: ['', '', 3] },
    ],
  },
};

describe('Scene text', () => {
  it('writes the summary, then the table in data order, without empty columns', () => {
    expect(sceneToText(withEmpty)).toBe(
      [
        'Count by host.',
        '',
        'host.name | Count | all',
        'web-01 | 12',
        '(empty) | 3',
      ].join('\n')
    );
  });

  it('writes the summary alone when the table has no rows', () => {
    expect(
      sceneToText({ ...withEmpty, table: { ...withEmpty.table, rows: [] } })
    ).toBe('Count by host.');
  });

  it('writes Markdown with an escaped GFM table', () => {
    expect(serializeMarkdown(sceneToMarkdown(withEmpty))).toBe(
      [
        'Count by host.',
        '',
        '| host.name | Count \\| all |',
        '| - | - |',
        '| web-01 | 12 |',
        '| (empty) | 3 |',
      ].join('\n')
    );
  });

  it('writes the footer row last, without empty columns', () => {
    const footed = {
      ...withEmpty,
      table: { ...withEmpty.table, footer: ['', 'Mean', 'Sum: 15'] },
    };
    expect(sceneToText(footed).split('\n').at(-1)).toBe(' | Sum: 15');
    expect(serializeMarkdown(sceneToMarkdown(footed)).split('\n').at(-1)).toBe(
      '| | Sum: 15 |'
    );
  });

  it('writes no table for a footer without rows', () => {
    expect(
      sceneToText({
        ...withEmpty,
        table: { ...withEmpty.table, rows: [], footer: ['', '', 'Sum: 0'] },
      })
    ).toBe('Count by host.');
  });

  it('carries every table string of a Scene', () => {
    const text = sceneToText(xyTimeSeriesScene);
    for (const { cells } of xyTimeSeriesScene.table.rows) {
      expect(text).toContain(cells.join(' | '));
    }
  });
});
