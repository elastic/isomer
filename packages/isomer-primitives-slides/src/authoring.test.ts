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

const { Composition, SlideCode, SlideTerritoryGroup, toComposition } =
  buildJsxShim(slideDeckPrimitives);

describe('slide authoring', () => {
  it('maps Territory children onto items', () => {
    const spec = toComposition(
      createElement(
        Composition,
        null,
        createElement(
          SlideTerritoryGroup,
          null,
          createElement(
            SlideTerritoryGroup.Territory,
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

  it('passes object props through untouched', () => {
    const lineNumbers = { highlight: '1' };
    const spec = toComposition(
      createElement(
        Composition,
        null,
        createElement(SlideCode, { text: 'const a = 1;', lineNumbers })
      )
    );

    expect(spec.body).toEqual([
      { type: 'slideCode', text: 'const a = 1;', lineNumbers },
    ]);
  });
});
