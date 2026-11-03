/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readCases } from './fixtures';
import { modelReadings } from './model';
import { replay } from './replay';

describe('modelReadings', () => {
  it('reads no secondary value for a secondary drawn as a badge alone', () => {
    const comparison = readCases().find(({ id }) =>
      id.includes('esql-breakdown-compare--light')
    )!;
    const result = replay(comparison);
    if (result.status !== 'bound') {
      throw new Error('The case did not bind.');
    }
    const [tile] = result.node.tiles;
    const secondary = tile!.secondary;
    if (secondary?.kind !== 'value') {
      throw new Error('The case has no value secondary.');
    }
    tile!.secondary = { ...secondary, value: undefined };
    const [reading] = modelReadings(
      result.node,
      'light',
      comparison.reference.fingerprint
    );
    expect(reading!['secondary.value']).toBeUndefined();
  });
});
