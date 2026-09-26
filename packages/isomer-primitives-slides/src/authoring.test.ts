/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { buildJsxShim } from '@elastic/isomer-sdk/author';
import { describe, expect, it } from 'vitest';

import { slideDeckPrimitives } from './registry';

const {
  Composition,
  SlideCode,
  SlideTerritory,
  SlideTerritoryGroup,
  SlideTranscript,
  SlideTurn,
  toComposition,
} = buildJsxShim(slideDeckPrimitives);

describe('slide authoring', () => {
  it('maps SlideTerritory children onto items', () => {
    const spec = toComposition(
      createElement(
        Composition,
        null,
        createElement(
          SlideTerritoryGroup,
          null,
          createElement(
            SlideTerritory,
            { title: 'Host', tone: 'accent' },
            'Owns routing.'
          )
        )
      )
    );

    expect(spec.body).toEqual([
      {
        type: 'slideTerritoryGroup',
        items: [{ title: 'Host', tone: 'accent', body: 'Owns routing.' }],
      },
    ]);
  });

  it('maps SlideTurn children onto turns', () => {
    const spec = toComposition(
      createElement(
        Composition,
        null,
        createElement(
          SlideTranscript,
          null,
          createElement(SlideTurn, { role: 'user' }, 'Show me refunds.'),
          createElement(SlideTurn, { role: 'model', format: 'code' }, '{}')
        )
      )
    );

    expect(spec.body).toEqual([
      {
        type: 'slideTranscript',
        turns: [
          { role: 'user', text: 'Show me refunds.' },
          { role: 'model', format: 'code', text: '{}' },
        ],
      },
    ]);
  });

  it('passes object props through untouched', () => {
    const panels = [{ file: 'a.ts', lines: ['const a = 1;'], highlight: [1] }];
    const spec = toComposition(
      createElement(Composition, null, createElement(SlideCode, { panels }))
    );

    expect(spec.body).toEqual([{ type: 'slideCode', panels }]);
  });
});
