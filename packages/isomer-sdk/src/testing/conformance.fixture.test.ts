/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { runPrimitiveInventoryConformance } from './conformance';
import { fixtureDefinitions, fixturePack } from './sdk.fixtures';

describe('fixture pack', () => {
  it('is the sdk conformance subject', () => {
    expect(fixturePack.id).toBe('sdk.fixture');
    expect(fixturePack.slackAssetTypes.has('chart')).toBe(true);
    expect(
      fixtureDefinitions.some(
        (definition) =>
          definition.type === 'caption' &&
          definition.renderers.slack === undefined
      )
    ).toBe(true);
    expect(
      fixtureDefinitions.some((definition) => definition.type === 'stack')
    ).toBe(true);
    runPrimitiveInventoryConformance(fixtureDefinitions);
  });
});
