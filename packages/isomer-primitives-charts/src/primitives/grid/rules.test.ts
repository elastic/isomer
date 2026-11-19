/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, it } from 'vitest';

import { expectRule, metric } from '../../schema/rules.fixtures';

import { GRID_RULES } from './schema';

describe('grid', () => {
  const metricNode = metric();

  it('rejects a panel past the last column', () => {
    expectRule(
      'grid',
      {
        type: 'grid',
        panels: [{ x: 40, y: 0, w: 12, h: 4, node: metricNode }],
      },
      GRID_RULES.width,
      'panels.0.w'
    );
  });

  it('rejects a repeated id across panels and sections', () => {
    expectRule(
      'grid',
      {
        type: 'grid',
        panels: [{ id: 'a', x: 0, y: 0, w: 12, h: 4, node: metricNode }],
        sections: [{ id: 'a', title: 'A', y: 4, panels: [] }],
      },
      GRID_RULES.ids,
      'sections.0.id'
    );
  });
});
