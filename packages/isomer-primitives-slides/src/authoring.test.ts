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
  SlideCard,
  SlideCardGroup,
  SlideCode,
  SlideTerritory,
  SlideTerritoryGroup,
  toComposition,
} = buildJsxShim(slideDeckPrimitives);

describe('slide authoring', () => {
  it('maps SlideCard children onto cards', () => {
    const spec = toComposition(
      createElement(
        Composition,
        null,
        createElement(
          SlideCardGroup,
          { columns: 3 },
          createElement(
            SlideCard,
            { badge: '01', title: 'React' },
            'Component tree'
          )
        )
      )
    );

    expect(spec.body).toEqual([
      {
        type: 'slideCardGroup',
        columns: 3,
        cards: [{ badge: '01', title: 'React', body: 'Component tree' }],
      },
    ]);
  });

  it('keeps an explicit cards array', () => {
    const spec = toComposition(
      createElement(
        Composition,
        null,
        createElement(SlideCardGroup, {
          cards: [{ title: 'HTML', body: 'Envelope.' }],
        })
      )
    );

    expect(spec.body).toEqual([
      {
        type: 'slideCardGroup',
        cards: [{ title: 'HTML', body: 'Envelope.' }],
      },
    ]);
  });

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
            { title: 'Host', tone: 'pink' },
            'Owns routing.'
          )
        )
      )
    );

    expect(spec.body).toEqual([
      {
        type: 'slideTerritoryGroup',
        items: [{ title: 'Host', tone: 'pink', body: 'Owns routing.' }],
      },
    ]);
  });

  it('maps SlideCode children onto code', () => {
    const spec = toComposition(
      createElement(
        Composition,
        null,
        createElement(
          SlideCode,
          { label: 'Composition', language: 'ts' },
          'const spec: Composition = {\n  type: "view",\n  body: [node],\n};'
        )
      )
    );

    expect(spec.body).toEqual([
      {
        type: 'slideCode',
        label: 'Composition',
        language: 'ts',
        code: 'const spec: Composition = {\n  type: "view",\n  body: [node],\n};',
      },
    ]);
  });

  it('keeps an explicit code prop', () => {
    const spec = toComposition(
      createElement(
        Composition,
        null,
        createElement(
          SlideCode,
          { code: 'const a = 1;', language: 'ts' },
          'const b = 2;'
        )
      )
    );

    expect(spec.body).toEqual([
      {
        type: 'slideCode',
        language: 'ts',
        code: 'const a = 1;',
      },
    ]);
  });

  it('trims surrounding JSX whitespace on SlideCode children', () => {
    const spec = toComposition(
      createElement(
        Composition,
        null,
        createElement(
          SlideCode,
          { language: 'ts' },
          '\n  ',
          'const x = {\n  a: 1,\n};',
          '\n'
        )
      )
    );

    expect(spec.body).toEqual([
      {
        type: 'slideCode',
        language: 'ts',
        code: 'const x = {\n  a: 1,\n};',
      },
    ]);
  });
});
