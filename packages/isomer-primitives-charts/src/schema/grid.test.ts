/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { gridExamples } from './examples/grid';
import { type GridNode, gridReadingOrder } from './grid';

// Kibana's grid orders panels by row, then column (`comparePanel` in
// `@kbn/grid-layout`), and draws sections after the panels outside them.

const node = (name: string): GridNode => {
  const found = gridExamples.find((example) => example.name === name);
  if (!found) {
    throw new Error(`no grid example named ${name}`);
  }
  return found.node;
};

describe('gridReadingOrder', () => {
  it('orders top-level panels by row, then column, before sections by row', () => {
    expect(
      gridReadingOrder(node('Sections')).map(({ path, section }) => [
        path,
        section?.id,
      ])
    ).toEqual([
      ['panels[1].node', undefined],
      ['panels[0].node', undefined],
      ['sections[1].panels[0].node', 'details'],
      ['sections[1].panels[1].node', 'details'],
      ['sections[0].panels[0].node', 'later'],
    ]);
  });

  it('keeps array order for panels at the same position', () => {
    const panel = (id: string) => ({
      id,
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      node: { type: 'unsupported' },
    });
    expect(
      gridReadingOrder({
        panels: [panel('first'), panel('second')],
      }).map(({ panel: { id } }) => id)
    ).toEqual(['first', 'second']);
  });
});
